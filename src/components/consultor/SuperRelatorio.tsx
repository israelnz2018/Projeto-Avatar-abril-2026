/**
 * Relatórios — o painel do mundo do consultor, dividido em DOIS blocos:
 *  1) Meus Alunos  — alunos diretos (sem empresa/coordenador)
 *  2) Empresas     — um sub-bloco por empresa (coordenador)
 * Read-only, scoped por consultorId. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { Users, UserCheck, FolderKanban, TrendingUp, Video, Award, Building2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { getRelatorioConsultor, RelatorioConsultor, SegmentoRelatorio } from '../../services/dashboardDataService';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

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
  const { consultor, consultorId } = useConsultor();
  const [r, setR] = useState<RelatorioConsultor | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro('');
    getRelatorioConsultor(consultorId)
      .then((res) => { if (ativo) setR(res); })
      .catch((e) => { if (ativo) setErro(e?.message || 'Erro ao carregar os relatórios.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [consultorId]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Relatórios</h1>
      <p className="text-gray-500 text-sm mb-6">O mundo de <b>{consultor.branding.nome}</b> — engajamento e resultados.</p>

      {loading && <div className="text-gray-500">Calculando o painel…</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}

      {!loading && !erro && r && (
        <>
          {/* BLOCO 1 — MEUS ALUNOS (diretos) */}
          {false && <section className="mb-10">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-gray-500 mb-3">
              <Users size={15} /> Meus Alunos
            </h2>
            <Cards s={r.diretos} />
          </section>}

          {/* BLOCO 2 — EMPRESAS (quebrado por empresa) */}
          <section>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-gray-500 mb-3">
              <Building2 size={15} /> Empresas
            </h2>
            {r.empresas.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
                Nenhuma empresa ainda. Convide um coordenador em <b>Meus Coordenadores</b>.
              </div>
            ) : (
              <div className="space-y-8">
                {r.empresas.map((e) => (
                  <div key={e.chave}>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-black text-gray-800">{e.titulo}</span>
                      {e.coordenadorNome && <span className="text-xs text-gray-400">coord. {e.coordenadorNome}</span>}
                    </div>
                    <Cards s={e} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
