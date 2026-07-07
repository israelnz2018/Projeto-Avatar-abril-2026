/**
 * quizSeed — banco de questões inicial das 8 provas (editável pelo admin depois).
 *
 * Regras aplicadas:
 *   - Trilhas 1..7: 15 questões cada, SEM repetição entre trilhas.
 *   - Trilha 8: 25 questões amostradas IDÊNTICAS das trilhas 2..7.
 *   - Baseado nas provas reais recuperadas da Hotmart + conteúdo das 8 trilhas.
 *   - correctIndex = índice (0..3) da alternativa correta. GABARITO SUGERIDO — Israel revisa depois.
 *
 * Títulos batem com TITULO_CERTIFICADO em Certificate.tsx.
 */

import type { QuizConfig, QuizQuestion } from './quizService';

const q = (id: string, text: string, options: [string, string, string, string], correctIndex: number): QuizQuestion => ({
  id, text, options, correctIndex,
});

// ===================================================================================
// TRILHA 1 — Sobreviva em uma Nova Área e se Destaque no Trabalho (cert. sem "Kit 90 Dias")
// (chegar numa área, entender empresa, SIPOC, desperdícios, ferramentas qualitativas)
// ===================================================================================
const T1: QuizQuestion[] = [
  q('t1-1', 'Ao chegar em uma área nova, qual é o primeiro passo para entregar resultado rápido?', ['Propor grandes mudanças imediatamente', 'Entender o processo, os stakeholders e onde estão os desperdícios', 'Esperar ordens da liderança antes de agir', 'Focar apenas na parte técnica ignorando as pessoas'], 1),
  q('t1-2', 'Para que serve a ferramenta SIPOC?', ['Calcular o custo de produção', 'Ter uma visão macro do processo: fornecedores, entradas, processo, saídas e clientes', 'Substituir a análise estatística', 'Priorizar problemas por gravidade'], 1),
  q('t1-3', 'O que caracteriza um "desperdício" (muda) em um processo?', ['Qualquer atividade que agrega valor ao cliente', 'Toda atividade que consome recursos sem agregar valor ao cliente', 'O tempo gasto em reuniões estratégicas', 'O investimento em treinamento da equipe'], 1),
  q('t1-4', 'Qual ferramenta é mais indicada para gerar muitas ideias em grupo rapidamente?', ['Ishikawa', 'Brainstorming', 'Histograma', 'FMEA'], 1),
  q('t1-5', 'O Diagrama de Ishikawa (espinha de peixe) serve para:', ['Priorizar tarefas por prazo', 'Organizar as possíveis causas de um problema por categorias', 'Medir a variabilidade de um processo', 'Mapear o fluxo de caixa'], 1),
  q('t1-6', 'A técnica dos "5 Porquês" é usada para:', ['Definir metas financeiras', 'Chegar à causa raiz de um problema perguntando "por quê" sucessivamente', 'Comparar médias de dois grupos', 'Criar apresentações executivas'], 1),
  q('t1-7', 'A matriz Esforço × Impacto ajuda a:', ['Calcular o desvio padrão', 'Priorizar ações comparando o esforço necessário com o impacto esperado', 'Mapear stakeholders', 'Medir a satisfação do cliente'], 1),
  q('t1-8', 'O que a ferramenta 5W2H organiza em um plano de ação?', ['Apenas o orçamento do projeto', 'O quê, por quê, onde, quando, quem, como e quanto custa', 'Somente os responsáveis pelas tarefas', 'A sequência estatística dos dados'], 1),
  q('t1-9', 'Um mapa de stakeholders serve para:', ['Listar apenas os fornecedores', 'Identificar as partes interessadas e seu nível de influência/interesse no projeto', 'Calcular a capacidade do processo', 'Definir os limites de controle'], 1),
  q('t1-10', 'Por que entender os KPIs de uma área é importante ao chegar nela?', ['Para aumentar o número de reuniões', 'Para saber o que a área mede como sucesso e direcionar esforços ao que importa', 'Para substituir a liderança', 'Para eliminar a coleta de dados'], 1),
  q('t1-11', 'Qual destes é um exemplo clássico de desperdício em processos?', ['Entregar valor ao cliente no prazo', 'Retrabalho, espera e movimentação desnecessária', 'Treinar a equipe adequadamente', 'Padronizar o procedimento'], 1),
  q('t1-12', 'O fluxo de valor de um processo representa:', ['Apenas o lucro final', 'A sequência de etapas que transformam entradas em saídas para o cliente', 'O organograma da empresa', 'A lista de fornecedores'], 1),
  q('t1-13', 'Ao resolver um problema sem dados, a melhor abordagem é:', ['Adivinhar a solução', 'Usar ferramentas qualitativas estruturadas como Ishikawa e 5 Porquês', 'Ignorar as causas e tratar só o sintoma', 'Esperar o problema desaparecer'], 1),
  q('t1-14', 'O que diferencia um sintoma de uma causa raiz?', ['São a mesma coisa', 'O sintoma é o efeito visível; a causa raiz é a origem real do problema', 'A causa raiz é sempre financeira', 'O sintoma é sempre mais difícil de resolver'], 1),
  q('t1-15', 'Qual é o principal benefício de padronizar um processo?', ['Aumentar a variabilidade', 'Garantir consistência e reduzir erros e retrabalho', 'Eliminar a necessidade de pessoas', 'Complicar a operação'], 1),
];

