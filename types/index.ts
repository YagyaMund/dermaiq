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
  /** True when the payload was served from `SkincareProductCatalog` (no scoring API calls). */
  from_catalog_cache?: boolean;
}

export interface AnalysisError {
  error: string;
  details?: string;
  requiresLogin?: boolean;
  code?: 'too_vague' | 'not_found' | 'out_of_scope';
  examples?: string[];
}

export interface AnalyzeQuota {
  authenticated: boolean;
  remaining: number | null;
  limit: number | null;
  requiresLogin: boolean;
}

export interface VisionExtractionResult {
  product_name: string;
  product_type: string;
  ingredients: string[];
  confidence: string;
  /** True when in scope for DermaIQ (skin, scalp, hair personal care; see analyze API). */
  is_skincare: boolean;
}
