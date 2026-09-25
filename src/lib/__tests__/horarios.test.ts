import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HORARIOS_POR_DIA, familiaDaPeca, horaSugerida } from '../horarios';
import { TIPOS_PECA, TipoPeca } from '../../types/marketing';

/** Uma data local num dia da semana conhecido. 2026-09-21 é uma segunda-feira. */
const SEGUNDA = new Date(2026, 8, 21);
const dia = (offset: number) => new Date(2026, 8, 21 + offset);

describe('familia de rede', () => {
  it('separa as três famílias', () => {
    assert.equal(familiaDaPeca('reel'), 'reels');
    assert.equal(familiaDaPeca('carrossel-video'), 'reels');
    assert.equal(familiaDaPeca('carrossel-feed'), 'feed');
    assert.equal(familiaDaPeca('linkedin-pdf'), 'linkedin');
    assert.equal(familiaDaPeca('linkedin-imagem'), 'linkedin');
    assert.equal(familiaDaPeca('linkedin-texto'), 'linkedin');
  });

  it('cobre TODO tipo de peça que existe', () => {
    // Se um tipo novo entrar em TIPOS_PECA, ele cai em alguma família aqui —
    // e não silenciosamente numa hora inventada.
    for (const { id } of TIPOS_PECA) {
      const familia = familiaDaPeca(id);
      assert.ok(['reels', 'feed', 'linkedin'].includes(familia), `${id} sem família`);
    }
  });
});

describe('grade de horários', () => {
  it('tem os sete dias em toda família, no formato HH:MM', () => {
    for (const [familia, horas] of Object.entries(HORARIOS_POR_DIA)) {
      assert.equal(horas.length, 7, `${familia} não tem sete dias`);
      for (const hora of horas) {
        assert.match(hora, /^([01]\d|2[0-3]):[0-5]\d$/, `${familia}: "${hora}" não é uma hora válida`);
      }
    }
  });

  it('o dia da semana muda a hora — era esse o defeito da hora fixa', () => {
    const naTerca = horaSugerida('linkedin-pdf', dia(1));
    const naQuarta = horaSugerida('linkedin-pdf', dia(2));
    assert.notEqual(naTerca, naQuarta);
  });

  it('quarta às 16h no LinkedIn: o melhor horário isolado da semana', () => {
    assert.equal(horaSugerida('linkedin-pdf', dia(2)), '16:00');
    assert.equal(horaSugerida('linkedin-texto', dia(2)), '16:00');
    assert.equal(horaSugerida('linkedin-imagem', dia(2)), '16:00');
  });

  it('Reel de terça a quinta cai na janela do almoço', () => {
    for (const offset of [1, 2, 3]) {
      assert.equal(horaSugerida('reel', dia(offset)), '11:30');
      assert.equal(horaSugerida('carrossel-video', dia(offset)), '11:30');
    }
  });

  it('Reel na segunda e na sexta vai para a noite', () => {
    assert.equal(horaSugerida('reel', SEGUNDA), '19:00');
    assert.equal(horaSugerida('reel', dia(4)), '19:00');
  });

  it('carrossel do feed usa a faixa da manhã de terça a quinta', () => {
    for (const offset of [1, 2, 3]) {
      assert.equal(horaSugerida('carrossel-feed', dia(offset)), '09:30');
    }
  });

  it('o fim de semana tem hora própria, e não a da segunda', () => {
    const sabado = dia(5);
    const domingo = dia(6);
    assert.equal(sabado.getDay(), 6);
    assert.equal(domingo.getDay(), 0);
    assert.equal(horaSugerida('reel', sabado), '11:00');
    assert.equal(horaSugerida('reel', domingo), '11:00');
  });

  it('todo tipo devolve hora em todo dia da semana', () => {
    for (const { id } of TIPOS_PECA) {
      for (let offset = 0; offset < 7; offset += 1) {
        const hora = horaSugerida(id as TipoPeca, dia(offset));
        assert.match(hora, /^\d{2}:\d{2}$/, `${id} no dia ${offset}`);
      }
    }
  });
});
