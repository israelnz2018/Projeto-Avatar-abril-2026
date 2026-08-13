import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Users2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { empresaIdDireto } from '../../services/consultorService';
import { isIntroCourse } from '../../services/knowledgeService';
import { getUserDocsByConsultor, updateUserNoConsultor } from '../../services/userService';
import MeusAlunos from './MeusAlunos';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

interface CursoCoord {
  curso: string;
  vencimento: string | null;
  valor?: number;
  quantidade?: number;
}

interface CoordRow {
  uid: string;
  nome: string;
  email: string;
  empresa: string;
  empresaId: string;
  time: number;
  timeAtivo: number;
  limite: number | null;
  valorPago: number;
  cursosAcesso: CursoCoord[];
  vencimento: string;
}

const dataPadrao = () => new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const moedaParaNumero = (valor: string) => Number(String(valor || '0').replace(',', '.')) || 0;
const formatMoney = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const maiorVencimento = (lista: { vencimento: string | null }[]) => {
  const datas = lista.map((c) => c.vencimento).filter(Boolean) as string[];
  return datas.length ? datas.sort().at(-1)! : '';
};

export default function MeusCoordenadores() {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const [diretoStats, setDiretoStats] = useState({ time: 0, timeAtivo: 0 });
  const [rows, setRows] = useState<CoordRow[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cursosConvite, setCursosConvite] = useState<string[]>([]);
  const [qtdConvite, setQtdConvite] = useState<Record<string, string>>({});
  const [valorCursoConvite, setValorCursoConvite] = useState<Record<string, string>>({});
  const [vencimentoCursoConvite, setVencimentoCursoConvite] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');
  const [editUid, setEditUid] = useState<string | null>(null);
  const [eCursos, setECursos] = useState<string[]>([]);
  const [eQtdCursos, setEQtdCursos] = useState<Record<string, string>>({});
  const [eValorCursos, setEValorCursos] = useState<Record<string, string>>({});
  const [eVencimentoCursos, setEVencimentoCursos] = useState<Record<string, string>>({});
  const [eSalvando, setESalvando] = useState(false);
  const [eMsg, setEMsg] = useState('');
  const [removendoUid, setRemovendoUid] = useState<string | null>(null);

  const montarResumo = (
    selecionados: string[],
    qtd: Record<string, string>,
    valor: Record<string, string>,
    venc: Record<string, string>,
  ) => {
    const cursosAcesso = selecionados.map((curso) => ({
      curso,
      vencimento: venc[curso] || '',
      valor: moedaParaNumero(valor[curso]),
      quantidade: Number(qtd[curso]) || 0,
    }));
    return {
      cursosAcesso,
      totalAcessos: cursosAcesso.reduce((s, c) => s + c.quantidade, 0),
      totalValor: cursosAcesso.reduce((s, c) => s + c.valor, 0),
      vencimentoGeral: maiorVencimento(cursosAcesso),
    };
  };

  const resumoConvite = montarResumo(cursosConvite, qtdConvite, valorCursoConvite, vencimentoCursoConvite);
  const resumoEdit = montarResumo(eCursos, eQtdCursos, eValorCursos, eVencimentoCursos);

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const [userDocs, kbSnap] = await Promise.all([
        getUserDocsByConsultor(consultorId),
        getDocs(query(collection(db, 'knowledge_base'), where('consultorId', '==', consultorId))),
      ]);
      const users = userDocs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      const coords = users.filter((u) => u.tipoUsuario === 'coordenador');
      const alunos = users.filter((u) => u.tipoUsuario !== 'coordenador' && u.tipoUsuario !== 'admin');
      // Alunos antigos podem não ter empresaId; eles também pertencem ao grupo
      // "Eu coordenando os meus alunos".
      const timeDireto = alunos.filter((a) => !a.empresaId || a.empresaId === empresaIdDireto(consultorId));
      setDiretoStats({ time: timeDireto.length, timeAtivo: timeDireto.filter((a) => a.primeiroAcessoEm).length });
      setRows(coords.map((c) => {
        const time = alunos.filter((a) => a.empresaId && a.empresaId === c.empresaId);
        const cursosAcesso = Array.isArray(c.cursosAcesso) ? c.cursosAcesso : [];
        return {
          uid: c.uid,
          nome: c.nome || c.displayName || (c.email ? String(c.email).split('@')[0] : '—'),
          email: c.email || '',
          empresa: c.empresaNome || c.empresaId || '—',
          empresaId: c.empresaId || '',
          time: time.length,
          timeAtivo: time.filter((a) => a.primeiroAcessoEm).length,
          limite: typeof c.maxAlunos === 'number' ? c.maxAlunos : null,
          valorPago: typeof c.valorPago === 'number' ? c.valorPago : 0,
          cursosAcesso,
          vencimento: c.acessoCompletoAte ? String(c.acessoCompletoAte).slice(0, 10) : maiorVencimento(cursosAcesso),
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome)));
      setCursos(Array.from(new Set(kbSnap.docs.map((d) => ((d.data() as any).course || '').trim()).filter((course): course is string => Boolean(course && !isIntroCourse(course))))).sort());
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar coordenadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId]);

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando...</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor gerencia coordenadores.</div>;

  const selecionarTodosConvite = () => {
    setCursosConvite(cursos);
    setQtdConvite((p) => Object.fromEntries(cursos.map((curso) => [curso, p[curso] || '1'])));
    setVencimentoCursoConvite((p) => Object.fromEntries(cursos.map((curso) => [curso, p[curso] || dataPadrao()])));
  };

  const selecionarTodosEdit = () => {
    setECursos(cursos);
    setEQtdCursos((p) => Object.fromEntries(cursos.map((curso) => [curso, p[curso] || '1'])));
    setEVencimentoCursos((p) => Object.fromEntries(cursos.map((curso) => [curso, p[curso] || dataPadrao()])));
  };

  async function convidar() {
    const mail = email.trim().toLowerCase();
    if (!mail || !mail.includes('@')) { setMsg('Informe um e-mail válido.'); return; }
    if (cursosConvite.length === 0) { setMsg('Escolha ao menos um curso para este coordenador e o time dele.'); return; }
    if (cursosConvite.some((curso) => (Number(qtdConvite[curso]) || 0) <= 0)) { setMsg('Informe a quantidade de acessos de cada curso selecionado.'); return; }
    if (cursosConvite.some((curso) => !vencimentoCursoConvite[curso])) { setMsg('Informe a expiração de cada curso selecionado.'); return; }
    setEnviando(true);
    setMsg('');
    try {
      const r = await authedFetch('/api/coordenador/convidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, nome: nome.trim(), empresa: empresa.trim(), cursosAcesso: resumoConvite.cursosAcesso }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j.error || 'erro');
      setMsg(`✅ Coordenador cadastrado com sucesso. ${j.emailEnviado ? 'Convite enviado por e-mail.' : 'Cadastro salvo, mas o e-mail falhou.'}`);
      setEmail(''); setNome(''); setEmpresa(''); setCursosConvite([]); setQtdConvite({}); setValorCursoConvite({}); setVencimentoCursoConvite({});
      carregar();
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setEnviando(false);
    }
  }

  function abrirEdit(c: CoordRow) {
    setEditUid(c.uid);
    setECursos(c.cursosAcesso.map((curso) => curso.curso).filter(Boolean));
    setEQtdCursos(Object.fromEntries(c.cursosAcesso.map((curso) => [curso.curso, String(curso.quantidade || '')])));
    setEValorCursos(Object.fromEntries(c.cursosAcesso.map((curso) => [curso.curso, curso.valor ? String(curso.valor) : ''])));
    setEVencimentoCursos(Object.fromEntries(c.cursosAcesso.map((curso) => [curso.curso, curso.vencimento ? String(curso.vencimento).slice(0, 10) : dataPadrao()])));
    setEMsg('');
  }

  async function salvarEdit(uid: string) {
    setESalvando(true); setEMsg('');
    try {
      if (eCursos.length === 0) { setEMsg('Escolha ao menos um curso.'); return; }
      if (eCursos.some((curso) => (Number(eQtdCursos[curso]) || 0) <= 0)) { setEMsg('Informe a quantidade de acessos de cada curso.'); return; }
      if (eCursos.some((curso) => !eVencimentoCursos[curso])) { setEMsg('Informe a expiração de cada curso.'); return; }
      const { cursosAcesso, totalAcessos, totalValor, vencimentoGeral } = resumoEdit;
      await updateUserNoConsultor(uid, consultorId, { maxAlunos: totalAcessos, valorPago: totalValor, acessoCompletoAte: vencimentoGeral, cursosAcesso });
      setRows((p) => p.map((r) => (r.uid === uid ? { ...r, limite: totalAcessos, valorPago: totalValor, vencimento: vencimentoGeral, cursosAcesso } : r)));
      setEMsg('✅ Salvo.');
    } catch (e: any) { setEMsg('❌ ' + (e?.message || e)); }
    finally { setESalvando(false); }
  }

  async function remover(c: CoordRow) {
    if (!window.confirm(`Remover ${c.nome} como coordenador?\n\nIsso bloqueia o acesso dele e de TODO o time (${c.time} alunos) imediatamente. Os dados ficam preservados por 3 meses e essa acao pode ser revertida pelo suporte nesse periodo.`)) return;
    setRemovendoUid(c.uid);
    try {
      const r = await authedFetch(`/api/coordenador/${encodeURIComponent(c.uid)}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j.error || 'erro');
      setRows((atual) => atual.filter((row) => row.uid !== c.uid));
      if (editUid === c.uid) setEditUid(null);
      window.alert(`Coordenador removido. ${j.timeBloqueado || 0} aluno(s) do time também foram bloqueados.`);
    } catch (e: any) {
      window.alert('❌ ' + (e?.message || e));
    } finally {
      setRemovendoUid(null);
    }
  }

  const toggleConvite = (curso: string) => {
    const on = cursosConvite.includes(curso);
    setCursosConvite((atual) => on ? atual.filter((c) => c !== curso) : [...atual, curso]);
    if (!on) {
      setQtdConvite((p) => ({ ...p, [curso]: p[curso] || '1' }));
      setVencimentoCursoConvite((p) => ({ ...p, [curso]: p[curso] || dataPadrao() }));
    }
  };

  const toggleEdit = (curso: string) => {
    const on = eCursos.includes(curso);
    setECursos((atual) => on ? atual.filter((c) => c !== curso) : [...atual, curso]);
    if (!on) {
      setEQtdCursos((p) => ({ ...p, [curso]: p[curso] || '1' }));
      setEVencimentoCursos((p) => ({ ...p, [curso]: p[curso] || dataPadrao() }));
    }
  };

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-xs font-black uppercase tracking-wide text-gray-500 mb-1';
  const resumoLinha = (resumo: typeof resumoConvite) => (
    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
      Total calculado: <b>{resumo.totalAcessos}</b> acessos · <b>{formatMoney(resumo.totalValor)}</b> · expiração geral <b>{resumo.vencimentoGeral ? new Date(resumo.vencimentoGeral).toLocaleDateString('pt-BR') : '—'}</b>
    </div>
  );

  const listaCursos = (
    selecionados: string[],
    toggle: (curso: string) => void,
    qtd: Record<string, string>,
    setQtd: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    valor: Record<string, string>,
    setValor: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    venc: Record<string, string>,
    setVenc: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  ) => (
    <div className="space-y-2">
      {cursos.length === 0 && <span className="text-xs text-gray-400">Nenhum curso cadastrado ainda.</span>}
      {cursos.map((curso) => {
        const on = selecionados.includes(curso);
        return (
          <div key={curso} className={`grid gap-2 rounded-xl border p-3 md:grid-cols-[minmax(0,1fr)_110px_120px_150px] ${on ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <label className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-800">
              <input type="checkbox" checked={on} onChange={() => toggle(curso)} className="h-4 w-4" />
              <span className="truncate">{curso}</span>
            </label>
            <input value={qtd[curso] || ''} disabled={!on} onChange={(e) => setQtd((p) => ({ ...p, [curso]: e.target.value.replace(/\D/g, '') }))} placeholder="Acessos" className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-gray-100" />
            <input value={valor[curso] || ''} disabled={!on} onChange={(e) => setValor((p) => ({ ...p, [curso]: e.target.value.replace(/[^\d.,]/g, '') }))} placeholder="Valor R$" className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-gray-100" />
            <input type="date" value={venc[curso] || ''} disabled={!on} onChange={(e) => setVenc((p) => ({ ...p, [curso]: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-gray-100" />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Meus Coordenadores e Alunos</h1>
      <p className="text-gray-500 text-sm mb-6">
        Convide coordenadores para o seu mundo (<b>{consultor.branding.nome}</b>). Cada curso fica em uma linha, com acessos, valor e expiração próprios.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <h2 className="font-black text-gray-800 mb-4">Convidar coordenador</h2>
        <div className="mb-4">
          <label className={label}>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coordenador@email.com" className={campo} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className={campo} />
          </div>
          <div>
            <label className={label}>Time / empresa</label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: Time Fábrica A" className={campo} />
          </div>
        </div>
        <div className="mt-4">
          <label className={label}>Cursos liberados para o coordenador e o time</label>
          {cursos.length > 0 && (
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={selecionarTodosConvite} className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">Selecionar todos</button>
              <button type="button" onClick={() => setCursosConvite([])} className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">Limpar seleção</button>
            </div>
          )}
          {listaCursos(cursosConvite, toggleConvite, qtdConvite, setQtdConvite, valorCursoConvite, setValorCursoConvite, vencimentoCursoConvite, setVencimentoCursoConvite)}
          {resumoLinha(resumoConvite)}
        </div>
        <div className="flex items-center gap-4 mt-5">
          <button onClick={convidar} disabled={enviando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40">
            {enviando ? 'Enviando...' : 'Convidar coordenador'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>

      <h2 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-3">Coordenadores ({rows.length})</h2>
      {loading && <div className="text-gray-500">Carregando...</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}
      {!loading && !erro && rows.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">Nenhum coordenador ainda. Convide o primeiro acima.</div>
      )}
      <div className="grid gap-4">
        {/* "Eu coordenando os meus alunos" — sempre a primeira linha, fixa. Não é um
            coordenador de verdade (sem doc próprio), por isso só mostra o resumo do
            time — adicionar/editar/remover aluno é tudo feito em Alunos na Plataforma. */}
        <div className="bg-white border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><Users2 size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-gray-800">Eu coordenando os meus alunos</div>
              <div className="text-xs text-gray-400">Alunos que você atende pessoalmente, sem passar por um coordenador.</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{diretoStats.time}</div>
              <div className="text-[11px] text-gray-400">{diretoStats.timeAtivo} ativos</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-100">
            <MeusAlunos embedded empresaIdFiltro={empresaIdDireto(consultorId)} onDirectStats={setDiretoStats} />
          </div>
        </div>
        {rows.map((c) => {
          const editandoEste = editUid === c.uid;
          const cursosExibidos = editandoEste ? resumoEdit.cursosAcesso : c.cursosAcesso;
          return (
          <div key={c.uid} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Users2 size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-800 truncate">{c.nome}</div>
                <div className="text-xs text-gray-400 truncate">{c.email} · {c.empresa}</div>
                <div className="space-y-1 mt-2">
                  {cursosExibidos.length === 0 ? (
                    <span className="text-[10px] font-bold rounded px-2 py-1 bg-red-50 text-red-600">Sem cursos liberados</span>
                  ) : (
                    cursosExibidos.map((curso) => (
                      <div key={curso.curso} className="text-[11px] font-bold rounded px-2 py-1 bg-blue-50 text-blue-700">
                        {curso.curso} · {curso.quantidade || 0} acessos · {formatMoney(Number(curso.valor) || 0)} · expira {curso.vencimento ? new Date(curso.vencimento).toLocaleDateString('pt-BR') : '—'}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Único lugar da tela com o TOTAL calculado (nunca digitado): soma dos cursos
                  selecionados. Enquanto edita, mostra o total AO VIVO da seleção atual. */}
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {c.time}{(editUid === c.uid ? resumoEdit.totalAcessos : c.limite) != null ? ` / ${editUid === c.uid ? resumoEdit.totalAcessos : c.limite}` : ''}
                </div>
                <div className="text-[11px] text-gray-400">{c.timeAtivo} ativos</div>
                <div className="text-xs font-bold text-emerald-600 mt-1">
                  {formatMoney(editUid === c.uid ? resumoEdit.totalValor : c.valorPago)}
                </div>
                <div className="text-[11px] text-gray-400">
                  expira {(() => { const v = editUid === c.uid ? resumoEdit.vencimentoGeral : c.vencimento; return v ? new Date(v).toLocaleDateString('pt-BR') : '—'; })()}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={() => (editandoEste ? setEditUid(null) : abrirEdit(c))} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                  {editandoEste ? 'fechar' : 'editar'}
                </button>
                <button onClick={() => remover(c)} disabled={removendoUid === c.uid} className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-40">
                  {removendoUid === c.uid ? 'removendo...' : 'remover'}
                </button>
              </div>
            </div>
            {editandoEste && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className={label}>Cursos liberados para este coordenador e o time</label>
                {cursos.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={selecionarTodosEdit} className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">Selecionar todos</button>
                    <button type="button" onClick={() => setECursos([])} className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">Limpar seleção</button>
                  </div>
                )}
                {listaCursos(eCursos, toggleEdit, eQtdCursos, setEQtdCursos, eValorCursos, setEValorCursos, eVencimentoCursos, setEVencimentoCursos)}
                <p className="text-[11px] text-gray-400 mt-2">O total (acessos, valor e expiração) já aparece calculado no topo do card.</p>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => salvarEdit(c.uid)} disabled={eSalvando} className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                    {eSalvando ? 'Salvando...' : 'Salvar cursos do coordenador'}
                  </button>
                  {eMsg && <span className="text-sm text-gray-600">{eMsg}</span>}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <MeusAlunos embedded empresaIdFiltro={c.empresaId} />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
