/** Shared evaluation lens for all DermaIQ product scores. */
export const REGULAR_SKIN_EVALUATION_CONTEXT = `
EVALUATION CONTEXT — REGULAR SKIN ONLY (mandatory):
- Score for a typical healthy adult with normal, non-sensitive facial or body skin.
- Do NOT score as if the user has eczema, rosacea, contact dermatitis, or baby/sensitive skin unless the product is marketed exclusively for those conditions.
- Cosmetic ingredients used within normal regulatory limits should not be escalated to ORANGE/RED solely because rare sensitive individuals might react.
- Mild preservatives (e.g. phenoxyethanol), common emollients (glycerin, petrolatum, cetyl alcohol), and gentle rinse-off surfactants in cleansers are typically GREEN or YELLOW for regular skin, not ORANGE/RED.
- Widely used dermatologic drugstore lines (e.g. Cetaphil Gentle Skin Cleanser, CeraVe Hydrating Cleanser, simple fragrance-free moisturizers) with mostly mild INCI should usually score Good (60–80) or Excellent (80+), not Poor or Very Poor.
`.trim();
