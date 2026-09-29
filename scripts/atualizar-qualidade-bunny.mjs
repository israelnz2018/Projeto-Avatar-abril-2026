#!/usr/bin/env node
/**
 * Sobe a versão HD do YouTube para cada vídeo que está em baixa resolução no
 * Bunny — a causa raiz achada em 27/09/2026: o script de migração original
 * (migrate-bunny.mjs, modo "fetch") pedia ao YouTube o formato 720p
 * progressivo, que o YouTube desativou; a chamada caía sozinha para 360p, sem
 * avisar. Confirmado: 146 vídeos (33h) estão em 360p, todos com o link do
 * YouTube guardado — dá para corrigir sem perder nada.
 *
 * Já testado manualmente com 1 vídeo ("Indicadores de desempenho"): baixado
 * em 1080p, duração bateu (1175,84s vs 1175,81s), subiu como vídeo NOVO no
 * Bunny (o Bunny recusa reenviar por cima de um vídeo já processado — HTTP
 * 400 "The video has already been uploaded"), o Firestore foi reapontado
 * para o novo guid, e um corte de teste renderizou com qualidade muito
 * melhor. Aprovado pelo Israel para rodar em todos os 146.
 *
 * SEGURO por padrão:
 *  - NÃO apaga o vídeo antigo do Bunny — fica de reserva até uma limpeza à
 *    parte, depois que o Israel conferir uma amostra.
 *  - Confere a DURAÇÃO do arquivo baixado contra a do Bunny antes de subir
 *    qualquer coisa. Os cortes dos Reels usam o tempo exato de cada palavra;
 *    uma edição diferente no YouTube desalinharia tudo. Fora da margem, PULA
 *    e registra — nunca força.
 *  - RETOMÁVEL: grava o progresso em progresso.json a cada vídeo. Interrompeu
 *    (Ctrl+C, queda de rede)? Roda de novo e continua de onde parou.
 *  - Atualiza TODOS os documentos do knowledge_base que apontam para aquele
 *    guid (o mesmo vídeo pode estar em vários cursos — mesma regra do
 *    migrate-bunny.mjs), só os campos bunnyVideoId/bunnyLibraryId.
 *
 * Uso:
 *   node scripts/atualizar-qualidade-bunny.mjs [--limite N] [--continuar]
 *
 * Precisa de, no .env local: BUNNY_STREAM_API_KEY, BUNNY_LIBRARY_ID,
 * FIREBASE_ADMIN_KEY_JSON (ou _PATH), e do arquivo de cookies exportado do
 * YouTube (extensão "Get cookies.txt LOCALLY") em COOKIES_YOUTUBE_PATH.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const KEY = process.env.BUNNY_STREAM_API_KEY;
const LIB = process.env.BUNNY_LIBRARY_ID;
const COOKIES = process.env.COOKIES_YOUTUBE_PATH || 'C:/Users/Israelnz2018/Downloads/www.youtube.com_cookies.txt';
if (!KEY || !LIB) { console.error('Faltam BUNNY_STREAM_API_KEY e/ou BUNNY_LIBRARY_ID no .env'); process.exit(1); }
if (!existsSync(COOKIES)) { console.error(`Cookies do YouTube não encontrados em ${COOKIES}`); process.exit(1); }

const LIMITE = Number((process.argv.find((a) => a.startsWith('--limite='))?.split('=')[1]) || 0);

const sa = process.env.FIREBASE_ADMIN_KEY_JSON
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY_JSON)
  : JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_KEY_PATH || './secrets/senha-92ce1-firebase-adminsdk-fbsvc-03d2cffb6e.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const H = { AccessKey: KEY, Accept: 'application/json' };
const base = `https://video.bunnycdn.com/library/${LIB}/videos`;

const PROGRESSO_PATH = join(process.cwd(), 'scripts', 'progresso-qualidade-bunny.json');
const LOG_PATH = join(process.cwd(), 'scripts', 'log-qualidade-bunny.txt');
const CADENCIA_RESUMO = 30;
function appendLog(texto) { appendFileSync(LOG_PATH, `${texto}\n\n`); }
const progresso = existsSync(PROGRESSO_PATH) ? JSON.parse(readFileSync(PROGRESSO_PATH, 'utf8')) : {};
function salvarProgresso() { writeFileSync(PROGRESSO_PATH, JSON.stringify(progresso, null, 2)); }

/** A duração pode diferir por arredondamento de contêiner. 3s de folga é
 * generoso o bastante para isso e apertado o bastante para pegar uma edição
 * diferente de verdade (um corte, uma parte removida). */
const TOLERANCIA_DURACAO_S = 3;

