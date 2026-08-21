/** Carga inicial do teste do curso CEP - Controle Estatístico de Processo. */
import admin from 'firebase-admin';
import fs from 'node:fs';

const serviceAccount = JSON.parse(fs.readFileSync('secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });

const questions = [
  ['cep-01', 'Qual é o principal objetivo do Controle Estatístico de Processo (CEP)?', ['Aumentar a variabilidade do processo', 'Reduzir custos operacionais sem considerar qualidade', 'Monitorar e controlar a variabilidade do processo para garantir a estabilidade', 'Substituir completamente a inspeção de qualidade'], 2],
  ['cep-02', 'O que caracteriza uma causa comum de variação em um processo?', ['Uma falha grave no equipamento', 'Uma tendência gradual de mudança na média do processo', 'Pequenas variações naturais dentro dos limites normais do processo', 'Um erro humano isolado durante a operação'], 2],
  ['cep-03', 'Qual das opções abaixo é um exemplo de causa especial de variação?', ['Oscilações normais de temperatura do ambiente', 'Um operador inserindo peças erradas no processo', 'Pequenas variações na matéria-prima esperadas', 'Diferença mínima entre lotes de produção dentro do esperado'], 1],
  ['cep-04', 'Quais são os dois tipos principais de dados utilizados no CEP?', ['Dados normais e não normais', 'Dados contínuos e dados discretos', 'Dados de amostra e dados populacionais', 'Dados de entrada e dados de saída'], 1],
  ['cep-05', 'Qual das opções abaixo representa um dado contínuo?', ['Número de defeitos em um lote de 100 peças', 'Diâmetro de um parafuso medido em milímetros', 'Quantidade de itens rejeitados por um operador', 'Número de clientes atendidos por dia'], 1],
  ['cep-06', 'O que a carta de controle X̄-R monitora?', ['A contagem total de defeitos em um processo', 'A média e a variabilidade dentro dos subgrupos de um processo', 'A quantidade de defeitos por amostra variável', 'A taxa de rejeição de um lote'], 1],
  ['cep-07', 'Se uma carta de controle mostrar pontos fora dos limites de controle, o que isso indica?', ['O processo está estável e dentro da normalidade', 'Deve haver uma causa especial de variação afetando o processo', 'O processo precisa ser encerrado imediatamente', 'Existem defeitos e o cliente será necessariamente impactado'], 1],
  ['cep-08', 'Quando um processo é considerado estatisticamente controlado?', ['Quando nenhuma causa especial de variação está presente', 'Quando todos os valores do processo são exatamente iguais', 'Quando há variação durante as medições de um processo', 'Quando os defeitos são eliminados completamente'], 0],
  ['cep-09', 'Qual das seguintes opções é um exemplo de dado discreto?', ['Pressão em um tanque medida em bar', 'Tempo médio de produção de um item', 'Número de produtos defeituosos em um lote', 'Diâmetro médio de um rolamento'], 2],
  ['cep-10', 'Quando é recomendável utilizar uma Carta de Controle P?', ['Quando os dados são contínuos e podem ser transformados', 'Quando estamos monitorando a proporção de itens defeituosos em um lote', 'Quando precisamos avaliar a variação dentro de um subgrupo', 'Quando queremos acompanhar a média de um processo ao longo do tempo'], 1],
  ['cep-11', 'A distribuição normal é importante no CEP porque:', ['Os valores de um processo tendem a se distribuir em torno da média de forma consistente.', 'Ela permite cálculos estatísticos mais precisos e sem margem de erro', 'Ela elimina qualquer variação indesejada no processo', 'Ela não influencia a análise de processos'], 0],
  ['cep-12', 'Quando se utiliza a carta X̄-R no Minitab, qual é a principal condição para seu uso?', ['O tamanho do subgrupo deve ser grande (n > 20)', 'O processo precisa estar completamente dentro dos limites de especificação', 'O tamanho do subgrupo deve ser pequeno (geralmente entre 3 e 5)', 'O processo não pode apresentar variação natural'], 2],
  ['cep-13', 'Quando devemos usar a carta de controle C?', ['Quando estamos monitorando a contagem de defeitos por unidade inspecionada', 'Quando queremos medir a variabilidade da média do processo', 'Quando os dados são contínuos e seguem uma distribuição normal', 'Quando estamos acompanhando a porcentagem de produtos rejeitados'], 0],
  ['cep-14', 'Qual das opções abaixo é um exemplo de causa especial de variação?', ['Oscilações normais de temperatura do ambiente', 'Pequenas variações na matéria-prima esperadas', 'Um operador inserindo peças erradas no processo', 'Diferenças mínimas entre lotes de produção dentro do esperado'], 2],
  ['cep-15', 'Quando um processo está fora de controle estatístico, o que deve ser feito?', ['Continuar operando normalmente, pois isso é comum', 'Identificar e corrigir a causa especial de variação antes de seguir a produção ou a análise do processo', 'Ajustar a especificação do produto para atender aos novos valores', 'Criar novos limites de controle mais amplos'], 1],
  ['cep-16', 'Se um processo apresentar pontos oscilando próximo aos limites de controle, o que isso pode indicar?', ['Um processo estável sem necessidade de ajustes', 'Um possível desvio do processo que deve ser monitorado', 'Um erro de medição que pode ser ignorado', 'Que os limites de controle devem ser ajustados'], 1],
  ['cep-17', 'Você tem um conjunto de dados e deseja verificar se ele segue uma distribuição normal. O que o p-valor indica exatamente 0,05? Os dados são normais?', ['Sim, pois o valor está acima de 0,05', 'Sim, pois o valor está abaixo de 0,05', 'Sim, pois o valor está exatamente igual a 0,05', 'Não é possível afirmar normalidade apenas com esse resultado limítrofe.'], 3],
  ['cep-18', 'Uma empresa precisa monitorar a largura de uma peça, com subgrupos de 3 medições cada. Qual gráfico deve ser usado?', ['Carta X̄-R', 'Carta I-MR', 'Carta X̄-S', 'Nenhuma das cartas acima'], 0],
  ['cep-19', 'Uma empresa precisa monitorar a quantidade de itens defeituosos em que o tamanho da amostra é constante. Qual gráfico deve ser usado?', ['Carta NP', 'Carta P', 'Carta C', 'Carta U'], 0],
  ['cep-20', 'Uma empresa monitora dados químicos de um produto líquido homogêneo em um tanque. O processo não é crítico e a empresa não quer realizar muitas medições. Por que a carta I-MR seria adequada?', ['Porque o líquido está homogêneo, o processo não é crítico e a carta permite acompanhar observações individuais com pouca medição', 'Porque é mais barato fazer o controle do processo', 'Porque não há necessidade de verificar causas especiais', 'A carta ideal seria X̄-S, pois está relacionada ao controle de líquidos'], 0],
].map(([id, text, options, correctIndex]) => ({ id, text, options, correctIndex }));

await admin.firestore().collection('quizzes').doc('israel__9').set({
  trilha: 9,
  initiativeId: '18366a01-139d-4d19-b539-2a6521f8118e',
  titulo: 'CEP - Controle Estatístico de Processo',
  passPct: 0.70,
  watchGatePct: 0.70,
  questions,
  consultorId: 'israel',
  updatedAt: new Date().toISOString(),
}, { merge: false });

console.log(`Teste salvo: israel__9 (${questions.length} perguntas)`);
await admin.app().delete();
