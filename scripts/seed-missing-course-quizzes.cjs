require('dotenv').config();

const fs = require('node:fs');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const CONSULTOR_ID = 'israel';

const q = (id, text, options, correctIndex, source) => ({ id, text, options, correctIndex, source });

const yellow = [
  q('yellow-01', 'Qual é o principal objetivo da ferramenta “Entendendo o Problema”?', ['Escolher imediatamente a solução mais barata.', 'Aprofundar o entendimento do problema selecionado antes de avançar no projeto.', 'Criar o plano de controle do processo.', 'Calcular o retorno financeiro da solução.'], 1, 'Entendendo o problema com detalhes'),
  q('yellow-02', 'O que representam as letras da Matriz GUT?', ['Gestão, Utilidade e Tempo.', 'Ganho, Urgência e Técnica.', 'Gravidade, Urgência e Tendência.', 'Gravidade, Unidade e Tratamento.'], 2, 'Matriz de Priorização RAB e GUT'),
  q('yellow-03', 'Para qual finalidade a Matriz RAB é especialmente útil?', ['Avaliar soluções considerando rapidez, autonomia e benefício.', 'Calcular a variabilidade estatística do processo.', 'Identificar fornecedores, entradas e clientes.', 'Determinar limites de controle.'], 0, 'Matriz de Priorização RAB e GUT'),
  q('yellow-04', 'Antes de criar um mapa detalhado do processo, como o SIPOC pode ajudar?', ['Calculando o custo de cada atividade.', 'Determinando a causa raiz do problema.', 'Substituindo o mapa detalhado do processo.', 'Apresentando uma visão geral e ajudando a definir o escopo.'], 3, 'Mapa do Processo: Como Identificar corretamente as variaveis de um processo'),
  q('yellow-05', 'Qual é um benefício importante do mapa do processo?', ['Eliminar a necessidade de coletar dados.', 'Visualizar as etapas e variações, padronizar o fluxo e reduzir a dependência do conhecimento individual.', 'Confirmar automaticamente todas as causas do problema.', 'Substituir os indicadores do processo.'], 1, 'Mapa do Processo: Como Identificar corretamente as variaveis de um processo'),
  q('yellow-06', 'O que as espinhas do Diagrama de Ishikawa representam?', ['Soluções já aprovadas pela liderança.', 'Indicadores financeiros do projeto.', 'Causas potenciais que ainda precisam ser investigadas e comprovadas.', 'Causas raízes definitivamente confirmadas.'], 2, 'Quais são as principais funções de uma espinha de peixe?'),
  q('yellow-07', 'Qual é a principal contribuição do Gráfico de Pareto para um projeto de melhoria?', ['Priorizar as categorias que mais contribuem para o problema.', 'Demonstrar que todas as causas possuem a mesma importância.', 'Comprovar estatisticamente a causa raiz.', 'Definir responsáveis e prazos das ações.'], 0, 'Mapa de Análise - Pareto'),
  q('yellow-08', 'O que um histograma ajuda a analisar?', ['A relação entre duas variáveis categóricas.', 'As responsabilidades da equipe do projeto.', 'A sequência das atividades de um processo.', 'A frequência, a variação e o formato da distribuição dos dados.'], 3, 'Mapa de Análise - Histograma'),
  q('yellow-09', 'No Boxplot, o que representa a linha localizada dentro da caixa?', ['A média dos dados.', 'A mediana dos dados.', 'O maior valor da amostra.', 'O limite de especificação.'], 1, 'Mapa de Análise - Box Plot'),
  q('yellow-10', 'Para que é utilizado o Gráfico de Dispersão?', ['Elaborar um cronograma de projeto.', 'Classificar causas nas categorias dos 6 Ms.', 'Avaliar a relação ou correlação entre duas variáveis contínuas.', 'Definir o plano de reação do processo.'], 2, 'Mapa de Análise - Gráfico de Dispersão'),
  q('yellow-11', 'O que o Gráfico de Séries Temporais permite observar?', ['O comportamento dos dados ao longo do tempo, incluindo picos, vales e tendências.', 'Somente a média geral do processo.', 'Apenas os valores atípicos da amostra.', 'A relação entre fornecedores, entradas e clientes.'], 0, 'Mapa de Análise - Gráfico de Séries Temporais'),
  q('yellow-12', 'O que melhor define benchmarking?', ['Copiar integralmente o processo de um concorrente.', 'Comparar apenas os resultados financeiros internos.', 'Substituir a investigação do problema por uma solução conhecida.', 'Pesquisar interna ou externamente boas práticas e soluções alinhadas ao negócio.'], 3, 'Benckmarking'),
  q('yellow-13', 'Como é calculado o resultado de uma Matriz de Critérios?', ['Escolhendo a alternativa com o menor custo, independentemente dos critérios.', 'Multiplicando o peso de cada critério pela pontuação da alternativa e somando os resultados.', 'Somando somente os pesos mais altos.', 'Calculando a média das opiniões sem considerar a importância dos critérios.'], 1, 'Matriz de Beneficio'),
  q('yellow-14', 'Quais informações são organizadas por um plano de ação 5W2H?', ['Somente o responsável, o prazo e o orçamento.', 'Causa, efeito, frequência, gravidade e tendência.', 'O que, por que, onde, quando, quem, como e quanto custa.', 'Fornecedores, entradas, processo, saídas e clientes.'], 2, 'Plano de acao'),
  q('yellow-15', 'Qual é a finalidade principal de um Plano de Controle?', ['Registrar somente os resultados financeiros do projeto.', 'Apresentar uma lista de possíveis soluções.', 'Encerrar automaticamente o projeto depois da implementação.', 'Definir o que será controlado, como será medido, a frequência, os responsáveis e a reação em caso de desvio.'], 3, 'Atualizar Plano de Controle'),
];