// ===================================================================================
// TRILHA 2 — Recomendação de Melhoria com Base em Dados
// (a pergunta antes do gráfico, Pareto, histograma, dispersão, tendência, box plot)
// ===================================================================================
const T2: QuizQuestion[] = [
  q('t2-1', 'Antes de escolher um gráfico, o que deve vir primeiro?', ['A cor do gráfico', 'A pergunta de negócio que se quer responder', 'O software a ser usado', 'A quantidade de slides'], 1),
  q('t2-2', 'Qual gráfico é ideal para priorizar problemas pela regra 80/20?', ['Histograma', 'Gráfico de Pareto', 'Boxplot', 'Gráfico de dispersão'], 1),
  q('t2-3', 'O histograma é mais adequado para:', ['Mostrar a correlação entre duas variáveis', 'Visualizar a distribuição de frequência de um conjunto de dados', 'Priorizar causas', 'Acompanhar tendência temporal'], 1),
  q('t2-4', 'O gráfico de dispersão permite analisar:', ['A distribuição de frequência', 'A relação/correlação entre duas variáveis', 'A priorização de defeitos', 'A sazonalidade'], 1),
  q('t2-5', 'Para acompanhar o comportamento de um indicador ao longo do tempo, usa-se:', ['Pareto', 'Gráfico de tendência (série temporal)', 'Ishikawa', 'Matriz GUT'], 1),
  q('t2-6', 'O boxplot é especialmente útil para:', ['Mostrar correlação', 'Identificar a dispersão e os outliers dos dados', 'Priorizar problemas', 'Medir proporções'], 1),
  q('t2-7', 'O que é um outlier?', ['A média dos dados', 'Um valor atípico, muito distante dos demais', 'O valor mais frequente', 'O desvio padrão'], 1),
  q('t2-8', 'Correlação e causalidade: qual afirmação está correta?', ['Correlação sempre implica causa', 'Correlação mede a relação entre variáveis; não prova causa e efeito', 'Causalidade dispensa dados', 'São conceitos idênticos'], 1),
  q('t2-9', 'Uma recomendação baseada em dados é mais forte porque:', ['Depende só da opinião do analista', 'Se sustenta em evidências e reduz o "achismo"', 'Ignora o contexto do negócio', 'Elimina a necessidade de apresentação'], 1),
  q('t2-10', 'O coeficiente de correlação varia entre quais valores?', ['0 e 1', '-1 e 1', '0 e 100', '-2 e 2'], 1),
  q('t2-11', 'Um valor de correlação de 0,85 indica:', ['Correlação negativa fraca', 'Correlação positiva forte', 'Ausência de correlação', 'Erro no cálculo'], 1),
  q('t2-12', 'Dados discretos são caracterizados por:', ['Assumir qualquer valor em um intervalo', 'Representar contagens e números inteiros', 'Serem sempre fracionários', 'Serem sempre qualitativos'], 1),
  q('t2-13', 'Dados contínuos são, por exemplo:', ['Número de defeitos em um lote', 'A altura ou o diâmetro de uma peça medido', 'A quantidade de clientes por dia', 'O número de reclamações'], 1),
  q('t2-14', 'Qual métrica mede a dispersão dos dados em relação à média?', ['Mediana', 'Desvio padrão', 'Moda', 'Coeficiente de correlação'], 1),
  q('t2-15', 'A qualidade de uma análise de dados depende principalmente de:', ['Quantidade de gráficos gerados', 'Qualidade e relevância dos dados coletados', 'Tempo gasto no software', 'Número de cores usadas'], 1),
];

