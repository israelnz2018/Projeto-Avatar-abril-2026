/**
 * quizSeed2 — trilhas 5, 6, 7 e a montagem da trilha 8.
 * (separado de quizSeed.ts só para manter os arquivos legíveis)
 */

import type { QuizQuestion } from './quizService';

const q = (id: string, text: string, options: [string, string, string, string], correctIndex: number): QuizQuestion => ({
  id, text, options, correctIndex,
});

// ===================================================================================
// TRILHA 5 — Gerenciamento de Risco Baseado em FMEA e PMI
// ===================================================================================
export const T5: QuizQuestion[] = [
  q('t5-1', 'Qual é o objetivo principal do gerenciamento de riscos em projetos?', ['Eliminar todos os riscos', 'Antecipar problemas potenciais e planejar respostas antes que ocorram', 'Aumentar a incerteza', 'Ignorar riscos de baixa probabilidade'], 1),
  q('t5-2', 'O que significa FMEA?', ['Análise Financeira de Empresas', 'Análise dos Modos de Falha e seus Efeitos', 'Ferramenta de Medição Estatística Avançada', 'Fluxo de Manufatura e Estoque Ajustado'], 1),
  q('t5-3', 'No FMEA, o RPN (Número de Prioridade de Risco) é calculado por:', ['Severidade + Ocorrência + Detecção', 'Severidade × Ocorrência × Detecção', 'Apenas Severidade', 'Ocorrência ÷ Detecção'], 1),
  q('t5-4', 'No FMEA, "Severidade" mede:', ['A frequência da falha', 'A gravidade do efeito da falha para o cliente/processo', 'A facilidade de detectar a falha', 'O custo da peça'], 1),
  q('t5-5', 'No FMEA, "Detecção" avalia:', ['O quanto a falha é grave', 'A capacidade de detectar a falha antes que ela afete o cliente', 'A frequência de ocorrência', 'O preço do reparo'], 1),
  q('t5-6', 'Um Risk Register (registro de riscos) serve para:', ['Listar apenas os custos', 'Documentar riscos, probabilidade, impacto e respostas planejadas', 'Substituir o cronograma', 'Medir a capabilidade'], 1),
  q('t5-7', 'As principais estratégias de resposta a riscos negativos são:', ['Ignorar, adiar, esquecer', 'Evitar, mitigar, transferir e aceitar', 'Aumentar, dobrar, triplicar', 'Somente aceitar'], 1),
  q('t5-8', 'Priorizar riscos por probabilidade × impacto ajuda a:', ['Tratar todos igualmente', 'Focar recursos nos riscos mais críticos primeiro', 'Eliminar o registro de riscos', 'Aumentar a severidade'], 1),
  q('t5-9', 'Segundo o PMI, o gerenciamento de riscos deve ser:', ['Feito só no fim do projeto', 'Um processo contínuo ao longo de todo o projeto', 'Opcional', 'Responsabilidade só da diretoria'], 1),
  q('t5-10', 'A diferença entre risco e problema é:', ['São a mesma coisa', 'Risco é um evento incerto futuro; problema é um risco que já ocorreu', 'Problema é sempre positivo', 'Risco nunca vira problema'], 1),
  q('t5-11', 'Um plano de mitigação de risco tem como objetivo:', ['Aumentar a probabilidade do risco', 'Reduzir a probabilidade e/ou o impacto do risco', 'Ignorar o risco', 'Transferir a culpa'], 1),
  q('t5-12', 'Transferir um risco significa, por exemplo:', ['Ignorá-lo completamente', 'Repassar a responsabilidade a terceiros (ex: seguro, terceirização)', 'Aumentar seu impacto', 'Documentá-lo apenas'], 1),
  q('t5-13', 'Riscos positivos (oportunidades) podem ser tratados com estratégias como:', ['Evitar e mitigar', 'Explorar, melhorar, compartilhar e aceitar', 'Ignorar sempre', 'Transferir a culpa'], 1),
  q('t5-14', 'O FMEA é mais eficaz quando aplicado:', ['Depois que a falha já causou danos', 'De forma preventiva, antes que as falhas ocorram', 'Somente em auditorias', 'Apenas no encerramento do projeto'], 1),
  q('t5-15', 'Monitorar riscos ao longo do projeto permite:', ['Eliminar a necessidade de planejamento', 'Identificar novos riscos e ajustar respostas conforme o projeto evolui', 'Ignorar mudanças', 'Reduzir a comunicação'], 1),
];

