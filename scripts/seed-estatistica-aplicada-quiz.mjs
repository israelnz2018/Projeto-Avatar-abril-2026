/**
 * Avaliação do curso "Estatística aplicada e ferramentas da qualidade".
 *
 * Perguntas fornecidas pelo Israel para este curso em 23/08/2026.
 */
import admin from 'firebase-admin';
import fs from 'node:fs';

const serviceAccount = JSON.parse(fs.readFileSync('secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });

const questions = [
  ['est-apl-01', 'O que representa a mediana em um conjunto de dados?', ['A soma de todos os valores dividida pelo número de observações.', 'O valor que mais se repete no conjunto de dados.', 'O valor central quando os dados são organizados em ordem crescente.', 'O desvio em relação à média.'], 2],
  ['est-apl-02', 'Qual gráfico é mais adequado para analisar a distribuição de um conjunto de dados?', ['Gráfico de Pareto.', 'Histograma.', 'Gráfico de Dispersão.', 'Diagrama de Ishikawa.'], 1],
  ['est-apl-03', 'Qual ferramenta permite identificar a relação entre duas variáveis?', ['Análise de Capacidade.', 'Gráfico de Controle.', 'Gráfico de Dispersão.', 'Gráfico de Pareto.'], 2],
  ['est-apl-04', 'O que representa o desvio padrão em um conjunto de dados?', ['A média dos valores.', 'A dispersão dos dados em relação à média.', 'O valor central dos dados.', 'A diferença entre o maior e o menor valor.'], 1],
  ['est-apl-05', 'Qual distribuição é caracterizada por uma curva em formato de sino?', ['Distribuição Binomial.', 'Distribuição Binomial.', 'Distribuição Normal.', 'Distribuição Poisson.'], 2],
  ['est-apl-06', 'O teste de normalidade é utilizado para:', ['Determinar se uma amostra tem média zero.', 'Avaliar se os dados seguem uma distribuição normal.', 'Medir a variabilidade dos dados.', 'Verificar a independência das variáveis.'], 1],
  ['est-apl-07', 'Qual métrica expressa a porcentagem de um evento ocorrer?', ['Mediana.', 'Desvio Padrão.', 'Probabilidade.', 'Curtose.'], 2],
  ['est-apl-08', 'O que é um histograma?', ['Um gráfico que mostra a frequência dos dados em intervalos.', 'Um diagrama de causa e efeito.', 'Um gráfico de linha que representa tendências.', 'Um gráfico que compara médias de grupos.'], 0],
  ['est-apl-09', 'Qual ferramenta é mais adequada para priorizar problemas?', ['Gráfico de Dispersão.', 'Histograma.', 'Diagrama de Causa e Efeito.', 'Gráfico de Pareto.'], 3],
  ['est-apl-10', 'Qual gráfico é ideal para analisar a tendência de um processo ao longo do tempo?', ['Boxplot.', 'Gráfico de séries temporais.', 'Histograma.', 'Gráfico de Pareto.'], 1],
  ['est-apl-11', 'Como é chamada a relação entre duas variáveis quando uma aumenta e a outra diminui?', ['Correlação Positiva.', 'Correlação Nula.', 'Correlação Negativa.', 'Relação Linear.'], 2],
  ['est-apl-12', 'Qual gráfico ajuda a identificar padrões sazonais em um processo?', ['Histograma.', 'Gráfico de Controle.', 'Gráfico de Linha.', 'Boxplot.'], 2],
  ['est-apl-13', 'O que significa uma curtose elevada em uma distribuição de dados?', ['Os dados têm média zero.', 'Os dados apresentam caudas mais pesadas que o normal.', 'Os dados são simétricos.', 'Os dados estão concentrados no centro.'], 1],
  ['est-apl-14', 'Qual ferramenta é usada para analisar a relação entre três variáveis?', ['Histograma.', 'Gráfico de Pareto.', 'Gráfico de Dispersão em 3D.', 'Diagrama de Ishikawa.'], 2],
  ['est-apl-15', 'Qual métrica indica o quão bem um modelo de regressão linear se ajusta aos dados?', ['Valor-p.', 'Coeficiente de Correlação.', 'Coeficiente de Determinação (R²).', 'Desvio Padrão.'], 2],
  ['est-apl-16', 'Qual métrica é usada para medir a assimetria de uma distribuição?', ['Curtose.', 'Variância.', 'Skewness (assimetria).', 'Desvio Padrão.'], 2],
  ['est-apl-17', 'Em um gráfico de controle, o que indicam os limites de controle?', ['Os valores máximo e mínimo possíveis.', 'Os pontos fora do padrão.', 'Os limites estatísticos onde o processo é considerado estável.', 'A média do processo.'], 2],
  ['est-apl-18', 'Qual ferramenta visual é mais útil para identificar outliers?', ['Boxplot.', 'Histograma.', 'Gráfico de Pareto.', 'Diagrama de Ishikawa.'], 0],
  ['est-apl-19', 'O que representa uma correlação neutra entre duas variáveis?', ['A dispersão total dos dados.', 'Não existe correlação entre as duas variáveis.', 'A diferença entre médias de dois grupos.', 'O valor do desvio padrão ao quadrado.'], 1],
  ['est-apl-20', 'O Mapa de análise gráfica é uma ferramenta que:', ['Resolve todos os problemas gráficos.', 'Faz análises superficiais sobre os dados coletados.', 'Auxilia na identificação do uso da melhor ferramenta gráfica.', 'Mapeia todo o processo para identificar causas raízes.'], 2],
].map(([id, text, options, correctIndex]) => ({ id, text, options, correctIndex }));

const db = admin.firestore();
await db.collection('quizzes').doc('israel__14').set({
  trilha: 14,
  initiativeId: '020edc59-0a9b-4504-8c28-617d50caca4b',
  titulo: 'Estatística aplicada e ferramentas da qualidade',
  passPct: 0.70,
  watchGatePct: 0.70,
  questions,
  consultorId: 'israel',
  updatedAt: new Date().toISOString(),
}, { merge: false });

const saved = await db.collection('quizzes').doc('israel__14').get();
const savedData = saved.data();
if (!saved.exists
  || savedData?.initiativeId !== '020edc59-0a9b-4504-8c28-617d50caca4b'
  || savedData?.questions?.length !== questions.length
  || savedData.questions.some((question, index) => question.correctIndex !== questions[index].correctIndex)) {
  throw new Error('A prova foi enviada, mas a verificação do curso/perguntas/gabarito falhou.');
}

console.log(`Teste salvo e verificado: israel__14 (${questions.length} perguntas com gabarito)`);
await admin.app().delete();
