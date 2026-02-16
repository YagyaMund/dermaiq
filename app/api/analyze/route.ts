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
});

const IngredientCategorySchema = z.object({
  category: z.string(),
  items: z.array(IngredientItemSchema),
});

const ScoringResultSchema = z.object({
  product_name: z.string(),
  product_type: z.string(),
  detected_ingredients: z.array(z.string()),
  scores: z.object({
    quality: z.number().min(0).max(100),
    safety: z.number().min(0).max(100),
    organic: z.enum(['Organic', 'Synthetic', 'Unknown']),
  }),
  positive_ingredients: z.array(IngredientCategorySchema),
  negative_ingredients: z.array(IngredientCategorySchema),
  verdict: z.string(),
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

    // Step 2: Analyze ingredients using strict European standards
    console.log('Step 2: Analyzing ingredients using European standards...');
    const scoringResponse = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are DermaIQ's European Cosmetic Safety Analyst.

You evaluate cosmetic products using STRICT European Union regulatory standards, specifically:
- EU Cosmetics Regulation (EC) No 1223/2009
- SCCS (Scientific Committee on Consumer Safety) opinions
- EU Annex II (Prohibited Substances list — over 1,600 banned ingredients)
- EU Annex III (Restricted Substances with conditions)
- EU Annex IV-VI (Permitted colorants, preservatives, UV filters with limits)
- CLP Regulation for allergen labeling (26 fragrance allergens that must be declared)

SCORING GUIDE (be strict and consistent):
- 0-20: Very Poor — Contains multiple banned/severely restricted EU substances
- 21-40: Poor — Contains several concerning ingredients (e.g. certain parabens, formaldehyde releasers, strong irritants)
- 41-60: Fair — Contains some synthetic ingredients of concern (sulfates, PEGs, phenoxyethanol, synthetic fragrances) but nothing banned
- 61-80: Good — Mostly clean formula with minimal concerns, few synthetics
- 81-100: Excellent — Very clean, natural/organic formula with no concerning ingredients

Most mass-market international brands (Neutrogena, Nivea, Dove, L'Oreal, etc.) should score 35-55.
Pharmacy/dermatology brands (CeraVe, La Roche-Posay, Bioderma) should score 50-70.
Clean/organic European brands (Weleda, Dr. Hauschka, Pai) should score 75-90.

INGREDIENT GROUPING:
Group positive and negative ingredients into everyday categories that regular people understand:
- Moisturizers & Hydrators
- Vitamins & Antioxidants
- Soothing & Calming Agents
- Natural Extracts & Oils
- Sun Protection
- Skin Repair
- Fragrances & Scents
- Preservatives & Stabilizers
- Harsh Cleansing Agents (Sulfates)
- Synthetic Chemicals
- Potential Allergens
- Silicones & Film Formers
- Colorants & Dyes
- pH Adjusters & Buffers

Use ONLY the categories that apply. Do NOT include empty categories.`,
        },
        {
          role: 'user',
          content: `Analyze this ${visionData.product_type} product using STRICT EU cosmetic safety standards:

Product: ${visionData.product_name}
Type: ${visionData.product_type}
Full Ingredient List (INCI): ${visionData.ingredients.join(', ')}

Provide a thorough analysis with:

1. QUALITY SCORE (0-100): Based on formulation quality, ingredient selection, efficacy. Be strict per EU standards.
2. SAFETY SCORE (0-100): Based on EU safety regulations, irritant potential, allergen risk, endocrine disruption potential.
3. CLASSIFICATION: "Organic" (95%+ natural/organic certified ingredients) or "Synthetic" (contains significant synthetic ingredients). No middle ground — be honest.
4. DETECTED INGREDIENTS: Return the full list of ingredients as detected/researched.
5. POSITIVE INGREDIENTS: Group GOOD ingredients by category. Use SIMPLE everyday names (e.g. "Vitamin E" not "Tocopheryl Acetate", "Shea Butter" not "Butyrospermum Parkii"). Explain benefits in one simple sentence anyone can understand.
6. NEGATIVE INGREDIENTS: Group CONCERNING ingredients by category. Use SIMPLE everyday names with the technical name in brackets if helpful (e.g. "Sulfates [SLS/SLES]"). Explain concerns in one simple sentence — like you're telling a friend why to be careful.
7. VERDICT: 2-3 sentences summarizing the product for a regular consumer. Be honest and direct.

Return STRICTLY in this JSON format:
{
  "product_name": "${visionData.product_name}",
  "product_type": "${visionData.product_type}",
  "detected_ingredients": ["ingredient1", "ingredient2", ...],
  "scores": {
    "quality": <number 0-100>,
    "safety": <number 0-100>,
    "organic": "Organic" | "Synthetic"
  },
  "positive_ingredients": [
    {
      "category": "Moisturizers & Hydrators",
      "items": [
        { "name": "Simple everyday name", "benefit": "Simple one-line explanation" }
      ]
    }
  ],
  "negative_ingredients": [
    {
      "category": "Fragrances & Scents",
      "items": [
        { "name": "Simple name [Technical name]", "concern": "Simple one-line explanation" }
      ]
    }
  ],
  "verdict": "Honest 2-3 sentence summary for regular consumers"
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
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
              qualityScore: analysisResult.scores.quality,
              safetyScore: analysisResult.scores.safety,
              organicType: analysisResult.scores.organic,
              positiveIngredients: JSON.parse(JSON.stringify(analysisResult.positive_ingredients)),
              negativeIngredients: JSON.parse(JSON.stringify(analysisResult.negative_ingredients)),
              verdict: analysisResult.verdict,
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