// ===================================================================================
// TRILHA 3 — Gestão de Mudanças e Engajamento de Pessoas
// (ADKAR, stakeholders, resistência, sustentação) — baseado em gerenciamento-de-mudancas
// ===================================================================================
const T3: QuizQuestion[] = [
  q('t3-1', 'Qual é o principal objetivo do gerenciamento de mudanças?', ['Minimizar a comunicação com a equipe', 'Garantir que as mudanças sejam implementadas de forma suave e com baixa resistência', 'Criar regras sem envolver colaboradores', 'Reduzir custos ignorando a qualidade'], 1),
  q('t3-2', 'Qual metodologia é mais focada em gestão de mudanças?', ['DMAIC', 'ADKAR', 'Kanban', 'Scrum'], 1),
  q('t3-3', 'O que NÃO faz parte de um bom plano de gestão de mudanças?', ['Comunicação eficaz', 'Esconder as resistências', 'Treinamento e capacitação', 'Engajamento da liderança'], 1),
  q('t3-4', 'O primeiro passo do modelo ADKAR é:', ['Forçar a mudança', 'Criar consciência (Awareness) sobre a necessidade da mudança', 'Punir quem resiste', 'Enviar e-mails sem acompanhamento'], 1),
  q('t3-5', 'Antes de iniciar as ações de mudança, é essencial conhecer:', ['O orçamento total', 'O nível atual de aceitação da mudança entre os stakeholders', 'O número de funcionários', 'O tempo disponível'], 1),
  q('t3-6', 'Como identificar a raiz da resistência à mudança?', ['Ignorar quem não aceita', 'Obter feedback constante de todos os envolvidos', 'Impor a mudança rapidamente', 'Evitar comunicação'], 1),
  q('t3-7', 'Um bom indicador para medir a aceitação da mudança é:', ['Quantidade de e-mails trocados', 'Nível de satisfação e engajamento dos funcionários afetados', 'Número de reuniões', 'Tempo de implementação'], 1),
  q('t3-8', 'A melhor estratégia para facilitar a aceitação de uma melhoria é:', ['Implementar sem aviso', 'Criar oportunidades para os colaboradores testarem e se familiarizarem', 'Punir quem não se adapta', 'Substituir quem resiste'], 1),
  q('t3-9', 'Como o gerenciamento de mudanças deve ser conduzido na fase de Melhoria?', ['Focando só na parte técnica', 'Definindo soluções com o time e obtendo aprovação da liderança', 'Deixando os funcionários se adaptarem sozinhos', 'Restringindo acesso às novas práticas'], 1),
  q('t3-10', 'Para garantir que a mudança se mantenha após a implementação:', ['Assumir que será adotada automaticamente', 'Criar um plano de sustentação com acompanhamento contínuo', 'Evitar treinamentos', 'Reduzir reuniões'], 1),
  q('t3-11', 'O maior risco de não fazer boa gestão de mudanças é:', ['Gastar mais em treinamento', 'Os funcionários retornarem aos antigos processos com o tempo', 'O projeto atrasar um pouco', 'A equipe trabalhar mais horas'], 1),
  q('t3-12', 'Um teste piloto deve ser realizado:', ['Só quando a alta gestão pedir', 'Antes da implementação total, para avaliar o impacto em menor escala', 'Após a mudança já adotada', 'Só se houver reclamações'], 1),
  q('t3-13', 'Como um líder reforça o sucesso da mudança após os testes?', ['Ignorando feedbacks negativos', 'Comunicando os resultados positivos e reforçando os benefícios', 'Parando os treinamentos', 'Implementando sem comunicação'], 1),
  q('t3-14', 'O feedback dos funcionários durante os testes serve para:', ['Identificar quem é contra', 'Ajustar a abordagem e melhorar a aceitação da mudança', 'Documentar sem ajustes', 'Eliminar qualquer resistência à força'], 1),
  q('t3-15', 'Influenciar sem autoridade formal significa:', ['Dar ordens diretas', 'Conquistar apoio pela credibilidade, relacionamento e argumentos', 'Ignorar os outros', 'Depender apenas do cargo'], 1),
];

