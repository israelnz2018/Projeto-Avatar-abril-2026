/**
 * MeusCoordenadores — uma linha por coordenador. Clicar na linha abre o time:
 * os cursos liberados pra ele (mesmo editor do aluno, com a coluna de acessos)
 * e a lista de alunos dele. O consultor entra como a última linha, coordenando
 * os próprios alunos — sem bloco de cursos, porque é dono de todos.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { ChevronDown, Mail, Plus, Users2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { empresaIdDireto } from '../../services/consultorService';
import { isIntroCourse } from '../../services/knowledgeService';
import { getUserDocsByConsultor, updateUserNoConsultor } from '../../services/userService';
import MeusAlunos from './MeusAlunos';
import CursosEditor, {
  CursosSel, formatMoney, resumoDaSel, selDeCursosAcesso, validarSel,
} from './CursosEditor';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

interface CursoCoord { curso: string; vencimento: string | null; valor?: number; quantidade?: number }

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
  /** true = a linha do próprio consultor (sem doc de coordenador). */
  euMesmo?: boolean;
}

const maiorVencimento = (lista: { vencimento: string | null }[]) => {
  const datas = lista.map((c) => c.vencimento).filter(Boolean) as string[];
  return datas.length ? datas.sort().at(-1)! : '';
};
const dataBr = (v: string) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

