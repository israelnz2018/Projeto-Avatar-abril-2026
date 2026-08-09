import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
  Users,
  Key,
  Unlock,
  Megaphone,
  Award,
  FolderCheck,
  Palette,
  Store,
  Shield,
  Wallet,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Login } from './components/Login';
import { cn } from './lib/utils';

// Imports eager: rotas iniciais críticas (sempre aparecem rápido) + UserProfile
// (tem export nominal `getUserProfile` usado em 4 outros arquivos)
import UserProfile, { getUserProfile } from './components/UserProfile';
import JornadaPrincipal from './components/JornadaPrincipal';

// Code splitting: rotas secundárias e telas admin viram chunks separados —
// o usuário só baixa o JS daquela tela quando navega pra ela.
// Reduz drasticamente o bundle inicial (era 10.5 MB, ~3 MB gzipped antes).
const Dashboard = lazy(() => import('./components/Dashboard'));
const ChatAssistant = lazy(() => import('./components/ChatAssistant'));
const DataAnalysis = lazy(() => import('./components/DataAnalysis'));
const ProjectManagement = lazy(() => import('./components/ProjectManagement'));
const LearningView = lazy(() => import('./components/LearningView'));
const RecursosView = lazy(() => import('./components/RecursosView'));
const Comunidade = lazy(() => import('./components/Comunidade'));
const KnowledgeManagerView = lazy(() => import('./components/KnowledgeManagerView'));
const ProjectToolsConfig = lazy(() => import('./components/ProjectToolsConfig'));
const UserManagementView = lazy(() => import('./components/UserManagementView'));
const MarketingView = lazy(() => import('./components/MarketingView'));
const CertificadosView = lazy(() => import('./components/CertificadosView'));
const AvaliacaoView = lazy(() => import('./components/AvaliacaoView'));
const AvaliacaoAdminView = lazy(() => import('./components/AvaliacaoAdminView'));
const OpinioesAdminView = lazy(() => import('./components/OpinioesAdminView'));
const ApiSettingsView = lazy(() => import('./components/ApiSettingsView'));
const CertificatePage = lazy(() => import('./components/CertificatePage').then(m => ({ default: m.CertificatePage })));
const VerificarPage = lazy(() => import('./components/CertificatePage').then(m => ({ default: m.VerificarPage })));
const LandingFormacao = lazy(() => import('./components/LandingFormacao'));
const LandingComecar = lazy(() => import('./components/LandingComecar'));
const LandingConsultores = lazy(() => import('./components/LandingConsultores'));
const LandingInstitucional = lazy(() => import('./components/LandingInstitucional'));
const CoordenadorEquipe = lazy(() => import('./components/dashboard/CoordenadorEquipe'));
const CoordenadorReport = lazy(() => import('./components/dashboard/CoordenadorReport'));
const MarcaDoTime = lazy(() => import('./components/consultor/MarcaDoTime'));
const RepassesView = lazy(() => import('./components/RepassesView'));
const MinhaMarca = lazy(() => import('./components/consultor/MinhaMarca'));
const MeusAlunos = lazy(() => import('./components/consultor/MeusAlunos'));
const SuperRelatorio = lazy(() => import('./components/consultor/SuperRelatorio'));
const MinhaVitrine = lazy(() => import('./components/consultor/MinhaVitrine'));
const VitrinePublica = lazy(() => import('./components/VitrinePublica'));
const MeusCoordenadores = lazy(() => import('./components/consultor/MeusCoordenadores'));
const ConfiguracaoConsultor = lazy(() => import('./components/consultor/ConfiguracaoConsultor'));
const AdminConsultores = lazy(() => import('./components/AdminConsultores'));
import { ensureUserDocument, getUserData } from './services/userService';
import { useUserAccess } from './hooks/useUserAccess';
import { HOTMART_CHECKOUT_URL } from './lib/constants';
import { DefinirSenha } from './components/DefinirSenha';
import MenuTour from './components/MenuTour';

