/**
 * aiRouter — mapeia cada local da UI ao provider + modelo certo.
 *
 * REGRAS (aprovadas pelo usuário):
 *   - Aba IA (chat-ai)                     → Anthropic sonnet
 *   - Sidebar Mentor com vídeos (mentor)   → Anthropic sonnet
 *   - Preencher com IA (fill-tool)         → Anthropic sonnet
 *   - Gerar índice da transcrição (kb-idx) → Anthropic sonnet
 *   - Criar ferramenta React (tool-react)  → Anthropic opus
 *   - Criar ferramenta PPT (tool-ppt)      → Anthropic opus
 *
 * Para mudar o modelo de um local, edite LOCATION_MAP abaixo.
 */

import { callAnthropic, callAnthropicJSON } from "../lib/anthropic";
import { getAnthropicModel } from "./apiSettingsService";

export type AILocation =
  | "chat-ai"
  | "mentor"
  | "fill-tool"
  | "kb-idx"
  | "tool-react"
  | "tool-ppt";

type Tier = "haiku" | "sonnet" | "opus";

const LOCATION_MAP: Record<AILocation, Tier> = {
  "chat-ai": "sonnet",
  "mentor": "sonnet",
  "fill-tool": "sonnet",
  "kb-idx": "sonnet",
  "tool-react": "opus",
  "tool-ppt": "opus",
};

export interface AIRouterCallOpts {
  location: AILocation;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export async function callAI(opts: AIRouterCallOpts) {
  const tier = LOCATION_MAP[opts.location];
  const model = await getAnthropicModel(tier);
  return callAnthropic({
    model,
    system: opts.system,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });
}

export async function callAIJSON<T = any>(opts: AIRouterCallOpts): Promise<T> {
  const tier = LOCATION_MAP[opts.location];
  const model = await getAnthropicModel(tier);
  return callAnthropicJSON<T>({
    model,
    system: opts.system,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });
}

export function getModelTierForLocation(location: AILocation): Tier {
  return LOCATION_MAP[location];
}
