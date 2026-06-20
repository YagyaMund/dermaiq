import { SKINCARE_PRODUCT_TYPES } from './vision-skincare';

export const PRODUCT_SEARCH_SYSTEM = `You are DermaIQ's product search resolver for skincare, hair, and body care (India + global market).

Your job: map a user's search text to the SINGLE most relevant real retail SKU — the product they most likely mean.

RELEVANCE RANKING (apply in order):
1. Brand match — if the query names or clearly implies a brand (Cetaphil, Mamaearth, Minimalist, Dot & Key, CeraVe, Neutrogena, etc.), the SKU must be from that brand.
2. Product line / variant match — honour keywords in the query (Onion, Vitamin C, Gentle, Hydrating, SPF 50, Anti-dandruff). Do NOT swap to a different variant when the query specifies one.
3. Category fit — cleanser vs shampoo vs serum vs sunscreen must match words in the query (cleanser, face wash, shampoo, serum, sunscreen, moisturizer, etc.).
4. Popularity tiebreaker — when the query is brand + category only (e.g. "mamaearth shampoo"), pick that brand's best-known / flagship SKU in that category in India.
5. Spelling tolerance — fix obvious typos (cetaphil, mama earth, minimalist vit c).

Always prefer status "found" with the best relevant SKU over "not_found" when intent is reasonably clear.

Match types:
- "exact": query names this specific SKU (or trivial spelling/format difference).
- "best_match": query is partial but one SKU is clearly the most relevant (explain briefly in match_note).

Use "too_vague" ONLY when many unrelated products fit equally with no brand or distinguishing keyword.
Use "not_found" ONLY when nothing in-scope plausibly matches.
Use "out_of_scope" for makeup-only, drugs, supplements, cleaners, etc.

Return JSON only. Do NOT include ingredients.`;

export function buildProductSearchUserPrompt(query: string): string {
  const types = SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare').join(' | ');

  return `Search query: "${query.trim()}"

Step 1 — Parse the query: brand (if any), product type/category, variant keywords (e.g. onion, gentle, spf), market (default India if unclear).
Step 2 — Mentally list 2–3 candidate SKUs that could match.
Step 3 — Pick the ONE most relevant SKU using the ranking rules (brand > variant > category > popularity).
Step 4 — Return that SKU with honest confidence and a short match_note when match_type is "best_match".

Examples of most relevant picks:
- "cetaphil cleanser" → Cetaphil Gentle Skin Cleanser (flagship cleanser)
- "mamaearth onion shampoo" → Mamaearth Onion Shampoo (not onion oil or face wash)
- "minimalist vit c serum" → Minimalist Vitamin C 10% Serum (closest line to query)
- "neutrogena sunscreen" → Neutrogena UltraSheer or their most widely sold SPF product in India

product_type must be one of: ${types}

Return ONE of:
{ "status": "found", "product_name": "full official SKU name", "brand": "...", "product_type": "...", "confidence": "high"|"medium"|"low", "is_skincare": true, "match_type": "exact"|"best_match", "match_note": "why this is the most relevant match" }
{ "status": "too_vague", "message": "...", "examples": ["more specific query 1", "..."] }
{ "status": "not_found", "message": "..." }
{ "status": "out_of_scope", "message": "..." }`;
}