const msa = [
  q('msa-01', 'Qual é o objetivo principal de uma Análise do Sistema de Medição (MSA)?', ['Avaliar se o sistema de medição produz dados confiáveis para a tomada de decisão.', 'Calcular apenas o custo dos instrumentos.', 'Substituir a capabilidade do processo.', 'Eliminar a necessidade de calibração.'], 0, 'Introdução a Análise do Sistema de Medição'),
  q('msa-02', 'Qual é a diferença entre exatidão e precisão?', ['Exatidão trata da repetição; precisão trata somente do custo.', 'São exatamente o mesmo conceito.', 'Exatidão indica proximidade do valor de referência; precisão indica consistência entre medições.', 'Exatidão só se aplica a dados discretos.'], 2, 'Introdução a Análise do Sistema de Medição'),
  q('msa-03', 'Em um estudo Gage R&R, o que representa a repetibilidade?', ['Variação entre diferentes operadores.', 'Variação quando o mesmo operador mede a mesma peça repetidamente com o mesmo equipamento.', 'Mudança do instrumento ao longo de vários anos.', 'Diferença entre o valor medido e a especificação.'], 1, 'Entenda Repetibilidade e Reprodutibilidade (R&R) de Forma Simples'),
  q('msa-04', 'Em um estudo Gage R&R, o que representa a reprodutibilidade?', ['Variação associada às diferenças entre operadores ou avaliadores.', 'Variação natural entre peças.', 'A média das medições.', 'O limite superior de especificação.'], 0, 'Entenda Repetibilidade e Reprodutibilidade (R&R) de Forma Simples'),
  q('msa-05', 'A variação observada nos resultados de medição pode conter:', ['Somente variação das peças.', 'Somente erro do operador.', 'Variação do produto e variação introduzida pelo sistema de medição.', 'Apenas arredondamento do software.'], 2, 'Entenda Repetibilidade e Reprodutibilidade (R&R) de Forma Simples'),
  q('msa-06', 'Por que uma definição operacional é importante antes de executar o MSA?', ['Para garantir que todos saibam exatamente o que, onde e como medir.', 'Para dispensar o treinamento dos avaliadores.', 'Para aumentar a tolerância do produto.', 'Para escolher o fornecedor mais barato.'], 0, 'MSA na Prática: Exercício de Repetibilidade e Reprodutibilidade (R&R) – Exercício 1'),
  q('msa-07', 'O que a linearidade avalia em um sistema de medição?', ['Se o instrumento mantém comportamento adequado ao longo de sua faixa de medição.', 'Se todos os operadores têm o mesmo salário.', 'Se os dados possuem distribuição binomial.', 'Se a peça está dentro da especificação.'], 0, 'MSA Contínuo: O Que é Exatidão no Sistema de Medição'),
  q('msa-08', 'O que representa o vício (bias) de medição?', ['A diferença sistemática entre a medição média e um valor de referência.', 'A diferença entre dois operadores.', 'O número de categorias distintas.', 'A amplitude das especificações.'], 0, 'MSA Contínuo: O Que é Exatidão no Sistema de Medição'),
  q('msa-09', 'O que significa avaliar a estabilidade do sistema de medição?', ['Verificar se seu comportamento permanece consistente ao longo do tempo.', 'Comparar somente dois operadores.', 'Calcular o preço do equipamento.', 'Transformar dados contínuos em categorias.'], 0, 'MSA Contínuo: Como Avaliar a Estabilidade do Sistema de Medição'),
  q('msa-10', 'Um estudo Gage R&R deve ser planejado considerando:', ['Somente uma peça e uma medição.', 'Operadores, peças, repetições e responsabilidades de execução.', 'Apenas o fabricante do instrumento.', 'Somente os limites de especificação.'], 1, 'MSA na Prática: Exercício de Repetibilidade e Reprodutibilidade (R&R) – Exercício 1'),
  q('msa-11', 'Qual exemplo representa um dado binário em um MSA de atributos?', ['Tipo de defeito A, B ou C.', 'Ruim, regular, bom e excelente.', 'Aprovado ou reprovado.', 'Temperatura em graus Celsius.'], 2, 'MSA para Dados Discretos: Entendendo o Kappa Binário'),
  q('msa-12', 'Qual característica define dados ordinais?', ['Categorias sem qualquer ordem.', 'Categorias com uma ordem natural, como ruim, regular e bom.', 'Medições com infinitos valores.', 'Somente respostas sim ou não.'], 1, 'MSA para Dados Discretos: Entendendo o Kappa Ordinal'),
  q('msa-13', 'Em dados nominais, as categorias:', ['Possuem necessariamente uma ordem de grandeza.', 'Representam medições contínuas.', 'Identificam classes sem uma ordem natural obrigatória.', 'Devem conter apenas duas respostas.'], 2, 'MSA para Dados Discretos: Como Funciona o Kappa Nominal'),
  q('msa-14', 'Para que serve o índice Kappa em um MSA de atributos?', ['Medir a concordância das avaliações considerando a concordância esperada ao acaso.', 'Calcular Cp e Cpk.', 'Definir o tamanho da tolerância.', 'Medir a correlação linear entre duas variáveis contínuas.'], 0, 'MSA para Dados Discretos: Introdução ao Método Kappa (Concordância nas Avaliações)'),
  q('msa-15', 'Quando os avaliadores apresentam baixa concordância em um MSA de atributos, uma ação apropriada é:', ['Ignorar a diferença e liberar o processo.', 'Revisar critérios, definição operacional e treinamento dos avaliadores.', 'Aumentar artificialmente a especificação.', 'Eliminar o valor padrão da análise.'], 1, 'MSA para Dados Discretos: Entendendo o Kappa Binário'),
];

