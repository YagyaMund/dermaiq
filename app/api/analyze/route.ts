import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, VISION_MODEL, TEXT_MODEL } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { AnalysisResult, VisionExtractionResult } from '@/types';

// Validation schemas
const VisionResultSchema = z.object({
  product_name: z.string(),
  product_type: z.string(),
  ingredients: z.array(z.string()),
  confidence: z.string(),
  is_cosmetic: z.boolean(),
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

export const maxDuration = 30;

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
          content: `You are DermaIQ's product identification expert.
Your job is to:
1. Identify the product from the image (brand name, product line, variant).
2. Determine if it is a dermatological/cosmetic product (skincare, haircare, body care, sunscreen, lip care, nail care, deodorant, oral hygiene, etc.).
3. If it IS a cosmetic/dermatological product, research its FULL ingredient list from your knowledge base (INCI list). If ingredients are visible on the label, use those. Otherwise, provide the known formulation.
4. If it is NOT a cosmetic/dermatological product (e.g. food, drink, medicine, supplement, cleaning product, electronics), flag it as non-cosmetic.

You MUST accurately classify the product type.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Look at this product image. Identify the product and determine if it's a dermatological/cosmetic product.

If it IS a cosmetic product (skincare, haircare, body care, sunscreen, etc.):
- Provide the full ingredient list (INCI names)
- If ingredients are on the label, read them. If not fully visible, use your knowledge of this product's known formulation.

If it is NOT a cosmetic product (food, beverage, medicine, supplement, household cleaner, etc.):
- Set is_cosmetic to false

Return STRICTLY in this JSON format:
{
  "product_name": "Full Product Name",
  "product_type": "skincare" | "haircare" | "body care" | "sunscreen" | "lip care" | "oral care" | "deodorant" | "nail care" | "fragrance" | "not_cosmetic",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "confidence": "high" | "medium" | "low",
  "is_cosmetic": true/false
}`,
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

    // Reject non-cosmetic products
    if (!visionData.is_cosmetic || visionData.product_type === 'not_cosmetic') {
      return NextResponse.json(
        {
          error: 'This is not a dermatological or cosmetic product',
          details: `DermaIQ only analyzes skincare, haircare, body care, and other cosmetic products. The detected product "${visionData.product_name}" appears to be a non-cosmetic item. Please upload an image of a skincare, haircare, or beauty product.`,
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

    // Step 2: Analyze ingredients using Yuka-style scoring (highest-risk ingredient sets range)
    console.log('Step 2: Analyzing ingredients (Yuka-style scoring)...');
    const ingredientCount = visionData.ingredients.length;

    const scoringResponse = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are DermaIQ's Cosmetic Safety Analyst using a Yuka-style scoring method.

You evaluate cosmetic products by analyzing every ingredient. Based on current science, each ingredient is assigned a risk level according to its potential effects on health or the environment: endocrine disruption, carcinogenic, allergenic, irritant, or pollutant. The potential risks and relevant scientific sources can be referenced in your concern/benefit text.

INGREDIENT RISK CLASSIFICATION (four categories only):
- GREEN (risk-free): No known concerns; safe, beneficial under current science
- YELLOW (low risk): Minor concerns (e.g. mild allergen potential, mild irritant)
- ORANGE (moderate risk): Notable concerns — potential endocrine disruptor, carcinogenic, allergenic, irritant, or pollutant
- RED (high-risk): Hazardous — confirmed endocrine disruptor, known carcinogen, severe allergen, or other serious health/environment risk

SCORING RULES (YOU MUST FOLLOW THIS EXACTLY):

The score is based on the LEVEL OF THE HIGHEST-RISK INGREDIENT in the product.

1) If ANY high-risk (red) ingredient is present:
   → Score must be RED: strictly lower than 25/100 (range 0–24).
   Other ingredients determine the exact score within 0–24 via penalties (e.g. more red/orange/yellow ingredients lower the score further).

2) If the highest-risk ingredient is moderate (orange) — no red present:
   → Score must be lower than 50/100 (range 0–49).
   Other ingredients determine the exact score within 0–49 via penalties.

3) If the highest-risk ingredients are only low (yellow) or risk-free (green):
   → Score is in the green band: 50–100.
   Other ingredients determine the exact score within 50–100 (penalties for yellow/green concerns can reduce the score within this range).

Apply penalties for each ingredient’s risks (endocrine, carcinogenic, allergenic, irritant, pollutant). Use only the highest penalty per ingredient (do not sum multiple penalties for the same ingredient). Ensure the final score never goes below 0 and never exceeds the allowed range (0–24 if any red; 0–49 if any orange but no red; 50–100 if only green/yellow).

INGREDIENT GROUPING:
Group positive and negative ingredients into everyday categories (only include categories that have ingredients):
- Moisturizers & Hydrators
- Vitamins & Antioxidants
- Soothing & Calming Agents
- Natural Extracts & Oils
- Sun Protection
- Skin Repair
- Fragrances & Scents
- Preservatives & Stabilizers
- Harsh Cleansing Agents (Sulfates)
- Potential Allergens
- Silicones & Film Formers
- Colorants & Dyes
- pH Adjusters & Buffers

Do NOT use a "Synthetic Chemicals" category. Skip empty categories.

HEALTHIER ALTERNATIVE:
If the final score is below 50, suggest a healthier alternative product in the same category. The alternative should be a real, widely available product with a cleaner ingredient profile and an estimated score.`,
        },
        {
          role: 'user',
          content: `Analyze this ${visionData.product_type} product using the Yuka-style scoring system (score driven by highest-risk ingredient; red < 25, orange < 50, only green/yellow → 50-100):

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
    "reason": "Why this is a better choice"
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

    const response = NextResponse.json(analysisResult, { status: 200 });

    // Save to database if user is logged in (async, don't block response)
    auth().then(async (session) => {
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
    }).catch((authError) => {
      console.error('Auth check failed:', authError);
    });

    return response;
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
