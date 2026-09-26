/**
 * O melhor horário para publicar cada peça, por rede e por dia da semana.
 *
 * Antes era uma hora fixa por tipo de peça, e isso errava por construção: a
 * mesma peça não rende no mesmo horário numa terça e num sábado. O LinkedIn
 * quase não existe no fim de semana; o Instagram muda de janela conforme o dia;
 * e a quarta às 16h é o melhor horário isolado da semana inteira no LinkedIn.
 *
 * Os números vêm de estudos de 2026 — Buffer (4,8 milhões de posts no
 * LinkedIn), Sprout Social, Hootsuite, SocialPilot e Metricool (800 mil vídeos
 * do YouTube) — lidos para o HORÁRIO DE BRASÍLIA, que é o fuso em que a agenda
 * publica. Não são palpite, mas também não são lei: a hora continua editável
 * na tela, e o que o consultor escolheu ganha da sugestão.
 *
 * MÚLTIPLOS HORÁRIOS POR DIA, desde 2026-09-27.
 *
 * A estratégia mudou para 2 a 3 cortes por dia (vídeo completo semanal
 * alimentando os cortes, publicados em sequência até acabar o estoque). Um
 * horário só por dia empilhava a segunda e a terceira peça do dia em cima da
 * primeira. Agora cada dia guarda uma LISTA de horários, na ordem em que
 * devem ser usados — e como o Reel cruza sozinho para Facebook, YouTube
 * Shorts e (quando o TikTok for aprovado) TikTok, espalhar os horários do dia
 * cobre o pico de VÁRIAS redes em vez de um horário só tentar servir a todas:
 * o Instagram pica no almoço, o YouTube Shorts pica à tarde (15h–17h), e à
 * noite pega quem só abre o telefone depois do trabalho — e é também quando o
 * TikTok tem o segundo pico do dia.
 */
import { TipoPeca } from '../types/marketing';

/** Onde a peça é publicada, para efeito de horário. */
export type FamiliaDeRede = 'reels' | 'feed' | 'linkedin';

/** Uma lista de horários HH:MM, na ordem em que devem ser usados no dia. */
export type HorariosDoDia = string[];

/** O índice é o dia da semana do JavaScript: 0 = domingo … 6 = sábado. */
export type HorariosDaSemana = [
  HorariosDoDia, HorariosDoDia, HorariosDoDia, HorariosDoDia,
  HorariosDoDia, HorariosDoDia, HorariosDoDia,
];

export const HORARIOS_POR_DIA: Record<FamiliaDeRede, HorariosDaSemana> = {
  // Reel e carrossel em vídeo — Instagram Reels, e de carona: Facebook,
  // YouTube Shorts e TikTok (quando ligado). Três horários por dia de semana
  // forte: almoço (pico do Instagram), meio da tarde (pico do YouTube Shorts)
  // e noite (pico geral e segundo pico do TikTok). Quarta é também o melhor
  // dia isolado do TikTok. Fim de semana e pontas da semana (segunda/sexta)
  // têm o dia inteiro mais fraco, então os horários vêm mais espaçados.
  reels: [
    ['11:00', '15:00', '19:30'], // domingo
    ['12:30', '16:30', '19:30'], // segunda
    ['11:30', '15:30', '20:00'], // terça
    ['11:30', '15:30', '20:00'], // quarta
    ['11:30', '15:30', '20:00'], // quinta
    ['12:30', '16:30', '19:30'], // sexta
    ['11:00', '15:00', '19:30'], // sábado
  ],
  // Carrossel do feed. Post estático tem pico curto, então o horário pesa
  // mais que a quantidade: continua 1 por dia — a estratégia de volume é dos
  // cortes de vídeo, não do carrossel de fotos.
  feed: [
    ['11:00'], ['12:00'], ['09:30'], ['09:30'], ['09:30'], ['12:00'], ['11:00'],
  ],
  // As três peças do LinkedIn. Quarta às 16h é o melhor horário da semana
  // inteira; terça e quinta, meio da manhã. Fim de semana é fraco no LinkedIn.
  // Continua 1 por dia DE PROPÓSITO: o LinkedIn pune volume — 2+ posts no
  // mesmo dia derrubam o alcance em mais de 40% (dado medido, 2026). Só as
  // melhores peças da semana devem chegar até aqui.
  linkedin: [
    ['10:00'], ['10:00'], ['11:00'], ['16:00'], ['11:00'], ['10:00'], ['10:00'],
  ],
};

export function familiaDaPeca(tipo: TipoPeca): FamiliaDeRede {
  if (tipo === 'carrossel-feed') return 'feed';
  if (tipo === 'reel' || tipo === 'carrossel-video') return 'reels';
  return 'linkedin';
}

/**
 * O horário sugerido para a peça número `ocupados` deste dia e família.
 *
 * `ocupados` é quantas peças da MESMA família já estão marcadas neste dia —
 * 0 para a primeira, 1 para a segunda, e por aí vai. A próxima usa o próximo
 * horário da lista, em vez de empilhar todas no mesmo minuto.
 *
 * Passar do fim da lista (mais peças no dia do que horários definidos) soma
 * 90 minutos a partir do último em vez de travar ou repetir — 90 min é folga
 * suficiente para não competir pela mesma leva de seguidores online.
 */
export function horaSugerida(tipo: TipoPeca, dia: Date, ocupados = 0): string {
  const horarios = HORARIOS_POR_DIA[familiaDaPeca(tipo)][dia.getDay()];
  if (ocupados < horarios.length) return horarios[ocupados];

  const [h, m] = horarios[horarios.length - 1].split(':').map(Number);
  const minutosExtra = (ocupados - horarios.length + 1) * 90;
  const total = h * 60 + m + minutosExtra;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