const change = [
  q('change-01', 'Qual é o foco central do gerenciamento de mudanças em um projeto de melhoria?', ['Apenas instalar uma nova tecnologia.', 'Preparar, engajar e apoiar as pessoas para que adotem e sustentem a mudança.', 'Substituir o gerenciamento do projeto.', 'Evitar qualquer alteração no processo.'], 1, 'O que é gerenciamento de mudanças e principais metodologias'),
  q('change-02', 'Por que uma solução tecnicamente correta pode fracassar?', ['Porque toda mudança reduz a produtividade.', 'Porque os dados nunca são suficientes.', 'Porque as pessoas podem não compreender, apoiar ou adotar a mudança.', 'Porque projetos não precisam de liderança.'], 2, 'Introdução a Gerenciamento de Mudança'),
  q('change-03', 'O que representa a sigla ADKAR?', ['Análise, Dados, Kaizen, Ação e Resultado.', 'Awareness, Desire, Knowledge, Ability e Reinforcement.', 'Aprovação, Definição, Controle, Análise e Revisão.', 'Autonomia, Disciplina, Conhecimento, Auditoria e Risco.'], 1, 'Gestão de Mudança na Fase Definir'),
  q('change-04', 'No ADKAR, o elemento Awareness corresponde a:', ['Consciência sobre a necessidade da mudança.', 'Capacidade prática de executar a mudança.', 'Recompensa financeira pelo projeto.', 'Auditoria final do processo.'], 0, 'Gestão de Mudança na Fase Definir'),
  q('change-05', 'No ADKAR, o elemento Desire representa:', ['Conhecimento técnico sobre o processo.', 'Desejo e disposição para participar e apoiar a mudança.', 'Controle estatístico do processo.', 'Documentação da mudança.'], 1, 'Gestão de Mudança na Fase Definir'),
  q('change-06', 'No ADKAR, Knowledge está relacionado a:', ['Saber como realizar a mudança.', 'Medir a rentabilidade do projeto.', 'Selecionar o patrocinador.', 'Aplicar punições a quem resistir.'], 0, 'Gestão de Mudança na Fase Definir'),
  q('change-07', 'No ADKAR, Ability significa:', ['Entender por que mudar.', 'Ter a habilidade prática para executar o novo comportamento ou processo.', 'Criar somente materiais de treinamento.', 'Definir o cronograma do projeto.'], 1, 'Gestão de Mudança na Fase Definir'),
  q('change-08', 'Qual é a finalidade de Reinforcement no ADKAR?', ['Iniciar a coleta de dados.', 'Escolher a solução.', 'Sustentar a mudança e evitar o retorno ao comportamento anterior.', 'Identificar stakeholders.'], 2, 'Fase Controlar - Gerenciamento de Mudanças'),
  q('change-09', 'Quem é considerado stakeholder de um projeto?', ['Somente o líder do projeto.', 'Qualquer pessoa ou grupo que afete ou seja afetado pelo projeto.', 'Somente o cliente externo.', 'Apenas quem executa as análises estatísticas.'], 1, 'Analise de stakeholders'),
  q('change-10', 'Para que serve a Matriz Poder × Interesse?', ['Calcular o risco financeiro.', 'Priorizar e definir estratégias de relacionamento com stakeholders.', 'Determinar a normalidade dos dados.', 'Escolher o software estatístico.'], 1, 'Classificacao de stakeholders'),
  q('change-11', 'Quais são as três partes essenciais da análise de stakeholders?', ['Identificar, classificar e planejar o engajamento.', 'Medir, analisar e controlar.', 'Comprar, instalar e auditar.', 'Treinar, punir e substituir.'], 0, 'Analise de stakeholders'),
  q('change-12', 'Qual abordagem tende a reduzir a resistência dos stakeholders?', ['Ocultar informações até a implementação.', 'Comunicar, ouvir preocupações e envolver as pessoas afetadas.', 'Excluir os resistentes do projeto.', 'Apresentar somente dados técnicos.'], 1, 'Engajamento de stakeholders'),
  q('change-13', 'Na fase Melhorar, qual prática ajuda a preparar a implementação?', ['Executar um teste piloto e comunicar seus resultados.', 'Eliminar o plano de comunicação.', 'Evitar a participação dos usuários.', 'Encerrar o projeto antes da validação.'], 0, 'Gerenciamento de Mudança para a fase Melhorar'),
  q('change-14', 'Na fase Definir, uma ação importante para a gestão da mudança é:', ['Obter alinhamento e aprovação formal da liderança e estruturar a comunicação.', 'Calcular o Cpk antes de definir o problema.', 'Iniciar a implementação sem equipe.', 'Evitar representantes das áreas afetadas.'], 0, 'Gestão de Mudança na Fase Definir'),
  q('change-15', 'Na fase Controlar, a gestão de mudanças deve priorizar:', ['Somente o encerramento administrativo.', 'Sustentação, comunicação, acompanhamento e reforço dos novos comportamentos.', 'A retirada imediata de todos os controles.', 'A troca completa da equipe.'], 1, 'Fase Controlar - Gerenciamento de Mudanças'),
];

