// Type definitions for DermaIQ Product Analyzer

export interface IngredientItem {
  name: string;
  benefit?: string;
  concern?: string;
  risk_level?: 'green' | 'yellow' | 'orange' | 'red';
}

export interface IngredientCategory {
  category: string;
  items: IngredientItem[];
}

export interface HealthierAlternative {
  product_name: string;
  brand: string;
  estimated_score: number;
  reason: string;
  /** Optional URL to a product image (e.g. brand or retailer). */
  image_url?: string | null;
}

export interface AnalysisResult {
  product_name: string;
  product_type: string;
  detected_ingredients: string[];
  score: number;
  positive_ingredients: IngredientCategory[];
  negative_ingredients: IngredientCategory[];
  verdict: string;
  healthier_alternative?: HealthierAlternative | null;
}

export interface AnalysisError {
  error: string;
  details?: string;
}

export interface VisionExtractionResult {
  product_name: string;
  product_type: string;
  ingredients: string[];
  confidence: string;
  is_cosmetic: boolean;
}
