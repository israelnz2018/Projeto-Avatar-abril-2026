/** Carga inicial do teste do curso Regressões e Correlações. */
import admin from 'firebase-admin';
import fs from 'node:fs';

const serviceAccount = JSON.parse(fs.readFileSync('secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'senha-92ce1' });

const questions = [
  ['reg-01', 'Como são caracterizados os dados discretos?', ['Podem assumir qualquer valor dentro de um intervalo.', 'São sempre números fracionários.', 'Representam contagens e números inteiros.', 'São variáveis de natureza qualitativa.'], 2],
  ['reg-02', 'Qual é a finalidade do teste de normalidade?', ['Medir a variabilidade dos dados.', 'Verificar se a média dos dados é zero.', 'Determinar se os dados seguem uma distribuição normal.', 'Calcular o desvio padrão.'], 2],
  ['reg-03', 'O que representa um gráfico de dispersão?', ['Mostra a distribuição de frequência dos dados.', 'Avalia a correlação entre duas variáveis.', 'Demonstra a variância de um conjunto de dados.', 'Compara medianas de diferentes grupos.'], 1],
  ['reg-04', 'Qual é o objetivo do gráfico de séries temporais?', ['Analisar a relação entre variáveis.', 'Verificar a normalidade dos dados.', 'Identificar padrões e tendências ao longo do tempo.', 'Calcular o desvio padrão.'], 2],
  ['reg-05', 'O que representa o coeficiente de correlação?', ['Mede a dispersão dos dados em relação à média.', 'Indica a força e a direção da relação entre duas variáveis.', 'Verifica a homogeneidade das variâncias.', 'Avalia a normalidade dos dados.'], 1],
  ['reg-06', 'Qual é a diferença entre correlação e causalidade?', ['Correlação implica causa.', 'Causalidade sempre ocorre sem correlação.', 'Correlação mede relações; causalidade implica relação de causa e efeito.', 'Não há diferença.'], 2],
  ['reg-07', 'Qual é o objetivo da regressão simples?', ['Comparar medianas de dois grupos.', 'Estimar a relação entre uma variável dependente e uma independente.', 'Avaliar variabilidade entre três ou mais grupos.', 'Testar a normalidade dos dados.'], 1],
  ['reg-08', 'Quando é adequada a regressão múltipla?', ['Para testar a variabilidade dos dados.', 'Quando há uma variável dependente e várias independentes.', 'Para comparar médias de dois grupos.', 'Para avaliar distribuição normal.'], 1],
  ['reg-09', 'O que a regressão logística analisa?', ['Variâncias de dois grupos.', 'Medianas de grupos emparelhados.', 'A relação entre variáveis categóricas e uma variável dependente categórica.', 'Normalidade dos dados.'], 2],
  ['reg-10', 'Em que situação o teste de normalidade é essencial?', ['Ao comparar variâncias.', 'Antes de aplicar testes paramétricos.', 'Apenas ao testar proporções.', 'Quando os dados são categóricos.'], 1],
  ['reg-11', 'Qual é o propósito de identificar padrões em séries temporais?', ['Para testar a normalidade dos dados.', 'Para prever tendências e sazonalidades.', 'Para comparar medianas.', 'Para avaliar variâncias.'], 1],
  ['reg-12', 'Como a correlação difere de causalidade?', ['Correlação sempre implica causalidade.', 'Causalidade ocorre apenas em dados discretos.', 'Correlação mede a força de uma relação, não a causa.', 'Não há diferença entre correlação e causalidade.'], 2],
  ['reg-13', 'Quais são as principais características dos dados contínuos?', ['Podem assumir qualquer valor dentro de um intervalo.', 'Representam contagens inteiras.', 'São limitados a resultados qualitativos.', 'Têm distribuição sempre normal.'], 0],
  ['reg-14', 'O que o desvio padrão mede?', ['A média dos dados.', 'A posição central dos dados.', 'A dispersão dos dados em relação à média.', 'A correlação entre variáveis.'], 2],
  ['reg-15', 'O que o gráfico de dispersão permite analisar?', ['A distribuição de frequência dos dados.', 'A relação entre duas variáveis.', 'A variância dos dados.', 'A normalidade dos dados.'], 1],
  ['reg-16', 'O coeficiente de correlação pode variar entre quais valores?', ['0 e 1.', '-1 e 1.', '0 e infinito.', '-2 e 2.'], 1],
  ['reg-17', 'Qual resultado indica uma forte correlação positiva?', ['0,1', '-0,8', '0,85', '-1'], 2],
  ['reg-18', 'Em uma regressão simples, o que a inclinação da linha representa?', ['A variância dos dados.', 'A taxa de mudança da variável dependente em relação à independente.', 'A normalidade dos dados.', 'O ponto de interseção com o eixo Y.'], 1],
  ['reg-19', 'Quando a regressão múltipla é recomendada?', ['Para comparar médias de dois grupos.', 'Quando existem múltiplas variáveis independentes.', 'Apenas para dados discretos.', 'Para testar normalidade.'], 1],
  ['reg-20', 'Em regressão múltipla, o que significa multicolinearidade?', ['Quando as variáveis independentes são altamente correlacionadas entre si.', 'Quando os dados não seguem uma distribuição normal.', 'Quando a variância dos dados é muito alta.', 'Quando o valor de p é maior que 0,05.'], 0],
].map(([id, text, options, correctIndex]) => ({ id, text, options, correctIndex }));

await admin.firestore().collection('quizzes').doc('israel__13').set({
  trilha: 13,
  initiativeId: '470183ee-b604-4e1f-8fd0-9e8ae87f1840',
  titulo: 'Regressões e Correlações',
  passPct: 0.70,
  watchGatePct: 0.70,
  questions,
  consultorId: 'israel',
  updatedAt: new Date().toISOString(),
}, { merge: false });

console.log(`Teste salvo: israel__13 (${questions.length} perguntas)`);
await admin.app().delete();
