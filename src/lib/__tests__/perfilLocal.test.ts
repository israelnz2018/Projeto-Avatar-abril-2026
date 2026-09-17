/**
 * O perfil de um usuário NUNCA pode aparecer para outro.
 *
 * Aconteceu de verdade: o consultor abriu "Meu Perfil" e viu o nome, a empresa e o
 * cargo de outra pessoa que tinha entrado antes no mesmo navegador. Como este perfil
 * assina a capa dos PowerPoints e alimenta os relatórios, o nome errado ia para
 * dentro dos documentos.
 */
import test from 'node:test';
import assert from 'node:assert';
import {
  chaveDoPerfil, cuidarDoRegistroAntigo, gravarPerfilLocal, jaSincronizou,
  lerPerfilLocal, marcarSincronizado,
} from '../perfilLocal.ts';

/** Um localStorage de mentira, para o teste não precisar de navegador. */
function deposito(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => (dados.has(k) ? dados.get(k)! : null),
    setItem: (k: string, v: string) => { dados.set(k, v); },
    removeItem: (k: string) => { dados.delete(k); },
    tudo: () => Object.fromEntries(dados),
  };
}

const CHAVE_ANTIGA = 'lbw_user_profile';

test('o perfil de um usuário não aparece para o outro', () => {
  const d = deposito();
  gravarPerfilLocal(d, 'uid-israelpb', { name: 'Israelpb', company: 'LojaShop', role: 'Analista' });

  assert.equal(lerPerfilLocal(d, 'uid-israel'), null, 'o outro usuário não pode ler nada');
  assert.deepEqual(lerPerfilLocal(d, 'uid-israelpb'), { name: 'Israelpb', company: 'LojaShop', role: 'Analista' });
});

test('sem usuário logado nada é gravado — perfil sem dono é o que vazava', () => {
  const d = deposito();
  gravarPerfilLocal(d, undefined, { name: 'Alguém' });
  assert.deepEqual(d.tudo(), {});
});

test('O CASO REAL: registro antigo de OUTRA pessoa é descartado, não herdado', () => {
  // O que estava no navegador: o perfil do Israelpb na chave única de antes.
  const d = deposito({
    [CHAVE_ANTIGA]: JSON.stringify({ name: 'Israelpb', email: 'israelpb@exemplo.com', company: 'LojaShop' }),
    lbw_user_profile_cloud_synced: '1',
  });

  const destino = cuidarDoRegistroAntigo(d, 'uid-israel', 'israelnz2018@hotmail.com');

  assert.equal(destino, 'descartado');
  assert.equal(lerPerfilLocal(d, 'uid-israel'), null, 'o consultor não herda o perfil alheio');
  assert.equal(d.getItem(CHAVE_ANTIGA), null, 'e o registro alheio sai do navegador');
  assert.equal(d.getItem('lbw_user_profile_cloud_synced'), null);
});

test('registro antigo do PRÓPRIO usuário é migrado, sem perder o que ele já tinha', () => {
  const d = deposito({
    [CHAVE_ANTIGA]: JSON.stringify({ name: 'Israel', email: 'israelnz2018@hotmail.com', company: 'LBW' }),
    lbw_user_profile_cloud_synced: '1',
  });

  const destino = cuidarDoRegistroAntigo(d, 'uid-israel', 'ISRAELNZ2018@hotmail.com  ');

  assert.equal(destino, 'migrado', 'e-mail igual, com espaço e caixa diferentes, ainda é o mesmo dono');
  assert.deepEqual(lerPerfilLocal(d, 'uid-israel'), { name: 'Israel', email: 'israelnz2018@hotmail.com', company: 'LBW' });
  assert.equal(jaSincronizou(d, 'uid-israel'), true, 'a marca de já sincronizado vem junto');
  assert.equal(d.getItem(CHAVE_ANTIGA), null);
});

test('registro antigo sem e-mail é descartado: não há como provar de quem é', () => {
  const d = deposito({ [CHAVE_ANTIGA]: JSON.stringify({ name: 'Sem dono' }) });
  assert.equal(cuidarDoRegistroAntigo(d, 'uid-israel', 'israel@exemplo.com'), 'descartado');
  assert.equal(lerPerfilLocal(d, 'uid-israel'), null);
});

test('registro antigo estragado não quebra a tela e some do navegador', () => {
  const d = deposito({ [CHAVE_ANTIGA]: '{isso não é json' });
  assert.equal(cuidarDoRegistroAntigo(d, 'uid-israel', 'israel@exemplo.com'), 'descartado');
  assert.equal(d.getItem(CHAVE_ANTIGA), null);
});

test('a migração não atropela o perfil que o usuário já tem nesta máquina', () => {
  const d = deposito({
    [chaveDoPerfil('uid-israel')]: JSON.stringify({ name: 'Israel de hoje' }),
    [CHAVE_ANTIGA]: JSON.stringify({ name: 'Israel de antigamente', email: 'israel@exemplo.com' }),
  });

  cuidarDoRegistroAntigo(d, 'uid-israel', 'israel@exemplo.com');

  assert.deepEqual(lerPerfilLocal(d, 'uid-israel'), { name: 'Israel de hoje' });
  assert.equal(d.getItem(CHAVE_ANTIGA), null);
});

test('cada usuário tem a própria marca de sincronismo', () => {
  const d = deposito();
  marcarSincronizado(d, 'uid-a');
  assert.equal(jaSincronizou(d, 'uid-a'), true);
  assert.equal(jaSincronizou(d, 'uid-b'), false);
});
