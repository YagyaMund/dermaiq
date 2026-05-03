import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, VISION_MODEL, TEXT_MODEL } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import {
  SKINCARE_PRODUCT_TYPES,
  VISION_SKINCARE_SYSTEM,
  buildVisionSkincareUserPrompt,
} from '@/lib/prompts/vision-skincare';
import { buildSkincareScoringSystemPrompt } from '@/lib/prompts/scoring-skincare';
import { runSkincareMethodologyDigestStep } from '@/lib/prompts/methodology-step';

// Validation schemas
const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const VisionResultSchema = z.object({
  product_name: z.string(),
  product_type: SkincareProductTypeZ,
  ingredients: z.array(z.string()),
  confidence: z.string(),
  is_skincare: z.boolean(),
});

const IngredientItemSchema = z.object({
  name: z.string(),
  benefit: z.string().optional(),
  concern: z.string().optional(),
  risk_level: z.enum(['green', 'yellow', 'orange', 'red']).optional(),
});

const IngredientCategorySchema = z.object({
  category: z.string(),
  items: z.array(IngredientItemSchema),
});

const HealthierAlternativeSchema = z.object({
  product_name: z.string(),
  brand: z.string(),
  estimated_score: z.number(),
  reason: z.string(),
  image_url: z.string().nullable().optional(),
}).optional();

const ScoringResultSchema = z.object({
  product_name: z.string(),
  product_type: z.string(),
  detected_ingredients: z.array(z.string()),
  score: z.number().min(0).max(100),
  positive_ingredients: z.array(IngredientCategorySchema),
  negative_ingredients: z.array(IngredientCategorySchema),
  verdict: z.string(),
  healthier_alternative: HealthierAlternativeSchema.nullable().optional(),
});

/** Vision + methodology digest + scoring (three model calls). */
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

    // Step 1: Identify product and research its ingredients
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

    // Reject anything that is not in-scope skincare (hair, makeup, drugs, etc.)
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

    // Step 1b: Full methodology digest (must run before final scoring per product policy)
    console.log('Step 1b: Skincare methodology digest (Yuka-aligned reference)...');
    const methodologyDigest = await runSkincareMethodologyDigestStep(openai, {
      product_name: visionData.product_name,
      product_type: visionData.product_type,
      ingredients: visionData.ingredients,
    });

    // Step 2: Analyze ingredients using risk-based scoring (highest-risk ingredient sets range)
    console.log('Step 2: Analyzing ingredients (risk-based scoring)...');
    const ingredientCount = visionData.ingredients.length;

    const scoringSystemPrompt = buildSkincareScoringSystemPrompt();

    const scoringResponse = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: scoringSystemPrompt,
        },
        {
          role: 'user',
          content: `=== METHODOLOGY DIGEST (from prior step — honor this) ===
${methodologyDigest.alignment_summary}
${methodologyDigest.titanium_dioxide_notes ? `\nTitanium dioxide notes: ${methodologyDigest.titanium_dioxide_notes}\n` : ''}
=== END DIGEST ===

Analyze this ${visionData.product_type} product using the risk-based scoring system (score driven by highest-risk ingredient; red < 25, orange < 50, only green/yellow → 50-100):

Product: ${visionData.product_name}
Type: ${visionData.product_type}
Total Ingredient Count: ${ingredientCount}
Full Ingredient List (INCI): ${visionData.ingredients.join(', ')}

You MUST:
1. Classify each ingredient as green/yellow/orange/red based on health and environment risks
2. Determine the score range from the highest-risk ingredient, then set exact score within that range using penalties from other ingredients
3. Group positive ingredients by category with simple names and benefits
4. Group negative ingredients by category with simple names, risk levels, and concerns
5. Write an honest 2-3 sentence verdict for regular consumers
6. If score < 50, suggest a healthier alternative product

Use SIMPLE everyday names (e.g. "Vitamin E" not "Tocopheryl Acetate", "Shea Butter" not "Butyrospermum Parkii").
For negative ingredients, include the technical name in brackets (e.g. "Sulfates [SLS/SLES]").

Return STRICTLY in this JSON format:
{
  "product_name": "${visionData.product_name}",
  "product_type": "${visionData.product_type}",
  "detected_ingredients": ["ingredient1", "ingredient2", ...],
  "score": <number 0-100, calculated using the penalty system>,
  "positive_ingredients": [
    {
      "category": "Moisturizers & Hydrators",
      "items": [
        { "name": "Simple name", "benefit": "Simple explanation", "risk_level": "green" }
      ]
    }
  ],
  "negative_ingredients": [
    {
      "category": "Fragrances & Scents",
      "items": [
        { "name": "Simple name [Technical name]", "concern": "Simple explanation", "risk_level": "orange" }
      ]
    }
  ],
  "verdict": "Honest 2-3 sentence summary",
  "healthier_alternative": ${'{'}
    "product_name": "Full Product Name",
    "brand": "Brand Name",
    "estimated_score": <number>,
    "reason": "Why this is a better choice",
    "image_url": "https://example.com/product-image.jpg" OR null
  ${'}'} OR null if score >= 50
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3500,
    });

    const scoringContent = scoringResponse.choices[0].message.content;
    if (!scoringContent) {
      throw new Error('No response from scoring API');
    }

    let analysisResult: AnalysisResult;
    try {
      const parsed = JSON.parse(scoringContent);
      analysisResult = ScoringResultSchema.parse(parsed);
    } catch (error) {
      console.error('Scoring API parsing error:', error);
      return NextResponse.json(
        {
          error: 'Could not generate product analysis',
          details: 'An error occurred while scoring the ingredients.',
        },
        { status: 500 }
      );
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

    return NextResponse.json(analysisResult, { status: 200 });
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
