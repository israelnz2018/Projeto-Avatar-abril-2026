/**
 * Contas de semana e de dia do calendário de publicação.
 *
 * Ficam fora do componente para poderem ser testadas sozinhas: é aqui que mora o
 * erro clássico de fuso, e ele não aparece olhando a tela — aparece quando o
 * consultor marca segunda-feira e a peça some, ou reaparece no domingo.
 */

/** A segunda-feira da semana em que esta data cai, à meia-noite local. */
export function segundaDaSemana(base: Date): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  // getDay() devolve 0 para domingo; queremos a semana começando na segunda.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Data LOCAL em "YYYY-MM-DD".
 *
 * Nunca `toISOString()`: ela converte para UTC, e de um fuso adiantado como o da
 * Nova Zelândia isso devolve o DIA ANTERIOR durante boa parte do dia. A peça
 * marcada para segunda apareceria no domingo.
 */
export function diaISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Soma dias a uma data.
 *
 * Passa pelo setDate de propósito: ele atravessa a virada do mês e a do horário
 * de verão sem somar 24 h fixas, que é o que faria a semana escorregar uma hora
 * e, na madrugada, um dia inteiro.
 */
export function somarDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Os sete dias da semana que começa nesta segunda. */
export function diasDaSemana(inicio: Date): Date[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => somarDias(inicio, i));
}
