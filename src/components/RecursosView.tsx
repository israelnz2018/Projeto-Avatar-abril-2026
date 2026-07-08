/**
 * RecursosView — aba "Checklists, Mapas e PPTs".
 * Biblioteca de materiais (recursos) em cards. Cada card tem um nível de acesso:
 *   'trilha1'  → liberado pra quem tem a Trilha 1 OU completo (todos os pagantes)
 *   'completo' → só plano completo
 * Card sem acesso mostra cadeado + convite pra comprar (checkout Hotmart).
 * Clicar num card liberado abre um modal com o conteúdo + botão "Imprimir como PDF".
 */
import React, { useState, useRef } from 'react';
import { FileCheck2, Lock, Map, Presentation, X, Printer } from 'lucide-react';
import { useUserAccess } from '../hooks/useUserAccess';
import { HOTMART_CHECKOUT_URL, KIT90_CHECKOUT_URL } from '../lib/constants';
import ChecklistMapa90Dias from './recursos/ChecklistMapa90Dias';

type Nivel = 'trilha1' | 'completo';

interface Recurso {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'Checklist' | 'Mapa' | 'PPT';
  icone: React.ComponentType<{ size?: number; className?: string }>;
  nivel: Nivel;
  conteudo?: React.ComponentType;   // componente React aberto em modal
  pdf?: string;                     // OU um PDF servido em /mapas (abre em nova aba)
  emBreve?: boolean;
}

// Mapas estatísticos (PDFs em public/mapas). Todos nível 'completo'.
const MAPAS: { id: string; titulo: string; descricao: string; pdf: string }[] = [
  { id: 'mapa-estatistico-geral', titulo: 'Mapa Estatístico Geral', descricao: 'A visão geral de qual análise usar em cada situação.', pdf: '/mapas/mapa-estatistico-geral.pdf' },
  { id: 'mapa-grafico-geral', titulo: 'Mapa Gráfico Geral', descricao: 'Qual gráfico escolher para cada tipo de dado e pergunta.', pdf: '/mapas/mapa-grafico-geral.pdf' },
  { id: 'mapa-identificacao', titulo: 'Identificação — Contínuo × Discreto', descricao: 'Descubra se o seu dado é contínuo ou discreto antes de analisar.', pdf: '/mapas/mapa-identificacao-continuo-discreto.pdf' },
  { id: 'mapa-analise-cd', titulo: 'Análise — Contínuo × Discreto', descricao: 'A análise certa conforme o tipo de dado.', pdf: '/mapas/mapa-analise-continuo-discreto.pdf' },
  { id: 'mapa-normalidade', titulo: 'Investigação de Normalidade', descricao: 'Como verificar se os seus dados seguem a distribuição normal.', pdf: '/mapas/mapa-normalidade.pdf' },
  { id: 'mapa-msa', titulo: 'Análise do Sistema de Medição (MSA)', descricao: 'Seu sistema de medição é confiável? O roteiro do R&R.', pdf: '/mapas/mapa-msa.pdf' },
  { id: 'mapa-cep', titulo: 'Carta de Controle (CEP)', descricao: 'Controle estatístico de processo — qual carta usar e quando.', pdf: '/mapas/mapa-cep.pdf' },
  { id: 'mapa-capabilidade', titulo: 'Capabilidade de Processo', descricao: 'Cp, Cpk, Pp, Ppk — o processo entrega o que a especificação pede?', pdf: '/mapas/mapa-capabilidade-processo.pdf' },
  { id: 'mapa-inferencial', titulo: 'Análise Inferencial', descricao: 'Testes de hipótese, ANOVA — decidir com base em amostra.', pdf: '/mapas/mapa-analise-inferencial.pdf' },
  { id: 'mapa-preditivo', titulo: 'Análise Preditiva', descricao: 'Regressão e previsão — do dado histórico à projeção.', pdf: '/mapas/mapa-analise-preditivo.pdf' },
];

const RECURSOS: Recurso[] = [
  {
    id: 'mapa-90-dias',
    titulo: 'O Mapa dos 90 Dias',
    descricao: 'Seu checklist de progresso — 60 ações, uma por dia, do "cheguei perdido" ao "olha o que eu entreguei".',
    categoria: 'Checklist',
    icone: FileCheck2,
    nivel: 'trilha1',
    conteudo: ChecklistMapa90Dias,
  },
  // Os 10 mapas estatísticos (PDFs), todos nível 'completo'.
  ...MAPAS.map((m): Recurso => ({
    id: m.id,
    titulo: m.titulo,
    descricao: m.descricao,
    categoria: 'Mapa',
    icone: Map,
    nivel: 'completo',
    pdf: m.pdf,
  })),
  {
    id: 'ppt-executivo',
    titulo: 'Template de Apresentação Executiva',
    descricao: 'A estrutura SCQA pronta em PPT pra você apresentar sua melhoria pra diretoria.',
    categoria: 'PPT',
    icone: Presentation,
    nivel: 'completo',
    emBreve: true,
  },
];