export default function MeusCoordenadores() {
  const [searchParams] = useSearchParams();
  const modoCoordenador = searchParams.get('modo') === 'coordenador';
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const [rows, setRows] = useState<CoordRow[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Uma linha aberta por vez — o time só carrega quando você abre.
  const [abertoUid, setAbertoUid] = useState<string | null>(null);

  // convidar coordenador
  const [addAberto, setAddAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [selConvite, setSelConvite] = useState<CursosSel>({});
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  // cursos do coordenador aberto
  const [editSel, setEditSel] = useState<CursosSel>({});
  const [eSalvando, setESalvando] = useState(false);
  const [eMsg, setEMsg] = useState('');
  const [removendoUid, setRemovendoUid] = useState<string | null>(null);

  const resumoConvite = resumoDaSel(selConvite, true);
  const resumoEdit = resumoDaSel(editSel, true);

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
      const direto = empresaIdDireto(consultorId);
      // Alunos antigos podem não ter empresaId; eles também pertencem ao grupo do consultor.
      const timeDireto = alunos.filter((a) => !a.empresaId || a.empresaId === direto);

      const cursosAtuais = Array.from(new Set(kbSnap.docs.map((d) => ((d.data() as any).course || '').trim()).filter((course): course is string => Boolean(course && !isIntroCourse(course)))));
      const linhasCoord: CoordRow[] = coords.map((c) => {
        const time = alunos.filter((a) => a.empresaId && a.empresaId === c.empresaId);
        const cursosAcesso = Array.isArray(c.cursosAcesso)
          ? c.cursosAcesso.filter((acesso: any) => cursosAtuais.includes(String(acesso?.curso || '').trim()))
          : [];
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
      }).sort((a, b) => a.nome.localeCompare(b.nome));

      // Coordenadores primeiro; eu por último, como mais uma linha da mesma lista.
      setRows(modoCoordenador ? linhasCoord : [...linhasCoord, {
        uid: 'eu',
        nome: 'Eu — meus próprios alunos',
        email: consultor.branding.nome || '',
        empresa: 'Alunos que você atende pessoalmente',
        empresaId: direto,
        time: timeDireto.length,
        timeAtivo: timeDireto.filter((a) => a.primeiroAcessoEm).length,
        limite: null,
        valorPago: 0,
        cursosAcesso: [],
        vencimento: '',
        euMesmo: true,
      }]);

      setCursos(cursosAtuais.sort());
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar coordenadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId, modoCoordenador]);

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando...</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor gerencia coordenadores.</div>;

  function alternar(c: CoordRow) {
    if (abertoUid === c.uid) { setAbertoUid(null); return; }
    setAbertoUid(c.uid);
    setEditSel(selDeCursosAcesso(c.cursosAcesso));
    setEMsg('');
  }

  async function convidar() {
    const mail = email.trim().toLowerCase();
    if (!mail || !mail.includes('@')) { setMsg('Informe um e-mail válido.'); return; }
    const invalido = validarSel(selConvite, true);
    if (invalido) { setMsg(invalido); return; }
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
      setMsg(`✅ Coordenador cadastrado. ${j.emailEnviado ? 'Convite enviado por e-mail.' : 'Cadastro salvo, mas o e-mail falhou.'}`);
      setEmail(''); setNome(''); setEmpresa(''); setSelConvite({});
      setAddAberto(false);
      carregar();
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setEnviando(false);
    }
  }

  async function salvarCursos(uid: string) {
    const invalido = validarSel(editSel, true);
    if (invalido) { setEMsg(invalido); return; }
    setESalvando(true); setEMsg('');
    try {
      const { cursosAcesso, totalAcessos, totalValor, vencimentoGeral } = resumoEdit;
      await updateUserNoConsultor(uid, consultorId, {
        maxAlunos: totalAcessos, valorPago: totalValor, acessoCompletoAte: vencimentoGeral, cursosAcesso,
      });
      setRows((p) => p.map((r) => (r.uid === uid
        ? { ...r, limite: totalAcessos, valorPago: totalValor, vencimento: vencimentoGeral, cursosAcesso }
        : r)));
      const anterior = rows.find((r) => r.uid === uid);
      const cursosNovos = cursosAcesso.filter((novo) => !anterior?.cursosAcesso.some((antigo) => antigo.curso === novo.curso));
      if (cursosNovos.length && anterior?.email) await authedFetch('/api/acesso/novo-curso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: anterior.email, nome: anterior.nome, cursos: cursosNovos.map((c) => c.curso) }) });
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
      if (abertoUid === c.uid) setAbertoUid(null);
      window.alert(`Coordenador removido. ${j.timeBloqueado || 0} aluno(s) do time também foram bloqueados.`);
    } catch (e: any) {
      window.alert('❌ ' + (e?.message || e));
    } finally {
      setRemovendoUid(null);
    }
  }

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-xs font-black uppercase tracking-wide text-gray-500 mb-1';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">{modoCoordenador ? 'Gestão de Usuários do Coordenador' : 'Meus Coordenadores e Alunos'}</h1>
      <p className="text-gray-500 text-sm mb-6">
        {modoCoordenador
          ? 'Abra o seu time para consultar os cursos e acessos liberados e gerenciar os alunos.'
          : <>Cada linha é um coordenador do seu mundo (<b>{consultor.branding.nome}</b>). Abra a linha para liberar cursos e gerenciar o time dele. A última linha é você, coordenando os seus próprios alunos.</>}
      </p>

      {loading && <div className="text-gray-500">Carregando...</div>}
      {erro && <div className="text-red-600 font-bold">❌ {erro}</div>}

      {!loading && !modoCoordenador && (
        <div className="mb-4">
          <button onClick={() => { setAddAberto(!addAberto); setMsg(''); }}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800">
            <Plus size={16} /> {addAberto ? 'fechar' : 'adicionar coordenador'}
          </button>
          {addAberto && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-3">
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
                <CursosEditor catalogo={cursos} sel={selConvite} onChange={setSelConvite} comAcessos />
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  Total calculado: <b>{resumoConvite.totalAcessos}</b> acessos · <b>{formatMoney(resumoConvite.totalValor)}</b> · expiração geral <b>{dataBr(resumoConvite.vencimentoGeral)}</b>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-5">
                <button onClick={convidar} disabled={enviando}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40">
                  {enviando ? 'Enviando...' : 'Convidar coordenador'}
                </button>
                {msg && <span className="text-sm text-gray-600">{msg}</span>}
              </div>
            </div>
          )}
          {!addAberto && msg && <span className="block mt-2 text-sm text-gray-600">{msg}</span>}
        </div>
      )}

      <div className="grid gap-4">
        {rows.map((c) => {
          const aberto = abertoUid === c.uid;
          const cursosExibidos = aberto && !c.euMesmo ? resumoEdit.cursosAcesso : c.cursosAcesso;
          return (
            <div key={c.uid} className={`bg-white border rounded-2xl overflow-hidden ${c.euMesmo ? 'border-blue-100' : 'border-gray-200'}`}>
              <button onClick={() => alternar(c)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-transparent">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                  <Users2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-800 truncate">{c.nome}</div>
                  <div className="text-xs text-gray-400 truncate">{c.euMesmo ? c.empresa : `${c.email} · ${c.empresa}`}</div>
                  {!c.euMesmo && aberto && (
                    <div className="space-y-1 mt-2">
                      {cursosExibidos.length === 0 ? (
                        <span className="text-[10px] font-bold rounded px-2 py-1 bg-red-50 text-red-600">Sem cursos liberados</span>
                      ) : cursosExibidos.map((curso) => (
                        <div key={curso.curso} className="text-[11px] font-bold rounded px-2 py-1 bg-blue-50 text-blue-700">
                          {curso.curso} · {curso.quantidade || 0} acessos · {formatMoney(Number(curso.valor) || 0)} · expira {dataBr(String(curso.vencimento || ''))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Único lugar com o TOTAL — sempre calculado dos cursos, nunca digitado.
                    Enquanto edita, mostra o total ao vivo da seleção atual. */}
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {c.time}{(() => { const lim = aberto && !c.euMesmo ? resumoEdit.totalAcessos : c.limite; return lim != null ? ` / ${lim}` : ''; })()}
                  </div>
                  <div className="text-[11px] text-gray-400">{c.timeAtivo} ativos</div>
                  {!c.euMesmo && <div className="text-[11px] text-gray-400">{c.cursosAcesso.length} cursos liberados</div>}
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform shrink-0 ${aberto ? 'rotate-180' : ''}`} />
              </button>

              {aberto && (
                <div className="border-t border-gray-100 p-5 space-y-5">
                  {/* Eu sou dono de todos os cursos — não tenho cota nem valor pago. */}
                  {!c.euMesmo && !modoCoordenador && (
                    <div>
                      <label className={label}>Cursos liberados para este coordenador e o time</label>
                      <CursosEditor catalogo={cursos} sel={editSel} onChange={setEditSel} comAcessos />
                      <p className="text-[11px] text-gray-400 mt-2">Os totais (acessos, valor e expiração) aparecem calculados no topo da linha.</p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <button onClick={() => salvarCursos(c.uid)} disabled={eSalvando}
                          className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                          {eSalvando ? 'Salvando...' : 'Salvar cursos do coordenador'}
                        </button>
                        {eMsg && <span className="text-sm text-gray-600">{eMsg}</span>}
                        <button onClick={() => remover(c)} disabled={removendoUid === c.uid}
                          className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-40">
                          {removendoUid === c.uid ? 'removendo...' : 'remover coordenador'}
                        </button>
                      </div>
                    </div>
                  )}
                  {!c.euMesmo && modoCoordenador && (
                    <div>
                      <label className={label}>Cursos e acessos liberados para este time</label>
                      <div className="space-y-2">
                        {c.cursosAcesso.map((curso) => (
                          <div key={curso.curso} className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
                            <span className="font-bold text-gray-800">{curso.curso}</span>
                            <span className="shrink-0 text-xs font-bold text-blue-700">{curso.quantidade || 0} acessos · expira {dataBr(String(curso.vencimento || ''))}</span>
                          </div>
                        ))}
                      </div>
                      <button type="button" disabled title="Este botão funciona quando o coordenador entra com a própria conta." className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 cursor-default">
                        <Mail size={16} /> Solicitar ao consultor mais cursos ou acessos
                      </button>
                    </div>
                  )}
                  <div>
                    <label className={label}>Alunos deste time</label>
                    <MeusAlunos embedded empresaIdFiltro={c.empresaId} somenteLeitura={modoCoordenador} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