// ===================================================================================
// TRILHA 4 — Apresentações Eficazes (SCQA, comunicação C-level, storytelling)
// ===================================================================================
const T4: QuizQuestion[] = [
  q('t4-1', 'Uma apresentação clara e objetiva é importante porque:', ['Elimina a necessidade de análise', 'Facilita a comunicação dos resultados aos stakeholders', 'Torna tudo mais técnico', 'Reduz o tempo de coleta de dados'], 1),
  q('t4-2', 'Para tornar uma apresentação impactante, você deve:', ['Focar apenas nos erros', 'Relacionar os dados com os objetivos do negócio', 'Falar o mais rápido possível', 'Evitar qualquer gráfico'], 1),
  q('t4-3', 'O que deve ser EVITADO ao apresentar resultados a executivos?', ['Destacar os insights principais', 'Usar terminologia técnica excessivamente complexa', 'Conectar dados à decisão', 'Ser claro e objetivo'], 1),
  q('t4-4', 'A estrutura SCQA de storytelling significa:', ['Somente Conclusão e Quadro Analítico', 'Situação, Complicação, Questão e Resposta', 'Slides, Cores, Quantidade e Áudio', 'Sem Conteúdo, Qualquer Apresentação'], 1),
  q('t4-5', 'Apresentar resultados de forma impactante ajuda a:', ['Convencer sem dados sólidos', 'Engajar o público e facilitar a tomada de decisão', 'Destacar só os números favoráveis', 'Eliminar ferramentas estatísticas'], 1),
  q('t4-6', 'Ao comunicar com a liderança (C-level), o ideal é:', ['Mostrar todo o trabalho técnico realizado', 'Comunicar de forma clara e objetiva na linguagem dos stakeholders', 'Usar muitos termos técnicos', 'Fazer uso exclusivo de textos longos'], 1),
  q('t4-7', 'Como garantir que os resultados apresentados sejam impactantes?', ['Destacar só os melhores números', 'Enfatizar as conclusões mais relevantes para o negócio', 'Criar gráficos coloridos sem cuidado com dados', 'Reduzir toda a informação'], 1),
  q('t4-8', 'O objetivo de uma boa apresentação de dados é:', ['Impressionar com complexidade', 'Levar o público a uma decisão informada', 'Mostrar domínio de software', 'Preencher tempo de reunião'], 1),
  q('t4-9', 'Storytelling com dados é eficaz porque:', ['Substitui os dados por histórias', 'Conecta os números a uma narrativa que gera significado e ação', 'Elimina a necessidade de análise', 'Foca só na estética'], 1),
  q('t4-10', 'Influência sem autoridade em uma apresentação depende de:', ['Autoridade do cargo', 'Credibilidade, clareza e argumentos baseados em evidências', 'Velocidade da fala', 'Quantidade de slides'], 1),
  q('t4-11', 'Uma boa recomendação executiva deve:', ['Ser vaga para não comprometer', 'Ser clara, baseada em dados e ligada ao objetivo do negócio', 'Depender só de opinião', 'Ignorar riscos'], 1),
  q('t4-12', 'Ao apresentar um gráfico, o ideal é:', ['Deixar o público interpretar sozinho', 'Destacar o insight principal e o que ele significa para a decisão', 'Mostrar muitos gráficos ao mesmo tempo', 'Não explicar nada'], 1),
  q('t4-13', 'O erro mais comum ao apresentar para a diretoria é:', ['Ser objetivo', 'Afogar a mensagem em detalhes técnicos e perder o "e daí?"', 'Conectar dados à decisão', 'Usar uma narrativa clara'], 1),
  q('t4-14', 'Para engajar o público durante a apresentação, é útil:', ['Ler slides na íntegra', 'Contar uma história que conecta o problema, o dado e a solução', 'Usar jargão técnico', 'Falar sem pausas'], 1),
  q('t4-15', 'O sucesso de uma apresentação de resultados se mede por:', ['Número de slides', 'A decisão/ação que ela gera nos stakeholders', 'Quantidade de gráficos', 'Duração da fala'], 1),
];

// TRILHAS 5-8 continuam em quizSeed2 (importadas abaixo)
import { T5, T6, T7, buildT8 } from './quizSeed2';

const TITULOS: Record<number, string> = {
  1: 'Sobreviva em uma Nova Área e se Destaque no Trabalho',
  2: 'Recomendação de Melhoria com Base em Dados',
  3: 'Gestão de Mudanças e Engajamento de Pessoas',
  4: 'Apresentações Eficazes',
  5: 'Gerenciamento de Risco Baseado em FMEA e PMI',
  6: 'Fundamentos Lean e Eliminação dos Desperdícios',
  7: 'Estatística Aplicada à Tomada de Decisão',
  8: 'Formação em Gestão de Projetos de Melhoria',
};

const BANKS: Record<number, QuizQuestion[]> = { 1: T1, 2: T2, 3: T3, 4: T4, 5: T5, 6: T6, 7: T7, 8: [] };
// Trilha 8 = 25 questões amostradas das trilhas 2..7 (idênticas às originais).
BANKS[8] = buildT8(BANKS);

function mkQuiz(trilha: number): QuizConfig {
  return {
    trilha,
    titulo: TITULOS[trilha],
    passPct: 0.70,
    watchGatePct: 0.70,
    questions: BANKS[trilha],
  };
}

export const DEFAULT_QUIZZES: Record<number, QuizConfig> = {
  1: mkQuiz(1), 2: mkQuiz(2), 3: mkQuiz(3), 4: mkQuiz(4),
  5: mkQuiz(5), 6: mkQuiz(6), 7: mkQuiz(7), 8: mkQuiz(8),
};

export { BANKS };
