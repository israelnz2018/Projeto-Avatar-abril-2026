/**
 * Knowledge Loader — carrega o arquivo único `mentor-ia-knowledge.md` em tempo de build
 * via Vite (?raw) e expõe funções pra extrair partes específicas.
 *
 * O arquivo .md é texto puro: você (admin) edita no Word/Notepad, salva, e
 * o app rebuilda — o conhecimento é injetado nos prompts da IA automaticamente.
 *
 * Estrutura esperada do .md:
 *   - Bloco 0 (preâmbulo + Seção 0 = Regras Globais)
 *   - Blocos 1-9 (Seções 1-9 = uma por trilha, identificada por `ID: \`trilha-id\``)
 *
 * Cada bloco é separado por linhas de "═" no markdown.
 */

import knowledgeRaw from './mentor-ia-knowledge.md?raw';

/** Quebra o arquivo em blocos usando linhas de ═ como separador. */
function splitIntoBlocks(raw: string): string[] {
  const lines = raw.split('\n');
  const blocks: string[][] = [[]];
  for (const line of lines) {
    // Linha que é APENAS caracteres ═ (com possíveis espaços) = separador
    if (/^═+\s*$/.test(line)) {
      blocks.push([]);
    } else {
      blocks[blocks.length - 1].push(line);
    }
  }
  return blocks
    .map(b => b.join('\n').trim())
    .filter(s => s.length > 0);
}

const BLOCKS = splitIntoBlocks(knowledgeRaw);

// Indexa blocos por trilha id (extraído via regex `ID: \`xxx\``)
const TRILHA_BLOCKS: Record<string, string> = {};
let GLOBAL_BLOCK = '';

for (const block of BLOCKS) {
  const idMatch = block.match(/ID:\s*`([^`]+)`/);
  if (idMatch) {
    TRILHA_BLOCKS[idMatch[1]] = block;
  } else if (!GLOBAL_BLOCK && /SEÇÃO 0|REGRAS GLOBAIS/i.test(block)) {
    // Primeiro bloco que NÃO tem ID e contém marcador de seção 0 = global
    GLOBAL_BLOCK = block;
  } else if (!GLOBAL_BLOCK) {
    // Fallback: primeiro bloco sem ID
    GLOBAL_BLOCK = block;
  }
}

/** Retorna as regras globais da plataforma (Seção 0). Sempre injetar. */
export function getGlobalKnowledge(): string {
  return GLOBAL_BLOCK;
}

/** Retorna o knowledge de uma trilha específica (Seção 1-9). String vazia se não achar. */
export function getTrilhaKnowledge(trilhaId: string): string {
  return TRILHA_BLOCKS[trilhaId] || '';
}

/** Retorna TODO o conteúdo (global + todas as trilhas). Útil quando IA precisa escolher entre trilhas. */
export function getAllKnowledge(): string {
  const all: string[] = [GLOBAL_BLOCK];
  for (const block of Object.values(TRILHA_BLOCKS)) {
    all.push(block);
  }
  return all.join('\n\n═══════════════════════════════════════════════════════════════════════\n\n');
}

/** Lista de trilhas conhecidas no arquivo (útil pra debug). */
export function getKnownTrilhaIds(): string[] {
  return Object.keys(TRILHA_BLOCKS);
}
