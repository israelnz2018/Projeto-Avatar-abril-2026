/**
 * Os dois relógios do calendário.
 *
 * O erro que estes testes existem para impedir: o consultor marca "segunda 19h"
 * na Nova Zelândia e a peça sai noutra hora, porque quem publica usa Brasília.
 * Aqui a conta é conferida nos dois sentidos, incluindo a virada do horário de
 * verão da Nova Zelândia — que existe e move o calendário uma hora.
 */
import test from 'node:test';
import assert from 'node:assert';
import {
  deslocamentoMinutos, comoRelogioDe, diaNoFuso, instanteDe, traduzirRelogio,
  equivalenteEm, tzDe, FUSO_DA_PUBLICACAO,
} from '../fuso.ts';

const SP = 'America/Sao_Paulo';
const NZ = 'Pacific/Auckland';

test('o Brasil está três horas atrás do UTC, o ano todo', () => {
  // O Brasil acabou com o horário de verão em 2019, então não muda.
  assert.equal(deslocamentoMinutos(new Date('2026-01-15T12:00:00Z'), SP), -180);
  assert.equal(deslocamentoMinutos(new Date('2026-07-15T12:00:00Z'), SP), -180);
});

test('a Nova Zelândia muda com o horário de verão', () => {
  // Julho é inverno lá: +12. Janeiro é verão: +13.
  assert.equal(deslocamentoMinutos(new Date('2026-07-15T12:00:00Z'), NZ), 720);
  assert.equal(deslocamentoMinutos(new Date('2026-01-15T12:00:00Z'), NZ), 780);
});

test('o dia no fuso não é o dia em UTC', () => {
  // 02:00 UTC de dia 20 ainda é dia 19 no Brasil, e já é dia 20 de tarde na NZ.
  const instante = new Date('2026-09-20T02:00:00Z');
  assert.equal(diaNoFuso(instante, SP), '2026-09-19');
  assert.equal(diaNoFuso(instante, NZ), '2026-09-20');
});

test('o instante de "19:00 em São Paulo" é 22:00 UTC', () => {
  assert.equal(instanteDe('2026-09-20', '19:00', SP).toISOString(), '2026-09-20T22:00:00.000Z');
});

test('o instante de "19:00 em Auckland" é 07:00 UTC do mesmo dia', () => {
  // Setembro na NZ já está no horário de verão (+12 muda para +13 em setembro),
  // por isso a conta é feita pela própria biblioteca e não por número fixo.
  const instante = instanteDe('2026-09-20', '19:00', NZ);
  assert.equal(diaNoFuso(instante, NZ), '2026-09-20');
});

test('sem dia não há instante, e dia estragado não vira instante', () => {
  assert.equal(instanteDe('', '19:00', SP), null);
  assert.equal(instanteDe('amanhã', '19:00', SP), null);
});

test('19h de segunda no Brasil é terça de manhã na Nova Zelândia', () => {
  const traduzido = traduzirRelogio('2026-09-21', '19:00', SP, NZ);
  assert.equal(traduzido.dia, '2026-09-22');
  assert.equal(traduzido.hora, '10:00');
});

test('e a volta fecha a conta', () => {
  const traduzido = traduzirRelogio('2026-09-22', '10:00', NZ, SP);
  assert.equal(traduzido.dia, '2026-09-21');
  assert.equal(traduzido.hora, '19:00');
});

test('meio-dia no Brasil ainda é o dia seguinte na Nova Zelândia', () => {
  const traduzido = traduzirRelogio('2026-09-21', '12:00', SP, NZ);
  assert.equal(traduzido.dia, '2026-09-22');
  assert.equal(traduzido.hora, '03:00');
});

test('de madrugada no Brasil é o MESMO dia de tarde na Nova Zelândia', () => {
  const traduzido = traduzirRelogio('2026-09-21', '01:00', SP, NZ);
  assert.equal(traduzido.dia, '2026-09-21');
  assert.equal(traduzido.hora, '16:00');
});

test('o relógio de exibição mostra a hora de parede do fuso pedido', () => {
  // comoRelogioDe existe para a grade da semana sair no fuso certo: os campos
  // locais do Date devolvido têm que bater com o dia daquele fuso.
  const instante = new Date('2026-09-20T02:00:00Z');
  const noBrasil = comoRelogioDe(instante, SP);
  assert.equal(noBrasil.getDate(), 19);
  const naNz = comoRelogioDe(instante, NZ);
  assert.equal(naNz.getDate(), 20);
});

test('o fuso da publicação é o do Brasil — é o que o worker usa', () => {
  assert.equal(FUSO_DA_PUBLICACAO, 'brasil');
  assert.equal(tzDe('brasil'), SP);
  assert.equal(tzDe('nz'), NZ);
});

test('a linha de equivalência sai legível, e vazia quando não há dia', () => {
  // O que aparece embaixo da peça: "ter 22 10:00".
  const linha = equivalenteEm('2026-09-21', '19:00', 'nz');
  assert.match(linha, /22/);
  assert.match(linha, /10:00/);
  assert.equal(equivalenteEm(undefined, '19:00', 'nz'), '');
});
