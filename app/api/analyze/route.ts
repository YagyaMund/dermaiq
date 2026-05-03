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
import { makeCatalogLookupKey } from '@/lib/catalog/lookup-key';
import { findCachedSkincareAnalysis, upsertSkincareCatalogEntry } from '@/lib/catalog/catalog-service';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const VisionResultSchema = z.object({
  product_name: z.string(),
  product_type: SkincareProductTypeZ,
  ingredients: z.array(z.string()),
  confidence: z.string(),
  is_skincare: z.boolean(),
});

/** Vision + optional cache hit, or methodology digest + scoring (up to three model calls). */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
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
    const base64Image = buffer.toString('base64');
    const imageUrl = `data:${image.type};base64,${base64Image}`;

    console.log('Step 1: Identifying product and researching ingredients...');
    const openai = getOpenAI();
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
          error: 'This product is not in-scope skincare for DermaIQ',
          details: `DermaIQ currently only scores skincare (cleansers, moisturizers, serums, sunscreens, masks, exfoliants, eye/lip treatments, hand/body moisturizers, etc.). "${visionData.product_name}" was classified as non-skincare. Try a facial or body skincare label.`,
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
    const cached = await findCachedSkincareAnalysis(lookupKey);

    let analysisResult: AnalysisResult;

    if (cached) {
      console.log('Catalog cache HIT for lookupKey:', lookupKey);
      analysisResult = { ...cached, from_catalog_cache: true };
    } else {
      console.log('Step 1b–2: Methodology digest + scoring (cache miss)...');
      analysisResult = await scoreSkincareFromVision(openai, visionData);
      analysisResult = { ...analysisResult, from_catalog_cache: false };

      await upsertSkincareCatalogEntry({
        lookupKey,
        vision: visionData,
        analysis: analysisResult,
        source: 'user_scan',
      });
    }

    const session = await auth();

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
