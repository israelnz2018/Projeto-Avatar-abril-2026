/**
 * CURSO ou TIPO DE PROJETO? A regra mora aqui e em nenhum outro lugar.
 *
 * As duas coisas vivem na MESMA coleção `initiatives` e só se distinguem por flags.
 * Espalhar essa checagem pelo código é o que fez curso ser tratado como projeto (e
 * vice-versa) mais de uma vez. Qualquer lugar que precise decidir usa estas funções.
 *
 *   somenteProjeto = true   -> existe só como tipo de projeto, não aparece em Educação
 *   temProjeto     = false  -> curso "só conteúdo", não vira projeto
 *   cursoAssociadoId        -> curso que libera este tipo de projeto (antigos usam o próprio id)
 */

export interface IniciativaClassificavel {
  id: string;
  temProjeto?: boolean;
  somenteProjeto?: boolean;
  cursoAssociadoId?: string;
}

/** Aparece no catálogo de Educação. */
export function ehCurso(i: IniciativaClassificavel | undefined | null): boolean {
  return !!i && !i.somenteProjeto;
}

/**
 * Curso "de verdade", já descontando os registros que são apenas espelho de um
 * outro curso (cursoAssociadoId apontando para terceiro). É a regra usada no
 * catálogo de Educação e nos quizzes.
 */
export function ehCursoRaiz(i: IniciativaClassificavel | undefined | null): boolean {
  return ehCurso(i) && (!i!.cursoAssociadoId || i!.cursoAssociadoId === i!.id);
}

/** Pode ser escolhido como tipo ao criar um projeto. */
export function ehTipoDeProjeto(i: IniciativaClassificavel | undefined | null): boolean {
  return !!i && i.temProjeto !== false;
}
