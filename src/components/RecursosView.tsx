/**
 * RecursosView — aba "Checklists, Mapas e PPTs".
 * Biblioteca de materiais (recursos) em cards, TOTALMENTE editável pelo consultor em
 * Configuração > Material de Apoio (support_materials, campo `nivel` controla o acesso):
 *   'todos'    → qualquer aluno logado
 *   'trilha1'  → liberado pra quem tem a Trilha 1 OU completo (todos os pagantes)
 *   'completo' → só plano completo
 * Card sem acesso mostra cadeado + convite pra comprar (checkout Hotmart).
 * O único item fixo no código é o Checklist dos 90 dias (é um componente interativo,
 * não um arquivo — não dá pra "fazer upload" dele).
 */
import React, { useEffect, useState, useRef } from 'react';
import { FileCheck2, Lock, Map, Presentation, X, Printer, Table2, Download, FileText } from 'lucide-react';
import { useUserAccess } from '../hooks/useUserAccess';
import { HOTMART_CHECKOUT_URL, KIT90_CHECKOUT_URL } from '../lib/constants';
import ChecklistMapa90Dias from './recursos/ChecklistMapa90Dias';
import { listSupportMaterials, SupportMaterial, CategoriaMaterial, NivelMaterial } from '../services/supportMaterialService';
import { resolveConsultorId } from '../services/consultorService';

type Nivel = NivelMaterial;

interface Recurso {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'Checklist' | 'Mapa' | 'PPT' | 'Planilha' | 'Material';
  icone: React.ComponentType<{ size?: number; className?: string }>;
  nivel: Nivel;
  conteudo?: React.ComponentType;   // componente React aberto em modal (só o checklist)
  arquivoUrl?: string;              // link do arquivo (abre em nova aba)
}

const ICONE_POR_CATEGORIA: Record<CategoriaMaterial, React.ComponentType<{ size?: number; className?: string }>> = {
  Checklist: FileCheck2,
  Mapa: Map,
  Planilha: Table2,
  PPT: Presentation,
  Material: FileText,
};

const CATEGORIA_COR: Record<Recurso['categoria'], string> = {
  Checklist: 'bg-blue-100 text-blue-700',
  Mapa: 'bg-violet-100 text-violet-700',
  PPT: 'bg-emerald-100 text-emerald-700',
  Planilha: 'bg-teal-100 text-teal-700',
  Material: 'bg-slate-100 text-slate-700',
};

export default function RecursosView() {
  const { plano, isAdmin, isCoordenador } = useUserAccess();
  const [aberto, setAberto] = useState<Recurso | null>(null);
  const [materiais, setMateriais] = useState<SupportMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listSupportMaterials(resolveConsultorId())
      .then(setMateriais)
      .catch(() => setMateriais([]))
      .finally(() => setLoading(false));
  }, []);

  // O checklist é o único recurso fixo (componente interativo, não é um arquivo).
  const recursos: Recurso[] = [
    {
      id: 'mapa-90-dias',
      titulo: 'O Mapa dos 90 Dias',
      descricao: 'Seu checklist de progresso — 60 ações, uma por dia, do "cheguei perdido" ao "olha o que eu entreguei".',
      categoria: 'Checklist',
      icone: FileCheck2,
      nivel: 'trilha1',
      conteudo: ChecklistMapa90Dias,
    },
    ...materiais.map((m): Recurso => ({
      id: m.id,
      titulo: m.titulo,
      descricao: m.descricao,
      categoria: m.categoria || 'Material',
      icone: ICONE_POR_CATEGORIA[m.categoria || 'Material'],
      nivel: m.nivel || 'todos',
      arquivoUrl: m.arquivoUrl,
    })),
  ];

  // Regra de acesso por card. 'todos' = qualquer aluno logado. 'trilha1' = qualquer
  // pagante (introdutório/gratuito com a Trilha 1, ou completo). 'completo' = só plano
  // completo. Admin/coordenador veem tudo.
  const temAcesso = (nivel: Nivel): boolean => {
    if (isAdmin || isCoordenador) return true;
    if (nivel === 'todos') return true;
    if (plano === 'completo') return true;
    if (nivel === 'trilha1') return true; // todo aluno logado tem ao menos a Trilha 1
    return false;
  };

  const abrir = (r: Recurso) => {
    if (!temAcesso(r.nivel)) return;
    if (r.arquivoUrl) { window.open(r.arquivoUrl, '_blank', 'noopener'); return; }
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
    // CSS de impressão: A4, cores fiéis (senão o navegador remove fundos) e
    // compactação pra caber nas 2 folhas.
    win.document.write(`<style>
      @page { size: A4; margin: 8mm; }
      html, body { margin: 0; background: #fff; }
      /* Cores fiéis na impressão (fundos das fases, badges, barra verde) */
      *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      /* Compacta pra caber em 2 folhas A4 */
      body { font-size: 10.5px; line-height: 1.28; }
      h1 { font-size: 20px !important; }
      h2 { font-size: 13px !important; }
      h3 { font-size: 12px !important; }
      /* Não cortar uma semana/fase no meio de uma quebra de página */
      label, .no-break { break-inside: avoid; page-break-inside: avoid; }
      /* Fase 3 começa na 2ª folha */
      .quebra-folha { break-before: page; page-break-before: always; }
      /* Esconde controles que não fazem sentido no papel (barra de progresso) */
      .no-print { display: none !important; }
    </style>`);
    win.document.write('</head><body>' + el.innerHTML + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 350);
  };

  const checkoutDoNivel = (nivel: Nivel) =>
    nivel === 'trilha1' ? KIT90_CHECKOUT_URL : HOTMART_CHECKOUT_URL;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
          Checklists, Mapas e PPTs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Materiais prontos pra você aplicar no seu trabalho real. Clique num card para abrir.
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500">Carregando materiais...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recursos.map((r) => {
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
                  {bloqueado ? (
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
                    <span className="text-[12px] font-bold text-blue-700">
                      {r.arquivoUrl
                        ? (r.arquivoUrl.endsWith('.pptx') || r.arquivoUrl.endsWith('.ppt') ? 'Baixar PPT →' : r.arquivoUrl.endsWith('.xlsx') || r.arquivoUrl.endsWith('.xls') ? 'Baixar planilha →' : 'Abrir →')
                        : 'Abrir →'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
