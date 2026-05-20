import React, { useEffect, useState } from 'react';
import { X, Loader2, UserPlus, Save, Copy, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserData, TipoUsuario, Plano } from '../services/userService';
import { adminCreateUser, adminUpdateUser } from '../services/adminUserService';

export type AdminUserModalMode = 'create' | 'edit';

interface AdminUserModalProps {
  isOpen: boolean;
  mode: AdminUserModalMode;
  user?: UserData;
  onClose: () => void;
  onSaved: () => void;
}

const PLANOS: Plano[] = ['gratuito', 'completo', 'coordenador'];
const TIPOS: TipoUsuario[] = ['aluno', 'coordenador', 'admin'];

const FORMACOES_DEFAULT = [
  'projetos-melhoria-introdutoria',
  'lean-six-sigma-yellow',
  'lean-six-sigma-green',
  'lean-six-sigma-black',
  'pmi-fundamentos',
];

export default function AdminUserModal({ isOpen, mode, user, onClose, onSaved }: AdminUserModalProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('aluno');
  const [plano, setPlano] = useState<Plano>('gratuito');
  const [formacoesText, setFormacoesText] = useState('projetos-melhoria-introdutoria');
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [maxAlunos, setMaxAlunos] = useState<number | ''>('');
  const [limite, setLimite] = useState<number | ''>(100);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [senhaProvisoria, setSenhaProvisoria] = useState<string | null>(null);
  const [emailEnviado, setEmailEnviado] = useState<boolean>(false);
  const [copiada, setCopiada] = useState(false);

  // Preenche o form com dados do user (modo edit) ou limpa (modo create)
  useEffect(() => {
    if (!isOpen) return;
    setErro(null);
    setSenhaProvisoria(null);
    setEmailEnviado(false);
    setCopiada(false);
    if (mode === 'edit' && user) {
      setNome(user.nome || '');
      setEmail(user.email);
      setTipoUsuario(user.tipoUsuario);
      setPlano((user.plano as Plano) || 'gratuito');
      setFormacoesText((user.formacoes || []).join('\n'));
      setEmpresaId(user.empresaId || '');
      setEmpresaNome(user.empresaNome || '');
      setMaxAlunos(user.maxAlunos ?? '');
      setLimite(user.creditoIA?.limite ?? 100);
    } else {
      setNome('');
      setEmail('');
      setTipoUsuario('aluno');
      setPlano('gratuito');
      setFormacoesText('projetos-melhoria-introdutoria');
      setEmpresaId('');
      setEmpresaNome('');
      setMaxAlunos('');
      setLimite(100);
    }
  }, [isOpen, mode, user]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (mode === 'create' && (!email.trim() || !email.includes('@'))) {
      setErro('E-mail inválido.');
      return;
    }
    setSaving(true);
    setErro(null);
    const formacoes = formacoesText.split('\n').map(s => s.trim()).filter(Boolean);
    try {
      if (mode === 'create') {
        const result = await adminCreateUser({
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          tipoUsuario: tipoUsuario === 'coordenador' ? 'coordenador' : 'aluno',
          plano,
          formacoes,
          empresaId: empresaId.trim() || undefined,
          empresaNome: empresaNome.trim() || undefined,
          maxAlunos: typeof maxAlunos === 'number' ? maxAlunos : undefined,
        });
        setSenhaProvisoria(result.senhaProvisoria);
        setEmailEnviado(!!result.emailEnviado);
        onSaved();
      } else if (user) {
        await adminUpdateUser(user.uid, {
          nome: nome.trim(),
          tipoUsuario,
          plano,
          formacoes,
          empresaId: empresaId.trim() || undefined,
          empresaNome: empresaNome.trim() || undefined,
          maxAlunos: typeof maxAlunos === 'number' ? maxAlunos : undefined,
          creditoIA: {
            ...user.creditoIA,
            limite: typeof limite === 'number' ? limite : 100,
          },
        });
        onSaved();
        onClose();
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro desconhecido.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold m-0 flex items-center gap-2">
              <UserPlus size={20} className="text-blue-600" />
              {mode === 'create' ? 'Adicionar novo usuário' : 'Editar usuário'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer text-gray-500">
              <X size={18} />
            </button>
          </div>

          {/* Senha provisória + status do email (após criar) */}
          {senhaProvisoria && (
            <div className="p-5 bg-green-50 border-b border-green-200">
              <div className="flex items-center gap-2 text-green-800 font-bold text-sm mb-2">
                <CheckCircle2 size={16} />
                Usuário criado com sucesso!
              </div>

              {/* Status do email */}
              {emailEnviado ? (
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3">
                  <Mail size={14} />
                  <span>E-mail com a senha foi enviado pro aluno automaticamente.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>E-mail não foi enviado</strong> (SMTP não configurado ou falhou). Copie a senha abaixo e envie manualmente.
                  </span>
                </div>
              )}

              <p className="text-xs text-green-700 mb-2">
                <strong>Senha provisória (backup):</strong> copie agora — esta janela não vai mostrar de novo.
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 font-mono text-sm">
                  {senhaProvisoria}
                </code>
                <button
                  onClick={() => copyToClipboard(senhaProvisoria)}
                  className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer border-none hover:bg-green-700"
                >
                  {copiada ? <><CheckCircle2 size={12}/> Copiado</> : <><Copy size={12}/> Copiar</>}
                </button>
              </div>
              <button
                onClick={onClose}
                className="mt-3 text-xs text-green-700 font-bold underline cursor-pointer bg-transparent border-none"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Form */}
          {!senhaProvisoria && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">Nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Maria Silva"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    E-mail {mode === 'edit' && <span className="text-gray-400 normal-case font-normal">(não editável)</span>}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={mode === 'edit'}
                    placeholder="maria@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">Tipo de usuário</label>
                  <select
                    value={tipoUsuario}
                    onChange={e => setTipoUsuario(e.target.value as TipoUsuario)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {mode === 'create' && tipoUsuario === 'admin' && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      ⚠️ Servidor só aceita criar como aluno ou coordenador. Admin = email na whitelist do código.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">Plano</label>
                  <select
                    value={plano}
                    onChange={e => setPlano(e.target.value as Plano)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                  >
                    {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                  Formações <span className="text-gray-400 normal-case font-normal">(uma por linha)</span>
                </label>
                <textarea
                  rows={4}
                  value={formacoesText}
                  onChange={e => setFormacoesText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                  placeholder={'projetos-melhoria-introdutoria\nlean-six-sigma-yellow'}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Sugestões: {FORMACOES_DEFAULT.map(f => <code key={f} className="bg-gray-100 px-1 rounded mx-0.5">{f}</code>)}
                </p>
              </div>

              {(tipoUsuario === 'coordenador' || plano === 'coordenador' || empresaId) && (
                <div className="grid md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase block mb-1">Empresa ID</label>
                    <input
                      type="text"
                      value={empresaId}
                      onChange={e => setEmpresaId(e.target.value)}
                      placeholder="empresa-x"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase block mb-1">Empresa Nome</label>
                    <input
                      type="text"
                      value={empresaNome}
                      onChange={e => setEmpresaNome(e.target.value)}
                      placeholder="Empresa X"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase block mb-1">Max Alunos</label>
                    <input
                      type="number"
                      value={maxAlunos}
                      onChange={e => setMaxAlunos(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      placeholder="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              )}

              {mode === 'edit' && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 uppercase block mb-1">
                    Limite de tokens IA <span className="text-gray-400 normal-case font-normal">(mensal)</span>
                  </label>
                  <input
                    type="number"
                    value={limite}
                    onChange={e => setLimite(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="100"
                    className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {erro && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!senhaProvisoria && (
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={onClose} disabled={saving}
                className="px-4 py-2 rounded text-sm font-bold bg-white border border-gray-300 cursor-pointer disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className={cn(
                  'px-4 py-2 rounded text-sm font-bold border-none cursor-pointer flex items-center gap-2',
                  saving ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                )}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : (mode === 'create' ? <UserPlus size={14} /> : <Save size={14} />)}
                {saving ? 'Salvando…' : (mode === 'create' ? 'Criar usuário' : 'Salvar alterações')}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
