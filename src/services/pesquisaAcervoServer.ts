import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { adminAuth, adminFirestore, isAdminReady } from '../lib/firebaseAdmin';
import { AulaPesquisa, MercadoPesquisa, TermoPesquisa, rankearAcervo } from './pesquisaAcervo';

class ErroPesquisa extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type FontePesquisa = { titulo: string; url: string };
type MercadoResumo = { idioma: string; resumo: string };
type TermoComSinal = TermoPesquisa & { sinal: string };

function texto(valor: unknown, maximo = 300): string {
  return String(valor || '').trim().slice(0, maximo);
}

async function autenticar(req: any): Promise<string> {
  if (!isAdminReady()) throw new ErroPesquisa(503, 'Firebase Admin não configurado.');
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw new ErroPesquisa(401, 'Autenticação obrigatória.');
  let uid = '';
  try { uid = (await adminAuth().verifyIdToken(header.slice(7))).uid; }
  catch { throw new ErroPesquisa(401, 'Token inválido.'); }
  const snap = await adminFirestore().collection('users').doc(uid).get();
  const pessoa = snap.exists ? snap.data() as any : {};
  const adminEmails = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];
  const admin = adminEmails.includes(texto(pessoa.email, 180).toLowerCase());
  if (pessoa.tipoUsuario !== 'consultor' && !admin) throw new ErroPesquisa(403, 'Só consultor ou admin.');
  return texto(pessoa.consultorId || 'israel', 100);
}

async function carregarAcervo(consultorId: string): Promise<AulaPesquisa[]> {
  const db = adminFirestore();
  const [base, marketing] = await Promise.all([
    db.collection('knowledge_base').where('consultorId', '==', consultorId)
      .select('title', 'course', 'playlist', 'summary', 'bunnyVideoId', 'sourceUrl').get(),
    db.collection('marketing_videos').where('consultorId', '==', consultorId)
      .select('titulo', 'curso', 'serie', 'knowledgeBaseId', 'bunnyVideoId', 'sourceUrl').get(),
  ]);
  const porAula = new Map<string, { id: string; dados: any }>();
  for (const doc of marketing.docs) {
    const dados = doc.data() as any;
    if (dados.knowledgeBaseId) porAula.set(String(dados.knowledgeBaseId), { id: doc.id, dados });
  }
  const itens: AulaPesquisa[] = [];
  const usados = new Set<string>();
  for (const doc of base.docs) {
    const aula = doc.data() as any;
    if (!aula.bunnyVideoId && !aula.sourceUrl) continue;
    const relacionado = porAula.get(doc.id);
    if (relacionado) usados.add(relacionado.id);
    const titulo = texto(relacionado?.dados?.titulo || aula.title, 240);
    if (!titulo) continue;
    const topicos = Array.isArray(aula.summary) ? aula.summary
      .map((t: any) => ({ time: texto(t?.time, 20), topic: texto(t?.topic, 300) }))
      .filter((t: any) => t.topic)
      .slice(0, 100) : [];
    itens.push({
      videoId: relacionado?.id || 'aula:' + doc.id,
      knowledgeBaseId: doc.id,
      titulo,
      curso: texto(relacionado?.dados?.curso || aula.course, 120),
      serie: texto(relacionado?.dados?.serie || aula.playlist, 120),
      topicos,
      origem: relacionado ? 'meus-videos' : 'curso',
    });
  }
  for (const doc of marketing.docs) {
    if (usados.has(doc.id)) continue;
    const video = doc.data() as any;
    const titulo = texto(video.titulo, 240);
    if (!titulo || (!video.bunnyVideoId && !video.sourceUrl)) continue;
    itens.push({
      videoId: doc.id,
      titulo,
      curso: texto(video.curso, 120),
      serie: texto(video.serie, 120),
      topicos: [],
      origem: 'meus-videos',
    });
  }
  return itens;
}