async function bunnyGet(guid) {
  const r = await fetch(`${base}/${guid}`, { headers: H });
  if (!r.ok) throw new Error(`Bunny GET ${guid}: HTTP ${r.status}`);
  return r.json();
}
async function bunnyCriar(titulo) {
  const r = await fetch(base, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titulo }) });
  if (!r.ok) throw new Error(`Bunny criar vídeo: HTTP ${r.status}`);
  return (await r.json()).guid;
}
async function bunnySubir(guid, caminho) {
  const bytes = readFileSync(caminho);
  const r = await fetch(`${base}/${guid}`, { method: 'PUT', headers: { AccessKey: KEY }, body: bytes });
  if (!r.ok) throw new Error(`Bunny upload ${guid}: HTTP ${r.status} ${await r.text()}`);
}
async function bunnyEsperarPronto(guid, minutos = 15) {
  for (let i = 0; i < minutos * 12; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    const v = await bunnyGet(guid);
    if (v.status === 4) return v;
    if (v.status >= 5) throw new Error(`Bunny recusou o processamento (status ${v.status})`);
  }
  throw new Error('Bunny não terminou de processar a tempo.');
}

function duracaoDoArquivo(caminho) {
  const saida = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', caminho], { encoding: 'utf8' });
  return Number(saida.trim());
}

/**
 * O YouTube BLOQUEOU a rede na primeira rodada completa ("Sign in to confirm
 * you're not a bot") — depois de ~8 downloads em pouco mais de uma hora, mais
 * testes avulsos. O bloqueio valia até SEM cookies, então era da rede, não da
 * conta; e caiu sozinho depois de algumas horas. A migração original dos 169
 * vídeos em 1080p funcionou porque andou devagar. As defesas aqui:
 *
 *  1. RITMO DE GENTE: pausa ALEATÓRIA de 2 a 4 minutos entre vídeos, e
 *     velocidade limitada (~4 MB/s, a de alguém assistindo em HD), em vez de
 *     rajadas coladas com intervalo fixo — intervalo fixo é assinatura de robô.
 *  2. BLOQUEIO NÃO É "PULADO": se o YouTube bloquear, o script NÃO marca o
 *     vídeo como pulado e NÃO segue para o próximo — seguir era insistir
 *     durante o bloqueio, e isso o prolonga. Ele PARA por 1 hora e tenta o
 *     MESMO vídeo de novo.
 *  3. DESISTE COM ELEGÂNCIA: 6 esperas seguidas no mesmo vídeo (6 horas)
 *     encerram o lote inteiro — se o YouTube ainda bloqueia depois disso,
 *     todos os seguintes também seriam bloqueados. O progresso fica salvo e
 *     basta rodar de novo depois.
 */
class BloqueioYoutube extends Error {}

const SINAIS_DE_BLOQUEIO = /confirm you.?re not a bot|sign in to confirm|HTTP Error 403|HTTP Error 429|Too Many Requests/i;

function baixarDoYoutube(url, destino) {
  const args = [
    '-q', '--no-warnings', '--cookies', COOKIES,
    '-f', 'bv*[height<=1080]+ba/b[height<=1080]/best', '--merge-output-format', 'mp4',
    '--limit-rate', '4M',
    '--sleep-requests', '3', '--sleep-interval', '5', '--max-sleep-interval', '15',
    '-o', destino, url,
  ];
  // 20 min: com o limite de 4 MB/s o maior vídeo da lista baixa em ~2 min;
  // passar de 20 é download estrangulado (o 5º do teste caiu para ~1 KB/s),
  // que é bloqueio disfarçado — e é tratado como bloqueio.
  const r = spawnSync('yt-dlp', args, { encoding: 'utf8', timeout: 20 * 60 * 1000 });
  if (r.signal === 'SIGTERM') throw new BloqueioYoutube('download estrangulado (velocidade quase zero) — limite do YouTube');
  // O .exe do yt-dlp no Windows, com -q, às vezes manda o "ERROR:" fatal para o
  // STDOUT em vez do stderr — foi exatamente isso que passou batido na primeira
  // rodada: SINAIS_DE_BLOQUEIO só olhava stderr, o bloqueio saiu marcado como
  // "pulado" e o script seguiu tentando os próximos, insistindo no bloqueio.
  const erro = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (r.status !== 0 && SINAIS_DE_BLOQUEIO.test(erro)) throw new BloqueioYoutube(`YouTube bloqueou: ${erro.trim().slice(0, 160)}`);
  if (r.status !== 0) throw new Error(`yt-dlp falhou: ${erro.trim().slice(0, 300)}`);
}

const dormir = (ms) => new Promise((res) => setTimeout(res, ms));
const pausaEntreVideos = () => (120 + Math.random() * 120) * 1000; // 2 a 4 min
const ESPERA_APOS_BLOQUEIO_MS = 60 * 60 * 1000;
const MAX_ESPERAS_SEGUIDAS = 6;

async function atualizarFirestore(guidAntigo, guidNovo) {
  const snap = await db.collection('knowledge_base').where('bunnyVideoId', '==', guidAntigo).get();
  for (const d of snap.docs) await d.ref.update({ bunnyVideoId: guidNovo });
  return snap.size;
}

