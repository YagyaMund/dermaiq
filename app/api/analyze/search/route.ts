import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenAI } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { AnalysisResult } from '@/types';
import {
  isObviouslyVagueSearchQuery,
  resolveProductSearch,
  searchResultToVision,
} from '@/lib/analysis/resolve-product-search';
import { runCatalogAnalysis } from '@/lib/analysis/run-catalog-analysis';
import {
  enforceAnalyzeSearchRequest,
  incrementVisitorScanCount,
} from '@/lib/security/analyze-guard';

const BodySchema = z.object({
  query: z.string().trim().min(1).max(200),
});

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const guard = await enforceAnalyzeSearchRequest(
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

    let body: z.infer<typeof BodySchema>;
    try {
      body = BodySchema.parse(await request.json());
    } catch {
      return NextResponse.json(
        { error: 'Invalid request', details: 'Send a product name to search.' },
        { status: 400 }
      );
    }

    if (isObviouslyVagueSearchQuery(body.query)) {
      return NextResponse.json(
        {
          error: 'Search too broad',
          code: 'too_vague',
          details:
            'Please include the brand and specific product name (e.g. "Cetaphil Gentle Skin Cleanser", not just "cleanser" or "Cetaphil").',
          examples: [
            'Cetaphil Gentle Skin Cleanser',
            'CeraVe Hydrating Facial Cleanser',
            'Neutrogena Hydro Boost Water Gel',
          ],
        },
        { status: 422 }
      );
    }

    const openai = getOpenAI();
    const resolved = await resolveProductSearch(openai, body.query);

    if (resolved.status === 'too_vague') {
      return NextResponse.json(
        {
          error: 'Search too broad',
          code: 'too_vague',
          details: resolved.message,
          examples: resolved.examples,
        },
        { status: 422 }
      );
    }

    if (resolved.status === 'not_found') {
      return NextResponse.json(
        {
          error: 'Product not found',
          code: 'not_found',
          details: resolved.message,
        },
        { status: 404 }
      );
    }

    if (resolved.status === 'out_of_scope') {
      return NextResponse.json(
        {
          error: 'Product out of scope',
          code: 'out_of_scope',
          details: resolved.message,
        },
        { status: 422 }
      );
    }

    const visionData = searchResultToVision(resolved);
    const analysisResult = await runCatalogAnalysis(openai, visionData, {
      source: 'name_search',
    });

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
        console.error('Failed to save search analysis:', dbError);
      }
    }

    if (guard.incrementOnSuccess) {
      await incrementVisitorScanCount();
    }

    const headers = new Headers();
    headers.set(
      'X-DermaIQ-Catalog-Cache',
      analysisResult.from_catalog_cache ? 'hit' : 'miss'
    );

    return NextResponse.json(analysisResult, { status: 200, headers });
  } catch (error) {
    console.error('Search analysis error:', error);
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
