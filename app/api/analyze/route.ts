import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, VISION_MODEL, TEXT_MODEL } from '@/lib/openai';
import { z } from 'zod';
import type { AnalysisResult, VisionExtractionResult } from '@/types';

// Validation schemas
const VisionResultSchema = z.object({
  product_name: z.string(),
  ingredients: z.array(z.string()),
  confidence: z.string(),
});

const ScoringResultSchema = z.object({
  product_name: z.string(),
  scores: z.object({
    quality: z.number().min(0).max(100),
    safety: z.number().min(0).max(100),
    organic: z.enum(['Organic', 'Mixed', 'Inorganic', 'Unknown']),
  }),
  positive_ingredients: z.array(z.object({
    name: z.string(),
    benefit: z.string(),
  })),
  negative_ingredients: z.array(z.object({
    name: z.string(),
    concern: z.string(),
  })),
  verdict: z.string(),
});

export const maxDuration = 30; // Vercel serverless function timeout

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (JPEG or PNG)' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: 'Image size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const imageUrl = `data:${image.type};base64,${base64Image}`;

    // Step 1: Extract product info using Vision API
    console.log('Step 1: Identifying product and researching ingredients...');
    const openai = getOpenAI();
    const visionResponse = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a European cosmetic safety expert for DermaIQ.
Your job is to identify products from images and research their complete ingredient formulations using your knowledge base.
Focus on EU cosmetic regulations and safety standards (more stringent than US FDA).`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Identify this skincare/cosmetic product from the image.
Once identified, provide the complete ingredient list based on your knowledge of this product's formulation.
If you can see ingredients on the label, use those. If not clearly visible, provide the known formulation for this product.

IMPORTANT: Use EU/European cosmetic standards and regulations (stricter than US).
Pay special attention to:
- Ingredients banned or restricted in the EU
- Endocrine disruptors
- Potential allergens and sensitizers
- Controversial preservatives (parabens, phenoxyethanol)
- Synthetic fragrances and colorants
- PEG compounds and sulfates

Return output strictly in this JSON format:
{
  "product_name": "Product Name",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "confidence": "high/medium/low"
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
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

    // Parse and validate vision response
    let visionData: VisionExtractionResult;
    try {
      const parsed = JSON.parse(visionContent);
      visionData = VisionResultSchema.parse(parsed);
    } catch (error) {
      console.error('Vision API parsing error:', error);
      return NextResponse.json(
        {
          error: 'Could not parse product information from image',
          details: 'The image may not contain a clear product label with ingredients.',
        },
        { status: 422 }
      );
    }

    // Check if ingredients were found
    if (visionData.ingredients.length === 0) {
      return NextResponse.json(
        {
          error: 'Ingredients could not be confidently identified',
          details: 'Please ensure the product label with ingredients list is clearly visible.',
        },
        { status: 422 }
      );
    }

    // Step 2: Analyze ingredients and generate scores
    console.log('Step 2: Analyzing ingredients using European standards...');
    const scoringResponse = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a European cosmetic safety evaluator for DermaIQ.
You analyze skincare products using STRICT EU/European standards (much stricter than US FDA standards).
Consider EU cosmetic regulations, which ban/restrict many ingredients allowed in the US.

CRITICAL: Apply STRICT European standards. Products like Neutrogena typically score LOW (40-60) due to:
- Synthetic preservatives (parabens, phenoxyethanol)
- Sulfates (SLS, SLES)
- PEG compounds
- Synthetic fragrances
- Endocrine disruptors

Only truly clean, natural European brands should score above 75.`,
        },
        {
          role: 'user',
          content: `Analyze this product using STRICT European cosmetic standards:

Product: ${visionData.product_name}
Ingredients: ${visionData.ingredients.join(', ')}

Provide analysis with:
1. Quality Score (0-100): STRICT European standards. Most mass-market products score 40-65. Only clean European brands score 75+
2. Safety Score (0-100): Based on EU regulations, potential irritants, allergens, endocrine disruptors
3. Organic Classification: Organic (95%+ natural), Mixed (some synthetic), Inorganic (mostly synthetic)
4. Positive Ingredients: List BENEFICIAL ingredients with SIMPLE EVERYDAY names and explanations for regular people (avoid technical jargon)
5. Negative Ingredients: List HARMFUL/CONCERNING ingredients with SIMPLE EVERYDAY names and explanations anyone can understand (avoid technical terms)
6. Overall Verdict: Simple 2-3 sentence summary for average consumers

IMPORTANT FOR INGREDIENT NAMES:
- Use common/everyday names people recognize (e.g., "Vitamin C" instead of "Ascorbic Acid")
- If technical name is needed, add common name in parentheses (e.g., "Parabens (Preservatives)")
- Keep explanations very simple, like explaining to a friend

BE STRICT: If product contains parabens, sulfates, synthetic fragrances, phenoxyethanol, or PEG compounds, score should be below 70.

Return in JSON:
{
  "product_name": "${visionData.product_name}",
  "scores": {
    "quality": number (0-100, be strict!),
    "safety": number (0-100),
    "organic": "Organic" | "Mixed" | "Inorganic"
  },
  "positive_ingredients": [
    {"name": "Simple everyday name", "benefit": "simple one-line explanation why it's good"}
  ],
  "negative_ingredients": [
    {"name": "Simple everyday name (technical name if needed)", "concern": "simple one-line explanation why you should be careful"}
  ],
  "verdict": "simple overall assessment"
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const scoringContent = scoringResponse.choices[0].message.content;
    if (!scoringContent) {
      throw new Error('No response from scoring API');
    }

    // Parse and validate scoring response
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

    // Return the complete analysis
    return NextResponse.json(analysisResult, { status: 200 });

  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Analysis failed',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: 'Please try again later.',
      },
      { status: 500 }
    );
  }
}