const risks = [
  q('risk-01', 'Qual é o objetivo principal do FMEA?', ['Identificar, avaliar e reduzir riscos antes que as falhas ocorram.', 'Calcular apenas custos de produção.', 'Substituir todos os testes de validação.', 'Registrar somente falhas já ocorridas.'], 0, 'FMEA - Parte 1'),
  q('risk-02', 'Quais são tipos de FMEA apresentados no curso?', ['Financeiro, contábil e comercial.', 'Processo, produto e sistema.', 'Preventivo, corretivo e auditoria.', 'Qualitativo, quantitativo e estatístico.'], 1, 'FMEA - Parte 1'),
  q('risk-03', 'No FMEA, o modo de falha descreve:', ['Como um item, etapa ou função pode falhar.', 'O responsável pelo projeto.', 'O custo total da solução.', 'A meta financeira do processo.'], 0, 'FMEA - Parte 1'),
  q('risk-04', 'No FMEA, o efeito da falha representa:', ['A possível consequência da falha.', 'A causa potencial da falha.', 'O controle de prevenção.', 'A frequência da auditoria.'], 0, 'FMEA - Parte 1'),
  q('risk-05', 'O que são causas potenciais no FMEA?', ['Hipóteses sobre por que o modo de falha pode acontecer.', 'Soluções já validadas.', 'Resultados financeiros do projeto.', 'Falhas eliminadas definitivamente.'], 0, 'FMEA - Parte 2'),
  q('risk-06', 'O índice de Severidade avalia:', ['A frequência da causa.', 'A gravidade do efeito da falha.', 'A capacidade do controle detectar a falha.', 'O custo da ação recomendada.'], 1, 'FMEA - Parte 1'),
  q('risk-07', 'O índice de Ocorrência avalia:', ['A probabilidade ou frequência de ocorrência da causa/falha.', 'A gravidade do efeito para o cliente.', 'A qualidade da apresentação.', 'O prazo de implantação.'], 0, 'FMEA - Parte 2'),
  q('risk-08', 'No índice de Detecção do FMEA, uma pontuação elevada normalmente significa:', ['Alta capacidade de detectar a falha.', 'Baixa capacidade de detectar a falha antes do efeito.', 'Baixa severidade.', 'Baixa ocorrência.'], 1, 'FMEA - Parte 3'),
  q('risk-09', 'Como é calculado o RPN tradicional?', ['Severidade + Ocorrência + Detecção.', 'Severidade × Ocorrência × Detecção.', 'Ocorrência ÷ Detecção.', 'Severidade × Custo.'], 1, 'FMEA - Parte 2'),
  q('risk-10', 'Após implementar uma ação recomendada no FMEA, o que deve ser feito?', ['Excluir o risco da planilha sem revisão.', 'Reavaliar os índices e o risco residual.', 'Manter obrigatoriamente o mesmo RPN.', 'Alterar somente a descrição do processo.'], 1, 'FMEA - Parte 3'),
  q('risk-11', 'Quando a severidade não pode ser reduzida, o trabalho de mitigação pode concentrar-se em:', ['Aumentar a ocorrência.', 'Reduzir ocorrência e melhorar a detecção.', 'Remover todos os controles.', 'Aumentar o prazo do projeto.'], 1, 'FMEA - Parte 3'),
  q('risk-12', 'Por que os limites de ação do FMEA devem considerar as regras da empresa?', ['Porque os critérios e níveis aceitáveis podem variar conforme contexto, normas e negócio.', 'Porque o RPN não utiliza números.', 'Porque severidade não é avaliada.', 'Porque todo risco deve ser automaticamente aceito.'], 0, 'FMEA - Parte 4'),
  q('risk-13', 'Na abordagem do PMI, a análise qualitativa de riscos procura:', ['Priorizar riscos por características como probabilidade e impacto.', 'Calcular somente Cp e Cpk.', 'Eliminar a identificação de riscos.', 'Substituir o plano de respostas.'], 0, 'Gerenciamento de Risco pelo PMI - Parte 2'),
  q('risk-14', 'Qual é o propósito da análise quantitativa de riscos?', ['Avaliar numericamente os efeitos dos riscos sobre os objetivos do projeto.', 'Criar apenas uma lista de riscos.', 'Definir a identidade visual do projeto.', 'Classificar stakeholders.'], 0, 'Gerenciamento de Risco pelo PMI - Parte 2'),
  q('risk-15', 'O gerenciamento de riscos continua após o planejamento porque é necessário:', ['Implementar respostas, monitorar riscos e revisar mudanças ao longo do projeto.', 'Congelar o registro de riscos.', 'Eliminar os responsáveis.', 'Evitar novos dados.'], 0, 'Gerenciamento de Risco pelo PMI - Parte 2'),
];

