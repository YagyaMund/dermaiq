/**
 * Condensed methodology aligned with Yuka’s public English help articles on
 * cosmetic evaluation, penalties, sources, organic labeling, quantity,
 * titanium dioxide, and unrated product categories.
 *
 * Sources (read-only reference for the model; DermaIQ is independent):
 * - https://help.yuka.io/l/en/article/2t20ixn5y5-evualuation-cosmetic-products
 * - https://help.yuka.io/l/en/article/ih5pet4ffc-how-are-penalties-calculated-in-the-cosmetic-product-scores
 * - https://help.yuka.io/l/en/article/qn7duow8xh-on-which-sources-does-yuka-base-their-analyses
 * - https://help.yuka.io/l/en/article/u2mhw6abwg-is-organic-labeling-taken-into-account-in-the-rating-of-cosmetic-products
 * - https://help.yuka.io/l/en/article/pp8zrhvg4x-quantity-of-each-ingredient-in-a-formula
 * - https://help.yuka.io/l/en/article/ydsi07q2n1-titanium-dioxide
 * - https://help.yuka.io/l/en/article/3dah3aamac-non-rated-cometic-products
 * - https://help.yuka.io/l/en/article/3kdehn4bnk-risk-level-changes-cosmetic-ingredients
 */

export const YUKA_SKINCARE_METHODOLOGY_REFERENCE = `
REFERENCE: SKINCARE / COSMETIC SCORING (Yuka-aligned methodology for DermaIQ)

1) HOW PRODUCTS ARE EVALUATED
- Analyze every ingredient in the INCI list.
- Assign each ingredient a risk level from current science for health and environment:
  endocrine disruption, carcinogenic, allergenic, irritant, pollutant.
- Four risk levels only: GREEN (risk-free), YELLOW (low risk), ORANGE (moderate), RED (high-risk).
- Overall score is driven by the HIGHEST-RISK ingredient present (MANDATORY — no exceptions):
  • Any RED ingredient → final score 0–24 only.
  • Highest is ORANGE and no RED → final score 25–49 only.
  • ONLY GREEN and/or YELLOW (no orange, no red anywhere) → final score 50–100 only. Never below 50.

RIGID OUTPUT RULES (DermaIQ):
- List GREEN and YELLOW ingredients under positive_ingredients only.
- List ORANGE and RED ingredients under negative_ingredients only.
- If negative_ingredients is empty, the score MUST be 50–100 and healthier_alternative MUST be null.
- Do NOT label a product "Poor" or score below 50 when every ingredient is green or yellow.
- YELLOW = low risk, not "bad"; do not treat yellow as orange.

2) PENALTIES (apply within the band determined above)
When only GREEN and/or YELLOW ingredients (green band 50–100 — start from 100 and subtract, floor 50):
  • −10 points max per ingredient: potential carcinogenic OR endocrine-disruptor at yellow level.
  • −7 points max per ingredient: several of allergen, irritant, other health effect, pollutant at yellow level.
  • −2 points max per ingredient: only ONE of allergen, irritant, other health effect, pollutant at yellow level.
  • Apply the single highest penalty per ingredient only (do not stack).
  • Typical products with a few yellow flags and no orange/red should land roughly 65–92, not the 40s.
When ORANGE or RED is present (band already fixed to 0–49 or 0–24), subtract additional points from other ingredients within that band:
  • −12: RED carcinogen or endocrine disruptor.
  • −8: RED allergen, irritant, other health effect, or pollutant.
  • −6: ORANGE potential carcinogen or endocrine disruptor.
  • −4: ORANGE allergen, irritant, other health effect, or pollutant.
  • −3: YELLOW potential carcinogen or endocrine disruptor (when still in orange/red band context).
  • −2: YELLOW allergen, irritant, other health effect, or pollutant.
If one ingredient has several risks, apply only the SINGLE highest applicable penalty for that ingredient (do not stack multiple risk-type penalties for the same INCI entry).
Very short INCI lists (about 3 ingredients or fewer): apply slightly stricter penalties within the allowed band, but if all ingredients are only green/yellow the score must still remain 50–100.

3) SOURCES & EVIDENCE (reflect in concern text, briefly)
Weight opinions of SCCS, ECHA, US EPA, AICIS, ANSES, IARC; then independent research tiered by evidence quality
(systematic reviews > cohort > case-control > animal > in vitro > expert opinion). Use Klimisch-style judgment for study quality.
International hazard lists (e.g. SIN, TEDX, ED lists, ECHA, PubChem, Skin Deep–style references) may inform suspicion levels.
Precautionary principle: flag plausible risks even when regulatory limits exist for cosmetic use.

4) ORGANIC LABELING
Do NOT upgrade or downgrade the numeric score because of organic/natural/eco labels alone. Organic ranges already tend to omit controversial substances; reflect that only through actual INCI risk, not the label claim.

5) QUANTITY IN FORMULA
Do NOT infer a numeric score change from guessed concentrations. INCI order is not a reliable dose.
Assume cumulative real-world exposure may matter for ubiquitous ingredients; reflect via risk level and penalties, not invented percentages.

6) TITANIUM DIOXIDE (special handling)
- If INCI lists "Titanium Dioxide [nano]" or clear nano UV filter context: treat as more controversial (nano); for spray/aerosol inhalation contexts use elevated concern (orange/red band drivers as appropriate).
- Non-nano: higher concern when ingestion/inhalation plausible (e.g. oral care, sprays, loose powders); for typical leave-on skin creams where inhalation/ingestion is not plausible, prefer YELLOW-level concern unless stronger evidence cited.
- Align verdict and ingredient narrative with nano vs non-nano and product form (spray vs cream vs lip).

7) UNRATED CATEGORIES (reject earlier in pipeline — not dermatology personal care)
Household cleaning concentrates, nutritional supplements, diapers, sanitary pads/tampons, prescription medications, makeup-only color cosmetics without care function. Skin, scalp, and hair personal care (including shampoos, hair oils, scalp treatments) are IN scope.

8) RISK RECAP / INGREDIENT UPDATES
Scientific consensus and regulatory context evolve; when classifying ingredients, prefer recent SCCS/EFSA/ECHA positions. Known re-classifications (e.g. UV filters, PFAS-related polymers, certain fragrances) should use current moderate/high caution where literature supports it.

END REFERENCE
`.trim();
