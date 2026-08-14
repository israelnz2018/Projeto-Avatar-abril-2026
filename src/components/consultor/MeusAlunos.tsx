/**
 * MeusAlunos — gestão completa dos alunos do consultor.
 * Lista + coluna de cursos + editar (cada curso com vencimento e valor próprios,
 * add/remove) + adicionar aluno (nome, email, e por curso: vencimento default 1 ano
 * e valor pago). Tudo no Firebase. Ver PLANO-WHITELABEL.md.
 *
 * Acesso: 'completo' = todos os cursos; sem cursosAcesso e não-completo = grupo grátis
 * (Trilha 1, os cursos isFree); com cursosAcesso = pacote por-curso escolhido aqui.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getInitiatives } from '../../services/configService';
import { empresaIdDireto } from '../../services/consultorService';
import { isIntroCourse } from '../../services/knowledgeService';
import { getUserDocsByConsultor, updateUserNoConsultor } from '../../services/userService';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

interface CursoAcesso { curso: string; vencimento: string | null; valor: number; quantidade: number; }
interface Aluno {
  uid: string; nome: string; email: string; tipo: string; acessou: boolean;
  cursosAcesso: CursoAcesso[]; completo: boolean;
  empresaId?: string;
  desvinculadoEm?: string;
  avisoBloqueio?: { expiraEm?: string };
  inativo?: boolean;
}
interface Equipe {
  empresaId: string;
  nome: string;
  coordenador: string;
  direto?: boolean;
}

const emUmAno = () => new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const venceu = (v: string | null) => !!v && new Date(v).getTime() < Date.now();
const parseValor = (s: string) => { const n = Number(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; };
// Sem separador de milhar (evita o ponto ser lido como decimal ao reparsear). Vírgula = decimal.
const fmtValor = (v: number) => (v ? String(v).replace('.', ',') : '');

export default function MeusAlunos({ embedded = false, empresaIdFiltro }: { embedded?: boolean; empresaIdFiltro?: string }) {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const [rows, setRows] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [freeCursos, setFreeCursos] = useState<string[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // agrupamento por time — cada grupo (meus próprios alunos + cada coordenador) é um
  // acordeão independente; abre/fecha e tem seu próprio "adicionar aluno" já escopado.
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [addAbertoEmpresaId, setAddAbertoEmpresaId] = useState<string | null>(null);

  // adicionar — cada curso do pacote com vencimento + valor próprios
  const [aNome, setANome] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aEmpresaId, setAEmpresaId] = useState('');
  const [aItens, setAItens] = useState<{ curso: string; vencimento: string; valor: string }[]>([]);
  const [addEnviando, setAddEnviando] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // editar
  const [editUid, setEditUid] = useState<string | null>(null);
  const [eCursos, setECursos] = useState<CursoAcesso[]>([]);
  const [eAddCurso, setEAddCurso] = useState('');
  const [editSalvando, setEditSalvando] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [bloqueados, setBloqueados] = useState<Aluno[]>([]);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const toAluno = (d: any): Aluno => {
    const u = d as any;
    let ca: CursoAcesso[] = Array.isArray(u.cursosAcesso)
      ? u.cursosAcesso.map((c: any) => ({ curso: c?.curso, vencimento: c?.vencimento ?? null, valor: typeof c?.valor === 'number' ? c.valor : 0, quantidade: Number(c?.quantidade) || 1 })).filter((c: CursoAcesso) => c.curso)
      : [];
    if (ca.length === 0 && Array.isArray(u.cursosLiberados)) ca = u.cursosLiberados.map((c: string) => ({ curso: c, vencimento: null, valor: 0, quantidade: 1 }));
    const completoValido = (() => {
      const ate = u.acessoCompletoAte;
      if (!ate) return true;
      const dt = new Date(ate);
      return isNaN(dt.getTime()) ? true : dt.getTime() > Date.now();
    })();
    const completo = (u.plano === 'completo' && completoValido)
      || (Array.isArray(u.formacoes) && u.formacoes.some((f: string) => !String(f).includes('introdutoria') && !String(f).includes('gratuito')));
    return {
      uid: d.id,
      nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '-'),
      email: u.email || '',
      tipo: u.tipoUsuario || 'aluno',
      acessou: !!u.primeiroAcessoEm,
      cursosAcesso: ca,
      completo,
      desvinculadoEm: u.desvinculadoEm,
      avisoBloqueio: u.avisoBloqueio,
      inativo: true,
    };
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const [userDocs, blockedSnap, kbSnap, inits] = await Promise.all([
        getUserDocsByConsultor(consultorId),
        getDocs(query(collection(db, 'users'), where('desvinculadoDe', '==', consultorId))),
        getDocs(query(collection(db, 'knowledge_base'), where('consultorId', '==', consultorId))),
        getInitiatives(),
      ]);
      const allUsers = userDocs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const gratis = inits.filter((i) => i.isFree === true).map((i) => i.name).filter(Boolean);
      const lista: Aluno[] = allUsers
        .map((d) => {
          const u = d as any;
          let ca: CursoAcesso[] = Array.isArray(u.cursosAcesso)
            ? u.cursosAcesso.map((c: any) => ({ curso: c?.curso, vencimento: c?.vencimento ?? null, valor: typeof c?.valor === 'number' ? c.valor : 0, quantidade: Number(c?.quantidade) || 1 })).filter((c: CursoAcesso) => c.curso)
            : [];
          if (ca.length === 0 && Array.isArray(u.cursosLiberados)) ca = u.cursosLiberados.map((c: string) => ({ curso: c, vencimento: null, valor: 0, quantidade: 1 }));
          // Acesso Completo (mundo Israel/legado): plano 'completo' válido OU formação avançada.
          const completoValido = (() => {
            const ate = u.acessoCompletoAte;
            if (!ate) return true;
            const dt = new Date(ate);
            return isNaN(dt.getTime()) ? true : dt.getTime() > Date.now();
          })();
          const completo = (u.plano === 'completo' && completoValido)
            || (Array.isArray(u.formacoes) && u.formacoes.some((f: string) => !String(f).includes('introdutoria') && !String(f).includes('gratuito')));
          return {
            uid: d.id,
            nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '—'),
            email: u.email || '',
            tipo: u.tipoUsuario || 'aluno',
            acessou: !!u.primeiroAcessoEm,
            cursosAcesso: ca,
            completo,
            empresaId: u.empresaId ? String(u.empresaId) : undefined,
          };
        })
        .filter((u) => u.tipo !== 'admin' && u.tipo !== 'coordenador' && u.tipo !== 'consultor')
        .sort((a, b) => a.nome.localeCompare(b.nome));
      const equipesMap = new Map<string, Equipe>();
      allUsers
        .filter((u: any) => u.tipoUsuario === 'coordenador' && u.empresaId)
        .forEach((u: any) => {
          equipesMap.set(String(u.empresaId), {
            empresaId: String(u.empresaId),
            nome: u.empresaNome || u.nome || u.empresaId,
            coordenador: u.nome || u.email || 'Coordenador',
          });
        });
      const nomesCursos = Array.from(new Set(kbSnap.docs.map((d) => ((d.data() as any).course || '').trim()).filter((course): course is string => Boolean(course && !isIntroCourse(course))))).sort();
      setRows(lista);
      setBloqueados(blockedSnap.docs.map((d) => toAluno({ id: d.id, ...(d.data() as any) })).filter((u) => u.tipo !== 'admin' && u.tipo !== 'coordenador' && u.tipo !== 'consultor').sort((a, b) => (b.desvinculadoEm || '').localeCompare(a.desvinculadoEm || '')));
      setCursos(nomesCursos);
      setFreeCursos(gratis);
      // "Alunos diretos" sempre disponível no topo — um único grupo fixo, sem coordenador,
      // pro consultor atender aluno avulso sem precisar de uma conta de coordenador fake.
      const equipesReais = Array.from(equipesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      setEquipes([
        { empresaId: empresaIdDireto(consultorId), nome: 'Meus próprios alunos', coordenador: consultor.branding.nome || 'você', direto: true },
        ...equipesReais,
      ]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId]);

  // Agrupa os alunos ativos por time (empresaId) — cada time é um acordeão em
  // "Alunos na Plataforma". Busca filtra dentro dos grupos. Aluno legado sem empresaId
  // (cadastrado antes dessa hierarquia existir) cai direto em "Meus próprios alunos".
  const alunosPorEmpresa = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const direto = empresaIdDireto(consultorId);
    const mapa = new Map<string, Aluno[]>();
    for (const a of rows) {
      if (t && !a.nome.toLowerCase().includes(t) && !a.email.toLowerCase().includes(t)) continue;
      const key = a.empresaId || direto;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(a);
    }
    return mapa;
  }, [rows, busca, consultorId]);
  const buscando = busca.trim().length > 0;

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Apenas consultores e admins gerenciam alunos dos times.</div>;

  // ----- adicionar -----
  const toggleCursoAdd = (curso: string) =>
    setAItens((p) => p.some((i) => i.curso === curso)
      ? p.filter((i) => i.curso !== curso)
      : [...p, { curso, vencimento: emUmAno(), valor: '' }]);
  const setItemVenc = (curso: string, v: string) => setAItens((p) => p.map((i) => (i.curso === curso ? { ...i, vencimento: v } : i)));
  const setItemValor = (curso: string, v: string) => setAItens((p) => p.map((i) => (i.curso === curso ? { ...i, valor: v.replace(/[^\d.,]/g, '') } : i)));

  async function adicionar() {
    const mail = aEmail.trim().toLowerCase();
    if (!mail || mail.indexOf('@') < 0) { setAddMsg('Informe um e-mail válido.'); return; }
    if (!aEmpresaId) { setAddMsg('Escolha o time/coordenador do aluno.'); return; }
    if (aItens.length === 0) { setAddMsg('Escolha ao menos um curso.'); return; }
    if (aItens.some((i) => !i.vencimento)) { setAddMsg('Informe a data de expiração de todos os cursos.'); return; }
    setAddEnviando(true); setAddMsg('');
    try {
      const cursosAcesso = aItens.map((i) => ({ curso: i.curso, vencimento: i.vencimento || null, valor: parseValor(i.valor) }));
      const valorPago = cursosAcesso.reduce((s, c) => s + c.valor, 0);
      const r = await authedFetch('/api/aluno/convidar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, nome: aNome.trim(), empresaId: aEmpresaId || undefined, cursosAcesso, valorPago }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (r.ok) {
        setAddMsg(`✅ Aluno ${j.status}${j.emailEnviado ? '' : ' (e-mail falhou)'}`);
        setANome(''); setAEmail(''); setAItens([]);
        setAddAbertoEmpresaId(null);
        carregar();
      } else setAddMsg('❌ ' + (j.error || 'erro'));
    } catch (e: any) { setAddMsg('❌ ' + (e?.message || e)); }
    finally { setAddEnviando(false); }
  }

  // ----- editar -----
  function abrirEdit(a: Aluno) {
    setEditUid(a.uid);
    setECursos(a.cursosAcesso.map((c) => ({ ...c, quantidade: 1 })));
    setEAddCurso('');
    setEditMsg('');
  }
  const setVenc = (curso: string, v: string) => setECursos((p) => p.map((c) => (c.curso === curso ? { ...c, vencimento: v || null } : c)));
  const setValorCurso = (curso: string, v: string) => setECursos((p) => p.map((c) => (c.curso === curso ? { ...c, valor: parseValor(v.replace(/[^\d.,]/g, '')) } : c)));
  const removerCurso = (curso: string) => setECursos((p) => p.filter((c) => c.curso !== curso));
  const addCursoEdit = () => {
    if (!eAddCurso || eCursos.some((c) => c.curso === eAddCurso)) return;
    setECursos((p) => [...p, { curso: eAddCurso, vencimento: emUmAno(), valor: 0, quantidade: 1 }]);
    setEAddCurso('');
  };

  async function salvarEdit(uid: string) {
    setEditSalvando(true); setEditMsg('');
    try {
      const anterior = rows.find((r) => r.uid === uid);
      const cursosNovos = eCursos.filter((novo) => !anterior?.cursosAcesso.some((antigo) => antigo.curso === novo.curso));
      const valorPago = eCursos.reduce((s, c) => s + (c.valor || 0), 0);
      await updateUserNoConsultor(uid, consultorId, { cursosAcesso: eCursos, valorPago });
      if (cursosNovos.length > 0 && anterior?.email) {
        await authedFetch('/api/acesso/novo-curso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: anterior.email, nome: anterior.nome, cursos: cursosNovos.map((c) => c.curso) }) });
      }
      setRows((p) => p.map((r) => (r.uid === uid ? { ...r, cursosAcesso: eCursos } : r)));
      setEditMsg(cursosNovos.length > 0 ? '✅ Salvo. Novo curso liberado e aviso enviado por e-mail.' : '✅ Salvo.');
    } catch (e: any) { setEditMsg('❌ ' + (e?.message || e)); }
    finally { setEditSalvando(false); }
  }

  async function removerAluno(aluno: Aluno) {
    if (!window.confirm(`Remover ${aluno.nome} do seu ambiente?\n\nA conta e o histórico não serão apagados, mas o aluno perderá o acesso aos seus cursos.`)) return;
    setRemovingUid(aluno.uid);
    try {
      const response = await authedFetch(`/api/aluno/${encodeURIComponent(aluno.uid)}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(body?.error || 'Erro ao remover aluno.');
      setRows(current => current.filter(item => item.uid !== aluno.uid));
      if (editUid === aluno.uid) setEditUid(null);
    } catch (error: any) {
      window.alert(error?.message || 'Erro ao remover aluno.');
    } finally { setRemovingUid(null); }
  }

  async function bloquearAluno(aluno: Aluno) {
    if (!window.confirm(`Bloquear/remover ${aluno.nome} do seu ambiente?\n\nO aluno perdera o acesso aos seus cursos agora. A conta, historico e projetos ficarao preservados por ate 3 meses antes de qualquer exclusao definitiva.`)) return;
    setRemovingUid(aluno.uid);
    try {
      const response = await authedFetch(`/api/aluno/${encodeURIComponent(aluno.uid)}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(body?.error || 'Erro ao remover aluno.');
      setRows(current => current.filter(item => item.uid !== aluno.uid));
      if (editUid === aluno.uid) setEditUid(null);
      carregar();
    } catch (error: any) {
      window.alert(error?.message || 'Erro ao remover aluno.');
    } finally { setRemovingUid(null); }
  }

  const diasDesdeBloqueio = (aluno: Aluno) => {
    const raw = aluno.desvinculadoEm;
    if (!raw) return 0;
    const ms = Date.now() - new Date(raw).getTime();
    return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  };

  const podeExcluirDefinitivo = (aluno: Aluno) => diasDesdeBloqueio(aluno) >= 90;

  async function excluirDefinitivo(aluno: Aluno) {
    const nome = aluno.nome || aluno.email || aluno.uid;
    if (!window.confirm(`Excluir definitivamente ${nome}?\n\nIsso vai apagar a conta do Firebase Auth, o cadastro, progresso, projetos e conversas do mentor desse aluno. Esta acao nao pode ser desfeita.`)) return;
    setDeletingUid(aluno.uid);
    try {
      const response = await authedFetch(`/api/aluno/${encodeURIComponent(aluno.uid)}/definitivo`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(body?.error || 'Erro ao excluir definitivamente.');
      setBloqueados(current => current.filter(item => item.uid !== aluno.uid));
      window.alert('Aluno excluido definitivamente do Firebase.');
    } catch (error: any) {
      window.alert(error?.message || 'Erro ao excluir definitivamente.');
    } finally { setDeletingUid(null); }
  }

  const campo = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const cursosDisponiveis = cursos.filter((c) => !eCursos.some((x) => x.curso === c));

  const renderLinha = (a: Aluno) => (
    <div key={a.uid} className="border-b border-gray-50 last:border-0">
      <div className={`grid grid-cols-[1.2fr_auto_1.3fr_auto] gap-3 px-4 py-3 items-center ${a.inativo ? 'bg-gray-50/70' : ''}`}>
        <div className="min-w-0">
          <div className="font-bold text-gray-800 text-sm truncate">{a.nome}</div>
          <div className="text-xs text-gray-400 truncate">{a.email}</div>
        </div>
        {/* "Ativo" = já entrou na plataforma pelo menos uma vez (primeiroAcessoEm),
            mesmo critério do contador de ativos na linha do coordenador. */}
        <span className={`text-[10px] font-black uppercase rounded-full px-2 py-1 ${
          a.inativo ? 'bg-gray-200 text-gray-600' : a.acessou ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {a.inativo ? 'Removido' : a.acessou ? 'Ativo' : 'Inativo'}
        </span>
        <div className="flex flex-wrap gap-1">
          {a.inativo ? (
            <span className="text-xs text-gray-400 italic">Acesso removido</span>
          ) : a.completo ? (
            <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-emerald-50 text-emerald-700">✓ Completo · todos os cursos</span>
          ) : a.cursosAcesso.length > 0 ? (
            a.cursosAcesso.map((c) => (
              <span key={c.curso} className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${venceu(c.vencimento) ? 'bg-red-50 text-red-600 line-through' : 'bg-blue-50 text-blue-700'}`}>{c.curso} · 1 acesso · R$ {fmtValor(c.valor) || '0,00'} · expira {c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '—'}</span>
            ))
          ) : freeCursos.length > 0 ? (
            freeCursos.map((c) => (
              <span key={c} className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-amber-50 text-amber-700">{c}</span>
            ))
          ) : false ? (
            // Sem cursosAcesso, sem completo, sem curso gratuito configurado — cai no
            // primeiro curso de Meus Cursos em vez de ficar em branco.
            <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-amber-50 text-amber-700">{cursos[0]}</span>
          ) : (
            <span className="text-xs text-gray-400 italic">—</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          {!a.inativo && <button onClick={() => (editUid === a.uid ? setEditUid(null) : abrirEdit(a))} className="text-xs font-bold text-blue-600 hover:text-blue-800">
            {editUid === a.uid ? 'fechar' : 'editar'}
          </button>}
          {!a.inativo ? <button onClick={() => bloquearAluno(a)} disabled={removingUid === a.uid}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40" title="Remover aluno do meu ambiente">
            <Trash2 size={15} />
          </button> : (
            <button onClick={() => excluirDefinitivo(a)} disabled={!podeExcluirDefinitivo(a) || deletingUid === a.uid}
              className="text-xs font-bold text-red-600 disabled:text-gray-300" title={podeExcluirDefinitivo(a) ? 'Excluir definitivamente' : 'Disponível após 90 dias'}>
              excluir
            </button>
          )}
        </div>
      </div>
      {!a.inativo && editUid === a.uid && (
        <div className="px-4 pb-4 bg-gray-50/60">
          {a.completo && (
            <div className="mt-3 mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              Este aluno tem <b>acesso Completo</b> (todos os cursos). Você só precisa mexer aqui embaixo se quiser trocá-lo para <b>acesso por curso</b>.
            </div>
          )}
          <div className="text-xs font-black uppercase text-gray-500 mb-2">Cursos · vencimento e valor</div>
          <div className="space-y-2 mb-3">
            {eCursos.length === 0 && (freeCursos.length > 0
              ? <div className="space-y-2">{freeCursos.map((curso) => <div key={curso} className="flex items-center gap-2 text-sm text-gray-800"><span className="flex-1 truncate">{curso}</span><span className="text-[11px] text-gray-400">1 acesso</span></div>)}</div>
              : null)}
            {eCursos.map((c) => (
              <div key={c.curso} className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{c.curso} · 1 acesso</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-400">vence</span>
                  <input type="date" value={c.vencimento || ''} onChange={(e) => setVenc(c.curso, e.target.value)} className={campo} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-400">R$</span>
                  <input value={fmtValor(c.valor)} onChange={(e) => setValorCurso(c.curso, e.target.value)} placeholder="0,00" className={campo + ' w-24'} />
                </div>
                <button onClick={() => removerCurso(c.curso)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover curso"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          {cursosDisponiveis.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <select value={eAddCurso} onChange={(e) => setEAddCurso(e.target.value)} className={campo}>
                <option value="">+ adicionar curso…</option>
                {cursosDisponiveis.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={addCursoEdit} disabled={!eAddCurso} className="text-xs font-bold text-blue-600 disabled:opacity-40">adicionar</button>
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => salvarEdit(a.uid)} disabled={editSalvando} className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
              {editSalvando ? 'Salvando…' : 'Salvar'}
            </button>
            {editMsg && <span className="text-sm text-gray-600">{editMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );

  const renderFormAdicionar = (empresaId: string) => (
    <div className="px-4 pb-4 pt-3 bg-blue-50/40 border-t border-blue-100 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={aNome} onChange={(e) => setANome(e.target.value)} placeholder="Nome completo" className={campo} />
        <input value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="E-mail" className={campo} />
      </div>
      <div>
        <div className="text-xs font-bold text-gray-500 mb-1">Cursos que ele vai acessar</div>
        <div className="flex flex-wrap gap-2">
          {cursos.length === 0 && <span className="text-xs text-gray-400">Nenhum curso ainda.</span>}
          {cursos.map((c) => {
            const on = aItens.some((i) => i.curso === c);
            return (
              <button key={c} onClick={() => toggleCursoAdd(c)}
                className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
      {aItens.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-gray-400">Vencimento e valor de cada curso</div>
          {aItens.map((i) => (
            <div key={i.curso} className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{i.curso}</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">vence</span>
                <input type="date" value={i.vencimento} onChange={(e) => setItemVenc(i.curso, e.target.value)} className={campo} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">R$</span>
                <input value={i.valor} onChange={(e) => setItemValor(i.curso, e.target.value)} placeholder="0,00" className={campo + ' w-24'} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button onClick={adicionar} disabled={addEnviando || aEmpresaId !== empresaId} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
          {addEnviando ? 'Adicionando…' : 'Adicionar aluno'}
        </button>
        {addMsg && <span className="text-sm text-gray-600">{addMsg}</span>}
      </div>
    </div>
  );

  const abrirFormAdicionar = (empresaId: string) => {
    if (addAbertoEmpresaId === empresaId) { setAddAbertoEmpresaId(null); return; }
    setAddAbertoEmpresaId(empresaId);
    setAEmpresaId(empresaId);
    setANome(''); setAEmail(''); setAItens([]); setAddMsg('');
  };
  const abrirAdicionarNoTopo = () => {
    const direto = empresaIdDireto(consultorId);
    setGruposAbertos((p) => ({ ...p, [direto]: true }));
    setAddAbertoEmpresaId(direto); setAEmpresaId(direto);
    setANome(''); setAEmail(''); setAItens([]); setAddMsg('');
    window.setTimeout(() => document.getElementById(`adicionar-aluno-${direto}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  // Corpo de um time: cabeçalho das colunas + alunos + "adicionar aluno".
  // Usado solto (dentro da linha do coordenador) e dentro do acordeão da tela cheia.
  const corpoGrupo = (empresaId: string) => {
    const alunosDoTime = alunosPorEmpresa.get(empresaId) || [];
    return (
      <>
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/30">
          <button onClick={() => abrirFormAdicionar(empresaId)} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800">
            <Plus size={14} /> {addAbertoEmpresaId === empresaId ? 'fechar cadastro' : 'adicionar aluno'}
          </button>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 grid grid-cols-[1.2fr_auto_1.3fr_auto] gap-3 text-[10px] font-black uppercase tracking-wide text-gray-400">
          <div>Aluno</div><div>Status</div><div>Cursos com acesso</div><div />
        </div>
        {alunosDoTime.length === 0 && <div className="px-4 py-6 text-center text-gray-400 text-sm">Nenhum aluno neste time ainda.</div>}
        {alunosDoTime.map(renderLinha)}
        {addAbertoEmpresaId === empresaId && <div id={`adicionar-aluno-${empresaId}`}>{renderFormAdicionar(empresaId)}</div>}
      </>
    );
  };

  // Embutido na linha do coordenador: o time já está identificado pela linha,
  // então não repete busca nem acordeão — só a tabela do time.
  if (embedded) {
    const empresaId = empresaIdFiltro || empresaIdDireto(consultorId);
    return loading
      ? <div className="text-gray-500 text-sm">Carregando…</div>
      : <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">{corpoGrupo(empresaId)}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Alunos na Plataforma</h1>
      <p className="text-gray-500 text-sm mb-5">
        Gerencie os alunos de <b>{consultor.branding.nome}</b>, agrupados por time — os seus diretos e os de cada coordenador.
      </p>

      <div className="flex justify-end mb-4">
        <button type="button" onClick={abrirAdicionarNoTopo} className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800">
          <Plus size={16} /> adicionar aluno
        </button>
      </div>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail…" className={campo + ' w-full max-w-sm mb-5'} />

      {loading ? <div className="text-gray-500">Carregando…</div> : (
        <div className="space-y-4">
          {equipes.map((eq) => {
            const alunosDoTime = alunosPorEmpresa.get(eq.empresaId) || [];
            const aberto = buscando ? alunosDoTime.length > 0 : !!gruposAbertos[eq.empresaId];
            return (
              <div key={eq.empresaId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setGruposAbertos((p) => ({ ...p, [eq.empresaId]: !p[eq.empresaId] }))}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-gray-800 truncate">
                      {eq.direto ? eq.nome : `${eq.coordenador}${eq.nome && eq.nome !== eq.coordenador ? ' — ' + eq.nome : ''}`}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">({alunosDoTime.length})</span>
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform shrink-0 ${aberto ? 'rotate-180' : ''}`} />
                </button>
                {aberto && <div className="border-t border-gray-100">{corpoGrupo(eq.empresaId)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {false && bloqueados.length > 0 && (
        <div className="mt-8 bg-white border border-orange-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="text-sm font-black text-orange-950">Alunos removidos em retencao</h2>
            <p className="text-xs text-orange-700 mt-0.5">Eles perderam o acesso, mas dados e projetos ficam preservados por 3 meses.</p>
          </div>
          {bloqueados.map((a) => {
            const dias = diasDesdeBloqueio(a);
            const pronto = podeExcluirDefinitivo(a);
            return (
              <div key={a.uid} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-orange-50 last:border-0">
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 text-sm truncate">{a.nome}</div>
                  <div className="text-xs text-gray-400 truncate">{a.email}</div>
                </div>
                <div className="text-xs text-gray-600">
                  <span className={pronto ? 'font-black text-red-600' : 'font-bold text-orange-700'}>
                    {pronto ? 'Mais de 3 meses' : `${dias}/90 dias`}
                  </span>
                  {a.desvinculadoEm && <span className="block text-[11px] text-gray-400">bloqueado em {new Date(a.desvinculadoEm).toLocaleDateString('pt-BR')}</span>}
                </div>
                <button
                  onClick={() => excluirDefinitivo(a)}
                  disabled={!pronto || deletingUid === a.uid}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={pronto ? 'Excluir definitivamente do Firebase' : 'Disponivel apos 3 meses'}
                >
                  <Trash2 size={14} />
                  {deletingUid === a.uid ? 'Excluindo...' : 'Excluir total'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
