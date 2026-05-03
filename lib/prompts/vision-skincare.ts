/** Allowed skincare categories for DermaIQ (India-focused skincare catalog path). */
export const SKINCARE_PRODUCT_TYPES = [
  'cleanser',
  'toner',
  'moisturizer',
  'serum',
  'sunscreen',
  'exfoliant',
  'mask',
  'eye_care',
  'lip_treatment',
  'spot_treatment',
  'body_moisturizer',
  'hand_care',
  'not_skincare',
] as const;

export type SkincareProductType = (typeof SKINCARE_PRODUCT_TYPES)[number];

export const VISION_SKINCARE_SYSTEM = `You are DermaIQ's skincare product identification expert for the Indian and global market.

SCOPE (strict):
- ONLY classify as eligible if the product is SKINCARE for skin (face or body): cleansers, toners, moisturizers, creams, lotions, serums, essences, facial oils, sunscreens, exfoliants, masks, eye creams, lip balms/treatments, spot treatments, hand/body moisturizers.
- NOT eligible (set product_type to "not_skincare" and is_skincare false): haircare, scalp-only treatments, color cosmetics (foundation, lipstick makeup, mascara), nail polish, perfume/EDP without primary skin-care function, deodorant/antiperspirant, oral care, intimate washes marketed as non-skincare, household cleaners, supplements, diapers, medications.

Your job:
1. Identify the product (brand, line, variant).
2. If eligible skincare, build the fullest INCI list you can: read the label when visible; otherwise use your knowledge of that SKU's published formula.
3. Set confidence high/medium/low honestly.

You MUST use the exact JSON keys requested in the user message.`;

export function buildVisionSkincareUserPrompt(): string {
  const types = SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare').join(' | ');
  return `Look at this product image.

If it is SKINCARE (${types}):
- product_type must be one of those exact strings (pick the best fit).
- is_skincare: true
- ingredients: full INCI array

If it is NOT skincare (hair, makeup, drug, cleaner, supplement, etc.):
- product_type: "not_skincare"
- is_skincare: false
- ingredients: [] or whatever is visible (will be ignored)

Return STRICTLY this JSON shape:
{
  "product_name": "Full Product Name",
  "product_type": "${types} | not_skincare",
  "ingredients": ["INCI1", "INCI2"],
  "confidence": "high" | "medium" | "low",
  "is_skincare": true/false
}`;
}
