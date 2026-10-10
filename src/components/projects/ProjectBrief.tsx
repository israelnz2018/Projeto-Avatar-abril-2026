import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, FileText, Image as ImageIcon, X, Trash2, BookOpen, Info, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  EstruturaBrief, ObjetivoProjeto, VerboObjetivo, OBJETIVO_VAZIO,
  estruturaDeAnswers, normalizarEstrutura, answersDaEstrutura, fraseDoObjetivo,
  frasesDosObjetivos, tituloAutomatico,
} from './briefModelo';

/**
 * Entendendo o Problema — o primeiro passo do projeto.
 *
 * DESENHADA PARA SER PREENCHIDA AO VIVO, na frente de uma turma: o Israel faz
 * as perguntas em voz alta e monta o projeto de alguém da sala enquanto todos
 * assistem. Por isso são 5 perguntas, não 10, e só 3 são essenciais.
 *
 * O título NÃO é pergunta: ele se monta sozinho a partir do objetivo e aparece
 * no fim, como conclusão — é o momento em que "um problema" vira "um projeto".
 *
 * Os dados ficam em dois lugares (ver briefModelo.ts): `answers` em texto, que é
 * o que o resto da plataforma lê, e `estrutura` com as listas e as partes do
 * objetivo, que é o que esta tela edita.
 */

type Exemplo = {
  id: string;
  rotulo: string;
  q1: string;
  q3: string;
  problemas: string[];
  ganhos: string[];
  objetivos: ObjetivoProjeto[];
};

// Exemplos prontos (read-only) pro modal "Ver exemplo" — não tocam nos dados do aluno.
const BRIEF_EXEMPLOS: Exemplo[] = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    q1: 'Emissão de propostas comerciais para novos clientes',
    problemas: [
      'A proposta leva em média 5 dias para chegar ao cliente',
      'O preço é refeito várias vezes entre comercial e precificação',
      'Não existe um modelo padrão de proposta',
    ],
    objetivos: [
      { verbo: 'Reduzir', indicador: 'o tempo de emissão de propostas comerciais', atual: '5 dias', meta: '1 dia útil', prazo: 'até março' },
      { verbo: 'Aumentar', indicador: 'a taxa de conversão das propostas', atual: '20%', meta: '35%', prazo: '' },
    ],
    ganhos: [
      'Clientes desistem antes de receber a proposta',
      'A equipe perde horas refazendo preço',
      'Mais propostas enviadas dentro do prazo',
    ],
    q3: 'Comercial, precificação, financeiro e jurídico',
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    q1: 'Injeção plástica da linha 3',
    problemas: [
      'Peças saindo com rebarba',
      'Falha de preenchimento no molde',
      'Separação e retrabalho manual no fim da linha',
    ],
    objetivos: [
      { verbo: 'Reduzir', indicador: 'o índice de refugo na injeção plástica', atual: '8%', meta: '2%', prazo: 'em 3 meses' },
    ],
    ganhos: [
      'Desperdício de matéria-prima',
      'Risco de peça defeituosa chegar ao cliente',
      'Menos paradas para retrabalho',
    ],
    q3: 'Operadores da linha 3, manutenção, qualidade e engenharia de processo',
  },
];

const RESPOSTAS_VAZIAS: Record<string, string> = {
  q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q10: '', q12: '',
};

interface ProjectBriefProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  previousToolData?: any;
  project?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onClearAIData?: () => void;
}

