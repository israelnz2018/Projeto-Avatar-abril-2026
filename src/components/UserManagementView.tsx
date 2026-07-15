import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  Shield,
  Briefcase,
  Mail,
  Send,
  UserPlus,
  Trash2,
  X,
  ChevronDown,
  Coins,
  Building2,
  Plus,
  Minus,
  Eye,
  Edit2,
  Key,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUserAccess } from '../hooks/useUserAccess';
import {
  UserData,
  PendingInvite,
  TipoUsuario,
  Plano,
  getAllUsers,
  getUsersByEmpresa,
  getCoordenadores,
  listarConvites,
  listarConvitesPorEmpresa,
  criarConvite,
  deletarConvite,
  deleteUserDoc,
  updateUserMaxAlunos,
  subscribeUsersChanges,
  subscribeInvitesChanges,
} from '../services/userService';
import { adminDeleteUser, adminResetPassword, adminListAllUsers, adminCompleteProfile, ListedUser } from '../services/adminUserService';
import AdminUserModal, { AdminUserModalMode } from './AdminUserModal';

const TIPO_LABEL: Record<TipoUsuario, string> = {
  admin: 'Admin',
  coordenador: 'Coordenador',
  aluno: 'Aluno',
};

const TIPO_COR: Record<TipoUsuario, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-300',
  coordenador: 'bg-blue-100 text-blue-700 border-blue-300',
  aluno: 'bg-gray-100 text-gray-700 border-gray-300',
};

const PLANO_LABEL: Record<Plano, string> = {
  gratuito: 'Introdutório',
  completo: 'Completo',
  coordenador: 'Coordenador',
};

const PLANO_COR: Record<Plano, string> = {
  gratuito: 'bg-green-100 text-green-700 border-green-300',
  completo: 'bg-amber-100 text-amber-700 border-amber-300',
  coordenador: 'bg-blue-100 text-blue-700 border-blue-300',
};

