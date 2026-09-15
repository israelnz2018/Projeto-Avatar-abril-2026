import test from 'node:test';
import assert from 'node:assert';
import {
  ETIQUETAS_PESSOA, etiquetasValidas, montarPromptImagem, semelhanca, tituloDasEtiquetas,
} from '../marketing.ts';

test('etiqueta inventada não passa: vira a primeira opção da lista', () => {
  const e = etiquetasValidas('pessoa', { emocao: 'empolgado', papel: 'gestor' });
  assert.equal(e.emocao, ETIQUETAS_PESSOA.emocao.opcoes[0].id);
  assert.equal(e.papel, 'gestor');
  // Todo grupo sai preenchido, mesmo sem nada pedido.
  assert.deepEqual(Object.keys(etiquetasValidas('pessoa')).sort(), ['ambiente', 'emocao', 'genero', 'idade', 'papel']);
  assert.deepEqual(Object.keys(etiquetasValidas('cena')).sort(), ['cenario', 'gente', 'momento']);
});

test('o pedido de pessoa mantém o padrão do elenco: cintura para cima, fundo cinza liso', () => {
  const p = montarPromptImagem('pessoa', { papel: 'engenheiro', ambiente: 'fabrica', emocao: 'apontando', genero: 'mulher', idade: '40' });
  assert.match(p, /^A Brazilian woman in her forties, industrial engineer/);
  assert.match(p, /safety vest/);
  assert.match(p, /waist-up framing/);
  assert.match(p, /plain solid light grey seamless studio backdrop/);
  assert.match(p, /no text, no logo, no watermark$/);
});

test('escritório não deixa vírgula sobrando no pedido', () => {
  const p = montarPromptImagem('pessoa', { papel: 'analista', ambiente: 'escritorio', genero: 'homem', idade: '30' });
  assert.match(p, /^A Brazilian man in his thirties, business analyst wearing a navy blazer over a white shirt\. /);
  assert.doesNotMatch(p, /,\s*\./);
});

test('o detalhe do consultor entra, mas antes das restrições, e com limite', () => {
  const p = montarPromptImagem('cena', { cenario: 'quadro-kanban' }, 'com post-its amarelos   '.repeat(30));
  assert.ok(p.indexOf('post-its') < p.indexOf('no watermark'));
  assert.ok(p.length < 900, `pedido com ${p.length} caracteres`);
  assert.match(p, /no signage$/);
});

test('o título da ficha sai das etiquetas', () => {
  assert.equal(tituloDasEtiquetas('pessoa', { papel: 'gestor', emocao: 'duvida' }), 'Gestor de operações — em dúvida');
  assert.equal(tituloDasEtiquetas('cena', { cenario: 'armazem', momento: 'problema' }), 'Armazém — o problema');
});

test('parecida é quem tem o mesmo gesto e o mesmo papel; tipo diferente não conta', () => {
  const alvo = { papel: 'gestor', ambiente: 'escritorio', emocao: 'explicando', genero: 'homem', idade: '40' };
  const mesmoGesto = semelhanca({ tipo: 'pessoa', etiquetas: { ...alvo, genero: 'mulher', idade: '30' } }, 'pessoa', alvo);
  const outroGesto = semelhanca({ tipo: 'pessoa', etiquetas: { ...alvo, emocao: 'frustracao', papel: 'analista' } }, 'pessoa', alvo);
  assert.ok(mesmoGesto > outroGesto);
  assert.equal(semelhanca({ tipo: 'cena', etiquetas: alvo }, 'pessoa', alvo), 0);
  // Foto enviada não tem etiqueta nenhuma, e não quebra a conta.
  assert.equal(semelhanca({ tipo: 'pessoa', etiquetas: {} }, 'pessoa', alvo), 0);
});