function escolherSementes(aulas: AulaPesquisa[]) {
  const cursos = [...new Set(aulas.map((a) => a.curso).filter(Boolean))].slice(0, 24);
  const series = [...new Set(aulas.map((a) => a.serie).filter(Boolean))].slice(0, 36);
  const porCurso = new Map<string, AulaPesquisa[]>();
  for (const aula of aulas) {
    const chave = aula.curso || 'Sem curso';
    if (!porCurso.has(chave)) porCurso.set(chave, []);
    porCurso.get(chave)!.push(aula);
  }
  const titulos: string[] = [];
  let rodada = 0;
  while (titulos.length < 60 && rodada < 8) {
    let encontrou = false;
    for (const grupo of porCurso.values()) {
      const escolhido = grupo[rodada * Math.max(1, Math.floor(grupo.length / 8))];
      if (escolhido) {
        titulos.push(escolhido.titulo);
        encontrou = true;
      }
      if (titulos.length >= 60) break;
    }
    if (!encontrou) break;
    rodada += 1;
  }
  return { cursos, series, titulos: [...new Set(titulos)] };
}

function extrairObjeto(conteudo: string): any {
  const inicio = conteudo.indexOf('{');
  const fim = conteudo.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) throw new ErroPesquisa(502, 'A pesquisa externa não devolveu termos legíveis. Tente atualizar a pesquisa.');
  try { return JSON.parse(conteudo.slice(inicio, fim + 1)); }
  catch { throw new ErroPesquisa(502, 'A pesquisa externa devolveu um formato inválido. Tente atualizar a pesquisa.'); }
}

function codigoMercado(valor: unknown): MercadoPesquisa | '' {
  const nome = texto(valor, 80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['br', 'brasil', 'brazil', 'pt', 'pt-br', 'portugues', 'portugues brasileiro'].includes(nome)) return 'BR';
  if (['en', 'english', 'ingles', 'us', 'uk', 'internacional'].includes(nome)) return 'EN';
  if (['es', 'espanhol', 'espanol', 'spanish', 'espana', 'latam'].includes(nome)) return 'ES';
  return '';
}

function normalizarPesquisa(objeto: any) {
  const vistos = new Set<string>();
  const lista = Array.isArray(objeto?.termos) ? objeto.termos : Array.isArray(objeto?.queries) ? objeto.queries : [];
  const termos: TermoComSinal[] = lista
    .map((t: any) => ({
      consulta: texto(t?.consulta || t?.termo || t?.query || t?.busca, 100),
      mercado: codigoMercado(t?.mercado || t?.idioma || t?.pais),
      sinal: texto(t?.sinal || t?.justificativa || t?.contexto, 240),
    }))
    .filter((t: TermoComSinal) => {
      if (t.consulta.length < 4 || !['BR', 'EN', 'ES'].includes(t.mercado)) return false;
      const chave = t.mercado + ':' + t.consulta.toLowerCase();
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    }).slice(0, 18);
  const nomes: Record<MercadoPesquisa, string> = { BR: 'Brasil', EN: 'Inglês', ES: 'Espanhol' };
  const mercados: MercadoResumo[] = (['BR', 'EN', 'ES'] as MercadoPesquisa[]).map((codigo) => {
    const item = (Array.isArray(objeto?.mercados) ? objeto.mercados : [])
      .find((m: any) => codigoMercado(m?.codigo || m?.idioma || m?.mercado) === codigo);
    return {
      idioma: nomes[codigo],
      resumo: texto(item?.resumo || 'Sem evidência suficiente para resumir este mercado.', 600),
    };
  });
  return { termos, mercados };
}

