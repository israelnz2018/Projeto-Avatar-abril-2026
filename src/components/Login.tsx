import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'primeiroAcesso'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', color: '' });

  // Primeiro Acesso states
  const [paEmail, setPaEmail] = useState('');
  const [paProvisoria, setPaProvisoria] = useState('');
  const [paNovaSenha, setPaNovaSenha] = useState('');
  const [paConfirmarSenha, setPaConfirmarSenha] = useState('');

  const tempoSpinnerLogin = 3000;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ text: '❌ Preencha todos os campos.', color: 'red' });
      return;
    }

    setMessage({ text: '🔄 Verificando...', color: '#444' });
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setMessage({ text: `✅ Bem-vindo, ${userCredential.user.email}!`, color: 'green' });
      
      localStorage.setItem('sessaoAtiva', 'true');
      localStorage.setItem('usuarioEmail', userCredential.user.email || '');
      localStorage.setItem('usuarioNome', userCredential.user.displayName || (userCredential.user.email?.split("@")[0] || ''));

      setTimeout(() => {
        onLogin(userCredential.user);
      }, tempoSpinnerLogin);
    } catch (error: any) {
      console.error("Erro no login:", error);
      setMessage({ text: "❌ Erro ao fazer login: " + error.message, color: 'red' });
      setLoading(false);
    }
  };

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paNovaSenha !== paConfirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    try {
      const resposta = await fetch("https://primary-production-1d53.up.railway.app/webhook/senhaprovisoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: paEmail, 
          senha_provisoria: paProvisoria, 
          nova_senha: paNovaSenha 
        })
      });

      const resultado = await resposta.json();

      if (resultado.sucesso === true) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, paEmail, paNovaSenha);
          
          localStorage.setItem('sessaoAtiva', 'true');
          localStorage.setItem('usuarioEmail', paEmail);
          localStorage.setItem('usuarioNome', paEmail.split("@")[0]);

          onLogin(userCredential.user);
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/email-already-in-use') {
            alert("Este e-mail já foi cadastrado. Tente fazer login normalmente ou use 'Esqueci minha senha'.");
          } else {
            alert("Erro ao criar usuário: " + firebaseError.message);
          }
        }
      } else {
        alert(resultado.mensagem || "Erro na troca de senha.");
      }
    } catch (error: any) {
      console.error(error);
      alert("Erro ao processar: " + error.message);
    }
  };

  const handleRecuperarSenha = () => {
    const emailPrompt = prompt("Digite seu e-mail para recuperar a senha:");
    if (!emailPrompt) return;

    sendPasswordResetEmail(auth, emailPrompt)
      .then(() => {
        alert("📧 Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
      })
      .catch((error: any) => {
        console.error("Erro ao enviar email de redefinição:", error);
        alert("❌ Erro ao enviar email de redefinição: " + error.message);
      });
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div id="login-box" style={{ maxWidth: '400px', width: '100%', margin: '60px auto', padding: '30px', borderRadius: '12px', backgroundColor: '#fdfdfd', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="Logo" style={{ height: '50px', width: 'auto' }} />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Learning by Working</span>
          </div>
        </div>

        <h2 style={{ marginBottom: '24px', color: '#333' }}>🔐 Acesso do Aluno</h2>

        {view === 'login' ? (
          <form id="loginSection" style={{ textAlign: 'left' }} onSubmit={handleLogin}>
            <label htmlFor="email-login" style={{ fontWeight: 'bold' }}>E-mail</label>
            <input 
              type="email" 
              id="email-login" 
              placeholder="Digite seu e-mail" 
              required 
              style={{ width: '100%', padding: '12px', margin: '8px 0 16px 0', border: '1px solid #ccc', borderRadius: '6px' }} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="senha-login" style={{ fontWeight: 'bold' }}>Senha</label>
            <input 
              type="password" 
              id="senha-login" 
              placeholder="Digite sua senha" 
              required 
              style={{ width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #ccc', borderRadius: '6px' }} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button 
              id="botao-login" 
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              Entrar
            </button>

            {loading && (
              <div id="spinner-login" style={{ marginTop: '20px', textAlign: 'center' }}>
                <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" alt="Carregando..." style={{ width: '80px', height: 'auto', margin: '0 auto' }} />
                <p style={{ fontSize: '14px', color: '#555' }}>Carregando, por favor aguarde...</p>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <button type="button" onClick={handleRecuperarSenha} style={{ color: '#007BFF', textDecoration: 'none', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Esqueci minha senha</button><br />
              <button type="button" onClick={() => setView('primeiroAcesso')} style={{ color: '#007BFF', textDecoration: 'none', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Primeiro acesso? Clique aqui</button>
            </div>

            <p id="mensagem-login" style={{ marginTop: '18px', fontSize: '15px', color: message.color }}>{message.text}</p>
          </form>
        ) : (
          <form id="primeiroAcesso" style={{ textAlign: 'left' }} onSubmit={handleTrocarSenha}>
            <h3 style={{ textAlign: 'center' }}>🔒 Primeiro Acesso</h3>
            <input 
              type="email" 
              placeholder="E-mail" 
              required 
              style={{ width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '6px' }} 
              value={paEmail}
              onChange={(e) => setPaEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Senha provisória" 
              required 
              style={{ width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '6px' }} 
              value={paProvisoria}
              onChange={(e) => setPaProvisoria(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Nova senha" 
              required 
              style={{ width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ccc', borderRadius: '6px' }} 
              value={paNovaSenha}
              onChange={(e) => setPaNovaSenha(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Confirme a nova senha" 
              required 
              style={{ width: '100%', padding: '12px', margin: '8px 0 16px 0', border: '1px solid #ccc', borderRadius: '6px' }} 
              value={paConfirmarSenha}
              onChange={(e) => setPaConfirmarSenha(e.target.value)}
            />

            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>Trocar Senha</button>

            <div style={{ marginTop: '16px' }}>
              <button type="button" onClick={() => setView('login')} style={{ color: '#007BFF', textDecoration: 'none', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Voltar ao Login</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
