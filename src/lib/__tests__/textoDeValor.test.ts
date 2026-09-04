import test from 'node:test';
import assert from 'node:assert';
import { textoDeValor, listaDeTextos } from '../textoDeValor.ts';

test('objeto da IA vira o NOME, nunca o id', () => {
  // Formato real que veio no Projeto Setmbro 2026 — com o id em primeiro lugar.
  assert.equal(textoDeValor({ id: 's4', name: 'Sistema ERP' }), 'Sistema ERP');
  assert.equal(textoDeValor({ id: 'p1', step: 'Receber e validar documentação' }), 'Receber e validar documentação');
  assert.equal(textoDeValor({ id: 'o2', name: 'Registro contábil', description: 'Lançamento no ERP' }), 'Registro contábil');
});

test('nome vence descrição mesmo quando a descrição vem primeiro', () => {
  assert.equal(
    textoDeValor({ description: 'Fornece pedidos aprovados', name: 'Área Comercial' }),
    'Área Comercial'
  );
});

test('sem chave conhecida, usa qualquer texto — menos campo de referência', () => {
  assert.equal(textoDeValor({ id: 'c4', supplier: 's1' }), '');
  assert.equal(textoDeValor({ id: 'x1', observacao: 'Algo útil' }), 'Algo útil');
});

test('string comum passa intacta', () => {
  assert.equal(textoDeValor('Fornecedor (emite a nota)'), 'Fornecedor (emite a nota)');
});

test('lista descarta vazio e nunca produz [object Object]', () => {
  const r = listaDeTextos(['Área fiscal', '', '   ', {}, { id: 'z9' }, null, { name: 'Tesouraria' }]);
  assert.deepEqual(r, ['Área fiscal', 'Tesouraria']);
  assert.ok(!JSON.stringify(r).includes('object Object'));
});

test('coluna sem informação continua vazia — não inventa', () => {
  assert.deepEqual(listaDeTextos(null), []);
  assert.deepEqual(listaDeTextos(undefined), []);
  assert.deepEqual(listaDeTextos([]), []);
});
