import { Project } from '../types';

export interface AnalysisInput {
  project: Project;
  toolId: string;
  toolData: any;
}

// Mapa de prompts especializados por ferramenta. Adicionar nova ferramenta = nova entrada aqui.
const PROMPT_BUILDERS: Record<string, (input: AnalysisInput) => string> = {
  measureIshikawa: ({ toolData }) => {
    const causes = toolData?.causes || {};
    const causesText = Object.entries(causes)
      .filter(([_, list]) => Array.isArray(list) && (list as string[]).length > 0)
      .map(([cat, list]) => `${cat}: ${(list as string[]).filter(c => c && c.trim()).join('; ')}`)
      .join('\n');
    return `Você é consultor sênior em Lean Six Sigma. Escreva uma análise executiva em prosa fluida (3 a 5 frases, em português, sem bullets, sem cabeçalhos), identificando as causas raiz mais críticas, conexões entre categorias 6M, e recomendando próximos passos para a fase Improve.

Problema: ${toolData?.problem || 'não informado'}

Causas levantadas:
${causesText || 'nenhuma'}`;
  },
  // Futuras ferramentas adicionam suas funções de prompt aqui.
};

export async function generateExecutiveAnalysis(input: AnalysisInput): Promise<string> {
  const builder = PROMPT_BUILDERS[input.toolId];
  if (!builder) {
    throw new Error(`Sem prompt configurado para ferramenta: ${input.toolId}`);
  }
  const prompt = builder(input);

  const response = await fetch('https://analises-production.up.railway.app/claude/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Claude API falhou: ${response.status}`);
  }

  const data = await response.json();
  const text = (data.text || data.response || data.completion || '').trim();
  if (!text) throw new Error('Resposta vazia da IA');
  return text;
}
