/**
 * RecursosView — aba "Checklists, Mapas e PPTs".
 * Biblioteca de materiais (recursos) em cards, TOTALMENTE editável pelo consultor em
 * Configuração > Material de Apoio (support_materials, campo `cursos` controla o acesso:
 * vazio = todos os cursos; senão, o aluno precisa ter pelo menos 1 dos cursos liberado —
 * MESMA regra de acesso usada em Educação e Projetos, pra ficar tudo consistente).
 * O único item fixo no código é o Checklist dos 90 dias (é um componente interativo,
 * não um arquivo — não dá pra "fazer upload" dele, e fica aberto pra qualquer aluno logado).
 */
import React, { useEffect, useState, useRef } from 'react';
import { FileCheck2, Lock, Map, Presentation, X, Printer, Table2, FileText } from 'lucide-react';
import { useUserAccess } from '../hooks/useUserAccess';
import { useConsultor } from '../contexts/ConsultorContext';
import { LockedToolPopup } from './LockedToolPopup';
import ChecklistMapa90Dias from './recursos/ChecklistMapa90Dias';
import { listSupportMaterials, SupportMaterial, CategoriaMaterial } from '../services/supportMaterialService';
import { resolveConsultorId } from '../services/consultorService';

interface Recurso {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'Checklist' | 'Mapa' | 'PPT' | 'Planilha' | 'Material';
  icone: React.ComponentType<{ size?: number; className?: string }>;
  cursos: string[];       // vazio = todos os cursos
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
  const { isAdmin, isCoordenador, isConsultor, plano, cursosLiberados, acessoPorCurso } = useUserAccess();
  const { consultor } = useConsultor();
  const nomeConsultor = (consultor.mentorNome && consultor.mentorNome.trim()) || consultor.branding.nome;
  const [aberto, setAberto] = useState<Recurso | null>(null);
  const [materiais, setMateriais] = useState<SupportMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listSupportMaterials(resolveConsultorId())
      .then(setMateriais)
      .catch(() => setMateriais([]))
      .finally(() => setLoading(false));
  }, []);

  // O checklist é conteúdo FIXO do curso do Israel (Kit 90 Dias) — não é um material
  // genérico da plataforma. Só aparece no mundo dele; cada consultor tem só os
  // materiais que ele mesmo publicou em "Material de Apoio".
  const recursos: Recurso[] = [
    ...(resolveConsultorId() === 'israel' ? [{
      id: 'mapa-90-dias',
      titulo: 'O Mapa dos 90 Dias',
      descricao: 'Seu checklist de progresso — 60 ações, uma por dia, do "cheguei perdido" ao "olha o que eu entreguei".',
      categoria: 'Checklist' as const,
      icone: FileCheck2,
      cursos: [],
      conteudo: ChecklistMapa90Dias,
    }] : []),
    ...materiais.map((m): Recurso => ({
      id: m.id,
      titulo: m.titulo,
      descricao: m.descricao,
      categoria: m.categoria || 'Material',
      icone: ICONE_POR_CATEGORIA[m.categoria || 'Material'],
      cursos: m.cursos || [],
      arquivoUrl: m.arquivoUrl,
    })),
  ];

  // MESMA regra de acesso por-curso usada em Educação/Projetos: staff do consultor vê
  // tudo; cursos=[] (todos) é aberto pra qualquer aluno logado; senão, precisa ter pelo
  // menos 1 dos cursos do material liberado (cursosLiberados).
  const veTudo = isAdmin || isConsultor;
  const temAcesso = (cursos: string[]): boolean => {
    if (veTudo) return true; // staff vê tudo
    if (cursos.length === 0) return true; // todos os cursos
    // Legado (plano completo sem pacote por-curso, ex.: Hotmart antigo) — vê tudo, como já
    // acontece em Educação/Projetos pra esse mesmo perfil.
    if (plano === 'completo' && !acessoPorCurso) return true;
    return cursos.some(c => (cursosLiberados || []).includes(c));
  };

  const abrir = (r: Recurso) => {
    if (!temAcesso(r.cursos)) { setLockedPopupOpen(true); return; }
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
            const liberado = temAcesso(r.cursos);
            const Icone = r.icone;
            return (
              <div
                key={r.id}
                onClick={() => abrir(r)}
                className={
                  'relative rounded-2xl border p-5 transition-all cursor-pointer ' +
                  (liberado
                    ? 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg'
                    : 'border-gray-200 bg-gray-50 opacity-70 grayscale-[35%]')
                }
              >
                {!liberado && (
                  <div className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Lock size={12} className="text-white" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className={'w-11 h-11 rounded-xl flex items-center justify-center ' + (liberado ? 'bg-gradient-to-br from-[#0033CC] to-[#1E2D6E] text-white' : 'bg-gray-200 text-gray-400')}>
                    {liberado ? <Icone size={22} /> : <Lock size={20} />}
                  </div>
                  <span className={'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ' + CATEGORIA_COR[r.categoria]}>
                    {r.categoria}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-[15px] leading-snug">{r.titulo}</h3>
                <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{r.descricao}</p>

                {/* Rodapé do card */}
                <div className="mt-4">
                  {!liberado ? (
                    <span className="text-[12px] font-bold text-gray-400">🔒 Ainda não liberado</span>
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

      <LockedToolPopup
        isOpen={lockedPopupOpen}
        onClose={() => setLockedPopupOpen(false)}
        variant={acessoPorCurso || isCoordenador ? 'consultor' : 'upgrade'}
        consultorNome={nomeConsultor}
      />
    </div>
  );
}