const lean = [
  q('lean-01', 'Por que o Sistema Toyota de Produção não deve ser tratado apenas como um conjunto de ferramentas?', ['Porque depende de um sistema integrado, cultura, liderança e valores.', 'Porque não possui métodos práticos.', 'Porque só funciona com estatística avançada.', 'Porque elimina a participação das pessoas.'], 0, 'Sistema Toyota de Produção - Parte 1'),
  q('lean-02', 'Qual é uma base essencial para o funcionamento do TPS?', ['Alta variabilidade.', 'Estabilidade e trabalho padronizado.', 'Grandes estoques.', 'Produção baseada somente em previsão.'], 1, 'Sistema Toyota de Produção - Parte 1'),
  q('lean-03', 'Qual é o princípio central do Just-in-Time?', ['Produzir o máximo possível.', 'Produzir apenas o necessário, no momento necessário e na quantidade necessária.', 'Aumentar estoques de segurança continuamente.', 'Inspecionar somente o produto final.'], 1, 'Sistema Toyota de Produção - Parte 1'),
  q('lean-04', 'O que caracteriza o Jidoka?', ['Automação sem qualquer intervenção humana.', 'Produção contínua mesmo quando ocorre um defeito.', 'Capacidade de identificar anormalidades e interromper o processo para correção.', 'Aumento do tamanho dos lotes.'], 2, 'Sistema Toyota de Produção - Parte 1'),
  q('lean-05', 'Qual é a finalidade de um Poka-Yoke?', ['Prevenir ou detectar erros para evitar defeitos.', 'Aumentar a velocidade sem controle.', 'Substituir o plano de controle.', 'Calcular a demanda do cliente.'], 0, 'Sistema Toyota de Produção - Parte 1'),
  q('lean-06', 'O que significa Kaizen?', ['Uma grande mudança feita uma única vez.', 'Melhoria contínua por meio de aprendizado e aperfeiçoamentos constantes.', 'Auditoria exclusivamente financeira.', 'Produção em grandes lotes.'], 1, 'Sistema Toyota de Produção - Parte 2'),
  q('lean-07', 'O princípio Genchi Genbutsu recomenda:', ['Decidir somente por relatórios.', 'Ir ao local real, observar e compreender os fatos diretamente.', 'Delegar toda investigação à consultoria.', 'Evitar contato com a operação.'], 1, 'Sistema Toyota de Produção - Parte 2'),
  q('lean-08', 'No Lean, Muda significa:', ['Irregularidade.', 'Sobrecarga.', 'Desperdício ou atividade que não agrega valor.', 'Nivelamento da produção.'], 2, 'Desperdício MUDA'),
  q('lean-09', 'Qual desperdício é frequentemente chamado de “mãe de todos os desperdícios”?', ['Espera.', 'Superprodução.', 'Movimentação.', 'Defeito.'], 1, 'Desperdício MUDA'),
  q('lean-10', 'O que significa Mura?', ['Irregularidade e variabilidade no fluxo ou na carga de trabalho.', 'Erro de medição.', 'Excesso de inspeção final.', 'Produção puxada.'], 0, 'Desperdícios - MURA'),
  q('lean-11', 'O que significa Muri?', ['Padronização.', 'Sobrecarga de pessoas ou equipamentos.', 'Melhoria contínua.', 'Produção nivelada.'], 1, 'Desperdícios - MURI'),
  q('lean-12', 'Qual é o objetivo do Heijunka?', ['Nivelar a carga e reduzir picos, vales e instabilidade.', 'Aumentar a superprodução.', 'Eliminar a comunicação visual.', 'Criar grandes lotes fixos.'], 0, 'Processo Certo Gera o Resultado Certo'),
  q('lean-13', 'Em um sistema puxado com Kanban, a produção é orientada principalmente:', ['Pela demanda real do processo seguinte ou do cliente.', 'Pela capacidade máxima da máquina.', 'Por grandes estoques antecipados.', 'Pela preferência individual do operador.'], 0, 'Processo Certo Gera o Resultado Certo'),
  q('lean-14', 'O princípio da filosofia de longo prazo orienta a empresa a:', ['Priorizar apenas resultados financeiros imediatos.', 'Tomar decisões sustentáveis mesmo que exista um custo no curto prazo.', 'Evitar investimentos em pessoas.', 'Trocar processos antes de testá-los.'], 1, 'Filosofia de Longo Prazo'),
  q('lean-15', 'Como a liderança contribui para uma cultura Lean?', ['Delegando o Lean integralmente para consultores.', 'Compreendendo profundamente o trabalho, vivendo a filosofia e desenvolvendo pessoas e parceiros.', 'Focando somente em metas individuais.', 'Ocultando problemas para proteger resultados.'], 1, 'Desenvolvimento de Pessoas e Parceiros'),
];

