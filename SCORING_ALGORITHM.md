# Scoring Algorithm (skincare, Yuka-aligned)

DermaIQ scores **skincare products only** (see vision gate in `app/api/analyze/route.ts`). The numeric model follows the public methodology described in Yuka’s English help articles on cosmetic evaluation and penalties (condensed in `lib/prompts/yuka-skincare-methodology.ts`, with URLs in that file).

## Pipeline order

1. **Vision** — Must output `is_skincare: true` and a `product_type` in the allowed skincare enum; otherwise **422** (no score).
2. **Methodology digest** (LLM, `gpt-5.4-nano`) — Reads the full reference text and writes a short `alignment_summary` (and optional titanium dioxide notes).
3. **Scoring** (LLM, `gpt-5.4-mini`) — System prompt embeds the same reference again (PART A) plus role/output rules (PART B). User message includes the digest from step 2 so the scorer explicitly “sees” the pre-pass.

Database writes (logged-in users) still store one `score` as both quality and safety for compatibility (`prisma.analysis`).

## Risk levels (per ingredient)

| Level         | Dot    | Description |
|---------------|--------|--------------|
| Risk-free     | Green  | No known concerns under current science |
| Low risk      | Yellow | Minor / suspected concerns |
| Moderate risk | Orange | Notable concerns (endocrine, carcinogen suspicion, allergen, irritant, pollutant, etc.) |
| High-risk     | Red    | Strong evidence / severe hazard drivers |

Risks considered include **endocrine disruption**, **carcinogenic**, **allergenic**, **irritant**, **pollutant**, with **precautionary** framing when science is evolving.

## Score bands (0–100)

Driven by the **highest-risk** ingredient:

| Condition                         | Band        | Score range |
|----------------------------------|-------------|-------------|
| Any **RED**                      | Red         | **0–24** (strictly &lt; 25) |
| Highest **ORANGE**, no red       | Orange      | **0–49** (strictly &lt; 50) |
| Only **GREEN** and/or **YELLOW** | Green       | **50–100** |

## Penalties (within the band)

Aligned with Yuka’s penalty article (see reference file):

**Green band only (green + yellow ingredients):**

- −10: potential carcinogen / endocrine concern (yellow-tier suspicion as per reference).
- −7: several of allergen, irritant, other health effect, pollutant.
- −2: only one of allergen, irritant, other health effect, pollutant.

**When orange/red is present** (band already 0–49 or 0–24), further deductions from *other* ingredients include −12 / −8 / −6 / −4 / −3 / −2 per the reference table (highest single penalty per ingredient; no stacking multiple risk types on the same INCI).

**Short INCI lists (about ≤3 ingredients):** apply stricter effective penalties within the band (risky fraction is large).

## Organic label, quantity, special cases

- **Organic / natural claims** do not change the score by themselves; only INCI risk counts.
- **Concentrations** are not inferred from INCI order.
- **Titanium dioxide:** differentiate **nano** (e.g. `[nano]` in INCI), sprays vs creams, oral vs skin-only context per reference.
- **Out of scope** products (cleaners, supplements, diapers, pads, drugs) are excluded before scoring.

## API contract

Unchanged consumer JSON: `score`, `positive_ingredients`, `negative_ingredients`, `verdict`, optional `healthier_alternative`.

## Planned: India top-skincare catalog

Seeding **~10,000** frequently used **skincare** SKUs for India is **not** part of the runtime path yet; when added, each row should be scored with this same pipeline or a batch equivalent.

## UI score labels

UI may still use coarse labels (e.g. Excellent / Good) on the 0–100 scale; align colors with red &lt; 25, orange &lt; 50, green ≥ 50 where possible.
