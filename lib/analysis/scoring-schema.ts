import { z } from 'zod';

export const IngredientItemSchema = z.object({
  name: z.string(),
  benefit: z.string().optional(),
  concern: z.string().optional(),
  risk_level: z.enum(['green', 'yellow', 'orange', 'red']).optional(),
});

export const IngredientCategorySchema = z.object({
  category: z.string(),
  items: z.array(IngredientItemSchema),
});

export const HealthierAlternativeSchema = z.object({
  product_name: z.string(),
  brand: z.string(),
  estimated_score: z.number(),
  reason: z.string(),
  image_url: z.string().nullable().optional(),
}).optional();

export const ScoringResultSchema = z.object({
  product_name: z.string(),
  product_type: z.string(),
  detected_ingredients: z.array(z.string()),
  score: z.number().min(0).max(100),
  positive_ingredients: z.array(IngredientCategorySchema),
  negative_ingredients: z.array(IngredientCategorySchema),
  verdict: z.string(),
  healthier_alternative: HealthierAlternativeSchema.nullable().optional(),
});