const presentations = [
  q('pres-01', 'Qual deve ser o objetivo principal de uma apresentação profissional baseada em dados?', ['Exibir o maior número possível de gráficos.', 'Facilitar a compreensão e a tomada de decisão.', 'Demonstrar domínio de termos técnicos.', 'Preencher todo o tempo disponível.'], 1, 'Conhecendo o Objetivo da Apresentação'),
  q('pres-02', 'Por que conhecer o público-alvo antes da apresentação é essencial?', ['Para adaptar idioma, profundidade, exemplos e nível técnico.', 'Para usar sempre a mesma apresentação.', 'Para eliminar as perguntas.', 'Para aumentar a quantidade de texto nos slides.'], 0, 'Conhecendo o seu Público Alvo'),
  q('pres-03', 'Ao apresentar para públicos com necessidades muito diferentes, uma boa prática é:', ['Misturar todos os detalhes em cada slide.', 'Ignorar o público menos técnico.', 'Agrupar públicos semelhantes ou adaptar a comunicação para cada audiência.', 'Utilizar somente acrônimos.'], 2, 'Conhecendo o seu Público Alvo'),
  q('pres-04', 'Antes de apresentar uma análise, o apresentador deve:', ['Conhecer os dados, verificar premissas e validar se os resultados fazem sentido.', 'Confiar somente no gráfico gerado pelo software.', 'Evitar revisar os números.', 'Apresentar mesmo sem conhecer a origem dos dados.'], 0, 'Conhecendo os Dados que vai apresentar'),
  q('pres-05', 'Qual princípio melhora a clareza de um slide?', ['Colocar várias mensagens principais no mesmo slide.', 'Trabalhar uma mensagem principal por slide.', 'Usar o menor tamanho de fonte possível.', 'Variar fontes e cores em cada página.'], 1, 'Como Fazer a Apresentação'),
  q('pres-06', 'Qual deve ser o papel do slide durante a apresentação?', ['Substituir completamente o apresentador.', 'Funcionar como suporte visual para a mensagem.', 'Conter todo o discurso em parágrafos.', 'Impedir interação com o público.'], 1, 'Como Fazer a Apresentação'),
  q('pres-07', 'Por que padronizar fontes, cores e formatação?', ['Para tornar a apresentação mais consistente e profissional.', 'Para aumentar a quantidade de elementos.', 'Para esconder diferenças nos dados.', 'Para dispensar a revisão.'], 0, 'Como Fazer a Apresentação'),
  q('pres-08', 'Ao comparar gráficos, por que as escalas precisam ser verificadas?', ['Escalas diferentes podem distorcer visualmente a comparação.', 'Todo gráfico precisa começar em 100.', 'A escala não altera a interpretação.', 'Para aumentar o número de casas decimais.'], 0, 'Como Fazer a Apresentação'),
  q('pres-09', 'Para que serve o apêndice de uma apresentação?', ['Guardar análises e detalhes adicionais que dão suporte sem sobrecarregar a narrativa principal.', 'Repetir todos os slides.', 'Substituir a conclusão.', 'Ocultar as fontes dos dados.'], 0, 'Como Fazer a Apresentação'),
  q('pres-10', 'Na estrutura SCR, o que significam as letras?', ['Situação, Complicação e Resolução.', 'Solução, Causa e Resultado.', 'Sistema, Controle e Risco.', 'Síntese, Comunicação e Revisão.'], 0, 'Escolha da Estrutura da Narrativa'),
  q('pres-11', 'Qual prática ajuda a controlar o tempo e melhorar a apresentação?', ['Ensaiar, gravar, receber feedback e preparar respostas para perguntas prováveis.', 'Ler os slides pela primeira vez durante a reunião.', 'Evitar qualquer simulação.', 'Improvisar todo o conteúdo.'], 0, 'Como se Preparar Para Fazer a Apresentação'),
  q('pres-12', 'Durante a apresentação, a comunicação não verbal inclui:', ['Somente o texto dos slides.', 'Postura, contato visual, expressão facial, voz e pausas.', 'Apenas o conteúdo técnico.', 'Somente a duração da reunião.'], 1, 'Como Você Deve se Comportar Durante a Apresentação'),
  q('pres-13', 'Ao apresentar uma recomendação para a liderança, o apresentador deve:', ['Tomar a decisão no lugar do líder.', 'Facilitar a decisão com evidências e recomendações claras.', 'Ocultar alternativas.', 'Apresentar somente opiniões pessoais.'], 1, 'O que Você tem que Falar Durante a Apresentação'),
  q('pres-14', 'Quando o storytelling deve ser usado com cuidado ou pode ser desnecessário?', ['Em uma discussão técnica curta e pontual.', 'Quando é necessário envolver o público.', 'Ao explicar uma transformação.', 'Ao apresentar uma jornada de mudança.'], 0, 'O que Você tem que Falar Durante a Apresentação'),
  q('pres-15', 'O que deve ser feito após uma apresentação com decisões e ações?', ['Esperar que cada participante lembre do combinado.', 'Registrar e enviar uma minuta com decisões, responsáveis e prazos, além de buscar feedback.', 'Apagar as anotações.', 'Encerrar a comunicação com o público.'], 1, 'O que Você Deve Fazer Depois da Apresentação'),
];

const gateCore = [
  q('gate-core-01', 'O que significa a sigla GATE?', ['Gestão, Análise, Técnica e Estatística.', 'Gráficos, Auditoria, Tempo e Execução.', 'Gestão, Ação, Teste e Estratégia.', 'Ganhos, Análise, Tecnologia e Excelência.'], 0, 'Introdução ao GATE'),
  q('gate-core-02', 'No método GATE, por que a Gestão aparece antes da análise?', ['Porque primeiro é necessário entender a demanda e alinhar expectativas com os stakeholders.', 'Porque os dados devem ser ignorados.', 'Porque toda demanda já possui uma solução definida.', 'Porque a apresentação deve ser criada antes da coleta.'], 0, 'O que é o método GATE'),
  q('gate-core-03', 'A escolha entre gráfico e análise estatística deve considerar:', ['Somente a preferência do analista.', 'Objetivo, público, tipo e volume de dados, precisão, tempo e recursos.', 'A cor do relatório.', 'Somente o software disponível.'], 1, 'Gráficos ou análises estatisticas'),
  q('gate-core-04', 'Qual tipo de análise responde principalmente “o que aconteceu”?', ['Preditiva.', 'Prescritiva.', 'Descritiva.', 'Inferencial.'], 2, 'Tipos de análises'),
  q('gate-core-05', 'Qual sequência representa a jornada anterior à análise descrita no curso?', ['Definir o problema, alinhar expectativas, escolher a coleta, garantir a qualidade dos dados e definir como analisar.', 'Escolher o gráfico, apresentar e depois coletar.', 'Comprar o software, criar o relatório e definir o problema.', 'Analisar, limpar os dados e perguntar o objetivo.'], 0, 'Identificando o problema'),
];