import { useProject } from './contexts/ProjectContext';
function Layout({ children, user, onLogout }: { children: React.ReactNode, user: User | null, onLogout: () => void }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [avisoBloqueio, setAvisoBloqueio] = useState<{ titulo?: string; mensagem?: string; consultorNome?: string; expiraEm?: string } | null>(null);
  const { projetoAtivo } = useProject();
  const { tipoUsuario, plano, siglaPpt, pptFonte, pptCores, empresaId } = useUserAccess();
  const { consultor } = useConsultor();
  // Em site de consultor (israel.…), o dono só vê o papel de CONSULTOR — nunca o admin.
  // O admin (super-admin LBW) vive no hub (app.…). Ver PLANO-WHITELABEL.md.
  const siteConsultor = isSiteConsultor();

  // Tour da plataforma (percorre o menu lateral). Só abre pelo botão no menu OU
  // por um evento global (botão na aba Projetos dispara 'lbw-open-menu-tour').
  const [menuTourOpen, setMenuTourOpen] = useState(false);
  useEffect(() => {
    const abrir = () => setMenuTourOpen(true);
    window.addEventListener('lbw-open-menu-tour', abrir);
    return () => window.removeEventListener('lbw-open-menu-tour', abrir);
  }, []);

  // O tour é montado global (fora das rotas). Sem isto, ele ficava aberto ao
  // navegar pra outra aba e o overlay escuro cobria a tela inteira (parecia
  // "modo escuro" travado). Ao trocar de rota, fecha o tour.
  useEffect(() => {
    setMenuTourOpen(false);
  }, [location.pathname]);

  const adminEmails = ['israelnz2018@hotmail.com', 'israel@learningbyworking.com'];
  const isAdmin = tipoUsuario === 'admin' || (user?.email ? adminEmails.includes(user.email.toLowerCase().trim()) : false);
  const isCoordenador = tipoUsuario === 'coordenador';
  const isConsultor = tipoUsuario === 'consultor';

  useEffect(() => {
    let ativo = true;
    if (!user?.uid) {
      setAvisoBloqueio(null);
      return;
    }
    getUserData(user.uid)
      .then((dados: any) => {
        if (!ativo) return;
        const aviso = dados?.avisoBloqueio;
        setAvisoBloqueio(aviso?.tipo === 'acesso_bloqueado' ? aviso : null);
      })
      .catch(() => {
        if (ativo) setAvisoBloqueio(null);
      });
    return () => { ativo = false; };
  }, [user?.uid]);

  // Marca + cores dos PPTs (white-label). A marca do TIME (coordenador que escolheu
  // "meu próprio PPT") sobrepõe a do consultor — tanto pro coordenador quanto pros
  // alunos do time dele (resolvido em useUserAccess). Só o Layout tem consultor +
  // papel do usuário juntos, então é o único lugar que aplica os dois.
  useEffect(() => {
    const marcaConsultor = consultor.branding.sigla || (consultor.branding.nome || '').split(' ')[0] || 'LBW';
    const usaTime = pptFonte === 'proprio';
    setSlideBrand(usaTime && siglaPpt ? siglaPpt : marcaConsultor);
    setSlideColors(usaTime && pptCores ? pptCores : consultor.branding.cores);
  }, [consultor, pptFonte, siglaPpt, pptCores]);

  const roleLabel = (siteConsultor && (isAdmin || isConsultor))
    ? 'Consultor'
    : isAdmin
    ? 'Administrador'
    : isCoordenador
    ? 'Coordenador'
    : plano === 'completo'
    ? 'Aluno · Completo'
    : 'Starter';

  // Avatar: foto do consultor (se houver) no lugar das iniciais.
  const avatarEl = consultor.branding.fotoUrl
    ? <img src={consultor.branding.fotoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
    : <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">{user?.email?.[0].toUpperCase()}</div>;

  // Hub do admin (app.…): o super-admin LBW logado FORA de um site de consultor.
  // Aqui o menu é PURO de gestão de plataforma — sem curso/projeto (isso é do consultor).
  const ehAdminHub = isAdmin && !siteConsultor;
  const menuItems = [
    // Experiência de aluno/consultor (curso, projeto, comunidades do consultor/coordenador).
    // Escondida no hub do admin — o admin não tem curso nem projeto.
    ...(ehAdminHub ? [
      // Projetos, Data & Analysis e Educação ficam visíveis TAMBÉM no hub do admin:
      // o Israel usa essas abas direto por aqui, como consultor #0.
      { name: 'Projetos', path: '/projects', icon: ClipboardList },
      { name: 'Data & Analysis', path: '/analysis', icon: Database },
      { name: 'Educação', path: '/education', icon: GraduationCap },
    ] : [
      { name: 'Projetos', path: '/projects', icon: ClipboardList },
      { name: 'Data & Analysis', path: '/analysis', icon: Database },
      { name: 'Educação', path: '/education', icon: GraduationCap },
      { name: 'Material de Apoio', path: '/recursos', icon: FolderCheck },
      { name: 'Avaliação e Certificado', path: '/avaliacao', icon: Award },
    ]),
    // AI Assistant — EXCEÇÃO ÚNICA: só o Israel como CONSULTOR (no israel.…) usa.
    // Não aparece no hub do admin nem pra outros consultores/coordenadores/alunos.
    ...(siteConsultor && isAdmin ? [{ name: 'AI Assistant', path: '/chat', icon: MessageSquare }] : []),
    // Comunidade ADM: admin + consultor (vale no hub e no site do consultor).
    ...(isAdmin || isConsultor ? [{ name: 'Comunidade ADM', path: '/comunidade-adm', icon: Shield }] : []),
    // Comunidade por time — escondida no hub do admin. Um único tipo de comunidade,
    // sempre isolada por time (coordenador OU "alunos diretos"); nunca um feed geral
    // misturando públicos diferentes — nem pro Israel como consultor.
    ...(ehAdminHub ? [] : [
      ...(isAdmin || isConsultor || isCoordenador || !!empresaId ? [{ name: 'Comunidade do Coordenador', path: '/comunidade-coordenador', icon: Users }] : []),
    ]),
    // Papel CONSULTOR — UMA aba "Configuração" que agrupa a gestão dele (abas horizontais dentro).
    ...(siteConsultor && (isAdmin || isConsultor) ? [
      { name: 'Configuração', path: '/configuracao', icon: Settings },
    ] : []),
    ...(isCoordenador ? [
      { name: 'Minha Equipe', path: '/equipe', icon: LayoutDashboard },
      { name: 'Report do Time', path: '/report-time', icon: TrendingUp },
      { name: 'Marca do Time', path: '/marca-time', icon: Palette },
    ] : []),
    // Papel ADMIN (super-admin LBW) — só no hub (app.…). Gestão de plataforma pura.
    // Ferramentas: nível plataforma (o admin cria/melhora as ferramentas-base que os
    // consultores usam). Fases/projetos são do consultor — simplificação da tela vem depois.
    ...(ehAdminHub ? [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Consultores', path: '/admin-consultores', icon: Store },
      { name: 'Repasses', path: '/repasses', icon: Wallet },
      { name: 'Gestão de Usuários', path: '/users', icon: Users },
      { name: 'Marketing', path: '/marketing', icon: Megaphone },
      { name: 'Opiniões dos Clientes', path: '/opinioes', icon: MessageSquare },
      { name: 'Ferramentas', path: '/config', icon: Settings },
      { name: 'APIs & Consumo', path: '/api-settings', icon: Key },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#1f2937] text-white transition-all duration-300 flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-start justify-between gap-2 border-b border-gray-700">
          {isSidebarOpen && (
            <Link to="/" className="flex flex-col items-center gap-2 flex-1 min-w-0 no-underline" title="Ir para a página principal">
              <img src={consultor.branding.logoUrl || CONSULTOR_PADRAO.branding.logoUrl} alt="Logo" className="h-10 w-auto" />
              <span className="font-bold text-sm whitespace-nowrap text-center text-white">Educação pelo Trabalho</span>
            </Link>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-700 rounded shrink-0">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Bloco do usuário — logo abaixo da logo, acima do Projeto Ativo */}
        <div className="p-4 border-b border-gray-700">
          <div className={cn("flex items-center justify-between gap-2", !isSidebarOpen && "justify-center")}>
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {avatarEl}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">
                      {roleLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to="/profile" title="Meu Perfil">
                    <UserIcon size={16} className="text-gray-400 hover:text-white transition-colors" />
                  </Link>
                  <button
                    onClick={onLogout}
                    title="Sair"
                    className="border-none bg-transparent cursor-pointer p-0 flex items-center"
                  >
                    <LogOut size={16} className="text-gray-400 hover:text-white transition-colors" />
                  </button>
                </div>
              </>
            ) : (
              avatarEl
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <span>📁</span>
              <span>Projeto Ativo:</span>
            </div>
            {projetoAtivo ? (
              <p className="text-sm font-bold text-white truncate" title={projetoAtivo.name}>
                {projetoAtivo.name}
              </p>
            ) : (
              <p className="text-sm italic text-gray-500">
                Nenhum projeto selecionado
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              data-tour-id={`menu-${item.path}`}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                location.pathname === item.path ? "bg-blue-600 text-white" : "hover:bg-gray-700 text-gray-300"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && (
                <span className="flex items-center gap-1.5">
                  {item.name}
                  {(item as any).beta && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-amber-900 bg-amber-300 rounded px-1.5 py-0.5">beta</span>
                  )}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Rodapé: CTA de compra — só para aluno gratuito */}
        {!isAdmin && !isCoordenador && plano !== 'completo' && (
          <div className="p-3 border-t border-gray-700">
            <a
              href={HOTMART_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Liberar tudo — Plano Completo"
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 rounded-lg text-white text-[11px] font-black uppercase tracking-widest transition-all hover:brightness-110 no-underline",
                isSidebarOpen ? "px-4 py-2.5" : "p-2.5"
              )}
              style={{ background: 'linear-gradient(135deg, #1E2D6E 0%, #0033CC 100%)' }}
            >
              <Unlock size={15} className="shrink-0" />
              {isSidebarOpen && <span>Liberar tudo</span>}
            </a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {avisoBloqueio && !isAdmin && !isConsultor && !isCoordenador && (
            <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-950 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} className="mt-0.5 shrink-0 text-orange-600" />
                <div>
                  <h2 className="text-base font-black">{avisoBloqueio.titulo || 'Seu acesso foi bloqueado'}</h2>
                  <p className="mt-1 text-sm leading-relaxed">
                    {avisoBloqueio.mensagem || 'Voce perdeu o acesso aos conteudos deste consultor, mas seus dados e projetos ficarao disponiveis por ate 3 meses.'}
                  </p>
                  {avisoBloqueio.consultorNome && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-orange-700">
                      Consultor: {avisoBloqueio.consultorNome}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Tour da plataforma (percorre o menu lateral) */}
      <MenuTour isOpen={menuTourOpen} onClose={() => setMenuTourOpen(false)} />
    </div>
  );
}

import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProjectProvider } from './contexts/ProjectContext';
import { ConsultorProvider, useConsultor } from './contexts/ConsultorContext';
import { isSiteConsultor, CONSULTOR_PADRAO } from './services/consultorService';
import { setSlideBrand, setSlideColors } from './services/slideTemplate';

const ProfileView = () => {
  const navigate = useNavigate();
  return <UserProfile onClose={() => navigate('/')} />;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // true = conta nova com senha provisória → força criar senha no 1º acesso
  const [precisaDefinirSenha, setPrecisaDefinirSenha] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const inatividadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pedirConfirmacaoLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const confirmarLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    try {
      await signOut(auth);
      localStorage.removeItem('sessaoAtiva');
      localStorage.removeItem('usuarioEmail');
      localStorage.removeItem('usuarioNome');
      setUser(null);
    } catch (error) {
      console.error('[Logout] Erro:', error);
      alert('Erro ao deslogar. Tente novamente.');
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          await ensureUserDocument(currentUser);
        } catch (err) {
          console.error('Erro ao garantir documento do usuário:', err);
        }
        // Conta nova com senha provisória → forçar criação de senha no 1º acesso
        try {
          const dados = await getUserData(currentUser.uid) as any;
          setPrecisaDefinirSenha(dados?.senhaProvisoria === true);
        } catch {
          setPrecisaDefinirSenha(false);
        }
        localStorage.setItem('sessaoAtiva', 'true');
        localStorage.setItem('usuarioEmail', currentUser.email || '');
      } else {
        setPrecisaDefinirSenha(false);
      }
      setUser(currentUser);
      setLoading(false);
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

  // Rotas/domínio PÚBLICOS (landings, verificação, institucionais) não exigem login —
  // então NÃO devem esperar o loading do Firebase nem mostrar o gatinho de "carregando app".
  // Detecta isso ANTES do if(loading) pra o gatinho ficar só no app real.
  const ehRotaPublica = (() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    const path = window.location.pathname;
    const isSitePublico = host === 'educacaopelotrabalho.com' || host === 'www.educacaopelotrabalho.com';
    const rotasPublicas = ['/formacao', '/vitrine', '/kit90dias', '/consultores', '/verificar/', '/quem-somos', '/contato', '/pacotes-corporativos', '/termos', '/privacidade'];
    return isSitePublico || rotasPublicas.some(r => path.startsWith(r));
  })();

  if (loading && !ehRotaPublica) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" alt="Carregando..." className="w-20 mx-auto mb-4" />
          <p className="text-gray-600">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  // SITE PÚBLICO (vitrine) — bypass total do login.
  // O domínio SEM "app." (educacaopelotrabalho.com / www) mostra APENAS a Jornada,
  // sem login. O app de verdade fica em app.educacaopelotrabalho.com (inalterado).
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const path = window.location.pathname;
    const isSitePublico = host === 'educacaopelotrabalho.com' || host === 'www.educacaopelotrabalho.com';
    // As landings de venda/captação e a verificação de certificado têm prioridade
    // (são tratadas nos blocos abaixo). O site público só mostra a Jornada no resto.
    const ROTAS_INSTITUCIONAIS = ['/quem-somos', '/contato', '/pacotes-corporativos', '/termos', '/privacidade'];
    const rotaReservada = path.startsWith('/formacao') || path.startsWith('/kit90dias') || path.startsWith('/consultores') || path.startsWith('/trilhagratis') || path.startsWith('/verificar/') || ROTAS_INSTITUCIONAIS.some(r => path.startsWith(r));
    if (isSitePublico && !rotaReservada) {
      return (
        <Router>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#070A18' }}><div className="w-10 h-10 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin" /></div>}>
            <Routes>
              <Route path="*" element={<JornadaPrincipal />} />
            </Routes>
          </Suspense>
        </Router>
      );
    }
  }

  // Rota PÚBLICA de verificação de certificado — bypass do login.
  // Recrutador/colega abre /verificar/{certId} sem precisar de conta.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/verificar/')) {
    return (
      <Router>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/verificar/:certId" element={<VerificarPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  // Rotas PÚBLICAS de landing — bypass do login (landings de venda/captação).
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/formacao')) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#070A18' }}><div className="w-10 h-10 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin" /></div>}>
        <LandingFormacao />
      </Suspense>
    );
  }
  // Redirect da URL antiga /trilhagratis (a Trilha 1 virou paga) para a página de
  // venda /kit90dias. Aproveita o tráfego de anúncios/links que ainda apontam pra ela.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/trilhagratis')) {
    window.location.replace('/kit90dias');
    return null;
  }
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/kit90dias')) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#070A18' }}><div className="w-10 h-10 border-4 border-emerald-900 border-t-emerald-500 rounded-full animate-spin" /></div>}>
        <LandingComecar />
      </Suspense>
    );
  }
  // Landing de captação de consultores parceiros — bypass do login.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/consultores')) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#070A18' }}><div className="w-10 h-10 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin" /></div>}>
        <LandingConsultores />
      </Suspense>
    );
  }
  // Páginas institucionais públicas (links do rodapé) — bypass do login.
  if (typeof window !== 'undefined' && ['/quem-somos', '/contato', '/pacotes-corporativos', '/termos', '/privacidade'].some(r => window.location.pathname.startsWith(r))) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#070A18' }}><div className="w-10 h-10 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin" /></div>}>
        <LandingInstitucional />
      </Suspense>
    );
  }

  // Vitrine pública de consultores — bypass do login (empresa externa navega sem conta).
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/vitrine')) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>}>
        <VitrinePublica />
      </Suspense>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  // Primeiro acesso (conta nova): obriga criar a senha antes de liberar o app.
  if (precisaDefinirSenha) {
    return <DefinirSenha user={user} onConcluido={() => setPrecisaDefinirSenha(false)} />;
  }

  return (
    <ErrorBoundary>
      <ConsultorProvider>
      <ProjectProvider>
        <Toaster position="top-right" richColors />
        <Router>
          <Layout user={user} onLogout={pedirConfirmacaoLogout}>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
                  <p className="text-gray-500 text-sm">Carregando…</p>
                </div>
              </div>
            }>
            <Routes>
              <Route path="/" element={<Navigate to="/education" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/equipe" element={<CoordenadorEquipe />} />
              <Route path="/report-time" element={<CoordenadorReport />} />
              <Route path="/marca-time" element={<MarcaDoTime />} />
              <Route path="/chat" element={<ChatAssistant />} />
              <Route path="/analysis" element={<DataAnalysis />} />
              <Route path="/projects" element={<ProjectManagement />} />
              <Route path="/learning" element={<KnowledgeManagerView />} />
              <Route path="/education" element={<LearningView />} />
              <Route path="/recursos" element={<RecursosView />} />
              <Route path="/comunidade" element={<Comunidade escopo="consultor" />} />
              <Route path="/comunidade-adm" element={<Comunidade escopo="rede" />} />
              <Route path="/comunidade-coordenador" element={<Comunidade escopo="time" />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/users" element={<UserManagementView />} />
              <Route path="/marketing" element={<MarketingView />} />
              <Route path="/certificados" element={<CertificadosView />} />
              <Route path="/avaliacao" element={<AvaliacaoView />} />
              <Route path="/avaliacao-admin" element={<AvaliacaoAdminView />} />
              <Route path="/opinioes" element={<OpinioesAdminView />} />
              <Route path="/config" element={<ProjectToolsConfig />} />
              <Route path="/api-settings" element={<ApiSettingsView />} />
              <Route path="/admin-consultores" element={<AdminConsultores />} />
              <Route path="/repasses" element={<RepassesView />} />
              <Route path="/marca" element={<MinhaMarca />} />
              <Route path="/meus-cursos" element={<KnowledgeManagerView />} />
              <Route path="/minhas-fases" element={<ProjectToolsConfig />} />
              <Route path="/meus-alunos" element={<MeusAlunos />} />
              <Route path="/super-relatorio" element={<SuperRelatorio />} />
              <Route path="/minha-vitrine" element={<MinhaVitrine />} />
              <Route path="/consultores" element={<VitrinePublica />} />
              <Route path="/meus-coordenadores" element={<MeusCoordenadores />} />
              <Route path="/configuracao" element={<ConfiguracaoConsultor />} />
              <Route path="/certificado/:initiativeId" element={<CertificatePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </Layout>
        </Router>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                    ⚠️
                  </div>
                  <h2 className="text-xl font-black text-gray-800">
                    Sair da plataforma?
                  </h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Antes de sair, certifique-se de que salvou suas análises e gráficos. Trabalhos não salvos serão perdidos.
                </p>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-5 py-2 text-sm font-black text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-xl"
                >
                  CANCELAR
                </button>
                <button
                  onClick={confirmarLogout}
                  className="px-5 py-2 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg"
                >
                  SAIR
                </button>
              </div>
            </div>
          </div>
        )}
      </ProjectProvider>
      </ConsultorProvider>
    </ErrorBoundary>
  );
}
