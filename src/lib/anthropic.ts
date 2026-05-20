/**
 * Cliente direto da Anthropic API rodando no browser.
 * Usa o header `anthropic-dangerous-direct-browser-access` (oficialmente suportado).
 * Key vem do Firestore via apiSettingsService.
 */

import { getApiSettings } from "../services/apiSettingsService";
import { trackAnthropicUsage } from "../services/apiUsageService";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export interface AnthropicCallOpts {
  model: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface AnthropicResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

async function getKey(): Promise<string> {
  const s = await getApiSettings();
  const key = s.anthropic.apiKey;
  if (!key) {
    throw new Error("Anthropic API key não configurada. Vá em /api-settings (admin).");
  }
  return key;
}

export async function callAnthropic(opts: AnthropicCallOpts): Promise<AnthropicResponse> {
  const key = await getKey();
  const body: any = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    messages: opts.messages,
  };
  if (opts.system) body.system = opts.system;
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    trackAnthropicUsage({ failed: true });
    throw new Error(`Falha de rede chamando Anthropic: ${err?.message || err}`);
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    trackAnthropicUsage({ failed: true });
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Anthropic API error: ${msg}`);
  }

  const usage = json?.usage || {};
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  trackAnthropicUsage({ inputTokens, outputTokens });

  const text: string =
    (json?.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n") || "";

  return { text, usage: { inputTokens, outputTokens } };
}

/**
 * Conveniência: chama Anthropic esperando JSON puro de volta.
 * Faz parse e devolve o objeto. Se vier markdown com ```json ... ```, extrai.
 */
export async function callAnthropicJSON<T = any>(opts: AnthropicCallOpts): Promise<T> {
  const { text } = await callAnthropic(opts);
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Tenta extrair primeiro bloco {…} ou […] da resposta
    const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) return JSON.parse(m[1]);
    throw new Error(`Resposta da Anthropic não é JSON válido: ${cleaned.slice(0, 200)}`);
  }
}