const doe = [
  q('doe-01', 'Qual é uma vantagem do DOE sobre alterar um fator por vez (OFAT)?', ['Permitir avaliar efeitos e interações entre fatores de forma estruturada.', 'Eliminar a necessidade de resposta Y.', 'Garantir resultado sem experimento.', 'Trabalhar somente com dados categóricos.'], 0, '01 - Introducao'),
  q('doe-02', 'Em um experimento fatorial completo com k fatores e dois níveis, quantas combinações básicas são avaliadas?', ['k × 2.', '2 elevado a k.', 'k dividido por 2.', 'k + 2.'], 1, '03 - Fatorial completo'),
  q('doe-03', 'Por que randomizar a ordem dos experimentos?', ['Para reduzir o risco de fatores não controlados influenciarem sistematicamente os resultados.', 'Para aumentar o número de respostas.', 'Para eliminar a análise residual.', 'Para escolher somente combinações favoráveis.'], 0, '03 - Fatorial completo'),
  q('doe-04', 'Qual é um cuidado importante em um fatorial fracionado?', ['Ignorar todas as interações.', 'Compreender o confundimento ou alias entre efeitos.', 'Executar todas as combinações do fatorial completo.', 'Eliminar a variável de resposta.'], 1, '09 - Fatorial Fracionado'),
];

const poka = q('poka-01', 'Qual é a diferença entre um Poka-Yoke de prevenção e um de detecção?', ['O preventivo impede o erro; o de detecção identifica o erro rapidamente para evitar seu avanço.', 'Ambos servem apenas para inspeção final.', 'O preventivo aumenta a ocorrência.', 'O de detecção elimina a necessidade de reação.'], 0, 'Pokayoke - Parte 1');

const clone = (question, id) => ({ ...question, id, source: `Questão previamente aprovada: ${question.id}` });
const pick = (map, sourceId, id) => {
  const found = map.get(sourceId);
  if (!found) throw new Error(`Questão existente não encontrada: ${sourceId}`);
  return clone(found, id);
};

