/** Normaliza nomes legados que ainda carregam prefixos como "8 - ". */
export function normalizeCourseName(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^\d+\s*[-–—.]\s*/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function courseNamesMatch(a: unknown, b: unknown): boolean {
  const left = normalizeCourseName(a);
  const right = normalizeCourseName(b);
  return Boolean(left && right && left === right);
}

export function hasCourseAccess(grantedCourses: readonly string[] | undefined, course: unknown): boolean {
  return (grantedCourses || []).some((granted) => courseNamesMatch(granted, course));
}
