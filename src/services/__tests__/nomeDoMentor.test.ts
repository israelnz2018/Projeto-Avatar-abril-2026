/**
 * O IA Consultor se chama pelo PRIMEIRO NOME do consultor, e só isso.
 *
 * O nome era um campo à parte que a tela de perfil gravava com o nome COMPLETO — o
 * IA passava a se chamar "Israel Cavalcanti de Souza". E, por ser campo solto,
 * aceitava qualquer coisa: uma consultora ficou com o IA chamado "Mary", que não é
 * o primeiro nome dela.
 */
import test from 'node:test';
import assert from 'node:assert';
import { nomeMentorDe, primeiroNome } from '../consultorService.ts';

const consultor = (dados: Record<string, unknown>) => ({ ...dados } as any);

test('primeiro nome é só a primeira palavra', () => {
  assert.equal(primeiroNome('Israel Cavalcanti de Souza'), 'Israel');
  assert.equal(primeiroNome('  Mariana   Nascimento '), 'Mariana');
  assert.equal(primeiroNome('Israel'), 'Israel');
  assert.equal(primeiroNome(''), '');
  assert.equal(primeiroNome(undefined), '');
  assert.equal(primeiroNome(null), '');
});

test('o IA leva o primeiro nome do consultor, nunca o nome completo', () => {
  assert.equal(nomeMentorDe(consultor({ nome: 'Israel Cavalcanti de Souza' })), 'Israel');
  assert.equal(nomeMentorDe(consultor({ nome: 'Mariana Nascimento' })), 'Mariana');
});

test('nome de IA gravado à mão não vence mais o nome do consultor', () => {
  // O caso real: mentorNome estava "Mary", que não é o primeiro nome dela.
  const mariana = consultor({ nome: 'Mariana Nascimento', mentorNome: 'Mary' });
  assert.equal(nomeMentorDe(mariana), 'Mariana');

  // E o nome completo gravado no campo antigo também não passa inteiro.
  const israel = consultor({ nome: 'Israel Cavalcanti de Souza', mentorNome: 'Israel Cavalcanti de Souza' });
  assert.equal(nomeMentorDe(israel), 'Israel');
});

test('sem o nome do consultor, cai no que houver — sempre só o primeiro nome', () => {
  assert.equal(nomeMentorDe(consultor({ mentorNome: 'Joana Prado' })), 'Joana');
  assert.equal(nomeMentorDe(consultor({ branding: { nome: 'Olimpia Digital' } })), 'Olimpia');
  assert.equal(nomeMentorDe(consultor({})), 'seu mentor');
});
