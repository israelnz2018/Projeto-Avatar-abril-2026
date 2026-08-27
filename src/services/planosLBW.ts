/**
 * Fonte única dos três planos comerciais da LBW (a "escada" de /plataformalbw).
 *
 * Existe porque preço e link de checkout precisavam aparecer em dois lugares —
 * a landing e o popup de curso bloqueado — e cópia manual entre eles já tinha
 * começado a divergir. Qualquer mudança de preço ou de link acontece AQUI e os
 * dois lados acompanham.
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
    resumo: 'Todos os cursos da LBW, com avaliações e certificados',
    parcela: '12x de R$ 61,74',
    vista: 597,
    checkout: 'https://pay.hotmart.com/N102603781W',
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
    parcela: '12x de R$ 103,11',
    vista: 997,
    precoDe: 1497,
    checkout: 'https://pay.hotmart.com/U107332530P',
  },
];

/**
 * Degrau que o popup destaca. Hoje é o último: como 'cursos-software' e
 * 'plataforma' estão os dois em R$ 997, o de cima entrega estritamente mais
 * pelo mesmo valor — destacar o do meio mandaria a pessoa pagar igual por
 * menos. Se os preços voltarem a ser diferentes, revisar esta escolha.
 */
export const PLANO_DESTAQUE: PlanoLBW['id'] = 'plataforma';
