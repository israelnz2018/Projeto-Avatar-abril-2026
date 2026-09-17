/**
 * Os dois relógios do calendário de publicação.
 *
 * O consultor mora na Nova Zelândia e publica para o Brasil — 15 ou 16 horas de
 * diferença, quase sempre em DIAS diferentes. O calendário era desenhado com o
 * relógio do navegador (ou seja, o da Nova Zelândia), mas quem publica é o worker,
 * e ele usa o horário de Brasília. Resultado: o consultor marcava "segunda, 19h"
 * olhando para a segunda dele, e a peça saía numa hora que ele não tinha previsto.
 *
 * A REGRA, agora explícita: o que está guardado na peça (`agendadoEm` e
 * `agendadoHora`) é SEMPRE horário de Brasília, o fuso de quem lê. Este módulo
 * só traduz para a tela — nada aqui muda o que vai para o banco. Se o fuso
 * escolhido mudasse o valor gravado, trocar de visão moveria todos os posts.
 */

export type IdFuso = 'brasil' | 'nz';

export const FUSOS: { id: IdFuso; nome: string; curto: string; tz: string }[] = [
  { id: 'brasil', nome: 'Brasil', curto: 'BR', tz: 'America/Sao_Paulo' },
  { id: 'nz', nome: 'Nova Zelândia', curto: 'NZ', tz: 'Pacific/Auckland' },
];

/** O fuso em que o worker publica. É o significado do que está gravado na peça. */
export const FUSO_DA_PUBLICACAO: IdFuso = 'brasil';

export function fusoPorId(id: IdFuso) {
  return FUSOS.find((f) => f.id === id) || FUSOS[0];
}

export function tzDe(id: IdFuso): string {
  return fusoPorId(id).tz;
}

/**
 * Quantos minutos este fuso está à frente do UTC naquele instante.
 * Feito com Intl para não depender de tabela de fuso nem de biblioteca.
 */
export function deslocamentoMinutos(data: Date, tz: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(data);

  const p: Record<string, number> = {};
  for (const parte of partes) if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
  const comoSeFosseUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return Math.round((comoSeFosseUtc - data.getTime()) / 60000);
}

/**
 * Um Date cujos campos LOCAIS mostram a hora de parede do fuso pedido.
 *
 * Serve para o desenho do calendário: `segundaDaSemana` e `diaISO` leem getDate()
 * e getDay(), que são sempre do fuso do navegador. Trocando o instante pela
 * diferença entre os dois fusos, a grade sai no fuso certo sem reescrever a conta
 * de semana.
 *
 * SÓ PARA EXIBIR. Este Date não representa o instante verdadeiro — usá-lo em
 * conta de tempo daria erro de horas.
 */
export function comoRelogioDe(data: Date, tz: string): Date {
  const diferenca = deslocamentoMinutos(data, tz) + data.getTimezoneOffset();
  return new Date(data.getTime() + diferenca * 60000);
}

/** 'YYYY-MM-DD' — o dia que está acontecendo naquele fuso. */
export function diaNoFuso(data: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(data);
}

/**
 * O instante exato em que "dia às hora" acontece naquele fuso.
 *
 * Duas passadas de propósito: na virada do horário de verão o deslocamento do
 * palpite inicial pode ser o do outro lado da virada, e a segunda passada
 * corrige. A Nova Zelândia tem horário de verão, então isto não é teoria.
 */
export function instanteDe(dia: string, hora: string, tz: string): Date | null {
  if (!dia) return null;
  const [ano, mes, data] = String(dia).split('-').map(Number);
  const [h, min] = String(hora || '00:00').split(':').map(Number);
  if (!ano || !mes || !data || Number.isNaN(h)) return null;

  const palpite = Date.UTC(ano, mes - 1, data, h, min || 0);
  let instante = palpite - deslocamentoMinutos(new Date(palpite), tz) * 60000;
  instante = palpite - deslocamentoMinutos(new Date(instante), tz) * 60000;
  return new Date(instante);
}

/**
 * Traduz uma hora de parede de um fuso para o outro.
 * "2026-09-21 19:00 em São Paulo" → "2026-09-22 10:00 em Auckland".
 */
export function traduzirRelogio(
  dia: string, hora: string, deTz: string, paraTz: string,
): { dia: string; hora: string } | null {
  const instante = instanteDe(dia, hora, deTz);
  if (!instante) return null;
  return {
    dia: diaNoFuso(instante, paraTz),
    hora: new Intl.DateTimeFormat('pt-BR', {
      timeZone: paraTz, hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(instante),
  };
}

/**
 * Como dizer, em uma linha, a que hora isto sai no OUTRO fuso.
 * Devolve vazio quando não há o que traduzir.
 */
export function equivalenteEm(
  dia: string | undefined, hora: string | undefined, destino: IdFuso,
): string {
  if (!dia) return '';
  const traduzido = traduzirRelogio(dia, hora || '00:00', tzDe(FUSO_DA_PUBLICACAO), tzDe(destino));
  if (!traduzido) return '';

  const data = new Date(`${traduzido.dia}T12:00:00`);
  const diaDaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
  return `${diaDaSemana} ${traduzido.hora}`;
}
