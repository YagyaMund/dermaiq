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

export const VISION_MODEL = 'gpt-4o';
export const TEXT_MODEL = 'gpt-4o';
/** Cheaper pass that reads full methodology before the main scoring call. */
export const METHODOLOGY_DIGEST_MODEL = 'gpt-4o-mini';