// ===================================================================================
// TRILHA 6 — Fundamentos Lean e Eliminação dos Desperdícios (TPS, Muri/Mura/Muda)
// ===================================================================================
export const T6: QuizQuestion[] = [
  q('t6-1', 'O que significa "Lean" na filosofia de melhoria?', ['Produzir o máximo possível', 'Maximizar valor ao cliente eliminando desperdícios', 'Reduzir a qualidade para cortar custos', 'Aumentar estoques'], 1),
  q('t6-2', 'Os três "M" do Sistema Toyota de Produção são:', ['Meta, Método, Medida', 'Muri, Mura e Muda', 'Marca, Mercado, Margem', 'Máquina, Mão de obra, Material'], 1),
  q('t6-3', 'O que é "Muda"?', ['Sobrecarga', 'Desperdício — atividade que não agrega valor', 'Variabilidade', 'Padronização'], 1),
  q('t6-4', 'O que é "Muri"?', ['Desperdício', 'Sobrecarga de pessoas ou equipamentos além do razoável', 'Irregularidade', 'Fluxo contínuo'], 1),
  q('t6-5', 'O que é "Mura"?', ['Sobrecarga', 'Irregularidade/variabilidade no fluxo de trabalho', 'Desperdício de material', 'Padronização'], 1),
  q('t6-6', 'Qual destes é um dos 8 desperdícios clássicos do Lean?', ['Agregar valor ao cliente', 'Superprodução', 'Padronizar o processo', 'Treinar a equipe'], 1),
  q('t6-7', 'O desperdício de "espera" acontece quando:', ['O processo flui perfeitamente', 'Pessoas ou materiais ficam parados aguardando a próxima etapa', 'O cliente recebe valor', 'Há padronização'], 1),
  q('t6-8', 'O conceito de "valor" no Lean é definido por:', ['Pela empresa apenas', 'Pelo que o cliente está disposto a pagar', 'Pelo custo de produção', 'Pelo tamanho do estoque'], 1),
  q('t6-9', 'O que é fluxo contínuo (one-piece-flow)?', ['Produzir em grandes lotes', 'Mover o trabalho peça a peça sem interrupções e estoques intermediários', 'Acumular estoque entre etapas', 'Parar a produção com frequência'], 1),
  q('t6-10', 'O 5S é uma ferramenta Lean voltada para:', ['Análise estatística', 'Organização e padronização do ambiente de trabalho', 'Gestão financeira', 'Mapeamento de riscos'], 1),
  q('t6-11', 'Kaizen significa:', ['Grande mudança radical única', 'Melhoria contínua incremental com envolvimento de todos', 'Corte de pessoal', 'Aumento de estoque'], 1),
  q('t6-12', 'O desperdício de "transporte" refere-se a:', ['Movimentação desnecessária de materiais entre locais', 'Treinamento da equipe', 'Agregar valor', 'Padronização'], 0),
  q('t6-13', 'O Value Stream Map (VSM / mapa de fluxo de valor) serve para:', ['Calcular o lucro', 'Visualizar todo o fluxo de valor e identificar desperdícios', 'Substituir o Ishikawa', 'Medir a variância'], 1),
  q('t6-14', 'O desperdício de "inventário/estoque" é problemático porque:', ['Melhora o fluxo de caixa', 'Imobiliza capital e esconde problemas do processo', 'Agrega valor ao cliente', 'Reduz o lead time'], 1),
  q('t6-15', 'A cultura Lean se sustenta principalmente por:', ['Ferramentas isoladas aplicadas uma vez', 'Uma mentalidade de melhoria contínua no dia a dia de todos', 'Decisões só da diretoria', 'Aumento da variabilidade'], 1),
];

