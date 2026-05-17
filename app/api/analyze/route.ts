import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, VISION_MODEL } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import {
  SKINCARE_PRODUCT_TYPES,
  VISION_SKINCARE_SYSTEM,
  buildVisionSkincareUserPrompt,
} from '@/lib/prompts/vision-skincare';
import { scoreSkincareFromVision } from '@/lib/analysis/score-from-vision';
import { resolveHealthierAlternativeScore } from '@/lib/analysis/resolve-healthier-alternative';
import type OpenAI from 'openai';
import { makeCatalogLookupKey } from '@/lib/catalog/lookup-key';
import {
  linkImageHashToCatalog,
  upsertSkincareCatalogEntry,
} from '@/lib/catalog/catalog-service';
import { hashImageBuffer } from '@/lib/catalog/image-hash';
import {
  findCachedByImageHash,
  resolveCachedAnalysis,
} from '@/lib/catalog/resolve-cache';
import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';
import {
  ANALYZE_TOKEN_HEADER,
  enforceAnalyzeRequest,
  incrementVisitorScanCount,
} from '@/lib/security/analyze-guard';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const VisionResultSchema = z.object({
  product_name: z.string(),
  product_type: SkincareProductTypeZ,
  ingredients: z.array(z.string()),
  confidence: z.string(),
  is_skincare: z.boolean(),
});

/** Vision + scoring; + alternative product scoring when suggested. */
export const maxDuration = 120;

function normalizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  if (!result.healthier_alternative?.image_url) return result;
  const safe = sanitizeProductImageUrl(result.healthier_alternative.image_url);
  return {
    ...result,
    healthier_alternative: { ...result.healthier_alternative, image_url: safe },
  };
}

