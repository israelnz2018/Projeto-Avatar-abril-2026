/**
 * analyticsModules — FONTE ÚNICA dos módulos do Data Analysis.
 *
 * Existe pra não repetir esta lista em cada tela. Quem precisar mostrar
 * (ex.: painel de acessos do aluno em MeusAlunos) ou BLOQUEAR (o gate do
 * Data Analysis, quando for construído) deve importar daqui — nunca
 * redeclarar a lista.
 *
 * NÃO existe "básico" e "avançado": o consultor escolhe, módulo a módulo, o
 * que cada aluno acessa. Por isso a permissão é uma LISTA de ids, não um
 * nível. Assim dá pra vender/liberar qualquer combinação, sem pacote fixo.
 *
 * O campo `grupo` é o nome EXATO usado em `configuracoesAnalises`
 * (DataAnalysis.tsx). Se um grupo novo nascer lá, tem que entrar aqui também.
 */

export interface AnalyticsModulo {
  id: string;
  /** Rótulo curto pra UI. */
  nome: string;
  /** Nome EXATO do grupo em configuracoesAnalises (DataAnalysis.tsx). */
  grupo: string;
}

/** Os 8 grupos reais do menu do Data Analysis. */
export const ANALYTICS_MODULOS: AnalyticsModulo[] = [
  { id: 'diversas',     nome: 'Estatística Básica',     grupo: 'Estatística Básica' },
  { id: 'graficos',     nome: 'Gráficos',             grupo: 'Análise Descritiva (Gráficos)' },
  { id: 'exploratoria', nome: 'Análise Exploratória', grupo: 'Análise Exploratória' },
  { id: 'inferencial',  nome: 'Análise Inferencial',  grupo: 'Análise Inferencial' },
  { id: 'msa',          nome: 'MSA',                  grupo: 'Análise do Sistema de Medição (MSA)' },
  { id: 'preditiva',    nome: 'Análise Preditiva',    grupo: 'Análise Preditiva' },
  { id: 'cep',          nome: 'Controle de Processo', grupo: 'Análise de controle de processo' },
  { id: 'capabilidade', nome: 'Capabilidade',         grupo: 'Análises de Capabilidade' },
];

/** Ids liberados pro aluno. Ausente = legado (ver acessoAnalyticsDoAluno). */
export interface AcessoAnalyticsItem {
  modulo: string;
  vencimento?: string | null;
  valor?: number;
}

/** Formato novo = objeto com preço/expiração; formato antigo = string[]. */
export type AcessoAnalytics = string[] | AcessoAnalyticsItem[] | undefined;

/**
 * O aluno tem acesso a este módulo?
 *
 * `legado: true` = o aluno é de antes do modelo por módulo e ainda não tem a
 * permissão gravada. Hoje aparece como liberado só pra não mentir sobre o
 * comportamento atual da plataforma (o Data Analysis está aberto pra todos).
 * Quando o bloqueio real existir, esses alunos precisam ser resolvidos por
 * MIGRAÇÃO EXPLÍCITA — não por "libera por omissão", senão quem nunca teve
 * permissão ganha tudo em silêncio.
 */
export function acessoAnalyticsDoAluno(
  modulosLiberados: AcessoAnalytics,
  modulo: AnalyticsModulo,
): { liberado: boolean; legado: boolean; valor?: number; vencimento?: string | null } {
  if (!Array.isArray(modulosLiberados)) return { liberado: true, legado: true };
  const item = modulosLiberados.find((acesso) =>
    typeof acesso === 'string' ? acesso === modulo.id : acesso?.modulo === modulo.id,
  );
  if (!item) return { liberado: false, legado: false, vencimento: null };
  if (typeof item === 'string') return { liberado: true, legado: false, vencimento: null };
  const expirado = !!item.vencimento && new Date(item.vencimento).getTime() < Date.now();
  return {
    liberado: !expirado,
    legado: false,
    valor: typeof item.valor === 'number' ? item.valor : 0,
    vencimento: item.vencimento || null,
  };
}
