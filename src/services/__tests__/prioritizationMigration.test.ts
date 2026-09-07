import test from 'node:test';
import assert from 'node:assert';
import { prioritizationItemsFromSource } from '../prioritizationMigration.ts';

test('leva as ideias do Brainstorming de Solucoes para a Matriz RAB', () => {
  const result = prioritizationItemsFromSource({
    ideas: [
      { id: 'i1', text: 'Treinar a equipe', category: 'X3: Equipe sem treinamento', causeSourceId: 'x3' },
      { id: 'i2', text: 'Reorganizar o layout', category: 'X10: Layout dificulta comunicacao', causeSourceId: 'x10' },
    ],
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].description, 'Treinar a equipe');
  assert.equal(result[0].sourceCauseId, 'x3');
  assert.equal(result[1].sourceCause, 'X10: Layout dificulta comunicacao');
});

test('continua aceitando projetos aprovados da ferramenta Ideias de Projetos', () => {
  const result = prioritizationItemsFromSource({
    toolData: {
      generatedProjects: [
        { id: 'p1', title: 'Reduzir retrabalho', aprovado: true },
        { id: 'p2', title: 'Projeto recusado', aprovado: false },
      ],
    },
  });

  assert.deepEqual(result.map((item) => item.description), ['Reduzir retrabalho']);
});

test('preserva textos iguais quando pertencem a causas diferentes', () => {
  const result = prioritizationItemsFromSource({
    ideas: [
      { text: 'Padronizar processo', causeSourceId: 'x3' },
      { text: 'Padronizar processo', causeSourceId: 'x3.1' },
    ],
  });

  assert.equal(result.length, 2);
});
