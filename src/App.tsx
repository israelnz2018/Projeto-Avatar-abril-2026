import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  ClipboardList, 
  GraduationCap, 
  BookOpen,
  Video,
  Menu, 
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Settings,
  Sparkles
} from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Login } from './components/Login';
import { cn } from './lib/utils';

// Components
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import DataAnalysis from './components/DataAnalysis';
import ProjectManagement from './components/ProjectManagement';
import LearningView from './components/LearningView';
import KnowledgeManagerView from './components/KnowledgeManagerView';
import ProjectToolsConfig from './components/ProjectToolsConfig';
import ToolCreator from './components/ToolCreator';
import UserProfile, { getUserProfile } from './components/UserProfile';

function Layout({ children, user, onLogout }: { children: React.ReactNode, user: User | null, onLogout: () => void }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const adminEmails = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];
  const isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase().trim()) : false;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projetos', path: '/projects', icon: ClipboardList },
    { name: 'Data & Analysis', path: '/analysis', icon: Database },
    { name: 'AI Assistant', path: '/chat', icon: MessageSquare },
    { name: 'Educação', path: '/education', icon: GraduationCap },
    { name: 'Base de Conhecimento', path: '/learning', icon: BookOpen },
    ...(isAdmin ? [
      { name: 'Ferramentas por Projeto', path: '/config', icon: Settings },
      { name: 'Criar Nova Ferramenta', path: '/tool-creator', icon: Sparkles }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#1f2937] text-white transition-all duration-300 flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <img src="https://i.postimg.cc/7PgJFtZK/logo-LBW.png" alt="Logo" className="h-8 w-auto" />
              <span className="font-bold text-lg">LBW Copilot</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-700 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                location.pathname === item.path ? "bg-blue-600 text-white" : "hover:bg-gray-700 text-gray-300"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className={cn("flex items-center gap-3 p-3", !isSidebarOpen && "justify-center")}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase">
                  {user?.email?.toLowerCase() === 'israelnz2018@hotmail.com' ? 'Administrador' : 'Aluno'}
                </p>
                <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                  <LogOut size={12} /> Sair
                </button>
                <Link
                  to="/profile"
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mt-1"
                >
                  <UserIcon size={12} /> Meu Perfil
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

const ProfileView = () => {
  const navigate = useNavigate();
  return <UserProfile onClose={() => navigate('/')} />;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const inatividadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const deslogar = useCallback(() => {
    if (window.confirm("⚠️ Já vai nos deixar? So aperte OK depois de ter salvo suas análises e gráficos.")) {
      signOut(auth).then(() => {
        localStorage.removeItem('sessaoAtiva');
        localStorage.removeItem('usuarioEmail');
        localStorage.removeItem('usuarioNome');
        setUser(null);
      }).catch((error) => console.error("Erro ao deslogar:", error));
    }
  }, []);

  const resetarTimer = useCallback(() => {
    if (!user) return;
    if (inatividadeTimerRef.current) clearTimeout(inatividadeTimerRef.current);
    
    inatividadeTimerRef.current = setTimeout(() => {
      signOut(auth).then(() => {
        localStorage.removeItem('sessaoAtiva');
        localStorage.removeItem('usuarioEmail');
        localStorage.removeItem('usuarioNome');
        setUser(null);
        alert("⏱ Sessão expirada por inatividade.");
      });
    }, 60 * 60 * 1000); // 1 hora
  }, [user]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const mensagem = "⚠️ Salve suas análises e gráficos agora, pois serão perdidos ao sair!";
      e.preventDefault();
      e.returnValue = mensagem;
      return mensagem;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        localStorage.setItem('sessaoAtiva', 'true');
        localStorage.setItem('usuarioEmail', currentUser.email || '');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const events = ['mousemove', 'keydown', 'scroll', 'click'];
      const reset = () => resetarTimer();
      events.forEach(evt => document.addEventListener(evt, reset));
      resetarTimer(); // Inicia o timer

      return () => {
        events.forEach(evt => document.removeEventListener(evt, reset));
        if (inatividadeTimerRef.current) clearTimeout(inatividadeTimerRef.current);
      };
    }
  }, [user, resetarTimer]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" alt="Carregando..." className="w-20 mx-auto mb-4" />
          <p className="text-gray-600">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <Router>
        <Layout user={user} onLogout={deslogar}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<ChatAssistant />} />
            <Route path="/analysis" element={<DataAnalysis />} />
            <Route path="/projects" element={<ProjectManagement />} />
            <Route path="/learning" element={<KnowledgeManagerView />} />
            <Route path="/education" element={<LearningView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/config" element={<ProjectToolsConfig />} />
            <Route path="/tool-creator" element={<ToolCreator />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}
