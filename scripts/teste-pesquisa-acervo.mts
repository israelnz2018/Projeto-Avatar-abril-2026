import assert from 'node:assert/strict';
import { rankearAcervo, palavrasPesquisa, type AulaPesquisa } from '../src/services/pesquisaAcervo';

const aulas: AulaPesquisa[] = [
  {
    videoId: 'sipoc', titulo: 'Introdução ao SIPOC', curso: 'Black Belt', serie: 'Definição',
    topicos: [{ time: '04:20', topic: 'Mapeamento do processo com fornecedores e clientes' }], origem: 'curso',
  },
  {
    videoId: 'causa', titulo: 'Diagrama de Ishikawa', curso: 'Black Belt', serie: 'Análise',
    topicos: [{ time: '08:15', topic: 'Análise de causa raiz em problemas de qualidade' }], origem: 'meus-videos',
  },
  {
    videoId: 'generica', titulo: 'Boas-vindas', curso: 'Gestão de Processos', serie: 'Introdução',
    topicos: [], origem: 'curso',
  },
];

assert.deepEqual(palavrasPesquisa('process mapping'), ['processo', 'mapear']);
const resultado = rankearAcervo(aulas, [
  { consulta: 'como mapear processos', mercado: 'BR' },
  { consulta: 'root cause analysis', mercado: 'EN' },
]);
assert.equal(resultado[0].videoId, 'sipoc');
assert.equal(resultado[0].trecho?.time, '04:20');
assert.ok(resultado.some((item) => item.videoId === 'causa'));
assert.ok(!resultado.some((item) => item.videoId === 'generica'));
console.log('Pesquisa do acervo: correspondência de temas e exclusão de curso genérico verificadas.');