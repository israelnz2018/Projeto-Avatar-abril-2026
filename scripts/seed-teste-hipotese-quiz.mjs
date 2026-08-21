/** Carga inicial do teste do curso Testes de Hipótese. */
import admin from 'firebase-admin';
import fs from 'node:fs';

const serviceAccount = JSON.parse(fs.readFileSync('secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });

const questions = [
  ['hip-01', 'Como são caracterizados os dados discretos?', ['Podem assumir qualquer valor dentro de um intervalo.', 'São sempre números fracionários.', 'Representam contagens e números inteiros.', 'São variáveis de natureza qualitativa.'], 2],
  ['hip-02', 'Qual é a diferença principal entre dados discretos e contínuos?', ['Dados discretos medem tempo, enquanto dados contínuos medem quantidades.', 'Apenas dados contínuos podem assumir infinitos valores dentro de um intervalo.', 'Dados discretos possuem distribuição normal.', 'Dados contínuos só podem ser positivos.'], 1],
  ['hip-03', 'Qual é a finalidade do teste de normalidade?', ['Medir a variabilidade dos dados.', 'Verificar se a média dos dados é zero.', 'Determinar se os dados seguem uma distribuição normal.', 'Calcular o desvio padrão.'], 2],
  ['hip-04', 'Quando se usa o teste T para uma amostra (1 Sample T)?', ['Para comparar a média de uma amostra com uma média de referência.', 'Para comparar médias de duas amostras relacionadas.', 'Para testar a variabilidade dos dados.', 'Para analisar dados categóricos.'], 0],
  ['hip-05', 'Qual é o objetivo do teste de Levene?', ['Avaliar a normalidade dos dados.', 'Verificar a igualdade das variâncias entre grupos.', 'Comparar médias de três ou mais grupos.', 'Testar a independência entre variáveis.'], 1],
  ['hip-06', 'Qual métrica é usada para medir a variabilidade dos dados?', ['Mediana.', 'Desvio Padrão.', 'Coeficiente de Correlação.', 'Skewness.'], 1],
  ['hip-07', 'Quando devemos utilizar o teste de Bartlett?', ['Para testar a normalidade dos dados.', 'Para comparar médias de duas amostras.', 'Para comparar a variância de duas amostras.', 'Para medir a variabilidade dos dados.'], 2],
  ['hip-08', 'O que representa um intervalo de confiança de 95%?', ['Que 95% dos dados são confiáveis.', 'Que, em sucessivas amostras, aproximadamente 95% dos intervalos calculados conteriam a média populacional.', 'Que 95% dos resultados são exatos.', 'Que 95% dos dados seguem uma distribuição normal.'], 1],
  ['hip-09', 'Qual teste é usado para comparar duas medianas independentes?', ['Teste de Sinal.', 'Teste de Mann-Whitney.', 'Teste de Wilcoxon.', 'Teste F.'], 1],
  ['hip-10', 'Em que situação é adequado usar o teste de Friedman?', ['Para comparar três ou mais medianas de medidas repetidas.', 'Para verificar a normalidade dos dados.', 'Para comparar variâncias de dois grupos.', 'Para testar a independência entre variáveis.'], 0],
  ['hip-11', 'Qual teste é indicado para comparar a média de duas amostras relacionadas?', ['1 Sample T.', '2 Sample T.', 'Paired T-Test.', 'ANOVA.'], 2],
  ['hip-12', 'Quando se usa o teste de sinal?', ['Para comparar medianas de duas amostras verificando a quantidade de valores menor e maior que a mediana.', 'Para comparar variâncias.', 'Para testar a normalidade.', 'Para analisar a dispersão dos dados.'], 0],
  ['hip-13', 'Para que serve o teste de Wilcoxon?', ['Para testar a homogeneidade das variâncias.', 'Para comparar medianas de duas amostras.', 'Para analisar distribuição normal.', 'Para comparar três ou mais medianas.'], 1],
  ['hip-14', 'Qual teste é usado para comparar proporções entre dois grupos?', ['1 Proportion Test.', '2 Proportions Test.', 'ANOVA.', 'Paired T-Test.'], 1],
  ['hip-15', 'O que o teste F verifica?', ['Diferença de médias entre grupos.', 'Homogeneidade das variâncias entre grupos.', 'Normalidade dos dados.', 'Relação entre três variáveis.'], 1],
  ['hip-16', 'Quando o teste de ANOVA deve ser utilizado?', ['Para comparar variâncias entre dois grupos.', 'Para testar a normalidade dos dados.', 'Para comparar médias de três ou mais grupos.', 'Para verificar a relação entre variáveis categóricas.'], 2],
  ['hip-17', 'O que o teste de 1 Proportion avalia?', ['A média de uma única amostra.', 'A variação de uma variável contínua.', 'A proporção de sucesso em uma única amostra.', 'A diferença entre medianas de dois grupos.'], 2],
  ['hip-18', 'Qual teste é mais adequado para comparar duas proporções?', ['Teste de Bartlett.', '2 Proportions Test.', 'Teste de Wilcoxon.', 'Teste T para uma amostra.'], 1],
  ['hip-19', 'Em que situação o teste de Mann-Whitney é utilizado?', ['Para testar normalidade.', 'Para comparar variâncias de três ou mais grupos.', 'Para comparar medianas de duas amostras independentes.', 'Para verificar a homogeneidade das variâncias.'], 2],
  ['hip-20', 'Quando é adequado usar o teste de Levene em vez do teste F?', ['Quando os dados não seguem uma distribuição normal.', 'Quando se compara proporções.', 'Quando se analisa a mediana.', 'Quando se testa a normalidade dos dados.'], 0],
].map(([id, text, options, correctIndex]) => ({ id, text, options, correctIndex }));

await admin.firestore().collection('quizzes').doc('israel__12').set({
  trilha: 12,
  initiativeId: '0debc708-b745-4999-b564-757e334296ba',
  titulo: 'Testes de Hipótese',
  passPct: 0.70,
  watchGatePct: 0.70,
  questions,
  consultorId: 'israel',
  updatedAt: new Date().toISOString(),
}, { merge: false });

console.log(`Teste salvo: israel__12 (${questions.length} perguntas)`);
await admin.app().delete();
