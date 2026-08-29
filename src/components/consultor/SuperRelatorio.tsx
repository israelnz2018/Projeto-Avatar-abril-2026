/**
 * Relatórios — painel do mundo do consultor, com seleção de clientes.
 * Read-only, scoped por consultorId. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, UserCheck, FolderKanban, TrendingUp, Video, Award, Building2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { getRelatorioConsultor, RelatorioConsultor, SegmentoRelatorio } from '../../services/dashboardDataService';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

// Dados fictícios usados exclusivamente em vídeos e demonstrações.
// Não são gravados no Firebase e não misturam informações reais do consultor.
const RELATORIO_DEMONSTRACAO: RelatorioConsultor = {
  diretos: {
    chave: 'diretos', titulo: 'Meus próprios alunos', totalAlunos: 0, ativos: 0,
    totalProjetos: 0, ganhoReal: 0, ganhoTeo: 0, videos: 0, certificados: 0,
  },
  empresas: [{
    chave: 'empresa-x-demo',
    titulo: 'Empresa X - FICTÍCIA',
    coordenadorNome: 'Coordenador demonstrativo',
    totalAlunos: 320,
    ativos: 278,
    totalProjetos: 48,
    ganhoReal: 1248000,
    ganhoTeo: 1860000,
    videos: 4860,
    certificados: 142,
  }],
};

function Card({ icon, label, valor, sub, destaque }: { icon: React.ReactNode; label: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${destaque ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide mb-2" style={{ color: destaque ? '#0f7a58' : '#9CA3AF' }}>
        {icon} {label}
      </div>
      <div className={`text-3xl font-black ${destaque ? 'text-emerald-700' : 'text-gray-800'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function Cards({ s }: { s: SegmentoRelatorio }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card icon={<TrendingUp size={14} />} label="Ganho gerado (R$)" valor={fmtBRL(s.ganhoReal)} sub={`teórico ${fmtBRL(s.ganhoTeo)}`} destaque />
      <Card icon={<Users size={14} />} label="Alunos" valor={String(s.totalAlunos)} sub={`${s.ativos} já acessaram`} />
      <Card icon={<UserCheck size={14} />} label="Ativos" valor={String(s.ativos)} sub="acessaram a plataforma" />
      <Card icon={<FolderKanban size={14} />} label="Projetos" valor={String(s.totalProjetos)} />
      <Card icon={<Video size={14} />} label="Vídeos assistidos" valor={String(s.videos)} />
      <Card icon={<Award size={14} />} label="Certificados" valor={String(s.certificados)} />
    </div>
  );
}

export default function SuperRelatorio() {
  const [searchParams] = useSearchParams();
  const modoCoordenador = searchParams.get('area') === 'coordenador';
  const { consultor, consultorId } = useConsultor();
  const [r, setR] = useState<RelatorioConsultor | null>(null);
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const exibindoDadosFicticios = empresaSelecionada === 'empresa-x-demo';

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro('');
    getRelatorioConsultor(consultorId)
      .then((res) => {
        if (ativo) {
          const empresasReais = res.empresas.filter((e) => e.chave !== 'diretos');
          setR({ ...res, empresas: [RELATORIO_DEMONSTRACAO.empresas[0], ...empresasReais] });
          // O painel único começa mostrando os alunos diretos; as demais
          // opções do seletor são os coordenadores/empresas.
          setEmpresaSelecionada('empresa-x-demo');
        }
      })
      .catch((e) => { if (ativo) setErro(e?.message || 'Erro ao carregar os relatórios.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [consultorId]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">{modoCoordenador ? 'Relatório do Meu Time' : 'Relatórios'}</h1>
      <p className="text-gray-500 text-sm mb-6">{exibindoDadosFicticios ? 'Dados fictícios para apresentação, sem expor informações reais.' : modoCoordenador ? 'Selecione um coordenador para visualizar exatamente o relatório do time dele.' : <>O mundo de <b>{consultor.branding.nome}</b> — engajamento e resultados.</>}</p>

      {loading && <div className="text-gray-500">Calculando o painel…</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}

      {!loading && !erro && r && (
        <>
          <section>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-gray-500 mb-3">
              <Building2 size={15} /> Clientes
            </h2>
            <select value={empresaSelecionada} onChange={(event) => setEmpresaSelecionada(event.target.value)} className="mb-5 w-full max-w-md border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white">
              <option value="empresa-x-demo">Empresa X - FICTÍCIA</option>
              <option value="diretos">Meus próprios alunos</option>
              {r.empresas.filter((e) => e.chave !== 'diretos').map((e) => <option key={e.chave} value={e.chave}>{e.coordenadorNome || e.titulo}</option>)}
            </select>
            {empresaSelecionada === 'diretos' ? (
              <div>
                <div className="font-black text-gray-800 mb-3">Meus próprios alunos</div>
                <Cards s={r.diretos} />
              </div>
            ) : r.empresas.filter((e) => e.chave !== 'diretos' && e.chave === empresaSelecionada).map((e) => (
              <div key={e.chave}>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-black text-gray-800">{e.titulo}</span>
                  {e.coordenadorNome && <span className="text-xs text-gray-400">coord. {e.coordenadorNome}</span>}
                </div>
                <Cards s={e} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
