/**
 * Registro canônico de iniciativas (cursos E tipos de projeto).
 *
 * Existe por um motivo só: a plataforma inteira referencia curso/projeto pelo NOME
 * — `users.cursosAcesso[].curso`, `users.cursosLiberados[]`, `knowledge_base.course`,
 * `support_materials.cursos[]`, `quizzes.titulo`. Nome é rótulo, não identidade:
 * renomear quebrava o vínculo e o aluno perdia acesso ao que comprou.
 *
 * Aqui qualquer referência — id, nome atual ou nome antigo — é traduzida para um
 * ID canônico. Com isso renomear deixa de impactar qualquer outra parte, presente
 * ou passada, e nenhum dado gravado precisa ser migrado.
 *
 * O registro é preenchido em `getInitiatives()`, único caminho de leitura das
 * iniciativas. Enquanto estiver vazio (primeiro render, testes), a comparação cai
 * no confronto de nomes normalizados — exatamente o comportamento anterior.
 */

/** Normaliza nomes legados que ainda carregam prefixos como "8 - ". */
export function normalizeCourseName(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^\d+\s*[-–—.]\s*/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

interface IniciativaRegistravel {
  id: string;
  name?: string;
  /** Nomes que esta iniciativa já teve. Gravado a cada renomeação. */
  nomesAnteriores?: string[];
}

let refPorChave = new Map<string, string>();

/**
 * Reindexa o registro. Chamado a cada leitura de iniciativas.
 *
 * Duas passadas de propósito: o nome ATUAL de um curso sempre vence o nome
 * histórico de outro. Sem isso, reaproveitar um nome antigo em curso novo faria
 * a referência apontar pro curso errado.
 */
export function setCourseRegistry(initiatives: readonly IniciativaRegistravel[]): void {
  const mapa = new Map<string, string>();

  for (const ini of initiatives) {
    if (!ini?.id) continue;
    mapa.set(ini.id, ini.id);
    const atual = normalizeCourseName(ini.name);
    if (atual) mapa.set(atual, ini.id);
  }

  for (const ini of initiatives) {
    if (!ini?.id || !Array.isArray(ini.nomesAnteriores)) continue;
    for (const antigo of ini.nomesAnteriores) {
      const chave = normalizeCourseName(antigo);
      if (chave && !mapa.has(chave)) mapa.set(chave, ini.id);
    }
  }

  refPorChave = mapa;
}

/** ID canônico de uma referência (id, nome atual ou nome antigo). null se desconhecida. */
export function canonicalCourseRef(value: unknown): string | null {
  const bruto = String(value ?? '').trim();
  if (!bruto) return null;
  return refPorChave.get(bruto) || refPorChave.get(normalizeCourseName(bruto)) || null;
}

/** Nome atual para exibir a partir de qualquer referência. Devolve null se não achar. */
export function courseDisplayName(
  value: unknown,
  initiatives: readonly IniciativaRegistravel[]
): string | null {
  const ref = canonicalCourseRef(value);
  return ref ? initiatives.find((i) => i.id === ref)?.name || null : null;
}
