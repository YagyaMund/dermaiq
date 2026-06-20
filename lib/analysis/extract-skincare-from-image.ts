import type OpenAI from 'openai';
import type { VisionExtractionResult } from '@/types';
import { identifyProductFromImage } from '@/lib/analysis/identify-product-from-image';
import { readInciLabelFromImage } from '@/lib/analysis/read-inci-label-from-image';
import { resolveProductIngredients } from '@/lib/analysis/resolve-product-ingredients';
import { resolveProductIngredientsFromImage } from '@/lib/analysis/resolve-product-ingredients-from-image';
import { isPlausibleInciList } from '@/lib/analysis/normalize-inci';

function toVisionResult(params: {
  product_name: string;
  product_type: string;
  ingredients: string[];
  confidence: string;
  source: VisionExtractionResult['ingredient_source'];
}): VisionExtractionResult {
  return {
    product_name: params.product_name,
    product_type: params.product_type,
    ingredients: params.ingredients,
    confidence: params.confidence,
    is_skincare: true,
    ingredient_source: params.source,
  };
}

function inferBrand(productName: string, brand?: string): string {
  if (brand?.trim()) return brand.trim();
  return productName.split(/\s+/)[0] ?? '';
}

/**
 * Image scan: identify SKU → label OCR → text INCI research → combined vision fallback.
 */
export async function extractSkincareFromImage(
  openai: OpenAI,
  imageUrl: string
): Promise<VisionExtractionResult | null> {
  const identified = await identifyProductFromImage(openai, imageUrl);

  if (identified) {
    if (!identified.is_skincare || identified.product_type === 'not_skincare') {
      return {
        product_name: identified.product_name,
        product_type: 'not_skincare',
        ingredients: [],
        confidence: identified.confidence,
        is_skincare: false,
      };
    }

    const brand = inferBrand(identified.product_name, identified.brand);
    const labelRead = await readInciLabelFromImage(
      openai,
      imageUrl,
      `${brand} ${identified.product_name}`
    );

    if (labelRead) {
      console.log(
        'Ingredient resolution (label OCR):',
        labelRead.ingredients.length,
        labelRead.confidence
      );
    }

    const researched = await resolveProductIngredients(openai, {
      product_name: identified.product_name,
      brand,
      product_type: identified.product_type,
      label_ingredients: labelRead?.ingredients,
    });

    if (researched && isPlausibleInciList(researched.ingredients)) {
      console.log(
        'Ingredient resolution (identify + research):',
        researched.source,
        researched.ingredients.length
      );
      return toVisionResult({
        product_name: researched.product_name,
        product_type: researched.product_type,
        ingredients: researched.ingredients,
        confidence: researched.confidence,
        source: researched.source,
      });
    }

    if (labelRead && isPlausibleInciList(labelRead.ingredients)) {
      console.log('Ingredient resolution (label OCR only):', labelRead.ingredients.length);
      return toVisionResult({
        product_name: identified.product_name,
        product_type: identified.product_type,
        ingredients: labelRead.ingredients,
        confidence: labelRead.confidence,
        source: 'label',
      });
    }
  }

  console.log('Identify/research path incomplete; trying combined image INCI call');

  const fromImage = await resolveProductIngredientsFromImage(openai, imageUrl);

  if (fromImage) {
    if (!fromImage.is_skincare) {
      return {
        product_name: fromImage.product_name,
        product_type: 'not_skincare',
        ingredients: [],
        confidence: fromImage.confidence,
        is_skincare: false,
      };
    }

    if (isPlausibleInciList(fromImage.ingredients)) {
      console.log(
        'Ingredient resolution (combined image):',
        fromImage.source,
        fromImage.ingredients.length
      );
      return toVisionResult({
        product_name: fromImage.product_name,
        product_type: fromImage.product_type,
        ingredients: fromImage.ingredients,
        confidence: fromImage.confidence,
        source: fromImage.source,
      });
    }

    if (identified?.is_skincare && identified.product_type !== 'not_skincare') {
      const brand = inferBrand(identified.product_name, identified.brand);
      const retry = await resolveProductIngredients(openai, {
        product_name: fromImage.product_name || identified.product_name,
        brand: fromImage.product_name ? inferBrand(fromImage.product_name) : brand,
        product_type: fromImage.product_type ?? identified.product_type,
        label_ingredients: fromImage.ingredients.length > 0 ? fromImage.ingredients : undefined,
      });

      if (retry && isPlausibleInciList(retry.ingredients)) {
        console.log('Ingredient resolution (retry after partial image):', retry.ingredients.length);
        return toVisionResult({
          product_name: retry.product_name,
          product_type: retry.product_type,
          ingredients: retry.ingredients,
          confidence: retry.confidence,
          source: retry.source,
        });
      }
    }
  }

  if (identified?.is_skincare && identified.product_type !== 'not_skincare') {
    console.log('Product identified but no reliable INCI:', identified.product_name);
  }

  return null;
}
