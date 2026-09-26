import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aceitoNoTiktok, camposDeAgendamentoTiktok, confirmacaoDeMusica,
  conflitoDeMarcaEPrivacidade, exigeConfirmacaoDeMusica,
} from '../tiktok';

describe('formatos aceitos', () => {
  it('aceita os três formatos integrados, recusa os do LinkedIn', () => {
    for (const t of ['reel', 'carrossel-video', 'carrossel-feed']) assert.equal(aceitoNoTiktok(t), true, t);
    for (const t of ['linkedin-pdf', 'linkedin-texto', 'linkedin-imagem']) assert.equal(aceitoNoTiktok(t), false, t);
  });

  it('só vídeo exige a confirmação de música — carrossel de fotos não tem áudio', () => {
    assert.equal(exigeConfirmacaoDeMusica('reel'), true);
    assert.equal(exigeConfirmacaoDeMusica('carrossel-video'), true);
    assert.equal(exigeConfirmacaoDeMusica('carrossel-feed'), false);
  });
});

describe('confirmação de música exige a declaração na tela', () => {
  it('O DEFEITO: marcar pela lista, sem a declaração à vista, NÃO vale consentimento', () => {
    // Era exatamente isto que a tela fazia: publicarNoTiktok + vídeo => true,
    // mesmo no card da lista, onde a declaração de música nunca é mostrada.
    const dado = confirmacaoDeMusica({
      tipo: 'reel', publicarNoTiktok: true, declaracaoExibida: false,
    });
    assert.equal(dado, false);
  });

  it('com a declaração à vista, o consentimento vale', () => {
    assert.equal(confirmacaoDeMusica({
      tipo: 'reel', publicarNoTiktok: true, declaracaoExibida: true,
    }), true);
  });

  it('consentimento já dado antes continua valendo, mesmo sem a declaração agora', () => {
    assert.equal(confirmacaoDeMusica({
      tipo: 'reel', publicarNoTiktok: true, declaracaoExibida: false,
      tiktokMusicUsageConfirmed: true,
    }), true);
  });

  it('peça que não vai ao TikTok não ganha consentimento do nada', () => {
    assert.equal(confirmacaoDeMusica({
      tipo: 'reel', publicarNoTiktok: false, declaracaoExibida: true,
    }), false);
  });
});

describe('parceria paga e privacidade', () => {
  it('O DEFEITO: marcar parceria paga e DEPOIS trocar para “somente você” ficava inconsistente', () => {
    const erro = conflitoDeMarcaEPrivacidade({
      tipo: 'reel', declaracaoExibida: true,
      tiktokBrandedContent: true, tiktokPrivacyLevel: 'SELF_ONLY',
    });
    assert.ok(erro && erro.includes('parceria paga'));
  });

  it('parceria paga com privacidade pública não é conflito', () => {
    assert.equal(conflitoDeMarcaEPrivacidade({
      tipo: 'reel', declaracaoExibida: true,
      tiktokBrandedContent: true, tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
    }), null);
  });

  it('agendar desliga a parceria paga em conflito em vez de travar o consultor', () => {
    const campos = camposDeAgendamentoTiktok({
      tipo: 'reel', publicarNoTiktok: true, declaracaoExibida: true,
      tiktokBrandedContent: true, tiktokPrivacyLevel: 'SELF_ONLY',
    });
    assert.equal(campos.tiktokBrandedContent, false);
    assert.equal(campos.publicarNoTiktok, true);
  });
});

describe('campos gravados ao agendar', () => {
  it('formato não integrado nunca liga o TikTok, mesmo pedido', () => {
    const campos = camposDeAgendamentoTiktok({
      tipo: 'linkedin-pdf', publicarNoTiktok: true, declaracaoExibida: true,
    });
    assert.equal(campos.publicarNoTiktok, false);
    assert.equal(campos.tiktokMusicUsageConfirmed, false);
  });

  it('carrossel de fotos agenda sem consentimento de música', () => {
    const campos = camposDeAgendamentoTiktok({
      tipo: 'carrossel-feed', publicarNoTiktok: true, declaracaoExibida: true,
    });
    assert.equal(campos.publicarNoTiktok, true);
    assert.equal(campos.tiktokMusicUsageConfirmed, false);
  });

  it('o caminho feliz: vídeo agendado pelo modal, com a declaração à vista', () => {
    const campos = camposDeAgendamentoTiktok({
      tipo: 'reel', publicarNoTiktok: true, declaracaoExibida: true,
      tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
    });
    assert.deepEqual(campos, {
      publicarNoTiktok: true, tiktokMusicUsageConfirmed: true, tiktokBrandedContent: false,
    });
  });
});
