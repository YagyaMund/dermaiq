// Type definitions for DermaIQ Product Analyzer

export interface AnalysisScores {
  quality: number;
  safety: number;
  organic: 'Organic' | 'Inorganic' | 'Mixed' | 'Unknown';
}

export interface IngredientItem {
  name: string;
  benefit?: string;
  concern?: string;
}

export interface AnalysisResult {
  product_name: string;
  scores: AnalysisScores;
  positive_ingredients: IngredientItem[];
  negative_ingredients: IngredientItem[];
  verdict: string;
}

export interface AnalysisError {
  error: string;
  details?: string;
}

export interface VisionExtractionResult {
  product_name: string;
  ingredients: string[];
  confidence: string;
}