async function applyCatalogScoredAlternative(
  openai: OpenAI,
  result: AnalysisResult
): Promise<AnalysisResult> {
  if (!result.healthier_alternative) return result;
  const healthier_alternative = await resolveHealthierAlternativeScore(
    openai,
    result.healthier_alternative
  );
  return normalizeAnalysisResult({ ...result, healthier_alternative });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const guard = await enforceAnalyzeRequest(
      request,
      Boolean(session?.user?.id),
      session?.user?.id
    );
    if (!guard.ok) {
      return NextResponse.json(
        {
          error: guard.error,
          details: guard.details,
          requiresLogin: guard.requiresLogin ?? false,
        },
        { status: guard.status }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (JPEG or PNG)' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: 'Image size must be less than 5MB' },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageHash = hashImageBuffer(buffer);

    const openai = getOpenAI();

    const imageCached = await findCachedByImageHash(imageHash);
    if (imageCached) {
      console.log('Catalog cache HIT (image hash):', imageHash.slice(0, 12));
      let analysisResult = normalizeAnalysisResult({
        ...imageCached,
        from_catalog_cache: true,
      });
      analysisResult = await applyCatalogScoredAlternative(openai, analysisResult);
      if (session?.user?.id) {
        try {
          await prisma.analysis.create({
            data: {
              userId: session.user.id,
              productName: analysisResult.product_name,
              imageUrl: null,
              qualityScore: analysisResult.score,
              safetyScore: analysisResult.score,
              organicType: 'N/A',
              positiveIngredients: JSON.parse(
                JSON.stringify(analysisResult.positive_ingredients)
              ),
              negativeIngredients: JSON.parse(
                JSON.stringify(analysisResult.negative_ingredients)
              ),
              verdict: analysisResult.verdict,
              healthierAlternative: analysisResult.healthier_alternative
                ? JSON.parse(JSON.stringify(analysisResult.healthier_alternative))
                : undefined,
            },
          });
        } catch (dbError) {
          console.error('Failed to save analysis to database:', dbError);
        }
      }
      if (guard.incrementOnSuccess) await incrementVisitorScanCount();
      const headers = new Headers();
      headers.set('X-DermaIQ-Catalog-Cache', 'hit');
      return NextResponse.json(analysisResult, { status: 200, headers });
    }

    const base64Image = buffer.toString('base64');
    const imageUrl = `data:${image.type};base64,${base64Image}`;

    console.log('Step 1: Identifying product and researching ingredients...');
    const visionResponse = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: VISION_SKINCARE_SYSTEM,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildVisionSkincareUserPrompt(),
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    });

    const visionContent = visionResponse.choices[0].message.content;
    if (!visionContent) {
      throw new Error('No response from Vision API');
    }

    let visionData: VisionExtractionResult;
    try {
      const parsed = JSON.parse(visionContent);
      visionData = VisionResultSchema.parse(parsed);
    } catch (error) {
      console.error('Vision API parsing error:', error);
      return NextResponse.json(
        {
          error: 'Could not identify the product from the image',
          details: 'Please make sure the product is clearly visible in the image.',
        },
        { status: 422 }
      );
    }

    if (!visionData.is_skincare || visionData.product_type === 'not_skincare') {
      return NextResponse.json(
        {
          error: 'This product is outside DermaIQ scope',
          details: `DermaIQ scores dermatology-related personal care: skin, scalp, and hair products (cleansers, moisturizers, serums, sunscreens, shampoos, hair oils, scalp treatments, deodorants, etc.). "${visionData.product_name}" was classified as out of scope. Try a clearer label photo.`,
        },
        { status: 422 }
      );
    }

    if (visionData.ingredients.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not identify ingredients for this product',
          details: 'Please ensure the product label is clearly visible, or try a different angle.',
        },
        { status: 422 }
      );
    }

    const lookupKey = makeCatalogLookupKey(visionData.product_name);
    const cached = await resolveCachedAnalysis(visionData.product_name);

    let analysisResult: AnalysisResult;

    if (cached) {
      console.log('Catalog cache HIT for product:', lookupKey);
      analysisResult = normalizeAnalysisResult({
        ...cached,
        product_name: cached.product_name || visionData.product_name,
        from_catalog_cache: true,
      });
      await linkImageHashToCatalog(lookupKey, imageHash);
    } else {
      console.log('Step 1b–2: Methodology digest + scoring (cache miss)...');
      analysisResult = await scoreSkincareFromVision(openai, visionData);
      analysisResult = { ...analysisResult, from_catalog_cache: false };

      await upsertSkincareCatalogEntry({
        lookupKey,
        vision: visionData,
        analysis: analysisResult,
        source: 'user_scan',
        imageHash,
      });
    }

    analysisResult = await applyCatalogScoredAlternative(openai, analysisResult);

    if (session?.user?.id) {
      try {
        await prisma.analysis.create({
          data: {
            userId: session.user.id,
            productName: analysisResult.product_name,
            imageUrl: null,
            qualityScore: analysisResult.score,
            safetyScore: analysisResult.score,
            organicType: 'N/A',
            positiveIngredients: JSON.parse(JSON.stringify(analysisResult.positive_ingredients)),
            negativeIngredients: JSON.parse(JSON.stringify(analysisResult.negative_ingredients)),
            verdict: analysisResult.verdict,
            healthierAlternative: analysisResult.healthier_alternative
              ? JSON.parse(JSON.stringify(analysisResult.healthier_alternative))
              : undefined,
          },
        });
        console.log('Analysis saved to database for user:', session.user.id);
      } catch (dbError) {
        console.error('Failed to save analysis to database:', dbError);
      }
    }

    if (guard.incrementOnSuccess) {
      await incrementVisitorScanCount();
    }

    const headers = new Headers();
    if (analysisResult.from_catalog_cache) {
      headers.set('X-DermaIQ-Catalog-Cache', 'hit');
    } else {
      headers.set('X-DermaIQ-Catalog-Cache', 'miss');
    }

    return NextResponse.json(analysisResult, { status: 200, headers });
  } catch (error) {
    console.error('Analysis error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Analysis failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred', details: 'Please try again later.' },
      { status: 500 }
    );
  }
}
