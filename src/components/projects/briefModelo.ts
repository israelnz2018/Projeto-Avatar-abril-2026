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
  /**
   * Um projeto pode ter mais de um objetivo (tempo E custo, por exemplo). O
   * PRIMEIRO é o principal: é dele que sai o título, porque título precisa de
   * um foco só.
   */
  objetivos: ObjetivoProjeto[];
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
 * A frase do objetivo: "Reduzir o tempo de emissão de propostas de 5 dias para
 * 1 dia útil até março".
 *
 * Só o "o quê" é obrigatório. Hoje, meta e prazo são opcionais: ao vivo, muita
 * gente sabe o que quer melhorar mas não tem o número na cabeça — e o projeto
 * pode começar assim; medir é justamente a fase seguinte. Cada parte que vier
 * preenchida entra na frase.
 */
export function fraseDoObjetivo(o: ObjetivoProjeto): string {
  const indicador = o.indicador.trim();
  if (!indicador) return '';
  const partes = [`${o.verbo} ${indicador}`];
  if (o.atual.trim()) partes.push(`de ${o.atual.trim()}`);
  if (o.meta.trim()) partes.push(`para ${o.meta.trim()}`);
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

/** O objetivo que dá o título: o primeiro que tenha o "o quê" preenchido. */
export function objetivoPrincipal(objetivos: ObjetivoProjeto[]): ObjetivoProjeto {
  return objetivos.find((o) => o.indicador.trim()) || objetivos[0] || { ...OBJETIVO_VAZIO };
}

/** As frases de todos os objetivos preenchidos, na ordem. */
export function frasesDosObjetivos(objetivos: ObjetivoProjeto[]): string[] {
  return objetivos.map(fraseDoObjetivo).filter(Boolean);
}

/**
 * Garante o formato atual de uma `estrutura` lida do banco. Durante um dia a
 * estrutura guardou UM objetivo em `objetivo`; aqui ele vira o primeiro item
 * de `objetivos`, sem perder o que foi preenchido.
 */
export function normalizarEstrutura(e: any): EstruturaBrief {
  const objetivos: ObjetivoProjeto[] = Array.isArray(e?.objetivos) && e.objetivos.length
    ? e.objetivos.map((o: any) => ({ ...OBJETIVO_VAZIO, ...o }))
    : e?.objetivo ? [{ ...OBJETIVO_VAZIO, ...e.objetivo }] : [{ ...OBJETIVO_VAZIO }];
  return {
    problemas: Array.isArray(e?.problemas) && e.problemas.length ? e.problemas : [''],
    ganhos: Array.isArray(e?.ganhos) && e.ganhos.length ? e.ganhos : [''],
    objetivos,
    tituloEditado: Boolean(e?.tituloEditado),
  };
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
    objetivos: [{ ...OBJETIVO_VAZIO }],
    tituloEditado: Boolean(String(answers.q6 || '').trim()),
  };
}

/**
 * Recalcula o texto de `answers` a partir da `estrutura`.
 *
 * - q2 recebe TODOS os problemas e q4 é esvaziado: o Contrato junta q2 com q4,
 *   e com os dois preenchidos o mesmo problema apareceria duas vezes.
 * - q7 só é reescrito quando algum objetivo estruturado tem conteúdo. Projeto
 *   antigo, com objetivo em texto livre, continua com o texto dele até a
 *   pessoa começar a preencher as partes. Com um objetivo, q7 é a frase; com
 *   vários, é a lista com marcadores.
 * - q6 segue o título automático enquanto a pessoa não o editar.
 */
export function answersDaEstrutura(answers: Record<string, any>, e: EstruturaBrief): Record<string, any> {
  const novo: Record<string, any> = { ...answers };
  novo.q2 = juntarLista(e.problemas);
  novo.q4 = '';
  novo.q8 = juntarLista(e.ganhos);

  const frases = frasesDosObjetivos(e.objetivos);
  const temObjetivoEstruturado = e.objetivos.some(
    (o) => o.indicador.trim() || o.atual.trim() || o.meta.trim(),
  );
  if (temObjetivoEstruturado) novo.q7 = frases.length > 1 ? juntarLista(frases) : (frases[0] || '');

  if (!e.tituloEditado) novo.q6 = tituloAutomatico(objetivoPrincipal(e.objetivos), String(answers.q1 || ''));
  return novo;
}
