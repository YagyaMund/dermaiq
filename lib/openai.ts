import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

/** Vision + product identification (text + image). */
export const VISION_MODEL = 'gpt-5.4-mini';
/** Main scoring pass (methodology + JSON result). */
export const TEXT_MODEL = 'gpt-5.4-mini';
/** INCI extraction / research (full formula lists; vision + text). */
export const INGREDIENT_MODEL = 'gpt-5.4';
/** Cheaper pass that reads full methodology before the main scoring call. */
export const METHODOLOGY_DIGEST_MODEL = 'gpt-5.4-nano';
/** Product name search → most relevant SKU resolution. */
export const PRODUCT_SEARCH_MODEL = 'gpt-5.4-mini';

/** GPT-5+ uses `max_completion_tokens`; earlier models use `max_tokens`. */
export function chatCompletionLimits(
  model: string,
  max: number
): { max_tokens: number } | { max_completion_tokens: number } {
  return /^gpt-5/i.test(model)
    ? { max_completion_tokens: max }
    : { max_tokens: max };
}
