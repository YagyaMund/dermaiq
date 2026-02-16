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

    // Step 2: Analyze ingredients using strict European standards with penalty-based scoring
    console.log('Step 2: Analyzing ingredients using European standards...');
    const ingredientCount = visionData.ingredients.length;
    const isLowIngredientProduct = ingredientCount <= 3;

    const scoringResponse = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are DermaIQ's European Cosmetic Safety Analyst.

You evaluate cosmetic products using STRICT European Union regulatory standards:
- EU Cosmetics Regulation (EC) No 1223/2009
- SCCS (Scientific Committee on Consumer Safety) opinions
- EU Annex II (Prohibited Substances — 1,600+ banned ingredients)
- EU Annex III (Restricted Substances with conditions)
- EU Annex IV-VI (Permitted colorants, preservatives, UV filters with limits)
- CLP Regulation for allergen labeling (26 fragrance allergens)

INGREDIENT RISK CLASSIFICATION:
Classify each ingredient into one of 4 risk levels:
- GREEN (risk-free): Safe, beneficial, no known concerns under EU standards
- YELLOW (low risk): Generally safe but has minor concerns (e.g., mild allergen potential, mild irritant)
- ORANGE (moderate risk): Notable concerns — restricted in EU, potential sensitizer, controversial preservative, PEGs, certain parabens, synthetic fragrances
- RED (hazardous): Banned or severely restricted in EU, known carcinogen, confirmed endocrine disruptor, formaldehyde releaser

PENALTY-BASED SCORING SYSTEM (YOU MUST FOLLOW THIS EXACTLY):

Start from 100 points.

CASE 1 — Product contains ONLY green and yellow ingredients (no orange or red):
The score floor is 50 (score cannot go below 50).
Apply these penalties per ingredient:
  • -10 points if the ingredient is potentially carcinogenic or an endocrine disruptor
  • -7 points if the ingredient has MULTIPLE risks (e.g., allergen + irritant, or irritant + pollutant)
  • -2 points if the ingredient has only ONE risk (allergen OR irritant OR other health effect OR pollutant)

CASE 2 — Product contains orange or red ingredients:
The CEILING is determined by the worst ingredient:
  • If ANY red (hazardous) ingredient exists → score ceiling is 24 (score range: 0-24)
  • If no red but ANY orange (moderate risk) exists → score ceiling is 49 (score range: 0-49)

Then apply penalties per ingredient:
  • -12 pts for a RED carcinogen or endocrine disruptor
  • -8 pts for a RED allergen, irritant, other health effect, or pollutant
  • -6 pts for an ORANGE carcinogen or endocrine disruptor
  • -4 pts for an ORANGE allergen, irritant, other health effect, or pollutant
  • -3 pts for a YELLOW carcinogen or endocrine disruptor
  • -2 pts for a YELLOW allergen, irritant, other health effect, or pollutant
If an ingredient has multiple risks, apply ONLY the highest penalty (not cumulative).

SPECIAL RULE — Few ingredients (3 or fewer total):
If the product has 3 or fewer ingredients, the penalties are MORE SEVERE because each risky ingredient represents a larger share. Multiply all penalties by 1.5x.

Score cannot go below 0.

INGREDIENT GROUPING:
Group positive and negative ingredients into everyday categories:
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

Only include categories that have ingredients. Skip empty categories.

HEALTHIER ALTERNATIVE:
If the final score is below 50, you MUST suggest a healthier alternative product in the same category (e.g., if analyzing a moisturizer, suggest a healthier moisturizer). The alternative should:
- Be a real, widely available product
- Have a cleaner ingredient profile
- Be in a similar price range if possible
- Provide an estimated score based on its known ingredients`,
        },
        {
          role: 'user',
          content: `Analyze this ${visionData.product_type} product using the PENALTY-BASED EU scoring system:

Product: ${visionData.product_name}
Type: ${visionData.product_type}
Total Ingredient Count: ${ingredientCount}${isLowIngredientProduct ? ' (FEW INGREDIENTS — apply 1.5x penalty multiplier)' : ''}
Full Ingredient List (INCI): ${visionData.ingredients.join(', ')}

You MUST:
1. Classify each ingredient as green/yellow/orange/red
2. Calculate the score using the exact penalty system described
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
