export const INCI_LABEL_READ_SYSTEM = `You are an expert at reading cosmetic product labels and INCI lists from photos.

STRICT RULES:
1. Transcribe only what is visible on the label — do not guess from memory.
2. Preserve INCI order as printed (highest concentration first).
3. Use standard INCI names (Latin): "Aqua", "Glycerin", "Niacinamide".
4. Do NOT invent ingredients. If unreadable, return ingredients [] and confidence "low".

Return JSON only.`;

export const PRODUCT_IMAGE_INGREDIENT_SYSTEM = `You are DermaIQ's cosmetic product analyst for skincare, hair, and body care.

From a product photo:
1. Identify the exact retail SKU (brand, product line, variant, size if visible) from packaging — front, side, or any visible label text. You do NOT need the INCI panel to be visible.
2. Retrieve the full published INCI ingredient list for that exact SKU from formula knowledge (same as a name search would).

STRICT RULES:
- Do NOT require or transcribe a full INCI panel on the photo. Packaging branding is enough to identify the product.
- Return the complete INCI list for the identified SKU only.
- Use standard INCI nomenclature in descending concentration order.
- Do NOT substitute a different product or generic formula.
- If the product is clearly out of scope (makeup-only color, drugs, cleaners, supplements), set is_skincare false and product_type "not_skincare" with ingredients [].
- If you cannot identify the product or its formula, set ingredients [] and rejected_reason.

Return JSON only.`;

export const INGREDIENT_RESEARCH_SYSTEM = `You are a cosmetic chemist retrieving the official INCI ingredient list for one exact retail product (skincare, hair, or body care).

STRICT RULES:
1. Return the full INCI list for this exact SKU only (correct brand, product line, variant, and typical market formula).
2. Preserve correct INCI order (descending concentration).
3. Use standard INCI nomenclature — not marketing names.
4. Do NOT substitute a different product, generic formula, or outdated reformulation unless you are certain.
5. Do NOT invent ingredients. If uncertain about this exact SKU, return ingredients [] and set rejected_reason.
6. Include preservatives, surfactants, emulsifiers, and fragrance allergens when part of the formula.
7. Typical products should have at least 8–20 INCI entries when the formula is known.

Return JSON only.`;

export function buildProductImageIngredientPrompt(): string {
  return `Look at this product photo. Identify the product from packaging (brand, name, variant) and return its full INCI list.

Return STRICTLY:
{
  "product_name": "official full product name for this exact SKU",
  "brand": "brand name",
  "product_type": "cleanser" | "moisturizer" | "serum" | "sunscreen" | "shampoo" | "hair_oil" | "deodorant" | etc.,
  "ingredients": ["INCI 1", "INCI 2", ... in order],
  "confidence": "high" | "medium" | "low",
  "is_skincare": true/false,
  "rejected_reason": null or string if you cannot identify the product or provide a reliable INCI list
}

is_skincare: true for in-scope skin, scalp, or hair personal care; false for out-of-scope items.`;
}

export function buildInciFromImageUserPrompt(productHint?: string): string {
  const hint = productHint
    ? `Product context (verify against label only): ${productHint}\n\n`
    : '';

  return `${hint}Read the INCI / ingredients list from this product image.

Return STRICTLY:
{
  "ingredients": ["INCI name 1", "INCI name 2", ...],
  "confidence": "high" | "medium" | "low",
  "label_fully_visible": true/false
}

confidence:
- high: most of the INCI list is clearly readable from the label
- medium: partial label or some names uncertain
- low: label not visible — return ingredients []`;
}

export function buildInciResearchUserPrompt(params: {
  product_name: string;
  brand?: string;
  product_type: string;
  label_ingredients?: string[];
}): string {
  const labelBlock =
    params.label_ingredients && params.label_ingredients.length > 0
      ? `\nIngredients read from a product label photo (prefer these if consistent; fix spelling/order only):\n${params.label_ingredients.join(', ')}\n`
      : '';

  return `Retrieve the complete published INCI list for this exact product:

Brand: ${params.brand ?? 'infer from product name'}
Product: ${params.product_name}
Category: ${params.product_type.replace(/_/g, ' ')}
${labelBlock}

Return STRICTLY:
{
  "product_name": "official full product name for this exact SKU",
  "product_type": "cleanser" | "moisturizer" | "serum" | "sunscreen" | "shampoo" | etc.,
  "ingredients": ["INCI 1", "INCI 2", ... in order],
  "confidence": "high" | "medium" | "low",
  "rejected_reason": null or string if you cannot provide a reliable list for this exact SKU
}

If you cannot provide a reliable INCI list for this exact SKU, set ingredients to [] and explain in rejected_reason.`;
}