async function pesquisarNaWeb(aulas: AulaPesquisa[]) {
  const configSnap = await adminFirestore().collection('app_config').doc('api_settings').get();
  const config = configSnap.exists ? configSnap.data() as any : {};
  const chave = process.env.GEMINI_API_KEY || config?.gemini?.apiKey;
  if (!chave) throw new ErroPesquisa(503, 'Serviço de pesquisa com IA não configurado no servidor.');
  const modelo = config?.gemini?.model || 'gemini-2.5-flash';
  const sementes = escolherSementes(aulas);
  const prompt = [
    'Hoje é ' + new Date().toISOString().slice(0, 10) + '.',
    'Pesquise na web perguntas e temas atuais ligados a melhoria contínua, gestão de processos, Lean, Six Sigma, qualidade, projetos e consultoria. Considere interesse persistente dos últimos 12 meses e mudanças recentes dos últimos 90 dias.',
    'Traga de 6 a 10 consultas naturais em português brasileiro, de 2 a 4 em inglês e de 2 a 4 em espanhol. São hipóteses editoriais investigadas na web, não volume real de buscas. Não invente volumes, crescimento, visualizações nem dados do YouTube Studio.',
    'Use a lista abaixo somente para orientar os assuntos da pesquisa. Ela contém exclusivamente títulos, cursos e séries. Não tente identificar vídeos nem devolver IDs. Evite perguntas genéricas e temas fora do acervo.',
    'Metadados do acervo: ' + JSON.stringify(sementes),
    'Devolva somente JSON válido: ' + JSON.stringify({
      termos: [{ consulta: 'como mapear um processo', mercado: 'BR', sinal: 'Observação curta sustentada pelas fontes' }],
      mercados: [{ codigo: 'BR', resumo: 'Observação editorial sobre os temas encontrados' }, { codigo: 'EN', resumo: '...' }, { codigo: 'ES', resumo: '...' }],
    }),
  ].join(String.fromCharCode(10));
  const ai = new GoogleGenAI({ apiKey: chave });
  const gerado = await ai.models.generateContent({
    model: modelo,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { tools: [{ googleSearch: {} }], temperature: 0.2, maxOutputTokens: 8000 },
  });
  if (gerado.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new ErroPesquisa(502, 'A pesquisa externa foi cortada antes de terminar. Tente atualizar a pesquisa.');
  }
  const bruto = texto(gerado.text, 100000);
  let objeto: any;
  try { objeto = extrairObjeto(bruto); }
  catch {
    // O Google Search às vezes devolve texto com fontes antes do JSON. Uma chamada
    // de formatação sem busca recupera a estrutura, sem receber transcrições.
    const formato = await ai.models.generateContent({
      model: modelo,
      contents: [{ role: 'user', parts: [{ text: 'Converta o texto a seguir para o JSON solicitado, sem acrescentar fatos ou termos novos. Responda apenas JSON válido.\n' + bruto }] }],
      config: { temperature: 0, maxOutputTokens: 6000 },
    });
    objeto = extrairObjeto(texto(formato.text, 100000));
  }
  const { termos, mercados } = normalizarPesquisa(objeto);
  if (!termos.length) throw new ErroPesquisa(502, 'A busca não trouxe perguntas utilizáveis. Tente atualizar a pesquisa.');
  const vistos = new Set<string>();
  const fontes: FontePesquisa[] = (gerado.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
    .map((p: any) => ({ titulo: texto(p?.web?.title, 180), url: texto(p?.web?.uri, 1200) }))
    .filter((f: FontePesquisa) => {
      if (!/^https?:\/\//i.test(f.url) || vistos.has(f.url)) return false;
      vistos.add(f.url);
      return true;
    }).slice(0, 12);
  if (!fontes.length) throw new ErroPesquisa(502, 'A busca externa não retornou fontes verificáveis. Tente atualizar a pesquisa.');
  return { termos, mercados, fontes };
}

async function pesquisarYoutube(termos: TermoComSinal[]) {
  const chave = process.env.YOUTUBE_DATA_API_KEY;
  if (!chave) return { status: 'nao_configurado', sinais: [] as any[] };
  // Inclui os três mercados sem consumir a cota com todas as hipóteses de uma vez.
  const consultas = [
    ...termos.filter((t) => t.mercado === 'BR').slice(0, 5),
    ...termos.filter((t) => t.mercado === 'EN').slice(0, 1),
    ...termos.filter((t) => t.mercado === 'ES').slice(0, 1),
  ];
  if (!consultas.length) return { status: 'sem_termos', sinais: [] as any[] };
  try {
    const desde = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const buscas = await Promise.all(consultas.map(async (termo) => {
      const regiao = termo.mercado === 'BR' ? 'BR' : termo.mercado === 'EN' ? 'US' : 'ES';
      const idioma = termo.mercado === 'BR' ? 'pt' : termo.mercado === 'EN' ? 'en' : 'es';
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.search = new URLSearchParams({
        part: 'snippet', type: 'video', q: termo.consulta, regionCode: regiao,
        relevanceLanguage: idioma, publishedAfter: desde, maxResults: '8', key: chave,
      }).toString();
      const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resposta.ok) throw new Error('Busca do YouTube respondeu HTTP ' + resposta.status);
      const corpo = await resposta.json() as any;
      return { consulta: termo.consulta, mercado: termo.mercado, videos: (corpo.items || [])
        .map((item: any) => ({ id: texto(item?.id?.videoId, 30), titulo: texto(item?.snippet?.title, 180), publicadoEm: texto(item?.snippet?.publishedAt, 35) }))
        .filter((v: any) => v.id).slice(0, 5) };
    }));
    const ids = [...new Set(buscas.flatMap((b) => b.videos.map((v: any) => v.id)))];
    const estatisticas = new Map<string, number>();
    if (ids.length) {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.search = new URLSearchParams({ part: 'statistics', id: ids.join(','), key: chave }).toString();
      const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (resposta.ok) {
        const corpo = await resposta.json() as any;
        for (const item of corpo.items || []) estatisticas.set(String(item.id), Number(item?.statistics?.viewCount || 0));
      }
    }
    const sinais = buscas.map((busca) => ({
      consulta: busca.consulta,
      mercado: busca.mercado,
      videos: busca.videos.map((v: any) => ({
        titulo: v.titulo,
        url: 'https://www.youtube.com/watch?v=' + v.id,
        visualizacoes: estatisticas.get(v.id) || 0,
        publicadoEm: v.publicadoEm,
      })).slice(0, 3),
    }));
    return { status: 'disponivel', sinais };
  } catch (error: any) {
    console.warn('[pesquisar-acervo] YouTube Data API indisponível:', String(error?.message || 'erro').slice(0, 150));
    return { status: 'indisponivel', sinais: [] as any[] };
  }
}

export async function pesquisarAcervoHandler(req: any, res: any) {
  try {
    const consultorId = await autenticar(req);
    const aulas = await carregarAcervo(consultorId);
    if (!aulas.length) throw new ErroPesquisa(422, 'Não encontrei aulas ou vídeos com título neste acervo.');
    const versao = crypto.createHash('sha256').update(JSON.stringify(aulas.map((a) => [a.videoId, a.titulo, a.topicos]))).digest('hex');
    const cacheRef = adminFirestore().collection('marketing_pesquisas_acervo').doc(consultorId);
    if (!req.body?.atualizar) {
      const cache = await cacheRef.get();
      const dados = cache.data() as any;
      if (dados?.versao === versao && Date.now() - Number(dados?.feitoEm || 0) < 24 * 60 * 60 * 1000 && dados?.resultado) {
        return res.json({ ...dados.resultado, cache: true });
      }
    }
    const pesquisa = await pesquisarNaWeb(aulas);
    const [youtube, ranking] = await Promise.all([
      pesquisarYoutube(pesquisa.termos),
      Promise.resolve(rankearAcervo(aulas, pesquisa.termos, 10)),
    ]);
    const resultado = {
      totalVideos: aulas.length,
      pesquisadoEm: new Date().toISOString(),
      mercados: pesquisa.mercados,
      termos: pesquisa.termos,
      ranking,
      fontes: pesquisa.fontes,
      youtube,
      aviso: ranking.length ? '' : 'A pesquisa encontrou temas atuais, mas nenhum teve correspondência suficiente nos títulos ou tópicos cadastrados. Veja os termos abaixo.',
      metodologia: 'O ranking mede a correspondência entre perguntas pesquisadas na web e títulos, módulos e índices das aulas, com maior peso para o Brasil. A busca direta no YouTube mostra exemplos de conteúdo publicado, quando há chave configurada. Este ranking não mede volume de buscas nem previsão de visualizações.',
    };
    try { await cacheRef.set({ versao, feitoEm: Date.now(), resultado }); }
    catch (erro) { console.warn("[pesquisar-acervo] Pesquisa pronta, mas não foi possível salvar o cache:", erro); }
    return res.json(resultado);
  } catch (error: any) {
    if (error instanceof ErroPesquisa) return res.status(error.status).json({ error: error.message });
    console.error('[/api/marketing-consultor/pesquisar-acervo] erro:', error);
    return res.status(500).json({ error: 'Não foi possível concluir a pesquisa. Consulte os registros do servidor e tente novamente.' });
  }
}
