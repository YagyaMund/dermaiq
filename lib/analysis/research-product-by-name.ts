import type OpenAI from 'openai';
import type { VisionExtractionResult } from '@/types';
import type { SkincareProductType } from '@/lib/prompts/vision-skincare';
import { resolveProductIngredients } from '@/lib/analysis/resolve-product-ingredients';

/**
 * Text-only ingredient research for a known SKU (no product photo).
 */
export async function researchProductByName(
  openai: OpenAI,
  productName: string,
  brand: string,
  productType?: SkincareProductType
): Promise<VisionExtractionResult | null> {
  const researched = await resolveProductIngredients(openai, {
    product_name: productName,
    brand,
    product_type: productType,
  });

  if (!researched) return null;

  return {
    product_name: researched.product_name,
    product_type: researched.product_type,
    ingredients: researched.ingredients,
    confidence: researched.confidence,
    is_skincare: true,
  };
}
