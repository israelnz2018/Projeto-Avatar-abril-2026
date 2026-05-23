/**
 * Cliente Gemini direto no browser via REST.
 * Key vem do Firestore via apiSettingsService.
 *
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Modelo padrão: gemini-2.5-flash (rápido + barato — ~$0,075/M input, $0,30/M output)
 */

import { getGeminiApiKey, getGeminiModel } from "../services/apiSettingsService";
import { trackGeminiUsage } from "../services/apiUsageService";

export interface GeminiCallOpts {
  system?: string;
  /** Conteúdo do usuário (texto único — Gemini aceita arrays mas não precisamos aqui). */
  userPrompt: string;
  /** Se true, força resposta em JSON puro. */
  responseAsJson?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  text: string;
  usage: { promptTokens: number; candidatesTokens: number; totalTokens: number };
}

export async function callGemini(opts: GeminiCallOpts): Promise<GeminiResponse> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key não configurada. Vá em /api-settings (admin).");
  }
  const model = await getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: opts.userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 8192,
      temperature: typeof opts.temperature === "number" ? opts.temperature : 0.4,
    },
  };
  if (opts.system) {
    body.system_instruction = { parts: [{ text: opts.system }] };
  }
  if (opts.responseAsJson) {
    body.generationConfig.responseMimeType = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    trackGeminiUsage({ failed: true });
    throw new Error(`Falha de rede chamando Gemini: ${err?.message || err}`);
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    trackGeminiUsage({ failed: true });
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${msg}`);
  }

  // Extrai texto da primeira candidate
  const candidate = json?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text: string = parts.map((p: any) => p.text || "").join("\n").trim();

  // Tracking de uso
  const usage = json?.usageMetadata || {};
  const promptTokens = usage.promptTokenCount || 0;
  const candidatesTokens = usage.candidatesTokenCount || 0;
  const totalTokens = usage.totalTokenCount || (promptTokens + candidatesTokens);
  trackGeminiUsage({ promptTokens, candidatesTokens, totalTokens });

  return {
    text,
    usage: { promptTokens, candidatesTokens, totalTokens },
  };
}

/**
 * Conveniência: chama Gemini esperando JSON puro de volta.
 * Faz parse e devolve o objeto. Se vier markdown com ```json ... ```, extrai.
 */
export async function callGeminiJSON<T = any>(opts: GeminiCallOpts): Promise<T> {
  const { text } = await callGemini({ ...opts, responseAsJson: true });
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) return JSON.parse(m[1]);
    throw new Error(`Resposta do Gemini não é JSON válido: ${cleaned.slice(0, 200)}`);
  }
}
