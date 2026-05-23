/**
 * Preços de referência por modelo (USD por 1 milhão de tokens).
 * Atualize esta tabela quando os preços oficiais mudarem.
 * Fonte: maio/2026.
 */

export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const GEMINI_PRICES: Record<string, ModelPrice> = {
  // Família 2.5 (stable)
  'gemini-2.5-flash-lite': { inputPerMTok: 0.04, outputPerMTok: 0.15 },
  'gemini-2.5-flash':      { inputPerMTok: 0.075, outputPerMTok: 0.30 },
  'gemini-2.5-pro':        { inputPerMTok: 1.25, outputPerMTok: 5.00 },
  // Família 3.x (stable)
  'gemini-3.1-flash-lite': { inputPerMTok: 0.05, outputPerMTok: 0.20 },
  'gemini-3.5-flash':      { inputPerMTok: 0.15, outputPerMTok: 0.60 },
  // Legados (mantidos pra compatibilidade — não usar em produção)
  'gemini-2.0-flash':      { inputPerMTok: 0.10, outputPerMTok: 0.40 },
  'gemini-2.0-flash-lite': { inputPerMTok: 0.075, outputPerMTok: 0.30 },
  'gemini-1.5-flash':      { inputPerMTok: 0.075, outputPerMTok: 0.30 },
  'gemini-1.5-pro':        { inputPerMTok: 1.25, outputPerMTok: 5.00 },
};

export const ANTHROPIC_PRICES: Record<string, ModelPrice> = {
  // Haiku family
  'claude-haiku-4-5-20251001': { inputPerMTok: 1.00, outputPerMTok: 5.00 },
  'claude-haiku-4-5': { inputPerMTok: 1.00, outputPerMTok: 5.00 },
  'claude-3-5-haiku-latest': { inputPerMTok: 0.80, outputPerMTok: 4.00 },
  // Sonnet family
  'claude-sonnet-4-6': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  'claude-sonnet-4-5': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  'claude-3-7-sonnet-latest': { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  // Opus family
  'claude-opus-4-7': { inputPerMTok: 15.00, outputPerMTok: 75.00 },
  'claude-opus-4-1': { inputPerMTok: 15.00, outputPerMTok: 75.00 },
  'claude-3-opus-latest': { inputPerMTok: 15.00, outputPerMTok: 75.00 },
};

const FALLBACK_GEMINI: ModelPrice = { inputPerMTok: 0.075, outputPerMTok: 0.30 };
const FALLBACK_ANTHROPIC: ModelPrice = { inputPerMTok: 3.00, outputPerMTok: 15.00 };

export function getGeminiPrice(model: string): ModelPrice {
  return GEMINI_PRICES[model] || FALLBACK_GEMINI;
}

export function getAnthropicPrice(model: string): ModelPrice {
  return ANTHROPIC_PRICES[model] || FALLBACK_ANTHROPIC;
}

export function estimateCostUSD(price: ModelPrice, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * price.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * price.outputPerMTok;
  return inputCost + outputCost;
}

export function formatUSD(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}