/** Chip de status de engajamento: colorido quando aconteceu, cinza apagado quando não. */
function EngajaChip({ ativo, label, cor }: { ativo: boolean; label: string; cor: 'amber' | 'blue' | 'green' }) {
  const cores: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700 border-amber-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    green: 'bg-green-100 text-green-700 border-green-300',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        ativo ? cores[cor] : 'bg-gray-50 text-gray-300 border-gray-200'
      }`}
    >
      {ativo ? '✓' : '○'} {label}
    </span>
  );
}

/**
 * Indicador COMPACTO de engajamento pra linha principal — mostra o funil de 3 passos
 * (cadastrou → acessou o app → trocou a senha provisória) como 3 pontinhos coloridos.
 * Verde = feito, cinza = pendente. Passa o mouse pra ver o rótulo.
 */
function EngajamentoMini({ acessou, trocouSenha }: { acessou: boolean; trocouSenha: boolean }) {
  // Nível de engajamento: 0 = só cadastrou, 1 = acessou, 2 = trocou senha (engajado).
  const nivel = trocouSenha ? 2 : acessou ? 1 : 0;
  const label = nivel === 2 ? 'Engajado (trocou senha)' : nivel === 1 ? 'Acessou o app' : 'Só cadastrou (lead)';
  const passos = [
    { on: true, t: 'Cadastrou' },            // sempre true (existe no sistema)
    { on: acessou, t: 'Acessou o app' },
    { on: trocouSenha, t: 'Trocou a senha' },
  ];
  return (
    <span className="inline-flex items-center gap-1" title={`Engajamento: ${label}`}>
      {passos.map((p, i) => (
        <span key={i}
          className={cn('w-2 h-2 rounded-full', p.on ? 'bg-green-500' : 'bg-gray-200')} />
      ))}
    </span>
  );
}

function getPlano(u: UserData): Plano {
  if (u.plano === 'coordenador' || u.tipoUsuario === 'coordenador') return 'coordenador';
  if (u.plano === 'completo') return 'completo';
  if (u.plano === 'gratuito') return 'gratuito';
  const formacoesAvancadas = (u.formacoes || []).some(
    f => !f.includes('introdutoria') && !f.includes('gratuito')
  );
  return formacoesAvancadas ? 'completo' : 'gratuito';
}

/**
 * Badge de estágio do funil:
 *   Lead         (gratuito, nunca acessou)              → vermelho
 *   Grátis       (gratuito, já acessou)                 → amarelo
 *   Pago         (completo da Hotmart, +1 ano)          → verde   (mostra "até DD/MM/AA")
 *   Pago 31/12   (completo do Hostinger / reativação)   → azul se já acessou, branco se não
 *   Coordenador  → padrão
 */
function getBadge(u: { primeiroAcessoEm?: string; acessoCompletoAte?: string; origemAcesso?: string; origem?: string }, plano: Plano): { label: string; cor: string } {
  // Comprou o Kit 90 (R$67): o plano é "gratuito" (nível Trilha 1), mas PAGOU.
  // Quem diz isso é a `origem`, não o `plano` — senão o comprador virava "Lead".
  const comprouTrilha1 = String(u.origem || '').startsWith('compra');
  if (plano === 'gratuito') {
    if (comprouTrilha1) {
      const d = u.acessoCompletoAte ? new Date(u.acessoCompletoAte) : null;
      const dataFmt = d && !isNaN(d.getTime())
        ? ` até ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
        : '';
      return { label: `Pago · Trilha 1${dataFmt}`, cor: 'bg-green-100 text-green-700 border-green-300' };
    }
    // Não pagou: cortesia/convite (já acessou) ou nunca acessou.
    return { label: 'Grátis', cor: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  }
  if (plano === 'completo') {
    const d = u.acessoCompletoAte ? new Date(u.acessoCompletoAte) : null;
    const dataFmt = d && !isNaN(d.getTime())
      ? ` até ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
      : '';
    // Convidado do Hostinger (reativação): azul só após o 1º acesso, senão neutro.
    if (u.origemAcesso === 'convite-reativacao') {
      const cor = u.primeiroAcessoEm
        ? 'bg-blue-100 text-blue-700 border-blue-300'
        : 'bg-white text-gray-600 border-gray-300';
      return { label: `Pago · Completo${dataFmt}`, cor };
    }
    // Pago de verdade (Hotmart): verde, com a validade de 1 ano.
    return { label: `Pago · Completo${dataFmt}`, cor: 'bg-green-100 text-green-700 border-green-300' };
  }
  return { label: PLANO_LABEL[plano], cor: PLANO_COR[plano] };
}

// "Online agora" (aproximado): fez login nos últimos 15 minutos.
const ONLINE_JANELA_MS = 15 * 60 * 1000;
function estaOnline(lastLogin?: string): boolean {
  if (!lastLogin) return false;
  const t = new Date(lastLogin).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t < ONLINE_JANELA_MS;
}

type Aba = 'lista' | 'equipes';

export default function UserManagementView() {
  const { tipoUsuario, empresaId: myEmpresaId, empresaNome: myEmpresaNome, loading: accessLoading } = useUserAccess();
  const isAdmin = tipoUsuario === 'admin';
  const isCoordenador = tipoUsuario === 'coordenador';
  const podeAcessar = isAdmin || isCoordenador;

  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>('lista');
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [coordenadores, setCoordenadores] = useState<UserData[]>([]);
  const [completandoUid, setCompletandoUid] = useState<string | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | TipoUsuario>('todos');
  const [filterPlano, setFilterPlano] = useState<'todos' | Plano>('todos');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('todos');
  // Re-renderiza a cada 30s pra recalcular o "online agora" (quem passou dos 15 min sai).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const [emailModal, setEmailModal] = useState<{ email: string; nome?: string; empresaNome?: string } | null>(null);
  const [emailExterno, setEmailExterno] = useState(false);
  const [adminModal, setAdminModal] = useState<{ mode: AdminUserModalMode; user?: UserData } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserData | null>(null);
  const [resetSenhaResult, setResetSenhaResult] = useState<{ email: string; senha: string } | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [resetando, setResetando] = useState<string | null>(null);

  useEffect(() => {
    if (accessLoading) return;
    if (!podeAcessar) {
      setLoading(false);
      return;
    }
    // Carrega imediatamente
    void fetchData();
    // Listeners real-time: o n8n cria/altera docs em `users` (e às vezes `invites`).
    // Cada mudança dispara um refetch completo — simples e cobre os 3 conjuntos.
    // Coalescemos múltiplas mudanças em uma janela curta pra evitar refetches em rajada.
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => { void fetchData(); }, 300);
    };
    const unsubUsers = subscribeUsersChanges(trigger);
    const unsubInvites = subscribeInvitesChanges(trigger);
    return () => {
      if (debounce) clearTimeout(debounce);
      unsubUsers();
      unsubInvites();
    };
  }, [accessLoading, podeAcessar, myEmpresaId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Admin: usa Auth + Firestore merged (mostra também usuários "órfãos" que só
      // têm conta Auth mas não têm doc Firestore).
      // Coordenador: continua usando getUsersByEmpresa (só vê o time dele).
      const [usersData, invitesData, coordsData] = await Promise.all([
        isAdmin ? adminListAllUsers() : (myEmpresaId ? getUsersByEmpresa(myEmpresaId) : Promise.resolve([])),
        isAdmin ? listarConvites() : (myEmpresaId ? listarConvitesPorEmpresa(myEmpresaId) : Promise.resolve([])),
        isAdmin ? getCoordenadores() : Promise.resolve([]),
      ]);
      const norm = (u: any): ListedUser => ({
        ...u,
        email: u.email || '',
        formacoes: Array.isArray(u.formacoes) ? u.formacoes : [],
        tipoUsuario: (u.tipoUsuario || 'aluno') as TipoUsuario,
        _hasDoc: typeof u._hasDoc === 'boolean' ? u._hasDoc : true,
        creditoIA: u.creditoIA && typeof u.creditoIA === 'object'
          ? {
              limite: typeof u.creditoIA.limite === 'number' ? u.creditoIA.limite : 100,
              usado: typeof u.creditoIA.usado === 'number' ? u.creditoIA.usado : 0,
              resetEm: u.creditoIA.resetEm || new Date().toISOString(),
              solicitouMais: !!u.creditoIA.solicitouMais,
              solicitadoEm: u.creditoIA.solicitadoEm,
            }
          : { limite: 100, usado: 0, resetEm: new Date().toISOString() },
      });
      setUsers(usersData.map(norm));
      setCoordenadores(coordsData.map(norm));
      setInvites(invitesData.map(i => ({
        ...i,
        email: i.email || '',
        formacoes: Array.isArray(i.formacoes) ? i.formacoes : [],
        tipoUsuario: (i.tipoUsuario || 'aluno') as TipoUsuario,
      })));
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  const empresas = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(u => {
      if (u.empresaId) map.set(u.empresaId, u.empresaNome || u.empresaId);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(u => {
      if (filterTipo !== 'todos' && u.tipoUsuario !== filterTipo) return false;
      if (filterPlano !== 'todos' && getPlano(u) !== filterPlano) return false;
      if (filterEmpresa !== 'todos') {
        if (filterEmpresa === 'sem_empresa' && u.empresaId) return false;
        if (filterEmpresa !== 'sem_empresa' && u.empresaId !== filterEmpresa) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        return (
          u.email.toLowerCase().includes(s) ||
          (u.nome || '').toLowerCase().includes(s) ||
          (u.empresaNome || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
    // Mais novos primeiro: ordena por data de criação (desc). Sem data vai pro fim.
    return filtered.sort((a, b) => {
      const ta = a.criadoEm ? new Date(a.criadoEm).getTime() : 0;
      const tb = b.criadoEm ? new Date(b.criadoEm).getTime() : 0;
      return tb - ta;
    });
  }, [users, search, filterTipo, filterPlano, filterEmpresa]);

  if (accessLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!podeAcessar) {
    return (
      <div className="bg-white border border-[#ccc] rounded-[4px] p-10 text-center">
        <Shield size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="font-bold text-gray-700">Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="bg-white p-6 border border-[#ccc] rounded-[4px]">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-[1.5rem] font-bold text-[#333] m-0 flex items-center gap-2">
              <Users size={24} className="text-blue-600" />
              Gestão de Usuários
            </h1>
            <p className="text-[#666] mt-2 text-sm">
              {isAdmin
                ? 'Visão geral de todos os usuários. Edições no Firebase só na aba Equipes.'
                : `Sua empresa: ${myEmpresaNome || myEmpresaId || '—'}`}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdminModal({ mode: 'create' })}
                className="bg-blue-600 text-white px-4 py-2 rounded-[4px] font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all border-none cursor-pointer"
              >
                <UserPlus size={16} /> Adicionar usuário
              </button>
              <button
                onClick={() => { setEmailExterno(true); setEmailModal({ email: '', nome: '' }); }}
                className="bg-white text-blue-600 px-4 py-2 rounded-[4px] font-bold text-sm flex items-center gap-2 hover:bg-blue-50 transition-all border border-blue-200 cursor-pointer"
                title="Enviar convite com link Hotmart pra quem ainda não é cliente"
              >
                <Send size={16} /> Convidar com link Hotmart
              </button>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-1 mt-4 border-b border-[#eee] -mb-2">
            <button
              onClick={() => setAba('lista')}
              className={cn(
                "px-4 py-2 text-sm font-bold border-none bg-transparent cursor-pointer transition-colors -mb-px border-b-2",
                aba === 'lista' ? "text-blue-600 border-blue-600" : "text-gray-500 hover:text-gray-700 border-transparent"
              )}
            >
              Todos os usuários
            </button>
            <button
              onClick={() => setAba('equipes')}
              className={cn(
                "px-4 py-2 text-sm font-bold border-none bg-transparent cursor-pointer transition-colors -mb-px border-b-2",
                aba === 'equipes' ? "text-blue-600 border-blue-600" : "text-gray-500 hover:text-gray-700 border-transparent"
              )}
            >
              Equipes de Coordenadores
            </button>
          </div>
        )}
      </header>

      {aba === 'lista' ? (
        <>
          {/* Resumo: quantas pessoas online agora (login nos últimos 15 min) */}
          {(() => {
            const online = users.filter(u => estaOnline((u as any).lastLogin));
            return (
              <div className="bg-white border border-[#ccc] rounded-[4px] p-4 mb-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    {online.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                    <span className={cn("relative inline-flex rounded-full h-3 w-3", online.length > 0 ? "bg-green-500" : "bg-gray-300")} />
                  </span>
                  <span className="text-2xl font-black text-gray-900">{online.length}</span>
                  <span className="text-sm text-gray-500 font-semibold">{online.length === 1 ? 'pessoa online agora' : 'pessoas online agora'}</span>
                </div>
                {online.length > 0 && (
                  <div className="text-xs text-gray-400 flex-1 min-w-[200px] truncate">
                    {online.slice(0, 5).map(u => u.nome || u.email.split('@')[0]).join(', ')}
                    {online.length > 5 && ` e mais ${online.length - 5}`}
                  </div>
                )}
                <span className="text-[11px] text-gray-400 ml-auto">online = login nos últimos 15 min</span>
              </div>
            );
          })()}

          <div className="bg-white border border-[#ccc] rounded-[4px] p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou empresa…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#ccc] rounded-[4px] text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as any)}
              className="px-3 py-2 border border-[#ccc] rounded-[4px] text-sm bg-white">
              <option value="todos">Todos os tipos</option>
              <option value="admin">Admin</option>
              <option value="coordenador">Coordenador</option>
              <option value="aluno">Aluno</option>
            </select>
            <select value={filterPlano} onChange={e => setFilterPlano(e.target.value as any)}
              className="px-3 py-2 border border-[#ccc] rounded-[4px] text-sm bg-white">
              <option value="todos">Todos os planos</option>
              <option value="gratuito">Introdutório</option>
              <option value="completo">Completo</option>
              <option value="coordenador">Coordenador</option>
            </select>
            {isAdmin && (
              <select value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}
                className="px-3 py-2 border border-[#ccc] rounded-[4px] text-sm bg-white">
                <option value="todos">Todas as empresas</option>
                <option value="sem_empresa">Sem empresa</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            )}
            <div className="text-xs text-gray-500 ml-auto">
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>

          <section className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="bg-white border border-[#ccc] rounded-[4px] p-10 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">Nenhum usuário encontrado.</p>
              </div>
            ) : (
              filteredUsers.map(u => (
                <UserRow
                  key={u.uid}
                  user={u}
                  isAdmin={isAdmin}
                  onSendEmail={() => { setEmailExterno(false); setEmailModal({ email: u.email, nome: u.nome, empresaNome: u.empresaNome }); }}
                  onEdit={() => setAdminModal({ mode: 'edit', user: u })}
                  onDelete={() => setConfirmDelete(u)}
                  onResetPassword={async () => {
                    if (!confirm(`Resetar a senha de ${u.email}? Uma senha provisória nova vai ser gerada.`)) return;
                    setResetando(u.uid);
                    try {
                      const r = await adminResetPassword(u.uid);
                      setResetSenhaResult({ email: u.email, senha: r.senhaProvisoria });
                    } catch (e: any) {
                      alert(`Erro ao resetar senha: ${e?.message || 'desconhecido'}`);
                    } finally {
                      setResetando(null);
                    }
                  }}
                  isResetting={resetando === u.uid}
                  onCompletarPerfil={u._hasDoc === false ? async () => {
                    setCompletandoUid(u.uid);
                    try {
                      await adminCompleteProfile(u.uid);
                      await fetchData();
                    } catch (e: any) {
                      alert(`Erro ao completar perfil: ${e?.message || 'desconhecido'}`);
                    } finally {
                      setCompletandoUid(null);
                    }
                  } : undefined}
                  isCompletando={completandoUid === u.uid}
                />
              ))
            )}
          </section>
        </>
      ) : (
        <EquipesView
          coordenadores={coordenadores}
          users={users}
          invites={invites}
          onChanged={fetchData}
          onSendEmail={(u) => { setEmailExterno(false); setEmailModal({ email: u.email, nome: u.nome, empresaNome: u.empresaNome }); }}
        />
      )}

      {emailModal && (
        <EmailModal
          destino={emailModal}
          externo={emailExterno}
          onClose={() => setEmailModal(null)}
        />
      )}

      {/* Modal de criar/editar usuário */}
      {adminModal && (
        <AdminUserModal
          isOpen={!!adminModal}
          mode={adminModal.mode}
          user={adminModal.user}
          onClose={() => setAdminModal(null)}
          onSaved={() => { void fetchData(); }}
        />
      )}

      {/* Modal de confirmar deletar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-center font-bold text-gray-800 mb-2">Deletar usuário?</h3>
              <p className="text-center text-sm text-gray-600 mb-2">
                <strong>{confirmDelete.nome || confirmDelete.email}</strong>
              </p>
              <p className="text-center text-xs text-gray-500 mb-4">
                Vai apagar a conta no Firebase Auth E o doc Firestore. Projetos e dados do aluno permanecem
                no banco (vinculados ao UID antigo), mas ele não consegue mais logar.
                <br/><br/>
                <strong>Esta ação não pode ser desfeita.</strong>
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletando}
                className="px-4 py-2 rounded text-sm font-bold bg-white border border-gray-300 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setDeletando(true);
                  try {
                    await adminDeleteUser(confirmDelete.uid);
                    setConfirmDelete(null);
                    // Força refresh: o listener real-time Firestore não dispara
                    // quando o usuário deletado era órfão (só Auth, sem doc).
                    await fetchData();
                  } catch (e: any) {
                    alert(`Erro ao deletar: ${e?.message || 'desconhecido'}`);
                  } finally {
                    setDeletando(false);
                  }
                }}
                disabled={deletando}
                className="px-4 py-2 rounded text-sm font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer border-none flex items-center gap-2 disabled:opacity-60"
              >
                {deletando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deletando ? 'Deletando…' : 'Deletar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado do reset de senha */}
      {resetSenhaResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-center font-bold text-gray-800 mb-2">Senha resetada</h3>
            <p className="text-center text-sm text-gray-600 mb-4">
              Nova senha provisória de <strong>{resetSenhaResult.email}</strong>:
            </p>
            <div className="flex gap-2 items-center mb-4">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm">
                {resetSenhaResult.senha}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(resetSenhaResult.senha)}
                className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer border-none hover:bg-blue-700"
              >
                <Copy size={12} /> Copiar
              </button>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
              ⚠️ Copie agora — esta senha não vai aparecer de novo. Envie ao aluno pelo canal que preferir.
            </p>
            <button
              onClick={() => setResetSenhaResult(null)}
              className="w-full py-2 rounded text-sm font-bold bg-gray-100 hover:bg-gray-200 cursor-pointer border-none"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------ UserRow (read-only) ------------ */

function UserRow({ user, isAdmin, onSendEmail, onEdit, onDelete, onResetPassword, isResetting, onCompletarPerfil, isCompletando }: {
  user: UserData & {
    _hasDoc?: boolean;
    _authCreatedAt?: string | null;
    senhaProvisoria?: boolean | string;
    engajamento?: { aberturas?: number; cliques?: number; ultimoEvento?: string; ultimoTipo?: string };
  };
  isAdmin: boolean;
  onSendEmail: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onResetPassword?: () => void;
  isResetting?: boolean;
  onCompletarPerfil?: () => void;
  isCompletando?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const plano = getPlano(user);
  const badge = getBadge(user, plano);
  const online = estaOnline((user as any).lastLogin);
  const pctUso = user.creditoIA.limite > 0
    ? Math.min(100, Math.round((user.creditoIA.usado / user.creditoIA.limite) * 100))
    : 0;
  const tokensColor = pctUso >= 90 ? 'bg-red-500' : pctUso >= 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-white border border-[#ccc] rounded-[4px] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors"
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
            {((user.nome || user.email)[0] || '?').toUpperCase()}
          </div>
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5" title="Online agora">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-800 m-0 truncate flex items-center gap-1.5">
            {user.nome || user.email.split('@')[0]}
            {online && <span className="text-[10px] font-bold text-green-600 uppercase">● online</span>}
          </p>
          <p className="text-xs text-gray-500 m-0 mt-0.5 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {user._hasDoc === false && (
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-300"
              title="Existe no Firebase Auth mas não tem doc Firestore — clique em 'Completar perfil' pra regularizar"
            >
              Sem perfil
            </span>
          )}
          <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded border", TIPO_COR[user.tipoUsuario])}>
            {TIPO_LABEL[user.tipoUsuario]}
          </span>
          <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded border", badge.cor)}>
            {badge.label}
          </span>
          {/* Engajamento resumido: acessou o app? trocou a senha provisória? */}
          {user.tipoUsuario === 'aluno' && (
            <EngajamentoMini
              acessou={!!user.primeiroAcessoEm}
              trocouSenha={user.senhaProvisoria === false}
            />
          )}
          {user.empresaNome && (
            <span className="text-[10px] font-bold uppercase text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 flex items-center gap-1">
              <Briefcase size={10} /> {user.empresaNome}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-2" title={`Tokens IA: ${user.creditoIA.usado} de ${user.creditoIA.limite}`}>
            <Coins size={12} className="text-gray-500" />
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={cn("h-full transition-all", tokensColor)} style={{ width: `${pctUso}%` }} />
            </div>
            <span className="text-[10px] text-gray-600 font-mono tabular-nums">
              {user.creditoIA.usado}/{user.creditoIA.limite}
            </span>
          </div>
          {user.creditoIA.solicitouMais && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700"
              title={user.creditoIA.solicitadoEm ? `Solicitou em ${new Date(user.creditoIA.solicitadoEm).toLocaleDateString('pt-BR')}` : 'Solicitou mais créditos'}>
              ⏳ Pediu + créditos
            </span>
          )}
          <ChevronDown size={16} className={cn("text-gray-400 transition-transform ml-1", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#eee] bg-gray-50 p-4 grid md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500 font-bold uppercase text-[10px]">Nome:</span> {user.nome || '—'}</div>
          <div><span className="text-gray-500 font-bold uppercase text-[10px]">E-mail:</span> {user.email}</div>
          <div><span className="text-gray-500 font-bold uppercase text-[10px]">UID:</span> <code className="text-xs">{user.uid}</code></div>
          <div><span className="text-gray-500 font-bold uppercase text-[10px]">Criado em:</span> {new Date(user.criadoEm || Date.now()).toLocaleDateString()}</div>
          <div>
            <span className="text-gray-500 font-bold uppercase text-[10px]">1º acesso:</span>{' '}
            {user.primeiroAcessoEm
              ? new Date(user.primeiroAcessoEm).toLocaleDateString()
              : <span className="text-red-600 font-semibold">nunca acessou (lead)</span>}
          </div>

          {/* Engajamento da campanha (e-mail + acesso ao app) */}
          <div className="md:col-span-2">
            <span className="text-gray-500 font-bold uppercase text-[10px]">Engajamento:</span>{' '}
            <span className="inline-flex flex-wrap gap-1.5 align-middle">
              <EngajaChip
                ativo={!!(user.engajamento && (user.engajamento.aberturas || 0) > 0)}
                label="Abriu o e-mail"
                cor="amber"
              />
              <EngajaChip
                ativo={!!(user.engajamento && (user.engajamento.cliques || 0) > 0)}
                label="Clicou no link"
                cor="blue"
              />
              <EngajaChip
                ativo={!!user.primeiroAcessoEm}
                label="Acessou o app"
                cor="green"
              />
              <EngajaChip
                ativo={user.senhaProvisoria === false}
                label="Trocou a senha"
                cor="green"
              />
            </span>
          </div>
          <div><span className="text-gray-500 font-bold uppercase text-[10px]">Tokens IA usados:</span> {user.creditoIA.usado} / {user.creditoIA.limite}</div>
          <div><span className="text-gray-500 font-bold uppercase text-[10px]">Reset em:</span> {new Date(user.creditoIA.resetEm).toLocaleDateString()}</div>
          {user.empresaId && (
            <div><span className="text-gray-500 font-bold uppercase text-[10px]">Empresa:</span> {user.empresaNome || user.empresaId}</div>
          )}
          {user.tipoUsuario === 'coordenador' && user.maxAlunos !== undefined && (
            <div><span className="text-gray-500 font-bold uppercase text-[10px]">Vagas no time:</span> {user.maxAlunos}</div>
          )}
          {isAdmin && (
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#eee] flex-wrap">
              {onCompletarPerfil && (
                <button
                  onClick={onCompletarPerfil}
                  disabled={isCompletando}
                  className="px-3 py-2 rounded-[4px] text-xs font-bold bg-amber-500 text-white border-none cursor-pointer flex items-center gap-2 hover:bg-amber-600 disabled:opacity-50"
                  title="Cria o doc Firestore deste usuário com defaults (aluno gratuito)"
                >
                  {isCompletando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {isCompletando ? 'Completando…' : 'Completar perfil'}
                </button>
              )}
              <button
                onClick={onSendEmail}
                className="px-3 py-2 rounded-[4px] text-xs font-bold bg-white text-blue-700 border border-blue-200 cursor-pointer flex items-center gap-2 hover:bg-blue-50"
              >
                <Send size={14} /> E-mail
              </button>
              {onResetPassword && (
                <button
                  onClick={onResetPassword}
                  disabled={isResetting}
                  className="px-3 py-2 rounded-[4px] text-xs font-bold bg-white text-amber-700 border border-amber-200 cursor-pointer flex items-center gap-2 hover:bg-amber-50 disabled:opacity-50"
                >
                  {isResetting ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  Resetar senha
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-2 rounded-[4px] text-xs font-bold bg-blue-600 text-white border-none cursor-pointer flex items-center gap-2 hover:bg-blue-700"
                >
                  <Edit2 size={14} /> Editar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-2 rounded-[4px] text-xs font-bold bg-red-600 text-white border-none cursor-pointer flex items-center gap-2 hover:bg-red-700"
                >
                  <Trash2 size={14} /> Deletar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------ Equipes (a única edição em Firebase) ------------ */

function EquipesView({ coordenadores, users, invites, onChanged, onSendEmail }: {
  coordenadores: UserData[];
  users: UserData[];
  invites: PendingInvite[];
  onChanged: () => Promise<void>;
  onSendEmail: (u: UserData) => void;
}) {
  if (coordenadores.length === 0) {
    return (
      <div className="bg-white border border-[#ccc] rounded-[4px] p-10 text-center">
        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-bold">Nenhum coordenador cadastrado ainda.</p>
        <p className="text-gray-400 text-sm mt-2">
          Coordenadores são criados pelo n8n após compra do pacote no Hotmart.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {coordenadores.map(coord => (
        <EquipeCard
          key={coord.uid}
          coord={coord}
          membros={users.filter(u => u.empresaId === coord.empresaId && u.uid !== coord.uid)}
          invitesPendentes={invites.filter(i => i.empresaId === coord.empresaId)}
          onChanged={onChanged}
          onSendEmail={onSendEmail}
        />
      ))}
    </div>
  );
}

function EquipeCard({ coord, membros, invitesPendentes, onChanged, onSendEmail }: {
  coord: UserData;
  membros: UserData[];
  invitesPendentes: PendingInvite[];
  onChanged: () => Promise<void>;
  onSendEmail: (u: UserData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [maxAlunos, setMaxAlunos] = useState(coord.maxAlunos ?? 0);
  const [savingMax, setSavingMax] = useState(false);

  const total = membros.length + invitesPendentes.length;
  const cheia = coord.maxAlunos !== undefined && total >= coord.maxAlunos;

  async function adicionarMembro() {
    if (!novoEmail.includes('@') || !coord.empresaId) return;
    setAdicionando(true);
    try {
      await criarConvite({
        email: novoEmail.trim().toLowerCase(),
        nome: novoNome.trim() || undefined,
        formacoes: [],
        tipoUsuario: 'aluno',
        empresaId: coord.empresaId,
        empresaNome: coord.empresaNome,
        criadoPor: 'admin',
      });
      setNovoEmail('');
      setNovoNome('');
      await onChanged();
    } catch (err: any) {
      alert('Erro: ' + (err?.message || 'falha ao adicionar.'));
    } finally {
      setAdicionando(false);
    }
  }

  async function removerInvite(email: string) {
    if (!confirm(`Remover convite para ${email}?`)) return;
    await deletarConvite(email);
    await onChanged();
  }

  async function removerMembro(membro: UserData) {
    if (!confirm(`Remover ${membro.email} do time? O doc do usuário será deletado do Firestore.`)) return;
    await deleteUserDoc(membro.uid);
    await onChanged();
  }

  async function salvarMax() {
    setSavingMax(true);
    try {
      await updateUserMaxAlunos(coord.uid, maxAlunos);
      await onChanged();
    } finally {
      setSavingMax(false);
    }
  }

  return (
    <div className="bg-white border border-[#ccc] rounded-[4px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50"
      >
        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">
          <Building2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-800 m-0 truncate">{coord.empresaNome || 'Empresa sem nome'}</p>
          <p className="text-xs text-gray-500 m-0 mt-0.5 truncate">Coordenador: {coord.nome || coord.email}</p>
        </div>
        <span className={cn(
          "text-xs font-bold px-3 py-1 rounded-full",
          cheia ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        )}>
          {total}{coord.maxAlunos !== undefined ? ` / ${coord.maxAlunos}` : ''} membros
        </span>
        <ChevronDown size={16} className={cn("text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-[#eee] bg-gray-50 p-4 space-y-4">
          {/* Quantidade máxima */}
          <div className="bg-white border border-[#ccc] rounded-[4px] p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase text-gray-500 m-0">Vagas no time (definidas pelo admin)</p>
              <p className="text-xs text-gray-500 m-0 mt-1">Use para limitar quantos alunos esse coordenador pode ter.</p>
            </div>
            <button
              onClick={() => setMaxAlunos(Math.max(0, maxAlunos - 1))}
              className="p-1.5 bg-gray-100 border border-[#ccc] rounded cursor-pointer"
            ><Minus size={14} /></button>
            <input
              type="number"
              min={0}
              value={maxAlunos}
              onChange={e => setMaxAlunos(parseInt(e.target.value || '0', 10))}
              className="w-16 text-center px-2 py-1.5 border border-[#ccc] rounded text-sm"
            />
            <button
              onClick={() => setMaxAlunos(maxAlunos + 1)}
              className="p-1.5 bg-gray-100 border border-[#ccc] rounded cursor-pointer"
            ><Plus size={14} /></button>
            <button
              onClick={salvarMax}
              disabled={savingMax || maxAlunos === (coord.maxAlunos ?? 0)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold border-none cursor-pointer",
                savingMax || maxAlunos === (coord.maxAlunos ?? 0)
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >Salvar</button>
          </div>

          {/* Adicionar membro */}
          <div className="bg-white border border-[#ccc] rounded-[4px] p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500 m-0 mb-2">Adicionar aluno ao time</p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Nome (opcional)"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                className="flex-1 min-w-[120px] px-3 py-2 border border-[#ccc] rounded-[4px] text-sm"
              />
              <input
                type="email"
                placeholder="email@empresa.com"
                value={novoEmail}
                onChange={e => setNovoEmail(e.target.value)}
                className="flex-1 min-w-[180px] px-3 py-2 border border-[#ccc] rounded-[4px] text-sm"
              />
              <button
                onClick={adicionarMembro}
                disabled={adicionando || !novoEmail.includes('@') || cheia}
                className={cn(
                  "px-3 py-2 rounded-[4px] text-xs font-bold border-none cursor-pointer flex items-center gap-1",
                  adicionando || !novoEmail.includes('@') || cheia
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <UserPlus size={14} /> {adicionando ? 'Adicionando…' : 'Adicionar'}
              </button>
            </div>
            {cheia && (
              <p className="text-xs text-red-600 mt-2">Time cheio. Aumente as vagas acima para adicionar mais.</p>
            )}
          </div>

          {/* Lista de membros + convites */}
          <div className="bg-white border border-[#ccc] rounded-[4px]">
            <div className="px-3 py-2 border-b border-[#eee] flex items-center gap-2">
              <Users size={14} className="text-blue-600" />
              <p className="text-[10px] font-bold uppercase text-gray-700 m-0">
                Membros do time ({total})
              </p>
            </div>
            {total === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">Nenhum aluno no time ainda.</p>
            ) : (
              <div className="divide-y divide-[#eee]">
                {membros.map(m => (
                  <div key={m.uid} className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">
                      {((m.nome || m.email)[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 m-0 truncate">{m.nome || m.email.split('@')[0]}</p>
                      <p className="text-[11px] text-gray-500 m-0 truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      {m.creditoIA.usado}/{m.creditoIA.limite} tokens
                    </span>
                    <button
                      onClick={() => onSendEmail(m)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 border-none bg-transparent cursor-pointer"
                      title="Enviar e-mail"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      onClick={() => removerMembro(m)}
                      className="p-1.5 text-gray-400 hover:text-red-600 border-none bg-transparent cursor-pointer"
                      title="Remover do time"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {invitesPendentes.map(inv => (
                  <div key={inv.email} className="p-3 flex items-center gap-3 bg-yellow-50/50">
                    <div className="w-8 h-8 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center font-bold shrink-0 text-xs">
                      <Mail size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 m-0 truncate">{inv.nome || inv.email.split('@')[0]}</p>
                      <p className="text-[11px] text-gray-500 m-0 truncate">{inv.email}</p>
                    </div>
                    <span className="text-[10px] text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 font-bold">
                      Convite pendente
                    </span>
                    <button
                      onClick={() => removerInvite(inv.email)}
                      className="p-1.5 text-gray-400 hover:text-red-600 border-none bg-transparent cursor-pointer"
                      title="Cancelar convite"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------ Modal de envio de email ------------ */

type TipoEmail = 'convite_gratuito' | 'convite_pago' | 'convite_coordenador' | 'time_coordenador';

const TIPO_EMAIL_OPCOES: { v: TipoEmail; label: string; descricao: string }[] = [
  // "convite_gratuito" foi removido daqui — agora o caminho oficial pra criar
  // aluno gratuito é o botão "+ Adicionar usuário" (cria conta + manda e-mail
  // com senha provisória direto via Admin SDK + SMTP).
  {
    v: 'convite_pago',
    label: 'Convite — Plano completo (link Hotmart)',
    descricao: 'Para quem você quer apresentar o plano completo e levar ao checkout da Hotmart.',
  },
  {
    v: 'convite_coordenador',
    label: 'Convite — Plano coordenador (link Hotmart)',
    descricao: 'Para empresas / líderes que querem gerenciar uma equipe. Link de compra na Hotmart.',
  },
  {
    v: 'time_coordenador',
    label: 'Aviso — Você foi adicionado ao time',
    descricao: 'Para o aluno que acabou de ser cadastrado pelo coordenador. Acesso já liberado.',
  },
];

function EmailModal({ destino, externo, onClose }: {
  destino: { email: string; nome?: string; empresaNome?: string };
  externo: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(destino.email || '');
  const [nome, setNome] = useState(destino.nome || '');
  const [tipoEmail, setTipoEmail] = useState<TipoEmail>('convite_pago');
  const [mensagemExtra, setMensagemExtra] = useState('');
  const [formacaoNome, setFormacaoNome] = useState('Yellow Belt LBW');
  const [aceitouMarketing, setAceitouMarketing] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<null | { ok: boolean; msg: string }>(null);

  async function enviar() {
    if (!email.includes('@')) {
      setResultado({ ok: false, msg: 'E-mail inválido.' });
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const resp = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          para: email.trim().toLowerCase(),
          nome: nome.trim(),
          empresa: destino.empresaNome || '',
          tipoEmail,
          mensagemExtra,
          appUrl: window.location.origin,
          // Campos extras usados pelo n8n no fluxo gratuito (paridade com a landing)
          formacaoNome: tipoEmail === 'convite_gratuito' ? formacaoNome.trim() : undefined,
          aceitouMarketing: tipoEmail === 'convite_gratuito' ? aceitouMarketing : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) setResultado({ ok: false, msg: data?.error || 'Falha ao enviar.' });
      else setResultado({ ok: true, msg: 'E-mail enviado com sucesso!' });
    } catch (err: any) {
      setResultado({ ok: false, msg: err?.message || 'Erro de conexão.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[4px] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#eee]">
          <h2 className="text-lg font-bold m-0 flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            {externo ? 'Enviar e-mail externo' : `Enviar e-mail para ${destino.email}`}
          </h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nome (opcional)</label>
              <input
                type="text"
                placeholder="Maria"
                value={nome}
                onChange={e => setNome(e.target.value)}
                disabled={!externo}
                className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">E-mail do destinatário</label>
              <input
                type="email"
                placeholder="pessoa@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!externo}
                className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Tipo de e-mail</label>
            <div className="space-y-2">
              {TIPO_EMAIL_OPCOES.map(opt => (
                <label
                  key={opt.v}
                  className={cn(
                    "flex items-start gap-2 p-3 border rounded-[4px] cursor-pointer transition-colors",
                    tipoEmail === opt.v
                      ? "bg-blue-50 border-blue-400"
                      : "border-[#ccc] hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="tipoEmail"
                    checked={tipoEmail === opt.v}
                    onChange={() => setTipoEmail(opt.v)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold block">{opt.label}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">{opt.descricao}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {tipoEmail === 'convite_gratuito' && (
            <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-[4px] p-3">
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Dados enviados ao n8n (mesmos campos da landing page)
              </p>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Curso / Formação</label>
                <input
                  type="text"
                  value={formacaoNome}
                  onChange={e => setFormacaoNome(e.target.value)}
                  placeholder="Ex: Yellow Belt LBW"
                  className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-sm bg-white"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Enviado como <span className="font-mono">formacaoNome</span> pro webhook.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceitouMarketing}
                  onChange={e => setAceitouMarketing(e.target.checked)}
                />
                <span className="text-sm text-gray-700">
                  Marcar <span className="font-mono">aceitouMarketing = true</span>
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Mensagem adicional (opcional)</label>
            <textarea
              rows={3}
              value={mensagemExtra}
              onChange={e => setMensagemExtra(e.target.value)}
              placeholder="Adicione um toque pessoal: contexto da indicação, próximos passos, etc."
              className="w-full px-3 py-2 border border-[#ccc] rounded-[4px] text-sm resize-vertical"
            />
          </div>

          {resultado && (
            <div className={cn(
              "p-3 rounded-[4px] text-sm border",
              resultado.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"
            )}>
              {resultado.msg}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#eee] flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-[4px] text-sm font-bold bg-white border border-[#ccc] cursor-pointer">
            {resultado?.ok ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            onClick={enviar}
            disabled={enviando || !email.includes('@')}
            className={cn(
              "px-4 py-2 rounded-[4px] text-sm font-bold border-none cursor-pointer flex items-center gap-2",
              enviando || !email.includes('@') ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Send size={14} /> {enviando ? 'Enviando…' : 'Enviar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
