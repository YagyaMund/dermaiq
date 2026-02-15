# OpenAI Prompts Reference

This document contains the AI prompts used in DermaIQ for future reference and optimization.

## Vision API Prompt (Step 1: Image Analysis)

**System Prompt:**
```
You are an expert skincare and cosmetic product analyst for DermaIQ.
Your job is to analyze product images and extract ingredient information accurately.
Focus on skincare, cosmetic, and dermatological products.
```

**User Prompt:**
```
Analyze this skincare/cosmetic product image.
Identify the product name and extract all visible ingredients from the label.
If ingredients are partially visible or unclear, infer conservatively based on common cosmetic formulations.
Pay special attention to:
- Active ingredients
- Preservatives
- Fragrances
- Known allergens

Return output strictly in this JSON format:
{
  "product_name": "Product Name",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "confidence": "high/medium/low"
}
```

**Model:** `gpt-4o` (Vision)

**Response Format:** JSON object

**Max Tokens:** 1000

---

## Scoring API Prompt (Step 2: Ingredient Analysis)

**System Prompt:**
```
You are a skincare and cosmetic product quality evaluator for DermaIQ.
You analyze ingredients in skincare, cosmetic, and dermatological products and provide clear, unbiased scores.
Consider factors like:
- Ingredient sourcing and quality
- Potential skin irritants or allergens
- Evidence-based efficacy
- Natural vs synthetic composition
- Safety profiles from dermatological research
```

**User Prompt Template:**
```
Analyze this skincare/cosmetic product:

Product Name: {product_name}
Ingredients: {ingredients_list}

Provide a comprehensive analysis with:
1. Quality Score (0-100): Based on ingredient quality, formulation, and efficacy
2. Safety Score (0-100): Based on potential irritants, allergens, and known skin concerns
3. Organic Classification: Classify as Organic, Inorganic, Mixed, or Unknown
4. Overall Verdict: 2-3 sentence summary
5. Detailed explanations for each score

Return output strictly in this JSON format:
{
  "product_name": "{product_name}",
  "ingredients": {ingredients_array},
  "scores": {
    "quality": number (0-100),
    "safety": number (0-100),
    "organic": "Organic" | "Inorganic" | "Mixed" | "Unknown"
  },
  "verdict": "overall assessment",
  "explanations": {
    "quality": "explanation for quality score",
    "safety": "explanation for safety score",
    "organic": "explanation for organic classification"
  }
}
```

**Model:** `gpt-4o`

**Response Format:** JSON object

**Max Tokens:** 1500

---

## Prompt Optimization Tips

### For Better Accuracy:

1. **Be Specific**: The more context you provide about the domain (skincare/cosmetics), the better
2. **Request Structured Output**: Always use `response_format: { type: 'json_object' }`
3. **Set Clear Boundaries**: Define score ranges (0-100) and classification options
4. **Request Explanations**: Ask for reasoning behind scores for transparency

### For Cost Optimization:

1. **Adjust Max Tokens**: Lower if responses are consistently short
2. **Use Appropriate Models**: 
   - Vision: `gpt-4o` or `gpt-4-vision-preview`
   - Text: `gpt-4o` or `gpt-4-turbo` (cheaper than Vision)
3. **Cache Results**: Store results for identical products

### For Better User Experience:

1. **Add Confidence Levels**: Help users understand certainty
2. **Explain Limitations**: Be clear about AI limitations
3. **Request Actionable Advice**: Future: "What to look for" guidance

---

## Prompt Variations to Test

### More Conservative Analysis:
Add to system prompt:
```
Be conservative in your assessments. When in doubt, indicate uncertainty rather than making definitive claims.
```

### Focus on Sensitive Skin:
Add to user prompt:
```
Pay special attention to ingredients that may cause sensitivity or allergic reactions, particularly for sensitive skin types.
```

### Regional Regulations:
Add to user prompt:
```
Consider ingredient regulations in {region} (e.g., EU, US, Asia).
```

---

## Future Enhancements

1. **Multi-language Support**: Analyze products with non-English labels
2. **Comparative Analysis**: Compare similar products
3. **Personalization**: Factor in user's skin type and concerns
4. **Ingredient Database**: Augment AI with structured ingredient data
5. **Trend Detection**: Identify trending ingredients

---

## Testing Prompts

Use these test cases to validate prompt effectiveness:

1. **Clear Label**: Product with fully visible ingredients
2. **Partial Label**: Product with partially obscured text
3. **Non-English**: International products
4. **Multiple Products**: Image containing multiple products
5. **No Label**: Product without visible ingredients list

---

## Version History

- **v1.0** (2024-02-15): Initial prompts for MVP
  - Vision extraction
  - Ingredient scoring
  - DermaIQ specialization

---

For prompt updates, test thoroughly before deploying to production.
