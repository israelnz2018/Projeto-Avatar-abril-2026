/**
 * Carga inicial do teste do curso Capabilidade de Processo.
 * Executar uma vez com a chave de service account disponível em secrets/.
 */
import admin from 'firebase-admin';
import fs from 'node:fs';

const serviceAccount = JSON.parse(fs.readFileSync('secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });

const questions = [
  ['cap-01', 'O que significa Capabilidade de Processo?', ['Um método para calcular o custo de produção', 'Uma métrica que avalia a capacidade de um processo em produzir dentro das especificações', 'Uma técnica para reduzir desperdícios em manufatura', 'Uma ferramenta de previsão de demanda'], 1],
  ['cap-02', 'Qual das opções a seguir representa corretamente dados contínuos?', ['Número de clientes atendidos por dia', 'Número de defeitos em um lote de produção', 'Altura de um produto fabricado', 'Quantidade de peças rejeitadas por um operador'], 2],
  ['cap-03', 'O que significa DPMO?', ['A quantidade total de defeitos produzidos em um processo', 'A fração de produtos defeituosos em um lote de 1000 peças', 'O número de defeitos por milhão de oportunidades', 'Uma métrica de tempo de produção'], 2],
  ['cap-04', 'Qual das alternativas representa um caso típico de distribuição binomial?', ['Medir a espessura de uma peça metálica', 'Contar quantos produtos estão dentro das especificações em um lote', 'Avaliar a temperatura média de um forno industrial', 'Medir a pressão de um fluido em um reservatório'], 1],
  ['cap-05', 'Qual é o principal objetivo da estatística na indústria?', ['Aumentar o custo da produção', 'Reduzir a variabilidade e melhorar a qualidade', 'Substituir a tomada de decisão humana', 'Controlar o estoque de matéria-prima'], 1],
  ['cap-06', 'O que significa probabilidade de defeito em um processo de produção?', ['A chance de um produto atender todas as especificações', 'A probabilidade de um produto apresentar falha em relação a um padrão estabelecido', 'A média do tempo de produção de um lote', 'A soma de todas as variações possíveis do processo'], 1],
  ['cap-07', 'Qual é a principal característica da distribuição normal?', ['É assimétrica e tem cauda longa', 'É representada por uma curva em forma de sino, centrada na média', 'Possui apenas dois possíveis resultados: sucesso ou falha', 'Apenas se aplica a processos discretos'], 1],
  ['cap-08', 'Por que às vezes os dados não seguem uma distribuição normal?', ['Porque sempre há erros nos cálculos', 'Porque durante a coleta de dados o processo pode estar instável ou o próprio processo apresenta outra distribuição', 'Porque a distribuição normal é rara na indústria', 'Porque o processo de medição sempre tem erro significativo'], 1],
  ['cap-09', 'Qual é a principal diferença entre Cp/Pp e Cpk/Ppk?', ['O Cp/Pp considera apenas a variabilidade do processo, enquanto o Cpk/Ppk leva em conta a centralização', 'O Cpk/Ppk mede a variação total do processo e o Cp/Pp mede apenas defeitos', 'O Cp/Pp sempre será menor que o Cpk/Ppk', 'O Cp/Pp avalia apenas dados binomiais'], 0],
  ['cap-10', 'Qual é o objetivo da transformação Box-Cox?', ['Ajustar a média dos dados', 'Transformar dados não normais em dados normais através de uma transformação matemática', 'Reduzir a variabilidade de um processo', 'Converter dados discretos em contínuos'], 1],
  ['cap-11', 'Qual é a diferença entre a transformação Box-Cox e a transformação Johnson?', ['Box-Cox funciona melhor para dados simétricos e positivos, enquanto Johnson pode lidar com distribuições mais complexas e negativas', 'Johnson é uma técnica para encontrar o Cpk', 'Box-Cox só é aplicável em distribuições binomiais', 'Não há diferença entre elas'], 0],
  ['cap-12', 'O que significa discretização de dados?', ['Converter dados contínuos em categorias ou classes', 'Transformar dados categóricos em contínuos', 'Aplicar um modelo estatístico para prever tendências', 'Remover dados extremos de um conjunto'], 0],
  ['cap-13', 'No Minitab, como calcular Cp, Cpk, Pp e Ppk de um processo com média, mediana e moda muito próximas?', ['Estatística > Teste de Normalidade', 'Estatística > Ferramentas de Qualidade > Capabilidade de Processo Normal', 'Gráficos > Boxplot', 'Estatísticas Básicas > Análise de Variância'], 1],
  ['cap-14', 'Qual teste do Minitab pode ser usado para verificar se um conjunto de dados segue uma distribuição normal?', ['Teste de Anderson-Darling', 'Teste de Proporção', 'Teste de Regressão', 'Teste Qui-Quadrado'], 0],
  ['cap-15', 'No Minitab, qual é a melhor maneira de calcular a probabilidade de um defeito ocorrer em um processo com distribuição normal?', ['Estatísticas > Teste de Normalidade', 'Calculadora > Distribuição de Probabilidades > Distribuição normal', 'Gráficos > Boxplot', 'Ferramentas de Qualidade > Capabilidade de Processo'], 1],
  ['cap-16', 'Uma empresa fabrica 10.000 peças e encontra 35 defeitos em um total de 3 oportunidades de defeito por peça. Qual é o DPMO (Defeitos Por Milhão de Oportunidades)?', ['1.166,67', '3.500,00', '11.666,67', '350,00'], 0],
  ['cap-17', 'Um processo tem média de 100 mm e limite superior de especificação de 104 mm. O que acontece ao produzir peças com valores maiores que 104 mm?', ['Serão produzidas peças com defeitos', 'Serão produzidas peças que talvez sejam defeituosas', 'Não há problemas em produzir algumas peças acima do limite de especificação', 'Não serão produzidas peças que talvez sejam defeituosas'], 0],
  ['cap-18', 'Um conjunto de dados foi coletado e apresentou p-valor = 0,045 no teste de Anderson-Darling, com confiança de 95%. Qual é a conclusão?', ['Os dados seguem uma distribuição normal', 'O valor de p não influencia a normalidade', 'Não há informações suficientes para concluir', 'Os dados não seguem uma distribuição normal'], 3],
  ['cap-19', 'Após rodar um Ajuste de Distribuição no Minitab, qual métrica devemos usar para escolher a melhor distribuição?', ['R² ajustado', 'Valor de p', 'Anderson-Darling (AD)', 'Cp e Cpk'], 2],
  ['cap-20', 'Um processo tem LSL = 8 mm e USL = 15 mm. Considerando as medidas (12; 14; 11; 13; 11; 9; 15; 14; 11; 13 mm), qual é o valor aproximado de Cpk?', ['0,62', '0,76', '0,40', '0,51'], 1],
].map(([id, text, options, correctIndex]) => ({ id, text, options, correctIndex }));

const db = admin.firestore();
await db.collection('quizzes').doc('israel__10').set({
  trilha: 10,
  initiativeId: '1d63b1e6-85d4-4faa-8ff3-99562d0838f5',
  titulo: 'Capabilidade de Processo',
  passPct: 0.70,
  watchGatePct: 0.70,
  questions,
  consultorId: 'israel',
  updatedAt: new Date().toISOString(),
}, { merge: false });

console.log(`Teste salvo: israel__10 (${questions.length} perguntas)`);
await admin.app().delete();
