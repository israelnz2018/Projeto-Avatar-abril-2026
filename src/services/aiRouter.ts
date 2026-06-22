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

import { callAnthropic, callAnthropicJSONWithUsage } from "../lib/anthropic";
import { getAnthropicModel } from "./apiSettingsService";
import { logIaQuestion } from "./eventLogger";
import { canUseAI, consumeOutput } from "./tokenCreditService";

/** Erro lançado quando o aluno esgotou o crédito de IA do mês. A UI trata
 *  esse caso mostrando o aviso de limite (sem parecer um erro técnico). */
export class CreditExhaustedError extends Error {
  constructor() {
    super("CREDIT_EXHAUSTED");
    this.name = "CreditExhaustedError";
  }
}

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
  "kb-idx": "haiku",
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

/** Locations de CONVERSA (chat). Só estes são bloqueados quando o crédito acaba.
 *  As demais (fill-tool, kb-idx, etc.) continuam funcionando — você monitora. */
const CHAT_LOCATIONS: ReadonlySet<AILocation> = new Set(["chat-ai", "mentor"]);

export async function callAI(opts: AIRouterCallOpts) {
  if (CHAT_LOCATIONS.has(opts.location)) {
    const credito = await canUseAI();
    if (!credito.allowed) throw new CreditExhaustedError();
  }
  logIaQuestion(opts.location, opts.messages);
  const tier = LOCATION_MAP[opts.location];
  const model = await getAnthropicModel(tier);
  const res = await callAnthropic({
    model,
    system: opts.system,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });
  consumeOutput(res.usage.outputTokens);
  return res;
}

export async function callAIJSON<T = any>(opts: AIRouterCallOpts): Promise<T> {
  if (CHAT_LOCATIONS.has(opts.location)) {
    const credito = await canUseAI();
    if (!credito.allowed) throw new CreditExhaustedError();
  }
  logIaQuestion(opts.location, opts.messages);
  const tier = LOCATION_MAP[opts.location];
  const model = await getAnthropicModel(tier);
  const { result, usage } = await callAnthropicJSONWithUsage<T>({
    model,
    system: opts.system,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });
  consumeOutput(usage.outputTokens);
  return result;
}

export function getModelTierForLocation(location: AILocation): Tier {
  return LOCATION_MAP[location];
}
