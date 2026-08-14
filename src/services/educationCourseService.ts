import type { Initiative } from '../types';
import { courseNamesMatch } from '../lib/courseAccess';
import { getInitiatives } from './configService';
import { getAllKnowledge, isIntroCourse } from './knowledgeService';
import { resolveConsultorId } from './consultorService';

const ORDEM_ISRAEL: Record<string, number> = {
  'Como Resolver Problemas no Trabalho - Kit 90 dias': 1,
  'Como Recomendar Melhorias com Base em Análise de Dados': 2,
  'Como Conduzir Mudanças com Menos Resistência': 3,
  'Como Criar Apresentações que Convencem': 4,
  'Como Antecipar Riscos Antes que Virem Problemas': 5,
  'Como Aplicar a Cultura Lean': 6,
  'Como Fazer Análises Estatísticas Aplicadas a Negócios': 7,
  'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria': 8,
};

function stableEducationId(consultorId: string, name: string): string {
  let hash = 2166136261;
  for (const char of `${consultorId}:${name}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `education_${(hash >>> 0).toString(36)}`;
}

/**
 * Catálogo educacional independente dos tipos de projeto.
 * Um curso existe quando possui vídeos; ter fases/ferramentas de projeto é opcional.
 */
export async function getEducationCourses(consultorId = resolveConsultorId()): Promise<Initiative[]> {
  const [projectTypes, videos] = await Promise.all([
    getInitiatives(),
    getAllKnowledge(consultorId),
  ]);

  const names: string[] = [];
  for (const video of videos) {
    const name = String(video.course || '').trim();
    if (!name || isIntroCourse(name) || names.some((current) => courseNamesMatch(current, name))) continue;
    names.push(name);
  }

  return names
    .map((name, index): Initiative => {
      const existing = projectTypes.find((item) => courseNamesMatch(item.name, name));
      if (existing) {
        return {
          ...existing,
          name,
          ordem: consultorId === 'israel' ? (ORDEM_ISRAEL[name] || existing.ordem) : existing.ordem,
        };
      }
      return {
        id: stableEducationId(consultorId, name),
        name,
        consultorId,
        ordem: consultorId === 'israel' ? (ORDEM_ISRAEL[name] || index + 1) : index + 1,
        createdAt: '',
      };
    })
    .sort((a, b) => (a.ordem || Number.MAX_SAFE_INTEGER) - (b.ordem || Number.MAX_SAFE_INTEGER));
}
