import test from 'node:test';
import assert from 'node:assert';
import { alinharIdeiasAsCausas, causasSemIdeia } from '../brainstormingSolutionCoverage.ts';

const causes = [
  { sourceId: 'a', x: 'X3: Volume elevado' },
  { sourceId: 'b', x: 'X3.1: Analistas desnivelados' },
  { sourceId: 'c', x: 'X6: Dados fiscais incompletos nos pedidos' },
  { sourceId: 'd', x: 'X10: Layout do setor dificulta comunicação' },
  { sourceId: 'e', x: 'X12: Falta de padronização' },
];

test('associa abreviacao ao X exato sem confundir X3 com X3.1', () => {
  const result = alinharIdeiasAsCausas([
    { text: 'A', category: 'x3' },
    { text: 'B', category: 'x3.1' },
    { text: 'C', category: 'x6' },
  ], causes);
  assert.equal(result[0].causeSourceId, 'a');
  assert.equal(result[1].causeSourceId, 'b');
  assert.equal(result[2].category, causes[2].x);
});

test('identifica toda causa confirmada que ficou sem ideia', () => {
  const missing = causasSemIdeia([
    { text: 'A', causeSourceId: 'a', category: causes[0].x },
    { text: 'C', category: 'X6' },
    { text: 'D', category: causes[3].x },
  ], causes);
  assert.deepEqual(missing.map((cause) => cause.sourceId), ['b', 'e']);
});

test('mantem X3 e X3.1 associados separadamente mesmo com textos de solucao iguais', () => {
  const aligned = alinharIdeiasAsCausas([
    { text: 'Padronizar o processo', category: 'X3' },
    { text: 'Padronizar o processo', category: 'X3.1' },
  ], causes);

  assert.deepEqual(aligned.map((idea) => idea.causeSourceId), ['a', 'b']);
  assert.deepEqual(causasSemIdeia(aligned, causes).map((cause) => cause.sourceId), ['c', 'd', 'e']);
});
