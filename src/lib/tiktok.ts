/**
 * As regras do TikTok que precisam valer IGUAL na tela e no worker.
 *
 * O TikTok é a rede mais exigente das cinco, e por um motivo específico: as
 * Content Sharing Guidelines tratam consentimento como ATO DO USUÁRIO, não
 * como campo de banco. A regra oficial é "there should be a declaration asking
 * for a user's consent before the publish button" e "only start sending content
 * materials to TikTok after the user has expressly consented".
 *
 * Isso vira código aqui, fora do componente, porque a mesma decisão é tomada em
 * dois lugares distantes (o modal de agendamento e a função `agendar`) e antes
 * elas discordavam — a declaração aparecia numa tela e o campo era marcado na
 * outra. Uma função só, testada, impede que voltem a divergir.
 */

/** Formatos que o TikTok aceita por esta integração. */
export type TipoTikTok = 'reel' | 'carrossel-video' | 'carrossel-feed';

export function aceitoNoTiktok(tipo: string): tipo is TipoTikTok {
  return tipo === 'reel' || tipo === 'carrossel-video' || tipo === 'carrossel-feed';
}

/** Vídeo leva declaração de música; carrossel de fotos não tem áudio. */
export function exigeConfirmacaoDeMusica(tipo: string): boolean {
  return tipo === 'reel' || tipo === 'carrossel-video';
}

export type DadosDeConsentimento = {
  tipo: string;
  publicarNoTiktok?: boolean;
  /** A declaração de consentimento esteve VISÍVEL na tela em que ele confirmou. */
  declaracaoExibida: boolean;
  tiktokMusicUsageConfirmed?: boolean;
  tiktokBrandedContent?: boolean;
  tiktokPrivacyLevel?: string | null;
};

/**
 * Se a confirmação de música pode ser registrada como dada.
 *
 * O defeito que isto corrige: a tela marcava `true` sempre que a peça ia para o
 * TikTok e era vídeo — inclusive quando o consultor mexeu na peça pela lista, um
 * lugar onde a declaração de música NUNCA é mostrada. O worker então lia esse
 * campo como prova de consentimento e publicava. Ninguém tinha consentido.
 *
 * Agora só conta quando a declaração esteve de fato na tela. Fora disso, o valor
 * anterior é preservado — um consentimento já dado antes continua válido, mas
 * nenhum é inventado.
 */
export function confirmacaoDeMusica(dados: DadosDeConsentimento): boolean {
  if (!dados.publicarNoTiktok) return dados.tiktokMusicUsageConfirmed === true;
  if (!exigeConfirmacaoDeMusica(dados.tipo)) return dados.tiktokMusicUsageConfirmed === true;
  if (dados.declaracaoExibida) return true;
  return dados.tiktokMusicUsageConfirmed === true;
}

/**
 * Conteúdo de parceria paga não pode sair privado — regra explícita do TikTok
 * ("Branded content visibility cannot be set to private").
 *
 * A tela já desabilita a caixa quando a privacidade é SELF_ONLY, mas a ordem
 * inversa passava: marcar "parceria paga" e SÓ DEPOIS trocar a privacidade para
 * "Somente você" deixava os dois ligados ao mesmo tempo, e o erro só aparecia lá
 * na frente, no worker, com a peça já agendada.
 */
export function conflitoDeMarcaEPrivacidade(dados: DadosDeConsentimento): string | null {
  if (dados.tiktokBrandedContent !== true) return null;
  if (dados.tiktokPrivacyLevel !== 'SELF_ONLY') return null;
  return 'O TikTok não permite parceria paga com visibilidade “Somente você”. Escolha outra privacidade ou desmarque a parceria paga.';
}

/**
 * O que gravar ao agendar. Devolve só os campos do TikTok, já coerentes entre si.
 *
 * Quando há conflito de marca/privacidade, a parceria paga é DESLIGADA em vez de
 * a peça ser recusada: agendar é o momento de arrumar, não de travar o consultor
 * — e a tela avisa o que mudou.
 */
export function camposDeAgendamentoTiktok(dados: DadosDeConsentimento): Record<string, unknown> {
  const ligado = dados.publicarNoTiktok === true && aceitoNoTiktok(dados.tipo);
  const conflito = conflitoDeMarcaEPrivacidade(dados);
  return {
    publicarNoTiktok: ligado,
    tiktokMusicUsageConfirmed: confirmacaoDeMusica({ ...dados, publicarNoTiktok: ligado }),
    tiktokBrandedContent: conflito ? false : dados.tiktokBrandedContent === true,
  };
}
