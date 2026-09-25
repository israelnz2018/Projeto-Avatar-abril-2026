/**
 * O melhor horário para publicar cada peça, por rede e por dia da semana.
 *
 * Antes era uma hora fixa por tipo de peça, e isso errava por construção: a
 * mesma peça não rende no mesmo horário numa terça e num sábado. O LinkedIn
 * quase não existe no fim de semana; o Instagram muda de janela conforme o dia;
 * e a quarta às 16h é o melhor horário isolado da semana inteira no LinkedIn.
 *
 * Os números vêm de estudos de 2026 — Buffer (4,8 milhões de posts no
 * LinkedIn), Sprout Social, Hootsuite e SocialPilot — lidos para o HORÁRIO DE
 * BRASÍLIA, que é o fuso em que a agenda publica. Não são palpite, mas também
 * não são lei: a hora continua editável na tela, e o que o consultor escolheu
 * ganha da sugestão.
 *
 * Uma limitação conhecida: o Reel cruza automaticamente para o YouTube Shorts,
 * e o melhor horário do Shorts (15h–17h) não é o do Instagram (11h30–13h30).
 * Como a peça é a mesma e sai no mesmo instante, a grade otimiza o Instagram,
 * que é a rede principal dela.
 */
import { TipoPeca } from '../types/marketing';

/** Onde a peça é publicada, para efeito de horário. */
export type FamiliaDeRede = 'reels' | 'feed' | 'linkedin';

/** O índice é o dia da semana do JavaScript: 0 = domingo … 6 = sábado. */
export type HorariosDaSemana = [string, string, string, string, string, string, string];

export const HORARIOS_POR_DIA: Record<FamiliaDeRede, HorariosDaSemana> = {
  // Reel e carrossel em vídeo (Instagram Reels, + Facebook e Shorts de carona).
  // Terça a quinta no almoço é a janela mais forte; segunda e sexta rendem mais
  // à noite; no fim de semana, de manhã.
  //        dom      seg      ter      qua      qui      sex      sáb
  reels: ['11:00', '19:00', '11:30', '11:30', '11:30', '19:00', '11:00'],
  // Carrossel do feed. Post estático tem pico curto, então o horário pesa mais:
  // a faixa da manhã (9h–12h) é a melhor de terça a quinta.
  feed: ['11:00', '12:00', '09:30', '09:30', '09:30', '12:00', '11:00'],
  // As três peças do LinkedIn. Quarta às 16h é o melhor horário da semana
  // inteira; terça e quinta, meio da manhã. Fim de semana é fraco no LinkedIn —
  // fica no começo do dia, para quem mesmo assim quiser marcar.
  linkedin: ['10:00', '10:00', '11:00', '16:00', '11:00', '10:00', '10:00'],
};

export function familiaDaPeca(tipo: TipoPeca): FamiliaDeRede {
  if (tipo === 'carrossel-feed') return 'feed';
  if (tipo === 'reel' || tipo === 'carrossel-video') return 'reels';
  return 'linkedin';
}

/** O melhor horário para esta peça NESTE dia, em horário de Brasília. */
export function horaSugerida(tipo: TipoPeca, dia: Date): string {
  return HORARIOS_POR_DIA[familiaDaPeca(tipo)][dia.getDay()];
}