// ===================================================================================
// TRILHA 7 — Estatística Aplicada à Tomada de Decisão
// (teste de hipótese, MSA, Cp/Cpk, ANOVA, CEP — baseado nas provas Hotmart)
// ===================================================================================
export const T7: QuizQuestion[] = [
  q('t7-1', 'Qual é a finalidade do teste de normalidade?', ['Medir a variabilidade', 'Determinar se os dados seguem uma distribuição normal', 'Calcular a média', 'Priorizar problemas'], 1),
  q('t7-2', 'Quando se usa o teste T para uma amostra (1 sample T)?', ['Para comparar variâncias', 'Para comparar a média de uma amostra com uma média de referência', 'Para dados categóricos', 'Para medir correlação'], 1),
  q('t7-3', 'Qual teste compara médias de três ou mais grupos?', ['Teste T', 'ANOVA', 'Qui-quadrado', 'Mann-Whitney'], 1),
  q('t7-4', 'O que a Capabilidade de Processo (Cp/Cpk) avalia?', ['O custo de produção', 'A capacidade do processo de produzir dentro das especificações', 'A satisfação do cliente', 'O prazo de entrega'], 1),
  q('t7-5', 'Qual a diferença entre Cp e Cpk?', ['São idênticos', 'Cp considera só a variabilidade; Cpk também considera a centralização', 'Cpk mede só defeitos', 'Cp avalia dados binomiais'], 1),
  q('t7-6', 'O que significa DPMO?', ['Total de defeitos', 'Defeitos por milhão de oportunidades', 'Desvio padrão médio', 'Tempo de produção'], 1),
  q('t7-7', 'MSA (Análise do Sistema de Medição / R&R) avalia:', ['A média do processo', 'A confiabilidade e variação do sistema de medição', 'O lucro', 'A sazonalidade'], 1),
  q('t7-8', 'Qual teste é usado para comparar duas medianas independentes?', ['Teste F', 'Teste de Mann-Whitney', 'Teste T pareado', 'ANOVA'], 1),
  q('t7-9', 'O objetivo do CEP (Controle Estatístico de Processo) é:', ['Aumentar a variabilidade', 'Monitorar e controlar a variabilidade para garantir estabilidade', 'Substituir a inspeção sem critério', 'Reduzir custos ignorando qualidade'], 1),
  q('t7-10', 'Uma causa comum de variação é caracterizada por:', ['Uma falha grave e isolada', 'Pequenas variações naturais dentro dos limites normais do processo', 'Um erro humano pontual', 'Uma quebra de máquina'], 1),
  q('t7-11', 'Um exemplo de causa especial de variação é:', ['Variação natural do processo', 'Um operador inserindo peças erradas no processo', 'Oscilação normal de temperatura', 'Diferença mínima esperada entre lotes'], 1),
  q('t7-12', 'Se pontos aparecem fora dos limites de controle, isso indica:', ['Processo estável', 'Provável causa especial de variação afetando o processo', 'Nada de anormal', 'Que os limites estão errados'], 1),
  q('t7-13', 'A carta X̄-R é indicada quando o subgrupo é:', ['Muito grande (n>20)', 'Pequeno (geralmente entre 3 e 5)', 'Sempre igual a 1', 'Irrelevante'], 1),
  q('t7-14', 'Um p-valor menor que 0,05 (a 95% de confiança) no teste de normalidade indica:', ['Os dados são normais', 'Os dados NÃO seguem distribuição normal', 'Não há conclusão possível', 'A média é zero'], 1),
  q('t7-15', 'A regressão logística é usada quando:', ['Entrada e saída são contínuas', 'A saída (variável dependente) é categórica/discreta', 'Não há variáveis', 'Só para séries temporais'], 1),
];

// ===================================================================================
// TRILHA 8 — 25 questões amostradas IDÊNTICAS das trilhas 2..7
// Regra: pega questões reais das trilhas 2 a 7 (sem inventar novas).
// Distribuição: ~4-5 por trilha, totalizando 25.
// ===================================================================================
export function buildT8(banks: Record<number, QuizQuestion[]>): QuizQuestion[] {
  // Índices escolhidos por trilha (as mais representativas de cada uma).
  const pick: Record<number, number[]> = {
    2: [0, 1, 2, 7],           // pergunta antes do gráfico, Pareto, histograma, correlação≠causa
    3: [0, 1, 3, 10],          // objetivo mudança, ADKAR, 1º passo ADKAR, maior risco
    4: [0, 3, 4, 5],           // apresentação clara, SCQA, impacto, C-level
    5: [1, 2, 6, 8],           // FMEA, RPN, estratégias de resposta, PMI contínuo
    6: [0, 1, 5, 10],          // Lean, 3 M, 8 desperdícios, Kaizen
    7: [0, 3, 4, 8, 13],       // normalidade, Cp/Cpk, Cp vs Cpk, CEP, p-valor (5 questões)
  };
  const out: QuizQuestion[] = [];
  for (const trilhaStr of Object.keys(pick)) {
    const trilha = Number(trilhaStr);
    const bank = banks[trilha] || [];
    for (const idx of pick[trilha]) {
      const original = bank[idx];
      if (original) {
        // Reusa IDÊNTICA, só prefixa o id pra não colidir com a trilha original.
        out.push({ ...original, id: `t8-${original.id}` });
      }
    }
  }
  return out; // 4+4+4+4+4+5 = 25
}