async function main() {
  const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
  if (!keyPath || !fs.existsSync(keyPath)) throw new Error('FIREBASE_ADMIN_KEY_PATH ausente ou inválido.');
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  if (!getApps().length) initializeApp({ credential: cert(key) });
  const db = getFirestore();

  const existingIds = ['1', 'israel__9', 'israel__10', 'israel__12', 'israel__13', 'israel__14'];
  const existingMap = new Map();
  for (const docId of existingIds) {
    const snap = await db.collection('quizzes').doc(docId).get();
    for (const question of snap.data()?.questions || []) existingMap.set(question.id, question);
  }

  const green = [
    clone(yellow[1], 'green-01'), clone(yellow[3], 'green-02'), clone(yellow[5], 'green-03'), clone(yellow[13], 'green-04'), clone(yellow[14], 'green-05'),
    pick(existingMap, 'est-apl-09', 'green-06'), pick(existingMap, 'est-apl-08', 'green-07'), pick(existingMap, 'est-apl-03', 'green-08'),
    clone(msa[2], 'green-09'), clone(msa[3], 'green-10'),
    pick(existingMap, 'cap-01', 'green-11'), pick(existingMap, 'cap-09', 'green-12'),
    pick(existingMap, 'hip-04', 'green-13'), pick(existingMap, 'hip-11', 'green-14'), pick(existingMap, 'hip-16', 'green-15'),
    pick(existingMap, 'cep-01', 'green-16'), pick(existingMap, 'cep-07', 'green-17'),
    clone(risks[8], 'green-18'), clone(poka, 'green-19'), pick(existingMap, 'reg-07', 'green-20'),
  ];

  const black = [
    clone(yellow[1], 'black-01'), clone(yellow[3], 'black-02'), clone(yellow[14], 'black-03'),
    clone(msa[2], 'black-04'), clone(msa[6], 'black-05'),
    pick(existingMap, 'cap-09', 'black-06'), pick(existingMap, 'cap-10', 'black-07'),
    pick(existingMap, 'hip-11', 'black-08'), pick(existingMap, 'hip-16', 'black-09'), pick(existingMap, 'hip-20', 'black-10'),
    pick(existingMap, 'cep-07', 'black-11'), pick(existingMap, 'cep-10', 'black-12'),
    pick(existingMap, 'reg-07', 'black-13'), pick(existingMap, 'reg-08', 'black-14'), pick(existingMap, 'reg-09', 'black-15'),
    clone(risks[8], 'black-16'), clone(risks[12], 'black-17'),
    clone(change[2], 'black-18'), clone(change[11], 'black-19'),
    ...doe.map((item, index) => clone(item, `black-${String(index + 20).padStart(2, '0')}`)),
    clone(poka, 'black-24'), clone(presentations[12], 'black-25'),
  ];

  const appliedBusiness = [
    pick(existingMap, 'est-apl-01', 'business-01'), pick(existingMap, 'est-apl-02', 'business-02'), pick(existingMap, 'est-apl-03', 'business-03'), pick(existingMap, 'est-apl-04', 'business-04'), pick(existingMap, 'est-apl-06', 'business-05'), pick(existingMap, 'est-apl-09', 'business-06'),
    pick(existingMap, 'cap-01', 'business-07'), pick(existingMap, 'cap-09', 'business-08'), pick(existingMap, 'cap-12', 'business-09'),
    clone(msa[0], 'business-10'), clone(msa[2], 'business-11'), clone(msa[13], 'business-12'),
    pick(existingMap, 'hip-04', 'business-13'), pick(existingMap, 'hip-11', 'business-14'), pick(existingMap, 'hip-16', 'business-15'), pick(existingMap, 'hip-18', 'business-16'),
    pick(existingMap, 'reg-06', 'business-17'), pick(existingMap, 'reg-07', 'business-18'),
    pick(existingMap, 'cep-01', 'business-19'), pick(existingMap, 'cep-07', 'business-20'),
  ];

  const gate = [
    ...gateCore,
    pick(existingMap, 'est-apl-02', 'gate-06'), pick(existingMap, 'est-apl-03', 'gate-07'), pick(existingMap, 'est-apl-06', 'gate-08'), pick(existingMap, 'est-apl-09', 'gate-09'),
    pick(existingMap, 'hip-04', 'gate-10'), pick(existingMap, 'hip-11', 'gate-11'), pick(existingMap, 'hip-16', 'gate-12'), pick(existingMap, 'hip-18', 'gate-13'), pick(existingMap, 'hip-19', 'gate-14'),
    pick(existingMap, 'reg-06', 'gate-15'), pick(existingMap, 'reg-07', 'gate-16'), pick(existingMap, 'reg-08', 'gate-17'),
    clone(presentations[0], 'gate-18'), clone(presentations[1], 'gate-19'), clone(presentations[12], 'gate-20'),
  ];

  const configs = [
    { trilha: 2, initiativeId: 'ice3vkbgn', titulo: 'Como Recomendar Melhorias com Base em Dados - GATE', questions: gate },
    { trilha: 3, initiativeId: '7f009d02-28a6-4059-ac9b-e8669c0647a2', titulo: 'Como Conduzir Mudanças com Menos Resistência', questions: change },
    { trilha: 4, initiativeId: 'UFpWSVU5HjiugRzbNlwv', titulo: 'Como Criar Apresentações que Convencem', questions: presentations },
    { trilha: 5, initiativeId: 'a3451196-b9e0-458a-9cc5-4265d6036f01', titulo: 'Como Antecipar Riscos Antes que Virem Problemas', questions: risks },
    { trilha: 6, initiativeId: 'L5jBFPhBAWNXbnixBazL', titulo: 'Como Aplicar a Cultura Lean', questions: lean },
    { trilha: 7, initiativeId: 'u7vy04o16', titulo: 'Como Fazer Análises Estatísticas Aplicadas a Negócios', questions: appliedBusiness },
    { trilha: 8, initiativeId: '4zyhj4ux2', titulo: 'Formação Profissional em Gestão de Projetos de Melhoria - Nível Black Belt', questions: black },
    { trilha: 11, initiativeId: 'a6015348-2585-4d84-a2c7-bd3b11cdb046', titulo: 'MSA- Análise  do Sistema de Medição', questions: msa },
    { trilha: 15, initiativeId: '1ccc0fbf-3c99-4749-8794-7468a05b7284', titulo: 'Formação Profissional em Gestão de Projetos de Melhoria - Nível Yellow Belt', questions: yellow },
    { trilha: 16, initiativeId: '4ed8828b-987b-49c0-9a27-4e75cb374797', titulo: 'Formação Profissional em Gestão de Projetos de Melhoria - Nível Green Belt', questions: green },
  ];

  const expectedCounts = new Map([[2, 20], [3, 15], [4, 15], [5, 15], [6, 15], [7, 20], [8, 25], [11, 15], [15, 15], [16, 20]]);
  for (const config of configs) {
    const expected = expectedCounts.get(config.trilha);
    if (config.questions.length !== expected) throw new Error(`${config.titulo}: esperado ${expected}, obtido ${config.questions.length}.`);
    const ids = new Set();
    for (const question of config.questions) {
      if (ids.has(question.id)) throw new Error(`${config.titulo}: ID duplicado ${question.id}.`);
      ids.add(question.id);
      if (!question.text?.trim()) throw new Error(`${config.titulo}: pergunta sem texto.`);
      if (!Array.isArray(question.options) || question.options.length !== 4) throw new Error(`${config.titulo}/${question.id}: deve ter 4 alternativas.`);
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) throw new Error(`${config.titulo}/${question.id}: gabarito inválido.`);
      if (!question.source) throw new Error(`${config.titulo}/${question.id}: fonte ausente.`);
    }
  }

  const report = [];
  for (const config of configs) {
    const docId = `${CONSULTOR_ID}__${config.trilha}`;
    const target = db.collection('quizzes').doc(docId);
    const current = await target.get();
    const currentQuestions = current.data()?.questions;
    if (Array.isArray(currentQuestions) && currentQuestions.length > 0) {
      throw new Error(`Proteção acionada: ${docId} já contém ${currentQuestions.length} questões.`);
    }
    report.push({ docId, titulo: config.titulo, quantidade: config.questions.length, status: APPLY ? 'gravado' : 'pronto' });
  }

  if (APPLY) {
    const batch = db.batch();
    for (const config of configs) {
      const docId = `${CONSULTOR_ID}__${config.trilha}`;
      const questions = config.questions.map(({ source, ...question }) => question);
      batch.set(db.collection('quizzes').doc(docId), {
        trilha: config.trilha,
        initiativeId: config.initiativeId,
        titulo: config.titulo,
        passPct: 0.70,
        watchGatePct: 0.70,
        questions,
        consultorId: CONSULTOR_ID,
        updatedAt: new Date().toISOString(),
        migration: 'missing-course-quizzes-2026-09-05',
      }, { merge: false });
    }
    batch.set(db.collection('system_migrations').doc('missing-course-quizzes-2026-09-05'), {
      consultorId: CONSULTOR_ID,
      appliedAt: FieldValue.serverTimestamp(),
      quizzes: report,
    }, { merge: false });
    await batch.commit();
  }

  console.log(JSON.stringify({ apply: APPLY, totalCursos: configs.length, totalQuestoes: configs.reduce((sum, item) => sum + item.questions.length, 0), report }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
