// Type definitions for DermaIQ Product Analyzer

export interface AnalysisScores {
  quality: number;
  safety: number;
  organic: 'Organic' | 'Synthetic' | 'Unknown';
}

export interface IngredientItem {
  name: string;
  benefit?: string;
  concern?: string;
}

export interface IngredientCategory {
  category: string;
  items: IngredientItem[];
}

export interface AnalysisResult {
  product_name: string;
  product_type: string;
  detected_ingredients: string[];
  scores: AnalysisScores;
  positive_ingredients: IngredientCategory[];
  negative_ingredients: IngredientCategory[];
  verdict: string;
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
