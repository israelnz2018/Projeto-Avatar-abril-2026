/**
 * useDashboardData — hooks React que embrulham `dashboardDataService` com
 * loading/error padronizados e refetch automático quando o usuário muda.
 *
 * Cada perfil de Dashboard chama UM destes hooks; toda a lógica de dado fica
 * isolada aqui e no service. Componentes ficam dumb.
 */

import { useEffect, useState, useCallback } from 'react';
import { auth } from '../lib/firebase';
import {
  getUserContentScope,
  getUserUsageStats,
  getResumoAluno,
  getResumoEquipe,
  getResultadosEquipe,
  ResultadoAluno,
  getAdminGlobalStats,
  getProgressoPorTrilha,
  getProjetosComDetalhes,
  getAdminEventStats,
  getApiUsageRecente,
  getFeedbacksRecentes,
  UserContentScope,
  UserUsageStats,
  ResumoAluno,
  AdminGlobalStats,
  ProgressoTrilha,
  ProjetoComDetalhes,
  AdminEventStats,
  ApiUsageDia,
  FeedbackResumo,
} from '../services/dashboardDataService';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  enabled: boolean = true,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  return { data, loading, error, refetch };
}

/** Escopo de conteúdo acessível ao usuário logado (trilhas, ferramentas, vídeos). */
export function useUserContentScope(uid?: string | null): AsyncState<UserContentScope> {
  const targetUid = uid ?? auth.currentUser?.uid ?? null;
  return useAsync(
    () => getUserContentScope(targetUid as string),
    [targetUid],
    !!targetUid,
  );
}

/** Estatísticas de uso do usuário (projetos, ferramentas completadas, crédito IA). */
export function useUserUsageStats(uid?: string | null): AsyncState<UserUsageStats> {
  const targetUid = uid ?? auth.currentUser?.uid ?? null;
  return useAsync(
    () => getUserUsageStats(targetUid as string),
    [targetUid],
    !!targetUid,
  );
}

/** Resumo de um aluno (pro card no Dashboard do Coordenador). */
export function useResumoAluno(alunoUid: string | null): AsyncState<ResumoAluno | null> {
  return useAsync(
    () => getResumoAluno(alunoUid as string),
    [alunoUid],
    !!alunoUid,
  );
}

/** Resumo de todo o time do coordenador (lista de alunos). */
export function useResumoEquipe(
  empresaId: string | null,
  coordenadorUid: string | null,
): AsyncState<ResumoAluno[]> {
  return useAsync(
    () => getResumoEquipe(empresaId as string, coordenadorUid as string),
    [empresaId, coordenadorUid],
    !!empresaId && !!coordenadorUid,
  );
}

/** Resultados (ganhos R$) + engajamento (vídeos, certificados) de todo o time. */
export function useResultadosEquipe(
  empresaId: string | null,
  coordenadorUid: string | null,
): AsyncState<ResultadoAluno[]> {
  return useAsync(
    () => getResultadosEquipe(empresaId as string, coordenadorUid as string),
    [empresaId, coordenadorUid],
    !!empresaId && !!coordenadorUid,
  );
}

/** Stats globais pro Dashboard do Admin. */
export function useAdminGlobalStats(): AsyncState<AdminGlobalStats> {
  return useAsync(() => getAdminGlobalStats(), []);
}

/** Progresso por trilha — TODAS as trilhas do sistema, com flag `bloqueada`. */
export function useProgressoPorTrilha(uid?: string | null): AsyncState<ProgressoTrilha[]> {
  const targetUid = uid ?? auth.currentUser?.uid ?? null;
  return useAsync(
    () => getProgressoPorTrilha(targetUid as string),
    [targetUid],
    !!targetUid,
  );
}

/** Projetos do usuário com detalhes (fase, progresso, travado). */
export function useProjetosComDetalhes(uid?: string | null): AsyncState<ProjetoComDetalhes[]> {
  const targetUid = uid ?? auth.currentUser?.uid ?? null;
  return useAsync(
    () => getProjetosComDetalhes(targetUid as string),
    [targetUid],
    !!targetUid,
  );
}

/** Agregados de eventos comportamentais pro Admin. */
export function useAdminEventStats(dias: number = 30): AsyncState<AdminEventStats> {
  return useAsync(() => getAdminEventStats(dias), [dias]);
}

/** Últimos N dias de api_usage. */
export function useApiUsageRecente(dias: number = 14): AsyncState<ApiUsageDia[]> {
  return useAsync(() => getApiUsageRecente(dias), [dias]);
}

/** Últimos N feedbacks. */
export function useFeedbacksRecentes(limite: number = 10): AsyncState<FeedbackResumo[]> {
  return useAsync(() => getFeedbacksRecentes(limite), [limite]);
}
