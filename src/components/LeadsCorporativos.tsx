/**
 * LeadsCorporativos — lista os leads vindos do formulário da página
 * /pacotes-corporativos. Plugado na aba Marketing (só admin).
 * Lê de GET /api/leads-corporativos (coleção Firestore corporate_leads).
 */
import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';

interface CorpLead {
  id: string;
  nome: string;
  funcao?: string;
  email?: string;
  telefone?: string;
  empresa: string;
  site?: string;
  qtdTreinandos?: string;
  suporte?: string[];
  detalhes?: string;
  criadoEm: string;
}

async function authedFetch(url: string): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado.');
  const token = await user.getIdToken();
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

export default function LeadsCorporativos() {
  const [leads, setLeads] = useState<CorpLead[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setCarregando(true); setErro('');
    try {
      const r = await authedFetch('/api/leads-corporativos');
      const b = await r.json().catch(() => ({}));
      if (r.ok) setLeads(Array.isArray(b?.leads) ? b.leads : []);
      else setErro(b?.error || 'Erro ao carregar.');
    } catch (e: any) { setErro(e?.message || 'Erro ao carregar.'); }
    finally { setCarregando(false); }
  };

  useEffect(() => { carregar(); }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-blue-700" />
          <h2 className="font-semibold text-gray-900">6. Leads corporativos</h2>
        </div>
        <button onClick={carregar} disabled={carregando}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Empresas que pediram proposta pela página de Pacotes Corporativos. Você também recebe cada um por e-mail.
      </p>

      {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-3">{erro}</div>}

      {leads.length === 0 ? (
        <p className="text-xs text-gray-400">{carregando ? 'Carregando…' : 'Nenhum lead corporativo ainda.'}</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-gray-800">{l.empresa}</div>
                  <div className="text-xs text-gray-500">
                    {l.nome}{l.funcao ? ` · ${l.funcao}` : ''}
                    {l.site ? <> · <a href={l.site.startsWith('http') ? l.site : `https://${l.site}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">{l.site}</a></> : null}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400">{new Date(l.criadoEm).toLocaleString('pt-BR')}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-gray-600">
                {l.email && (
                  <div><span className="font-semibold">E-mail:</span> <a href={`mailto:${l.email}`} className="text-blue-600">{l.email}</a></div>
                )}
                {l.telefone && (
                  <div><span className="font-semibold">Telefone/WhatsApp:</span> {l.telefone}</div>
                )}
                <div><span className="font-semibold">Funcionários a treinar:</span> {l.qtdTreinandos || '—'}</div>
              </div>

              {l.suporte && l.suporte.length > 0 && (
                <div className="mt-2">
                  <div className="text-[11px] font-semibold text-gray-500 mb-1">Suporte desejado:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {l.suporte.map((s, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {l.detalhes && (
                <div className="mt-2">
                  <div className="text-[11px] font-semibold text-gray-500 mb-0.5">Detalhes:</div>
                  <p className="text-xs text-gray-600 italic">"{l.detalhes}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
