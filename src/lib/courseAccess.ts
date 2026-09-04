import { canonicalCourseRef, normalizeCourseName } from './courseRegistry';

export { normalizeCourseName };

/**
 * Duas referências apontam para o mesmo curso/tipo de projeto?
 *
 * Compara pela IDENTIDADE (id canônico) sempre que os dois lados são conhecidos —
 * é o que faz renomear não quebrar nada. Quando um dos lados não está no registro
 * (curso apagado, referência órfã, registro ainda não carregado), cai na comparação
 * de nomes normalizados, que é como isto funcionava antes.
 */
export function courseNamesMatch(a: unknown, b: unknown): boolean {
  const refA = canonicalCourseRef(a);
  const refB = canonicalCourseRef(b);
  if (refA && refB) return refA === refB;

  const left = normalizeCourseName(a);
  const right = normalizeCourseName(b);
  return Boolean(left && right && left === right);
}

export function hasCourseAccess(grantedCourses: readonly string[] | undefined, course: unknown): boolean {
  return (grantedCourses || []).some((granted) => courseNamesMatch(granted, course));
}
