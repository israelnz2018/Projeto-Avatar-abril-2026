/**
 * Quais arquivos vão para qual pasta.
 *
 * O erro que estes testes existem para impedir: a peça do LinkedIn carrega
 * também os PNGs do feed (a tela precisa deles para editar página por página).
 * Salvar tudo jogaria o carrossel do feed inteiro dentro da pasta do LinkedIn,
 * e o Israel só descobriria abrindo a pasta.
 */
import test from 'node:test';
import assert from 'node:assert';
import { PASTA_DA_PECA, arquivosParaSalvar, nomeNoDisco } from '../salvarNoComputador.ts';
import { TIPOS_PECA, Peca } from '../../types/marketing.ts';

const peca = (dados: Partial<Peca>): Peca => ({
  id: 'p', consultorId: 'israel', campanhaId: 'c', versao: 1,
  status: 'aprovado', criadoEm: '', ...dados,
} as Peca);

test('todo tipo de peça tem uma pasta de destino', () => {
  for (const tipo of TIPOS_PECA) {
    assert.ok(PASTA_DA_PECA[tipo.id], `falta a pasta de ${tipo.id}`);
  }
});

test('as pastas são exatamente as que já existem em ENTREGAS', () => {
  // Acentos e maiúsculas incluídos: divergir cria pasta nova ao lado.
  assert.equal(PASTA_DA_PECA['carrossel-feed'], 'CARROCEL DO FEED');
  assert.equal(PASTA_DA_PECA['carrossel-video'], 'CARROCEL DO REELS');
  assert.equal(PASTA_DA_PECA['linkedin-pdf'], 'CARROCEL DO LINKEDIN');
  assert.equal(PASTA_DA_PECA['reel'], 'VIDEO DO REELS e CAPA');
  assert.equal(PASTA_DA_PECA['linkedin-imagem'], 'IMAGEM ÚNICA DO LINKEDIN');
});

test('o PDF do LinkedIn vai sozinho, sem arrastar o carrossel do feed junto', () => {
  const linkedin = peca({
    tipo: 'linkedin-pdf',
    arquivoUrl: 'marketing/i/c/linkedin/v1/documento.pdf',
    arquivos: [
      'marketing/i/c/linkedin/v1/documento.pdf',
      'marketing/i/c/feed/v1/slide-01.png',
      'marketing/i/c/feed/v1/slide-02.png',
    ],
  });
  assert.deepEqual(arquivosParaSalvar(linkedin), ['marketing/i/c/linkedin/v1/documento.pdf']);
});

test('o carrossel do feed leva as páginas, não a legenda nem a capa solta', () => {
  const feed = peca({
    tipo: 'carrossel-feed',
    arquivoUrl: 'marketing/i/c/feed/v1/slide-01.png',
    arquivos: [
      'marketing/i/c/feed/v1/slide-01.png',
      'marketing/i/c/feed/v1/slide-02.png',
      'marketing/i/c/feed/v1/legenda.md',
    ],
  });
  assert.deepEqual(arquivosParaSalvar(feed), [
    'marketing/i/c/feed/v1/slide-01.png',
    'marketing/i/c/feed/v1/slide-02.png',
  ]);
});

test('o Reel leva o vídeo E a capa — a pasta se chama "VIDEO DO REELS e CAPA"', () => {
  const reel = peca({
    tipo: 'reel',
    arquivoUrl: 'marketing/i/c/reel/reel.mp4',
    arquivos: ['marketing/i/c/reel/capa.jpg', 'marketing/i/c/reel/reel.mp4', 'marketing/i/c/reel/legenda.md'],
  });
  const salvos = arquivosParaSalvar(reel);
  assert.ok(salvos.some((c) => c.endsWith('reel.mp4')));
  assert.ok(salvos.some((c) => c.endsWith('capa.jpg')));
  assert.ok(!salvos.some((c) => c.endsWith('.md')));
});

test('o carrossel em vídeo leva só o mp4', () => {
  const video = peca({
    tipo: 'carrossel-video',
    arquivoUrl: 'marketing/i/c/reels/v1/reel.mp4',
    arquivos: ['marketing/i/c/reels/v1/reel.mp4', 'marketing/i/c/reels/v1/legenda.md'],
  });
  assert.deepEqual(arquivosParaSalvar(video), ['marketing/i/c/reels/v1/reel.mp4']);
});

test('o arquivo principal entra mesmo se não estiver na lista', () => {
  const p = peca({ tipo: 'linkedin-imagem', arquivoUrl: 'marketing/i/c/feed/v1/slide-01.png', arquivos: [] });
  assert.deepEqual(arquivosParaSalvar(p), ['marketing/i/c/feed/v1/slide-01.png']);
});

test('não repete arquivo que aparece como principal e na lista', () => {
  const p = peca({
    tipo: 'linkedin-imagem',
    arquivoUrl: 'marketing/i/c/feed/v1/slide-01.png',
    arquivos: ['marketing/i/c/feed/v1/slide-01.png'],
  });
  assert.equal(arquivosParaSalvar(p).length, 1);
});

test('peça antiga, com caminho de fora da plataforma, não tenta baixar nada', () => {
  // Produzidas na máquina antes da fila existir: apontam para ENTREGAS/... local.
  const antiga = peca({ tipo: 'reel', arquivoUrl: 'ENTREGAS/VIDEO/reel.mp4', arquivos: [] });
  assert.deepEqual(arquivosParaSalvar(antiga), []);
});

test('o nome no disco leva o assunto na frente, para não haver cinco slide-01.png', () => {
  const nome = nomeNoDisco('marketing/i/c/feed/v1/slide-01.png', 'Sua mentalidade é de Melhoria Contínua?');
  assert.match(nome, /slide-01\.png$/);
  assert.match(nome, /^Sua-mentalidade/);
  // Sem acento e sem interrogação: nome de arquivo do Windows não aceita.
  assert.ok(!/[?éê]/.test(nome), nome);
});

test('sem assunto, fica o nome original', () => {
  assert.equal(nomeNoDisco('marketing/i/c/feed/v1/slide-01.png', ''), 'slide-01.png');
});