const CATEGORIA_COR: Record<Recurso['categoria'], string> = {
  Checklist: 'bg-blue-100 text-blue-700',
  Mapa: 'bg-violet-100 text-violet-700',
  PPT: 'bg-emerald-100 text-emerald-700',
};

export default function RecursosView() {
  const { plano, isAdmin, isCoordenador } = useUserAccess();
  const [aberto, setAberto] = useState<Recurso | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Regra de acesso por card. 'trilha1' = qualquer pagante (introdutório/gratuito
  // com a Trilha 1, ou completo). 'completo' = só plano completo. Admin/coord veem tudo.
  const temAcesso = (nivel: Nivel): boolean => {
    if (isAdmin || isCoordenador) return true;
    if (plano === 'completo') return true;
    if (nivel === 'trilha1') return true; // todo aluno logado tem ao menos a Trilha 1
    return false;
  };

  const abrir = (r: Recurso) => {
    if (r.emBreve) return;
    if (!temAcesso(r.nivel)) return;
    if (r.pdf) { window.open(r.pdf, '_blank', 'noopener'); return; } // PDF abre em nova aba
    if (r.conteudo) setAberto(r);
  };

  const imprimir = () => {
    // Abre uma janela só com o conteúdo do recurso, dispara o print e fecha.
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) { window.print(); return; }
    win.document.write(`<!doctype html><html><head><title>${aberto?.titulo || 'Recurso'}</title>`);
    // Copia os estilos da página atual pra impressão sair igual.
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
      win.document.write(n.outerHTML);
    });
    win.document.write('</head><body>' + el.innerHTML + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const checkoutDoNivel = (nivel: Nivel) =>
    nivel === 'trilha1' ? KIT90_CHECKOUT_URL : HOTMART_CHECKOUT_URL;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
          Checklists, Mapas e PPTs
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">Versão beta</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Materiais prontos pra você aplicar no seu trabalho real. Clique num card para abrir e imprimir.
        </p>
      </div>

      {/* Grade de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {RECURSOS.map((r) => {
          const liberado = temAcesso(r.nivel);
          const Icone = r.icone;
          const bloqueado = !liberado;
          return (
            <div
              key={r.id}
              onClick={() => abrir(r)}
              className={
                'relative rounded-2xl border p-5 transition-all ' +
                (bloqueado
                  ? 'border-gray-200 bg-gray-50 opacity-90 cursor-default'
                  : r.emBreve
                    ? 'border-gray-200 bg-white cursor-default'
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg cursor-pointer')
              }
            >
              <div className="flex items-start justify-between mb-3">
                <div className={'w-11 h-11 rounded-xl flex items-center justify-center ' + (bloqueado ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-br from-[#0033CC] to-[#1E2D6E] text-white')}>
                  {bloqueado ? <Lock size={20} /> : <Icone size={22} />}
                </div>
                <span className={'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ' + CATEGORIA_COR[r.categoria]}>
                  {r.categoria}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-[15px] leading-snug">{r.titulo}</h3>
              <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{r.descricao}</p>

              {/* Rodapé do card */}
              <div className="mt-4">
                {r.emBreve ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Em breve</span>
                ) : bloqueado ? (
                  <a
                    href={checkoutDoNivel(r.nivel)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-700 hover:text-blue-900"
                  >
                    <Lock size={13} /> {r.nivel === 'trilha1' ? 'Disponível no Kit 90 Dias →' : 'Disponível no plano Completo →'}
                  </a>
                ) : (
                  <span className="text-[12px] font-bold text-blue-700">{r.pdf ? 'Abrir PDF →' : 'Abrir →'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL do recurso aberto */}
      {aberto && aberto.conteudo && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4 md:p-8"
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(null); }}
        >
          <div className="bg-gray-100 rounded-2xl max-w-4xl w-full my-4 shadow-2xl relative">
            {/* Barra do modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white rounded-t-2xl border-b border-gray-200 px-5 py-3">
              <h2 className="font-bold text-gray-900 text-sm md:text-base truncate">{aberto.titulo}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={imprimir}
                  className="inline-flex items-center gap-1.5 bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  <Printer size={15} /> Imprimir como PDF
                </button>
                <button onClick={() => setAberto(null)} className="text-gray-400 hover:text-gray-700 p-1">
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Conteúdo (é o que vai pra impressão) */}
            <div ref={printRef} className="p-4 md:p-6">
              <aberto.conteudo />
            </div>
            {/* Botão imprimir também embaixo (pedido do Israel) */}
            <div className="px-5 pb-5 pt-1 text-center">
              <button
                onClick={imprimir}
                className="inline-flex items-center gap-2 bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-sm font-bold px-5 py-2.5 rounded-lg"
              >
                <Printer size={16} /> Imprimir como PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
