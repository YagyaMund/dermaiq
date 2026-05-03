# OpenAI Prompts Reference

DermaIQ uses **skincare-only** analysis with a **Yuka-aligned** public methodology (see `lib/prompts/yuka-skincare-methodology.ts` for the full reference text and source URLs). Prompts are implemented in code; this file mirrors them for review and tuning.

## Pipeline overview

1. **Vision (Step 1)** — `VISION_MODEL` (`gpt-4o`): identify product, restrict to **skincare** categories, output INCI list.  
   Code: `lib/prompts/vision-skincare.ts` + `app/api/analyze/route.ts`
2. **Methodology digest (Step 1b)** — `METHODOLOGY_DIGEST_MODEL` (`gpt-4o-mini`): read the full reference block and emit a short alignment summary **before** scoring.  
   Code: `lib/prompts/methodology-step.ts`
3. **Scoring (Step 2)** — `TEXT_MODEL` (`gpt-4o`): risk dots, bands, penalties, grouping, JSON result. System prompt = reference + role/output rules.  
   Code: `lib/prompts/scoring-skincare.ts` + `app/api/analyze/route.ts`

Non-skincare products are rejected with HTTP 422 (no scoring).

---

## Step 1 — Vision (product image → INCI)

**System prompt:** `VISION_SKINCARE_SYSTEM` in `lib/prompts/vision-skincare.ts`

Summary:

- Expert for **skincare only** (cleansers, toners, moisturizers, serums, sunscreens, exfoliants, masks, eye/lip treatments, spot treatments, hand/body moisturizers).
- Reject haircare, color cosmetics, nail, fragrance-only, deodorant, oral care, cleaners, supplements, drugs, diapers, etc. as `not_skincare`.

**User prompt:** `buildVisionSkincareUserPrompt()`

**JSON shape (strict):**

```json
{
  "product_name": "string",
  "product_type": "cleanser | toner | moisturizer | serum | sunscreen | exfoliant | mask | eye_care | lip_treatment | spot_treatment | body_moisturizer | hand_care | not_skincare",
  "ingredients": ["INCI", "..."],
  "confidence": "high | medium | low",
  "is_skincare": true
}
```

**Model:** `gpt-4o` (vision)  
**API:** `response_format: { type: 'json_object' }`, `max_tokens: 1500`

---

## Step 1b — Methodology digest (reference → alignment text)

**System prompt:** In `lib/prompts/methodology-step.ts` — clerk role; must read user `REFERENCE` block; output JSON only.

**User message:** Full `YUKA_SKINCARE_METHODOLOGY_REFERENCE` plus a JSON snapshot of `product_name`, `product_type`, `ingredient_count`, `ingredients_inci` (first 80 INCI strings).

**JSON output:**

```json
{
  "alignment_summary": "string (max ~2500 chars)",
  "titanium_dioxide_notes": "optional string"
}
```

**Model:** `gpt-4o-mini` (`METHODOLOGY_DIGEST_MODEL` in `lib/openai.ts`)  
**Purpose:** Ensures the long methodology document is **processed in a separate call** before the final scorer; the digest is injected into the scoring user message.

---

## Step 2 — Scoring (INCI → score + categories)

**System prompt:** `buildSkincareScoringSystemPrompt()` = **PART A** (full `YUKA_SKINCARE_METHODOLOGY_REFERENCE`) + **PART B** (`SCORING_SKINCARE_ROLE_AND_OUTPUT` in `lib/prompts/scoring-skincare.ts`).

Summary of PART B:

- Analyst applies PART A literally (bands, penalties, organic/quantity rules, titanium dioxide logic, precautionary principle).
- Four dots: GREEN / YELLOW / ORANGE / RED.
- Ingredient categories (Moisturizers & Hydrators, …) and healthier alternative if score &lt; 50.

**User prompt (constructed in route):** Starts with `=== METHODOLOGY DIGEST ===` (from Step 1b), then product name, type, ingredient count, full INCI list, and the same JSON schema as before (`score`, `positive_ingredients`, `negative_ingredients`, `verdict`, `healthier_alternative`).

**Model:** `gpt-4o`  
**API:** `response_format: { type: 'json_object' }`, `max_tokens: 3500`

---

## Legacy note

Earlier versions of this repo described a separate “quality + safety + organic” JSON; the live API now uses a **single** 0–100 score and Yuka-style risk bands. Ignore old JSON examples in archived docs if they conflict with `app/api/analyze/route.ts`.

---

## Future: curated product catalog (not implemented here)

A planned job may seed **~10,000 popular skincare SKUs in India** with scores for faster lookup; that will reuse this same methodology and is **separate** from the real-time image pipeline.

---

## Version history

- **v2.0** (2026-05-03): Skincare-only vision gate; Yuka-aligned reference text; methodology digest step before scoring; prompts split under `lib/prompts/`.
- **v1.0**: Initial vision + scoring in route.

For prompt updates, change `lib/prompts/*` and keep this file in sync.