export default function ProjectBrief({
  onSave,
  initialData,
  onGenerateAI,
  onClearAIData,
}: ProjectBriefProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialData?.answers || RESPOSTAS_VAZIAS);
  const [estrutura, setEstrutura] = useState<EstruturaBrief>(
    initialData?.estrutura ? normalizarEstrutura(initialData.estrutura) : estruturaDeAnswers(initialData?.answers),
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0);

  useEffect(() => {
    if (initialData) {
      const a = initialData.answers || RESPOSTAS_VAZIAS;
      setAnswers(a);
      setEstrutura(initialData.estrutura ? normalizarEstrutura(initialData.estrutura) : estruturaDeAnswers(a));
      setImages(initialData.images || []);
    } else {
      setAnswers(RESPOSTAS_VAZIAS);
      setEstrutura(estruturaDeAnswers({}));
      setImages([]);
    }
  }, [initialData]);

  /** Grava tudo de uma vez: a estrutura editada e o texto recalculado a partir dela. */
  const gravar = (e: EstruturaBrief, base: Record<string, any> = answers, imgs: string[] = images) => {
    const a = answersDaEstrutura(base, e);
    setEstrutura(e);
    setAnswers(a);
    onSave({ answers: a, images: imgs, estrutura: e }, { silent: true });
  };

  const alterarResposta = (q: string, valor: string) => gravar(estrutura, { ...answers, [q]: valor });
  const alterarObjetivo = (i: number, campo: keyof ObjetivoProjeto, valor: string) =>
    gravar({
      ...estrutura,
      objetivos: estrutura.objetivos.map((o, k) => (k === i ? { ...o, [campo]: valor } : o)),
    });
  const adicionarObjetivo = () =>
    gravar({ ...estrutura, objetivos: [...estrutura.objetivos, { ...OBJETIVO_VAZIO }] });
  const removerObjetivo = (i: number) => {
    const resto = estrutura.objetivos.filter((_, k) => k !== i);
    gravar({ ...estrutura, objetivos: resto.length ? resto : [{ ...OBJETIVO_VAZIO }] });
  };

  const alterarTitulo = (valor: string) =>
    gravar({ ...estrutura, tituloEditado: true }, { ...answers, q6: valor });
  const refazerTitulo = () => gravar({ ...estrutura, tituloEditado: false });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const novas = [...images];
    Array.from(files).forEach((file) => {
      if (novas.length >= 2) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        novas.push(reader.result as string);
        setImages([...novas]);
        onSave({ answers, images: [...novas], estrutura }, { silent: true });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const novas = images.filter((_, i) => i !== index);
    setImages(novas);
    onSave({ answers, images: novas, estrutura }, { silent: true });
  };

  const handleSave = () => onSave({ answers, images, estrutura });

  const isToolEmpty = Object.values(answers).every((v) => !String(v || '').trim()) && images.length === 0;

  // As 3 essenciais — é com elas que dá para começar o projeto na frente da turma.
  const temProcesso = Boolean(String(answers.q1 || '').trim());
  const temProblema = estrutura.problemas.some((p) => p.trim());
  const frasesObjetivo = frasesDosObjetivos(estrutura.objetivos);
  const essenciais = [temProcesso, temProblema, frasesObjetivo.length > 0].filter(Boolean).length;

  const temObjetivoEstruturado = estrutura.objetivos.some(
    (o) => o.indicador.trim() || o.atual.trim() || o.meta.trim(),
  );
  const objetivoAntigo = !temObjetivoEstruturado ? String(answers.q7 || '').trim() : '';

  const titulo = String(answers.q6 || '');
  const detalhesAbertos = Boolean(
    String(answers.q10 || '').trim() || images.length || String(answers.q5 || '').trim() || String(answers.q12 || '').trim(),
  );

  return (
    <div className="space-y-8">
      {/* Indicador de IA */}
      {!isToolEmpty && onGenerateAI && initialData?.isGenerated && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600">Gerado com IA</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Deseja limpar os dados gerados pela IA?')) onClearAIData?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={13} />
            Limpar dados da IA
          </button>
        </div>
      )}

      <div className="bg-white p-8 border border-[#ccc] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee] pb-4">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <h2 className="text-[1.25rem] font-bold text-[#333]">Entendendo o Problema</h2>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest',
                essenciais === 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              Essenciais: {essenciais} de 3
            </span>
            <button
              onClick={() => setShowExemplo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
            >
              <BookOpen size={14} /> Ver exemplo
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-9">
          {/* 1 — PROCESSO */}
          <Pergunta numero={1} titulo="Qual processo você quer melhorar?" nivel="essencial">
            <input
              value={answers.q1 || ''}
              onChange={(e) => alterarResposta('q1', e.target.value)}
              placeholder="Ex.: emissão de propostas comerciais"
              className={CAMPO}
            />
          </Pergunta>

          {/* 2 — PROBLEMAS (lista) */}
          <Pergunta
            numero={2}
            titulo="O que dá errado nesse processo hoje?"
            nivel="essencial"
            dica="Um problema por linha. Aperte Enter para escrever o próximo."
          >
            <ListaEditavel
              itens={estrutura.problemas}
              aoMudar={(itens) => gravar({ ...estrutura, problemas: itens })}
              placeholder="Ex.: a proposta leva 5 dias para chegar ao cliente"
              rotuloAdicionar="Adicionar outro problema"
            />
          </Pergunta>

          {/* 3 — OBJETIVO */}
          <Pergunta
            numero={3}
            titulo="Objetivo do projeto"
            nivel="essencial"
            dica="O que você quer reduzir ou aumentar. Se já souber os números de hoje e da meta, melhor — se não, eles vêm na fase de medição."
          >
            {objetivoAntigo && (
              <p className="mb-3 rounded-[4px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                Objetivo que já estava escrito: <strong>{objetivoAntigo}</strong>. Preencha as partes abaixo para atualizá-lo.
              </p>
            )}
            <div className="space-y-4">
              {estrutura.objetivos.map((o, i) => {
                const frase = fraseDoObjetivo(o);
                const varios = estrutura.objetivos.length > 1;
                return (
                  <div key={i} className={cn(varios && 'rounded-[6px] border border-[#e2e8f0] bg-white p-4')}>
                    {varios && (
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#555]">
                          Objetivo {i + 1}
                        </span>
                        <button
                          onClick={() => removerObjetivo(i)}
                          title="Apagar este objetivo"
                          className="cursor-pointer rounded border-none bg-transparent p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
                      <Campo rotulo="Você quer">
                        <select
                          value={o.verbo}
                          onChange={(e) => alterarObjetivo(i, 'verbo', e.target.value as VerboObjetivo)}
                          className={CAMPO}
                        >
                          <option value="Reduzir">Reduzir</option>
                          <option value="Aumentar">Aumentar</option>
                        </select>
                      </Campo>
                      <Campo rotulo="O quê">
                        <input
                          value={o.indicador}
                          onChange={(e) => alterarObjetivo(i, 'indicador', e.target.value)}
                          placeholder={i === 0 ? 'Ex.: o tempo de emissão de propostas' : 'Ex.: o custo de retrabalho'}
                          className={CAMPO}
                        />
                      </Campo>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Campo rotulo="Hoje está em (opcional)">
                        <input
                          value={o.atual}
                          onChange={(e) => alterarObjetivo(i, 'atual', e.target.value)}
                          placeholder="Ex.: 5 dias"
                          className={CAMPO}
                        />
                      </Campo>
                      <Campo rotulo="Quer chegar a (opcional)">
                        <input
                          value={o.meta}
                          onChange={(e) => alterarObjetivo(i, 'meta', e.target.value)}
                          placeholder="Ex.: 1 dia útil"
                          className={CAMPO}
                        />
                      </Campo>
                      <Campo rotulo="Prazo (opcional)">
                        <input
                          value={o.prazo}
                          onChange={(e) => alterarObjetivo(i, 'prazo', e.target.value)}
                          placeholder="Ex.: até março"
                          className={CAMPO}
                        />
                      </Campo>
                    </div>
                    {frase && (
                      <p className="mb-0 mt-3 rounded-[4px] bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-900">
                        {frase}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={adicionarObjetivo}
              className="mt-3 flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-blue-300 bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-50"
            >
              <Plus size={13} /> Adicionar outro objetivo
            </button>
          </Pergunta>

          {/* 4 — GANHOS E PERDAS (lista) */}
          <Pergunta
            numero={4}
            titulo="O que se ganha resolvendo — ou o que se perde se nada mudar?"
            nivel="recomendada"
            dica="Pode ser em dinheiro, tempo, cliente ou risco. Um por linha."
          >
            <ListaEditavel
              itens={estrutura.ganhos}
              aoMudar={(itens) => gravar({ ...estrutura, ganhos: itens })}
              placeholder="Ex.: perdemos umas 10 vendas por mês pela demora"
              rotuloAdicionar="Adicionar outro"
            />
          </Pergunta>

          {/* 5 — QUEM PARTICIPA */}
          <Pergunta
            numero={5}
            titulo="Quem participa desse processo?"
            nivel="recomendada"
            dica="Áreas, pessoas ou fornecedores. É daqui que sai o SIPOC."
          >
            <input
              value={answers.q3 || ''}
              onChange={(e) => alterarResposta('q3', e.target.value)}
              placeholder="Ex.: comercial, precificação, financeiro e jurídico"
              className={CAMPO}
            />
          </Pergunta>

          {/* MAIS DETALHES — opcional, fechado */}
          <details open={detalhesAbertos} className="rounded-[4px] border border-[#e5e5e5] bg-gray-50/60">
            <summary className="cursor-pointer select-none px-4 py-3 text-[12px] font-bold text-[#666]">
              Mais detalhes (opcional)
            </summary>
            <div className="space-y-6 border-t border-[#e5e5e5] px-4 py-5">
              <Campo rotulo="Próximos passos que você já tem em mente">
                <textarea
                  value={answers.q10 || ''}
                  onChange={(e) => alterarResposta('q10', e.target.value)}
                  rows={2}
                  placeholder="Ex.: mapear o fluxo atual da proposta"
                  className={cn(CAMPO, 'resize-y')}
                />
              </Campo>

              {/* Só aparecem em projeto antigo que já tinha resposta — não
                  fazem parte das perguntas novas, mas o que foi escrito não
                  pode sumir da tela. */}
              {String(answers.q5 || '').trim() && (
                <Campo rotulo="Riscos (resposta anterior)">
                  <textarea
                    value={answers.q5 || ''}
                    onChange={(e) => alterarResposta('q5', e.target.value)}
                    rows={2}
                    className={cn(CAMPO, 'resize-y')}
                  />
                </Campo>
              )}
              {String(answers.q12 || '').trim() && (
                <Campo rotulo="Que tipo de ajuda você precisa (resposta anterior)">
                  <textarea
                    value={answers.q12 || ''}
                    onChange={(e) => alterarResposta('q12', e.target.value)}
                    rows={2}
                    className={cn(CAMPO, 'resize-y')}
                  />
                </Campo>
              )}

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#888]">
                  Imagens (até 2) — gráfico de perdas, foto do problema
                </p>
                <div className="flex flex-wrap gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="group relative h-28 w-28 overflow-hidden rounded border border-gray-200">
                      <img src={img} alt={`Imagem ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.length < 2 && (
                    <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 transition-all hover:border-blue-500 hover:bg-blue-50">
                      <ImageIcon className="text-gray-400" size={22} />
                      <span className="mt-2 text-[10px] font-bold text-gray-400">ENVIAR</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </details>

          {/* CONCLUSÃO — o título do projeto */}
          <div className="rounded-[6px] border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              <Sparkles size={14} /> Conclusão — o título do seu projeto
            </p>
            {titulo || frasesObjetivo.length ? (
              <>
                {/* Caixa que cresce com o texto: com vários objetivos o título
                    passa de uma linha, e um campo de linha única o cortaria. */}
                <textarea
                  ref={(el) => {
                    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
                  }}
                  value={titulo}
                  onChange={(e) => {
                    alterarTitulo(e.target.value.replace(/\n/g, ' '));
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  rows={1}
                  placeholder="O título aparece aqui"
                  className="mt-3 w-full resize-none overflow-hidden rounded-[4px] border border-blue-200 bg-white px-4 py-3 text-[17px] font-bold leading-snug text-[#1E2D6E] focus:border-blue-500 focus:outline-none"
                />
                {frasesObjetivo.length === 1 && (
                  <p className="mt-2 text-[13px] text-[#555]">
                    <strong className="text-[#333]">Objetivo:</strong> {frasesObjetivo[0]}
                  </p>
                )}
                {frasesObjetivo.length > 1 && (
                  <div className="mt-2 text-[13px] text-[#555]">
                    <strong className="text-[#333]">Objetivos:</strong>
                    <ul className="mb-0 mt-1 list-disc space-y-0.5 pl-5">
                      {frasesObjetivo.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#777]">
                  {estrutura.tituloEditado ? (
                    <button
                      onClick={refazerTitulo}
                      disabled={!tituloAutomatico(estrutura.objetivos, String(answers.q1 || ''))}
                      className="flex cursor-pointer items-center gap-1.5 rounded border border-blue-200 bg-white px-2.5 py-1 font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw size={12} /> Gerar o título de novo
                    </button>
                  ) : (
                    <span>Montado a partir do objetivo. Você pode editar.</span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-[#777]">
                Preencha o processo e o objetivo, e o título do projeto se monta aqui.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-[#eee] pt-6">
          <button
            data-save-trigger
            onClick={handleSave}
            className="flex cursor-pointer items-center rounded-[4px] border-none bg-[#10b981] px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-green-600"
          >
            <CheckCircle2 size={18} className="mr-2" />
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* MODAL "Ver exemplo" — read-only, não toca nos dados do aluno */}
      {showExemplo && (
        <ModalExemplo exemploIdx={exemploIdx} setExemploIdx={setExemploIdx} fechar={() => setShowExemplo(false)} />
      )}
    </div>
  );
}

const CAMPO =
  'w-full rounded-[4px] border border-[#ccc] bg-gray-50 px-4 py-2.5 text-[14px] shadow-inner transition-all focus:border-blue-500 focus:bg-white focus:outline-none';

function Pergunta({
  numero, titulo, nivel, dica, children,
}: { numero: number; titulo: string; nivel: 'essencial' | 'recomendada'; dica?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-[15px] font-bold text-[#333]">
          <span className="mr-1.5 text-blue-600">{numero}.</span>
          {titulo}
        </h3>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
            nivel === 'essencial' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500',
          )}
        >
          {nivel === 'essencial' ? 'Essencial' : 'Recomendada'}
        </span>
      </div>
      {dica && <p className="mb-3 mt-0 text-[12px] text-[#888]">{dica}</p>}
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#888]">{rotulo}</span>
      {children}
    </label>
  );
}

/**
 * Uma linha por item. Enter cria a próxima e já põe o cursor nela; apagar uma
 * linha vazia volta para a anterior. Ao vivo, isso deixa listar três ou quatro
 * problemas sem tirar a mão do teclado.
 */
function ListaEditavel({
  itens, aoMudar, placeholder, rotuloAdicionar,
}: { itens: string[]; aoMudar: (itens: string[]) => void; placeholder: string; rotuloAdicionar: string }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const focarEm = useRef<number | null>(null);
  const lista = itens.length ? itens : [''];

  useEffect(() => {
    if (focarEm.current !== null) {
      refs.current[focarEm.current]?.focus();
      focarEm.current = null;
    }
  });

  const mudar = (i: number, valor: string) => aoMudar(lista.map((v, k) => (k === i ? valor : v)));

  const inserirDepois = (i: number) => {
    const nova = [...lista];
    nova.splice(i + 1, 0, '');
    focarEm.current = i + 1;
    aoMudar(nova);
  };

  const remover = (i: number) => {
    if (lista.length === 1) { aoMudar(['']); return; }
    focarEm.current = Math.max(0, i - 1);
    aoMudar(lista.filter((_, k) => k !== i));
  };

  return (
    <div className="space-y-2">
      {lista.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-center text-[16px] font-black text-blue-600">•</span>
          <input
            ref={(el) => { refs.current[i] = el; }}
            value={item}
            onChange={(e) => mudar(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); inserirDepois(i); }
              if (e.key === 'Backspace' && !item && lista.length > 1) { e.preventDefault(); remover(i); }
            }}
            placeholder={i === 0 ? placeholder : 'Mais um…'}
            className={CAMPO}
          />
          {(lista.length > 1 || item) && (
            <button
              onClick={() => remover(i)}
              title="Apagar"
              className="shrink-0 cursor-pointer rounded border-none bg-transparent p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => inserirDepois(lista.length - 1)}
        className="ml-6 flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-blue-300 bg-white px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-50"
      >
        <Plus size={13} /> {rotuloAdicionar}
      </button>
    </div>
  );
}

function ModalExemplo({
  exemploIdx, setExemploIdx, fechar,
}: { exemploIdx: number; setExemploIdx: (i: number) => void; fechar: () => void }) {
  const ex = BRIEF_EXEMPLOS[exemploIdx];
  const titulo = tituloAutomatico(ex.objetivos, ex.q1);
  const frases = frasesDosObjetivos(ex.objetivos);
  const Linha = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <p className="m-0 text-[12px] font-bold text-[#666]">{rotulo}</p>
      <div className="rounded-[4px] border border-[#ccc] bg-gray-50 px-4 py-2 text-[13px] text-gray-800">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={fechar}>
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-blue-600" />
            <div>
              <h3 className="m-0 text-base font-black text-gray-800">Exemplo de Entendendo o Problema</h3>
              <p className="m-0 text-xs text-gray-500">{titulo}</p>
            </div>
          </div>
          <button
            onClick={fechar}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          {BRIEF_EXEMPLOS.map((e, i) => (
            <button
              key={e.id}
              onClick={() => setExemploIdx(i)}
              className={cn(
                'cursor-pointer rounded-lg border-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all',
                exemploIdx === i ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300',
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>

        <div className="space-y-5 p-6">
          <Linha rotulo="1. Qual processo você quer melhorar?">{ex.q1}</Linha>
          <Linha rotulo="2. O que dá errado nesse processo hoje?">
            <ul className="m-0 list-disc space-y-1 pl-5">{ex.problemas.map((p) => <li key={p}>{p}</li>)}</ul>
          </Linha>
          <Linha rotulo="3. Objetivo do projeto">
            {frases.length > 1
              ? <ul className="m-0 list-disc space-y-1 pl-5">{frases.map((f) => <li key={f}>{f}</li>)}</ul>
              : frases[0]}
          </Linha>
          <Linha rotulo="4. O que se ganha resolvendo — ou o que se perde se nada mudar?">
            <ul className="m-0 list-disc space-y-1 pl-5">{ex.ganhos.map((g) => <li key={g}>{g}</li>)}</ul>
          </Linha>
          <Linha rotulo="5. Quem participa desse processo?">{ex.q3}</Linha>
          <Linha rotulo="Conclusão — o título do projeto"><strong>{titulo}</strong></Linha>

          <div className="mt-2 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Info className="mt-0.5 shrink-0 text-amber-600" size={18} />
            <p className="m-0 text-xs leading-relaxed text-amber-800">Este exemplo é só para consulta — não altera os seus dados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