/** Um vídeo, do começo ao fim. Lança BloqueioYoutube, ou Error (motivo do vídeo). */
async function processar(item, passo) {
  const temp = mkdtempSync(join(tmpdir(), 'bunny-qual-'));
  const arquivoLocal = join(temp, 'video.mp4');
  try {
    const antigo = await bunnyGet(item.guid);
    if (!antigo.length) throw new Error('duração desconhecida no Bunny — não dá para conferir com segurança');

    const docsSnap = await db.collection('knowledge_base').where('bunnyVideoId', '==', item.guid).limit(1).get();
    const sourceUrl = docsSnap.docs[0]?.data()?.sourceUrl;
    if (!sourceUrl) throw new Error('sem sourceUrl (link do YouTube) no Firestore');

    passo('baixando do YouTube...');
    baixarDoYoutube(sourceUrl, arquivoLocal);
    if (!existsSync(arquivoLocal)) throw new Error('yt-dlp não gerou o arquivo');

    const duracaoBaixada = duracaoDoArquivo(arquivoLocal);
    const diferenca = Math.abs(duracaoBaixada - antigo.length);
    if (diferenca > TOLERANCIA_DURACAO_S) {
      throw new Error(`duração não bate: Bunny ${antigo.length}s vs YouTube ${duracaoBaixada.toFixed(1)}s (diferença ${diferenca.toFixed(1)}s) — vídeo pode ter sido reeditado`);
    }

    const tamanhoMB = (statSync(arquivoLocal).size / 1024 / 1024).toFixed(0);
    passo(`${tamanhoMB}MB, ${duracaoBaixada.toFixed(1)}s (bate com o Bunny) | criando vídeo novo...`);
    const guidNovo = await bunnyCriar(item.title);
    passo('subindo para o Bunny...');
    await bunnySubir(guidNovo, arquivoLocal);
    passo('aguardando processar...');
    const pronto = await bunnyEsperarPronto(guidNovo, 30);
    if (pronto.height < item.height) throw new Error(`o Bunny processou em ${pronto.width}x${pronto.height}, pior que o original (${item.height}p) — mantendo o antigo`);

    const quantos = await atualizarFirestore(item.guid, guidNovo);
    passo(`OK: ${pronto.width}x${pronto.height} | ${quantos} documento(s) reapontado(s) | guid novo ${guidNovo}`);
    return { guidNovo, resolucao: `${pronto.width}x${pronto.height}` };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// ---- main ----
const lista = JSON.parse(readFileSync(join(tmpdir(), 'bunny-baixos.json'), 'utf8'));
const pendentes = lista.filter((v) => !progresso[v.guid] || progresso[v.guid].status === 'pendente');
const alvo = LIMITE ? pendentes.slice(0, LIMITE) : pendentes;
const agora = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

console.log(`${agora()} | ${lista.length} vídeo(s) em baixa resolução | ${Object.keys(progresso).length} já processado(s) antes | ${alvo.length} nesta rodada`);

let ok = 0, pulados = 0;
for (const [indice, item] of alvo.entries()) {
  const passos = [`[${indice + 1}/${alvo.length}] ${item.title}`];
  const passo = (s) => passos.push(`  ${s}`);
  let esperas = 0;
  for (;;) {
    try {
      const r = await processar(item, passo);
      progresso[item.guid] = { status: 'ok', ...r, quando: new Date().toISOString() };
      ok++;
      break;
    } catch (e) {
      if (e instanceof BloqueioYoutube) {
        esperas++;
        passo(`BLOQUEIO (${esperas}/${MAX_ESPERAS_SEGUIDAS}): ${e.message}`);
        appendLog(passos.join('\n'));
        passos.length = 1;
        if (esperas >= MAX_ESPERAS_SEGUIDAS) {
          salvarProgresso();
          console.log(`${agora()} | YouTube continua bloqueando depois de ${MAX_ESPERAS_SEGUIDAS}h. Lote PARADO em ok=${ok}. Rode de novo mais tarde — retoma daqui.`);
          process.exit(2);
        }
        console.log(`${agora()} | YouTube bloqueou; pausa de 1h antes de tentar o mesmo vídeo de novo (ok=${ok} até aqui).`);
        await dormir(ESPERA_APOS_BLOQUEIO_MS);
        continue;
      }
      passo(`PULADO: ${e.message}`);
      progresso[item.guid] = { status: 'pulado', motivo: String(e.message).slice(0, 300), quando: new Date().toISOString() };
      pulados++;
      break;
    }
  }
  salvarProgresso();
  appendLog(passos.join('\n'));
  if ((ok + pulados) % CADENCIA_RESUMO === 0 || indice === alvo.length - 1) {
    console.log(`${agora()} | [${indice + 1}/${alvo.length}] ok=${ok} pulados=${pulados}`);
  }
  if (indice < alvo.length - 1) await dormir(pausaEntreVideos());
}

console.log(`${agora()} | Fim da rodada. ok=${ok} pulados=${pulados}`);
console.log(`Progresso completo em ${PROGRESSO_PATH}`);
process.exit(0);
