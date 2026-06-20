/** In-scope product categories for DermaIQ (dermatology / skin & hair personal care). */
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
  'deodorant',
  'shampoo',
  'conditioner',
  'hair_oil',
  'hair_serum',
  'hair_mask',
  'scalp_treatment',
  'not_skincare',
] as const;

export type SkincareProductType = (typeof SKINCARE_PRODUCT_TYPES)[number];

export const VISION_SKINCARE_SYSTEM = `You are DermaIQ's dermatology and personal-care product identification expert for the Indian and global market.

SCOPE — classify as IN SCOPE (is_skincare: true) when the product is for skin, scalp, or hair care, including:
- Face & body skincare: cleansers, toners, moisturizers, creams, lotions, serums, essences, facial oils, sunscreens, exfoliants, masks, eye/lip treatments, spot/acne topicals, hand/body moisturizers.
- Hair & scalp: shampoos, conditioners, hair oils, hair serums, hair masks, scalp serums/treatments, anti-dandruff or growth tonics applied to scalp.
- Essential or botanical oils sold for hair or skin (e.g. rosemary, coconut, argan, tea tree) — use hair_oil when primarily for hair/scalp; use serum when primarily a face/skin treatment oil.
- Deodorants, antiperspirants, underarm roll-ons (product_type "deodorant"), including "odour control" labels.

OUT OF SCOPE (product_type "not_skincare", is_skincare false) — only reject when clearly NOT dermatology/personal care:
- Color cosmetics for makeup only (foundation, lipstick, mascara, blush) with no care function.
- Nail polish, perfume/EDP with no skin/hair care role, oral care, household cleaners, laundry, supplements, Rx medications, diapers, sanitary products, tools/devices without a scoreable formula.

Your job:
1. Identify the exact product (brand, line, variant, size if visible) — even from a partial or angled photo.
2. Read any visible text on front, back, or sides. Indian brands (Mamaearth, Dot & Key, Minimalist, Cetaphil, etc.) and global brands are in scope.
3. Do NOT invent an INCI list in this step — ingredients are filled by a dedicated label read or SKU research step.
4. Set confidence high/medium/low honestly; use medium when brand is clear but variant is uncertain.

You MUST use the exact JSON keys requested in the user message.`;

export function buildVisionSkincareUserPrompt(): string {
  const types = SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare').join(' | ');
  return `Look at this product image.

If it is IN SCOPE for dermatology / skin & hair personal care (${types}):
- product_type must be one of those exact strings (best fit; e.g. Mamaearth Rosemary Essential Oil → hair_oil).
- is_skincare: true
- ingredients: [] (filled in a later step)

If it is OUT OF SCOPE (makeup-only, drugs, cleaners, supplements, etc.):
- product_type: "not_skincare"
- is_skincare: false
- ingredients: [] or whatever is visible (will be ignored)

Return STRICTLY this JSON shape (ingredients will be filled by a separate step — use [] here):
{
  "product_name": "Full Product Name",
  "brand": "Brand name",
  "product_type": "${types} | not_skincare",
  "ingredients": [],
  "confidence": "high" | "medium" | "low",
  "is_skincare": true/false
}`;
}
