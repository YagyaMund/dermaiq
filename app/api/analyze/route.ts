import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { AnalysisResult } from '@/types';
import { extractSkincareFromImage } from '@/lib/analysis/extract-skincare-from-image';
import { isPlausibleInciList } from '@/lib/analysis/normalize-inci';
import { runCatalogAnalysis } from '@/lib/analysis/run-catalog-analysis';
import { hashImageBuffer } from '@/lib/catalog/image-hash';
import {
  enforceAnalyzeRequest,
  incrementVisitorScanCount,
} from '@/lib/security/analyze-guard';

/** Vision + scoring; + alternative product scoring when suggested. */
export const maxDuration = 120;

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

    const base64Image = buffer.toString('base64');
    const imageUrl = `data:${image.type};base64,${base64Image}`;

    console.log('Step 1: Product ID + INCI extraction from image...');
    const visionData = await extractSkincareFromImage(openai, imageUrl);

    if (!visionData) {
      return NextResponse.json(
        {
          error: 'Could not analyze this product from the photo',
          details:
            'We could not identify the product or find its ingredient list. Try a photo with the brand and product name visible on the front, include the ingredients panel if possible, or use Search by product name instead.',
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

    if (!isPlausibleInciList(visionData.ingredients)) {
      return NextResponse.json(
        {
          error: 'Could not find a complete ingredient list',
          details:
            'We identified the product but could not retrieve a reliable INCI list. Try searching by exact product name (brand + product line) instead.',
        },
        { status: 422 }
      );
    }

    console.log('Step 1b–2: Methodology digest + scoring...');
    const analysisResult = await runCatalogAnalysis(openai, visionData, {
      source: 'user_scan',
      imageHash,
    });

    if (session?.user?.id) {
      try {
        await prisma.analysis.create({
          data: {
            userId: session.user.id,
            productName: analysisResult.product_name,
            imageUrl: analysisResult.image_url ?? null,
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
