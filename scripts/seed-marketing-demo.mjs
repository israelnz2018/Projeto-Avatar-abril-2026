/**
 * Semeia o módulo Marketing com os dados reais produzidos entre 11 e 12/09/2026.
 * Serve para ver as etapas preenchidas antes de construir as telas de entrada.
 *
 * Uso:  node scripts/seed-marketing-demo.mjs
 *
 * Não apaga nada: usa merge. Rodar de novo só atualiza.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const CONSULTOR_ID = 'israel';

// Credencial: FIREBASE_ADMIN_KEY_PATH no .env, ou o json em secrets/.
function credencial() {
  const raw = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const m = raw.match(/^FIREBASE_ADMIN_KEY_PATH=(.*)$/m);
  let p = m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  if (!p || !fs.existsSync(p)) {
    const dir = 'secrets';
    const achado = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.endsWith('.json'));
    if (!achado) throw new Error('Credencial de admin não encontrada (.env FIREBASE_ADMIN_KEY_PATH ou secrets/*.json).');
    p = path.join(dir, achado);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

if (!getApps().length) initializeApp({ credential: cert(credencial()) });
const db = getFirestore();

const agora = new Date().toISOString();

/* ---------------- Etapa 1 e 2: configuração e conexões ---------------- */

const config = {
  consultorId: CONSULTOR_ID,
  linkPrincipal: 'https://israel.educacaopelotrabalho.com/plataformalbw',
  instagram: {
    conectado: true,
    conta: '@educacao_pelo_trabalho',
    tipoConta: 'Profissional (Business)',
    conectadoEm: '2026-09-11T21:00:00.000Z',
    expiraEm: '2026-11-10T21:00:00.000Z',
  },
  linkedin: {
    conectado: true,
    conta: 'Israel Cavalcanti de Souza, MBB, PMP, MBA',
    tipoConta: 'Perfil pessoal',
    conectadoEm: '2026-09-12T10:00:00.000Z',
    expiraEm: '2026-11-11T10:00:00.000Z',
  },
  atualizadoEm: agora,
};

/* ---------------- Etapa 3: vídeo fonte ---------------- */

const VIDEO_ID = 'wb-parte-1';
const video = {
  id: VIDEO_ID,
  consultorId: CONSULTOR_ID,
  titulo: 'Lean Six Sigma White Belt — Parte 1',
  curso: 'White Belt',
  serie: 'Parte 1',
  sourceUrl: 'https://youtu.be/UAtX6rqJ_AM',
  duracaoSegundos: 3584,
  temTranscricao: true,
  criadoEm: '2026-09-11T06:59:00.000Z',
};

/* ---------------- Etapas 4 e 5: campanhas e peças ---------------- */

const campanhas = [
  {
    id: 'wb-01-definicao',
    titulo: 'A definição de Lean Six Sigma não é igual para todo mundo',
    objetivo: 'autoridade',
    status: 'publicada',
    corteInicio: '00:27:14.720',
    corteFim: '00:29:49.200',
    criadoEm: '2026-09-11T18:00:00.000Z',
    pecas: [
      { tipo: 'reel', status: 'publicado', versao: 2, legenda: 'Lean Six Sigma não é apenas uma ferramenta para resolver um problema pontual.', arquivoUrl: 'ENTREGAS/REELS/2026-09-11__Videos WB - 01-definicao-lean-six-sigma/reel.mp4', capaUrl: 'capa.jpg', pedidoMelhoria: 'A capa saiu do último segundo do vídeo. Trocar por um quadro do início com o rosto visível.' },
    ],
  },
  {
    id: 'wb-02-metodologia',
    titulo: 'Quando a metodologia passa a fazer parte da gestão da empresa',
    objetivo: 'autoridade',
    status: 'revisar',
    corteInicio: '00:29:49.000',
    corteFim: '00:30:45.000',
    criadoEm: '2026-09-12T09:00:00.000Z',
    pecas: [
      { tipo: 'reel', status: 'revisar', versao: 1, legenda: 'Lean Six Sigma chega a mudar a estrutura da empresa — até o RH e as entrevistas.', arquivoUrl: 'ENTREGAS/REELS/2026-09-12__Videos WB - 02-metodologia-na-gestao/reel.mp4', capaUrl: 'capa.jpg' },
    ],
  },
  {
    id: 'wb-carrossel-ferramenta',
    titulo: 'Ninguém controla o Lean Six Sigma',
    objetivo: 'comentarios',
    status: 'revisar',
    corteInicio: '00:27:14.720',
    corteFim: '00:29:49.200',
    criadoEm: '2026-09-12T14:00:00.000Z',
    pecas: [
      { tipo: 'carrossel-feed', status: 'aprovado', versao: 1, legenda: 'Não existe uma organização dona do método. E é aí que mora o problema.', arquivoUrl: 'ENTREGAS/FEED/2026-09-12__Carrossel - 01-lean-six-sigma-nao-e-ferramenta/' },
      { tipo: 'linkedin-pdf', status: 'aprovado', versao: 1, legenda: 'Documento de 7 páginas para o LinkedIn.', arquivoUrl: 'ENTREGAS/LINKEDIN/2026-09-12__Carrossel - 01-lean-six-sigma-nao-e-ferramenta/documento.pdf' },
      { tipo: 'carrossel-video', status: 'revisar', versao: 2, legenda: 'Versão em vídeo do mesmo carrossel, para Reels.', arquivoUrl: 'ENTREGAS/REELS/2026-09-11__Reels - 06-ia-trava-no-processo/reel-slides-mais-lentos.mp4', pedidoMelhoria: 'Cada tela está passando rápido demais. Deixar 5 segundos por slide.' },
    ],
  },
];

/* ---------------- Grava ---------------- */

const lote = db.batch();

lote.set(db.collection('marketing_config').doc(CONSULTOR_ID), config, { merge: true });
lote.set(db.collection('marketing_videos').doc(VIDEO_ID), video, { merge: true });

let totalPecas = 0;
for (const c of campanhas) {
  const { pecas, ...campanha } = c;
  lote.set(db.collection('marketing_campanhas').doc(c.id), {
    ...campanha,
    consultorId: CONSULTOR_ID,
    videoId: VIDEO_ID,
    atualizadoEm: agora,
  }, { merge: true });

  pecas.forEach((p, i) => {
    const pecaId = `${c.id}__${p.tipo}`;
    lote.set(db.collection('marketing_pecas').doc(pecaId), {
      ...p,
      id: pecaId,
      consultorId: CONSULTOR_ID,
      campanhaId: c.id,
      criadoEm: campanha.criadoEm,
      atualizadoEm: agora,
    }, { merge: true });
    totalPecas++;
  });
}

await lote.commit();

console.log('Semeado com sucesso:');
console.log('  configuração:  1 documento');
console.log(`  vídeo fonte:   1`);
console.log(`  campanhas:     ${campanhas.length}`);
console.log(`  peças:         ${totalPecas}`);
