/**
 * DefinirSenha — tela de troca OBRIGATÓRIA de senha no primeiro acesso.
 *
 * Aparece quando o doc do usuário tem `senhaProvisoria: true` (gravado pela
 * portinha /api/acesso/liberar ao criar a conta). Bloqueia o app até o aluno
 * criar a senha definitiva (digitada 2x).
 *
 * Ao salvar: updatePassword no Firebase Auth + marca senhaProvisoria:false no
 * doc do próprio usuário (regra Firestore permite update do dono).
 */

import React, { useState } from 'react';
import { updatePassword, signOut, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface DefinirSenhaProps {
  user: User;
  onConcluido: () => void;
}

export const DefinirSenha: React.FC<DefinirSenhaProps> = ({ user, onConcluido }) => {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }

    setLoading(true);
    try {
      // 1) Atualiza a senha no Firebase Auth
      await updatePassword(user, senha);
      // 2) Marca no Firestore que não é mais provisória
      await setDoc(doc(db, 'users', user.uid), { senhaProvisoria: false }, { merge: true });
      onConcluido();
    } catch (err: any) {
      console.error('[DefinirSenha] erro:', err);
      if (err?.code === 'auth/requires-recent-login') {
        // O Firebase exige login recente pra trocar senha. Como o aluno acabou
        // de logar, isso raramente ocorre; se ocorrer, peça pra entrar de novo.
        setErro('Por segurança, faça login novamente para criar sua senha.');
        setTimeout(() => signOut(auth), 2500);
      } else {
        setErro(err?.message || 'Erro ao salvar a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 420, width: '100%', padding: 32, borderRadius: 12, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="LBW" style={{ height: 46 }} />
        </div>
        <h2 style={{ textAlign: 'center', color: '#1E2D6E', margin: '0 0 6px 0', fontSize: 22 }}>Crie sua senha</h2>
        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, margin: '0 0 22px 0' }}>
          Este é o seu primeiro acesso. Defina uma senha pessoal para continuar.
        </p>

        <form onSubmit={handleSalvar} style={{ textAlign: 'left' }}>
          <label style={{ fontWeight: 'bold', fontSize: 14 }}>Nova senha</label>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoFocus
            style={{ width: '100%', padding: 12, margin: '8px 0 16px 0', border: '1px solid #ccc', borderRadius: 6 }}
          />

          <label style={{ fontWeight: 'bold', fontSize: 14 }}>Confirme a nova senha</label>
          <input
            type="password"
            placeholder="Digite a senha de novo"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            style={{ width: '100%', padding: 12, margin: '8px 0 16px 0', border: '1px solid #ccc', borderRadius: 6 }}
          />

          {erro && <p style={{ color: '#DC2626', fontSize: 14, margin: '0 0 14px 0' }}>{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 13, background: loading ? '#9CA3AF' : '#0033CC', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Salvando…' : 'Criar senha e entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 18 }}>
          Guarde sua senha. Você vai usá-la nos próximos acessos.
        </p>
      </div>
    </div>
  );
};
