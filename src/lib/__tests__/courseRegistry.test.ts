import test from 'node:test';
import assert from 'node:assert';
import { setCourseRegistry, canonicalCourseRef } from '../courseRegistry.ts';
import { hasCourseAccess, courseNamesMatch } from '../courseAccess.ts';

const YELLOW = {
  id: 'yb1',
  name: 'formação yellow belt',
  nomesAnteriores: ['Formação Profissional em Gestão de Projetos de Melhoria - Nível Yellow Belt'],
};
const BLACK = { id: 'bb1', name: 'Black Belt' };

test('acesso gravado com o nome ANTIGO sobrevive à renomeação', () => {
  setCourseRegistry([YELLOW, BLACK]);
  const aluno = ['Formação Profissional em Gestão de Projetos de Melhoria - Nível Yellow Belt'];
  assert.equal(hasCourseAccess(aluno, YELLOW.name), true);
  assert.equal(hasCourseAccess(aluno, BLACK.name), false);
});

test('trocar para minúsculas não tira o acesso de ninguém', () => {
  setCourseRegistry([{ id: 'p1', name: 'projeto piloto', nomesAnteriores: ['PROJETO PILOTO'] }]);
  assert.equal(hasCourseAccess(['PROJETO PILOTO'], 'projeto piloto'), true);
});

test('acesso gravado por ID funciona igual', () => {
  setCourseRegistry([YELLOW, BLACK]);
  assert.equal(hasCourseAccess(['yb1'], YELLOW.name), true);
  assert.equal(hasCourseAccess(['yb1'], BLACK.name), false);
});

test('nome atual de um curso vence nome histórico de outro', () => {
  const NOVO = { id: 'n1', name: 'Black Belt' };
  const VELHO = { id: 'v1', name: 'Outra Coisa', nomesAnteriores: ['Black Belt'] };
  setCourseRegistry([VELHO, NOVO]);
  assert.equal(canonicalCourseRef('Black Belt'), 'n1');
});

test('referência órfã não libera acesso a curso nenhum', () => {
  setCourseRegistry([YELLOW, BLACK]);
  assert.equal(hasCourseAccess(['Curso Que Nao Existe Mais'], YELLOW.name), false);
});

test('registro vazio cai no comportamento antigo (comparação por nome)', () => {
  setCourseRegistry([]);
  assert.equal(courseNamesMatch('8 - Black Belt', 'Black Belt'), true);
  assert.equal(courseNamesMatch('Black Belt', 'Yellow Belt'), false);
});
