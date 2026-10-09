/**
 * Os três planos comerciais da LBW (a "escada" de /plataformalbw), separados da
 * copy de marketing: preço e link de checkout mudam sozinhos, o texto não.
 * Qualquer alteração de valor ou de link acontece AQUI.
 *
 * A escada é cumulativa: cada degrau contém o anterior.
 */
export interface PlanoLBW {
  id: 'cursos' | 'cursos-software' | 'plataforma';
  /** Nome curto, para o popup. O nome comercial completo fica na landing. */
  nome: string;
  /** O que este degrau acrescenta ao anterior, em uma linha. */
  resumo: string;
  parcela: string;
  vista: number;
  /** Preço riscado, quando o degrau está em condição promocional. */
  precoDe?: number;
  checkout: string;
}

export const PLANOS_LBW: PlanoLBW[] = [
  {
    id: 'cursos',
    nome: 'Formação Profissional',
    resumo: '100% dos cursos disponíveis na aba Educação, com certificado para cada curso concluído',
    parcela: '12x de R$ 61,74',
    vista: 597,
    // Conferido direto no <title> da página de checkout da Hotmart (o link que
    // o Israel tinha passado para este degrau abria, na prática, o produto
    // "Plataforma Profissional" — o title da OUTRA página de checkout). Os
    // dois links estavam trocados entre este degrau e o degrau 3.
    checkout: 'https://pay.hotmart.com/U107332530P',
  },
  {
    id: 'cursos-software',
    nome: 'Formação + Software LBW',
    resumo: 'Tudo acima e todos os módulos de Data Analysis',
    parcela: '12x de R$ 103,11',
    vista: 997,
    checkout: 'https://pay.hotmart.com/Q100793649F',
  },
  {
    id: 'plataforma',
    nome: 'Plataforma Profissional',
    resumo: 'Tudo acima e os projetos guiados Yellow, Green e Black Belt',
    // PREÇO CHEIO, sem parcela e sem riscado: o desconto deste degrau não vive
    // mais na página. Quem quer condição melhor fala com o Israel pelo botão
    // logo abaixo do de compra, e recebe um link de checkout com cupom.
    // Mostrar "12x de" aqui competiria com o valor à vista e tiraria a força
    // do número cheio, que é justamente o que faz a conversa valer a pena.
    parcela: 'R$ 1.497',
    vista: 1497,
    // Ver nota no degrau 'cursos': o <title> da Hotmart confirma que este link
    // é de fato o produto "Plataforma Profissional em Gestão de Projetos de
    // Melhoria" — o outro link é que estava aqui por engano.
    checkout: 'https://pay.hotmart.com/N102603781W',
  },
];
