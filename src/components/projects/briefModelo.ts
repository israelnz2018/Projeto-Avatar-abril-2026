/**
 * Regras do "Entendendo o Problema", compartilhadas pela tela (ProjectBrief) e
 * pela geração com IA (generateBriefData).
 *
 * DOIS LUGARES PARA OS DADOS, DE PROPÓSITO
 *
 * `answers` continua sendo só texto, nas mesmas chaves de sempre (q1, q2, q6,
 * q7, q8…). É o que o Contrato do Projeto, o SIPOC, as ferramentas de ADKAR, a
 * validação de causas, o slide e o relatório leem — nenhum deles precisa saber
 * que agora existem listas.
 *
 * `estrutura` guarda a forma de editar: os problemas e os ganhos como itens
 * separados, e o objetivo em partes (verbo, indicador, hoje, meta, prazo). Fica
 * FORA de `answers` porque há quem percorra `answers` inteiro — o relatório
 * imprime cada chave, e a checagem de "ferramenta vazia" trata lista vazia como
 * preenchida.
 *
 * A cada edição a tela recalcula o texto de `answers` a partir da `estrutura`.
 */

export type VerboObjetivo = 'Reduzir' | 'Aumentar';

export interface ObjetivoProjeto {
  verbo: VerboObjetivo;
  /** O que se mede, escrito para caber depois do verbo: "o tempo de emissão de propostas". */
  indicador: string;
  /** Como está hoje: "5 dias". */
  atual: string;
  /** Onde quer chegar: "1 dia útil". */
  meta: string;
  /** Livre, como a pessoa falaria: "até março", "em 3 meses". */
  prazo: string;
}

export interface EstruturaBrief {
  problemas: string[];
  ganhos: string[];
  objetivo: ObjetivoProjeto;
  /**
   * Depois que a pessoa mexe no título, ele deixa de se refazer sozinho — senão
   * cada letra digitada no objetivo apagaria o que ela escreveu.
   */
  tituloEditado: boolean;
}

export const OBJETIVO_VAZIO: ObjetivoProjeto = { verbo: 'Reduzir', indicador: '', atual: '', meta: '', prazo: '' };

/** Lista de itens → texto com marcadores, que é o formato que os leitores antigos recebem. */
export function juntarLista(itens: string[]): string {
  return itens.map((s) => s.trim()).filter(Boolean).map((s) => `• ${s}`).join('\n');
}

/** Texto antigo (uma frase, ou linhas com marcador) → lista de itens. */
export function separarLista(texto: string | undefined): string[] {
  return String(texto || '')
    .split(/\r?\n/)
    .map((linha) => linha.replace(/^\s*[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * A frase do objetivo, com os números: "Reduzir o tempo de emissão de propostas
 * de 5 dias para 1 dia útil até março". Vazia enquanto não houver o mínimo
 * (o que medir e onde chegar) — meio objetivo é pior que nenhum.
 */
export function fraseDoObjetivo(o: ObjetivoProjeto): string {
  const indicador = o.indicador.trim();
  const meta = o.meta.trim();
  if (!indicador || !meta) return '';
  const partes = [`${o.verbo} ${indicador}`];
  if (o.atual.trim()) partes.push(`de ${o.atual.trim()}`);
  partes.push(`para ${meta}`);
  if (o.prazo.trim()) partes.push(o.prazo.trim());
  return partes.join(' ');
}

/**
 * O título do projeto, SEM números.
 *
 * Título de projeto diz o que será melhorado; a meta "de 5 para 1" é do
 * objetivo e muda ao longo do projeto — se morasse no título, o título ficaria
 * errado na primeira revisão da meta.
 */
export function tituloAutomatico(o: ObjetivoProjeto, processo: string): string {
  const indicador = o.indicador.trim();
  if (indicador) return primeiraMaiuscula(`${o.verbo} ${indicador}`);
  const p = processo.trim();
  if (p) return `Melhorar ${primeiraMinuscula(p)}`;
  return '';
}

function primeiraMaiuscula(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function primeiraMinuscula(s: string) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/**
 * Monta a `estrutura` de um projeto que ainda não tem — projeto antigo, salvo
 * antes desta versão. Nada se perde: o antigo "o que está dando errado" (q4)
 * vira mais itens da lista de problemas, e o título que já existia é
 * respeitado como editado.
 */
export function estruturaDeAnswers(answers: Record<string, any> = {}): EstruturaBrief {
  const problemas = separarLista(answers.q2);
  for (const item of separarLista(answers.q4)) {
    if (!problemas.includes(item)) problemas.push(item);
  }
  return {
    problemas: problemas.length ? problemas : [''],
    ganhos: separarLista(answers.q8).length ? separarLista(answers.q8) : [''],
    objetivo: { ...OBJETIVO_VAZIO },
    tituloEditado: Boolean(String(answers.q6 || '').trim()),
  };
}

/**
 * Recalcula o texto de `answers` a partir da `estrutura`.
 *
 * - q2 recebe TODOS os problemas e q4 é esvaziado: o Contrato junta q2 com q4,
 *   e com os dois preenchidos o mesmo problema apareceria duas vezes.
 * - q7 só é reescrito quando o objetivo estruturado tem conteúdo. Projeto
 *   antigo, com objetivo em texto livre, continua com o texto dele até a
 *   pessoa começar a preencher as partes.
 * - q6 segue o título automático enquanto a pessoa não o editar.
 */
export function answersDaEstrutura(answers: Record<string, any>, e: EstruturaBrief): Record<string, any> {
  const novo: Record<string, any> = { ...answers };
  novo.q2 = juntarLista(e.problemas);
  novo.q4 = '';
  novo.q8 = juntarLista(e.ganhos);

  const objetivo = fraseDoObjetivo(e.objetivo);
  const temObjetivoEstruturado = Boolean(
    e.objetivo.indicador.trim() || e.objetivo.atual.trim() || e.objetivo.meta.trim(),
  );
  if (temObjetivoEstruturado) novo.q7 = objetivo;

  if (!e.tituloEditado) novo.q6 = tituloAutomatico(e.objetivo, String(answers.q1 || ''));
  return novo;
}
