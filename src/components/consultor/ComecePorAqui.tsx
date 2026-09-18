/**
 * ComecePorAqui — checklist de onboarding do consultor. Cada item tem um texto
 * explicando o que fazer e um botão que leva direto pra tela certa. O check é
 * marcado manualmente pelo próprio consultor (não é detectado automaticamente).
 * O item "Comunidade" é diferente: edita e publica o texto de boas-vindas ali
 * mesmo, sem precisar navegar pra outro lugar.
 */
import { ehTipoDeProjeto } from '../../lib/tipoIniciativa';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { CheckCircle2, Circle, GraduationCap, PlayCircle, Rocket, Video } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getInitiatives } from '../../services/configService';
import { getQuiz } from '../../services/quizService';
import { CONSULTOR_ONBOARDING_STEPS, consultorOnboardingStepId, getAllKnowledge, INTRO_COURSE_CONSULTOR, type KnowledgeEntry } from '../../services/knowledgeService';

interface Item {
  id: string;
  titulo: string;
  texto: string;
  botao?: string;
  path?: string;
}

const LEGACY_ITENS: Item[] = [
  {
    id: 'boas-vindas',
    titulo: 'Boas-vindas ao Programa de Consultores LBW',
    texto: 'Assista ao vídeo de abertura para entender o programa, a sua jornada e as próximas etapas.',
  },
  {
    id: 'experiencia-aluno',
    titulo: 'Conheça a plataforma como aluno',
    texto: 'Use o curso gratuito para conhecer, na prática, a experiência que seus futuros alunos terão.',
  },
  {
    id: 'marca',
    titulo: 'Sua marca',
    texto: 'Coloque o nome, o texto da marca, a logo e os modelos de PPT da sua plataforma — é isso que os seus alunos veem no dia a dia.',
    botao: 'Configurar minha marca',
    path: '/configuracao?aba=marca',
  },
  {
    id: 'cursos',
    titulo: 'Seus cursos',
    texto: 'Cadastre pelo menos um curso. Sem curso, não dá pra criar projeto, nem liberar acesso pra ninguém.',
    botao: 'Ir para Meus Cursos',
    path: '/configuracao?aba=cursos',
  },
  {
    id: 'projetos',
    titulo: 'Crie seus projetos por curso',
    texto: 'Defina as fases e as ferramentas que ficarão disponíveis em cada tipo de projeto.',
    botao: 'Configurar projetos',
    path: '/configuracao?aba=fases',
  },
  {
    id: 'avaliacao-certificado',
    titulo: 'Configure a avaliação dos alunos e o certificado',
    texto: 'Crie as perguntas, alternativas e gabarito; depois configure o modelo de certificado que o aluno receberá.',
    botao: 'Configurar avaliação e certificado',
    path: '/configuracao?aba=prova',
  },
  {
    id: 'clientes-alunos',
    titulo: 'Cadastre clientes (empresas) e seus próprios alunos',
    texto: 'Adicione um coordenador, ou decida atender os alunos diretamente (sem coordenador) — depois adicione os alunos.',
    botao: 'Gerenciar clientes e alunos',
    path: '/configuracao?aba=coordenadores',
  },
  {
    id: 'comunidade',
    titulo: 'Crie sua própria comunidade',
    texto: 'Publique o texto de boas-vindas e prepare o espaço de conversa dos seus clientes.',
    botao: 'Ir para Comunidade',
    path: '/comunidade',
  },
  {
    id: 'outros-consultores',
    titulo: 'Interaja com outros consultores',
    texto: 'Participe da comunidade de consultores para trocar experiências, dúvidas e boas práticas.',
    botao: 'Abrir comunidade de consultores',
    path: '/comunidade-adm',
  },
  {
    id: 'melhorar-plataforma',
    titulo: 'Ajude a melhorar a plataforma',
    texto: 'Registre sugestões e pontos de melhoria a partir do uso real da sua plataforma.',
    botao: 'Enviar uma sugestão',
    path: '/comunidade-adm',
  },
  {
    id: 'termos-gerais',
    titulo: 'Termos de contrato e considerações gerais',
    texto: 'Leia os termos do Programa de Consultores LBW e confirme que entendeu as condições gerais.',
  },
];

// Refeito em 18/09/2026 junto com CONSULTOR_ONBOARDING_STEPS (knowledgeService.ts),
// para acompanhar 1:1 os 12 vídeos novos e os itens reais do menu do consultor de
// hoje (ver a lista de navegação em App.tsx). A etapa 1 fica sem vídeo por
// enquanto — é a de boas-vindas, ainda sendo gravada.
const ITENS: Item[] = [
  { id: 'boas-vindas', titulo: 'Boas-vindas ao Programa de Consultores LBW', texto: 'Assista ao vídeo de abertura para entender o programa, a sua jornada e as próximas etapas.' },
  { id: 'experiencia-aluno', titulo: 'Conheça a plataforma como o aluno vê', texto: 'Use o curso gratuito para conhecer, na prática, a experiência que seus futuros alunos terão.' },
  { id: 'perfil', titulo: 'Acesso à plataforma e meu perfil', texto: 'Veja como entrar na sua plataforma e configurar a sua foto, seus dados e os da sua empresa.', botao: 'Ir para Meu perfil', path: '/configuracao?aba=perfil' },
  { id: 'associar-ferramentas', titulo: 'Associar ferramentas e análises ao vídeo', texto: 'Em cada vídeo de curso, marque quais ferramentas e análises de dados aparecem sugeridas para o aluno.', botao: 'Ir para Meus Cursos', path: '/configuracao?aba=cursos' },
  { id: 'certificados', titulo: 'Configure os certificados', texto: 'Defina o modelo de certificado que o aluno recebe ao concluir um curso.', botao: 'Configurar certificados', path: '/configuracao?aba=certificados' },
  { id: 'comunicacao', titulo: 'Comunidade e considerações finais', texto: 'Publique o texto de boas-vindas da sua comunidade e participe do espaço de troca com outros consultores.', botao: 'Abrir comunidade', path: '/comunidade-adm' },
  { id: 'material-apoio', titulo: 'Material de apoio', texto: 'Envie os arquivos que ficam disponíveis para os seus alunos baixarem.', botao: 'Ir para Material de Apoio', path: '/configuracao?aba=materiais' },
  { id: 'clientes-alunos', titulo: 'Meus clientes', texto: 'Adicione empresas, coordenadores e alunos para organizar o atendimento.', botao: 'Gerenciar meus clientes', path: '/configuracao?aba=coordenadores&area=consultor' },
  { id: 'cursos', titulo: 'Meus cursos', texto: 'Cadastre pelo menos um curso. Sem curso, não dá para criar projeto nem liberar acesso para ninguém.', botao: 'Ir para Meus Cursos', path: '/configuracao?aba=cursos' },
  { id: 'papeis', titulo: 'Papéis e responsabilidades', texto: 'Entenda a diferença entre consultor, coordenador e aluno, e o que cada um pode fazer na plataforma.' },
  { id: 'marca', titulo: 'Modelo de PPT', texto: 'Envie a capa e a página interna dos slides exportados para os seus alunos.', botao: 'Configurar modelo de PPT', path: '/configuracao?aba=marca' },
  { id: 'projetos', titulo: 'Projetos, fases e ferramentas', texto: 'Defina as fases e as ferramentas que ficarão disponíveis em cada tipo de projeto.', botao: 'Configurar projetos', path: '/configuracao?aba=fases' },
  { id: 'relatorios', titulo: 'Relatórios', texto: 'Acompanhe o progresso dos seus alunos e o desempenho da sua plataforma.', botao: 'Ir para Relatórios', path: '/configuracao?aba=relatorio' },
  { id: 'avaliacao-certificado', titulo: 'Teste de avaliação', texto: 'Crie as perguntas, alternativas e gabarito da prova que libera o certificado do aluno.', botao: 'Configurar teste de avaliação', path: '/configuracao?aba=prova' },
];

export default function ComecePorAqui() {
  const navigate = useNavigate();
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();
  const [autoChecks, setAutoChecks] = useState<Record<string, boolean>>({});
  const [videosOrientacao, setVideosOrientacao] = useState<KnowledgeEntry[]>([]);
  const [nomesPlaylistChecklist, setNomesPlaylistChecklist] = useState<Record<string, string>>({});
  const [videoAberto, setVideoAberto] = useState<KnowledgeEntry | null>(null);
  const [videosAcessados, setVideosAcessados] = useState<Record<string, boolean>>({});
  const [liberandoCurso, setLiberandoCurso] = useState(false);
  const [erroCurso, setErroCurso] = useState('');
  const [cursoSolicitado, setCursoSolicitado] = useState(false);

  useEffect(() => {
    try {
      const salvos = window.localStorage.getItem(`consultor-onboarding-videos-${consultorId}`);
      setVideosAcessados(salvos ? JSON.parse(salvos) : {});
    } catch {
      setVideosAcessados({});
    }
  }, [consultorId]);

  useEffect(() => {
    let ativo = true;

    async function carregarChecksAutomaticos() {
      try {
        const [cursos, usersSnap] = await Promise.all([
          getInitiatives().catch(() => []),
          getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId))).catch(() => null),
        ]);

        const cursosComProjeto = cursos.filter(ehTipoDeProjeto);
        const fases = await Promise.all(
          cursosComProjeto.map((curso: any) =>
            getDocs(query(collection(db, 'initiative_configs'), where('initiativeId', '==', curso.id))).catch(() => null)
          )
        );
        const temFaseConfigurada = fases.some((snap) =>
          snap?.docs.some((d) => {
            const data = d.data() as any;
            return ((data.consultorId || 'israel') === consultorId) && Array.isArray(data.toolIds) && data.toolIds.length > 0;
          })
        );

        const usuarios = usersSnap?.docs.map((d) => d.data() as any) || [];
        const temClienteOuAluno = usuarios.some((u) => (
          u.tipoUsuario === 'coordenador' ||
          (u.tipoUsuario !== 'admin' && u.tipoUsuario !== 'consultor')
        ));
        const cursoNumero = (nome: string) => Number(String(nome || '').match(/\d+/)?.[0] || 0);
        const cursoChave = (curso: any, index: number) => {
          if (typeof curso?.ordem === 'number' && curso.ordem > 0) return curso.ordem;
          const numeroNoNome = cursoNumero(curso?.name || '');
          return numeroNoNome > 0 ? numeroNoNome : index + 1;
        };
        const quizzes = await Promise.all(
          cursos
            .map((curso: any, index: number) => cursoChave(curso, index))
            .filter((trilha: number) => trilha > 0)
            .map((trilha: number) => getQuiz(trilha, consultorId).catch(() => null))
        );
        const temProvaConfigurada = quizzes.some((quiz) =>
          Array.isArray(quiz?.questions) && quiz.questions.length > 0 && !!quiz.updatedAt
        );
        const certificado = consultor.certificado;
        const certificadoConfigurado = !!(
          certificado?.atualizadoEm ||
          certificado?.versao ||
          certificado?.fundoUrl ||
          certificado?.assinaturaUrl ||
          certificado?.instituicao ||
          certificado?.emissorNome ||
          certificado?.emissorCargo ||
          certificado?.textoRodape
        );

        if (!ativo) return;
        setAutoChecks({
          cursos: cursos.length > 0,
          projetos: temFaseConfigurada,
          'avaliacao-certificado': temProvaConfigurada && certificadoConfigurado,
          'clientes-alunos': temClienteOuAluno,
          comunidade: !!consultor.comunidadeBoasVindas?.trim(),
        });
      } catch {
        if (ativo) setAutoChecks({});
      }
    }

    carregarChecksAutomaticos();
    return () => { ativo = false; };
  }, [consultorId, consultor.certificado, consultor.comunidadeBoasVindas, consultor.depoimentoPosProvaAtivo, consultor.depoimentoPreProvaAtivo]);

  useEffect(() => {
    async function carregarVideosOrientacao() {
      try {
        const user = auth.currentUser;
        if (user) {
          await fetch('/api/bunny/refresh-thumbnails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
          });
        }
      } catch {
        // A miniatura é complementar: se o refresh falhar, o vídeo continua abrindo.
      }

      return getAllKnowledge(consultorId).then((videos) => {
        const onboarding = videos
          .filter((video) => video.course === INTRO_COURSE_CONSULTOR && video.bunnyVideoId && video.bunnyLibraryId)
          .sort((a, b) => (a.playlistOrder ?? 0) - (b.playlistOrder ?? 0) || (a.order ?? 0) - (b.order ?? 0));
        setVideosOrientacao(onboarding);
        const nomes: Record<string, string> = {};
        onboarding.forEach((video) => {
          const etapa = video.onboardingStep || CONSULTOR_ONBOARDING_STEPS.find((item) => item.playlist === video.playlist)?.id;
          if (etapa && !nomes[etapa]) nomes[etapa] = video.playlist;
        });
        setNomesPlaylistChecklist(nomes);
      });
    }

    carregarVideosOrientacao().catch(() => { setVideosOrientacao([]); setNomesPlaylistChecklist({}); });
  }, [consultorId]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor vê essa página.</div>;

  const marcaConfigurada = () => {
    const b = consultor.branding;
    return !!(
      b.nome?.trim()
      || b.slogan?.trim()
      || b.logoUrl?.trim()
      || b.fotoUrl?.trim()
      || b.pptCapaUrl?.trim()
      || b.pptInternaUrl?.trim()
      || consultor.mentorNome?.trim()
    );
  };

  const marcado = (id: string) => (
    id === 'marca'
      ? !!consultor.onboarding?.[id] || marcaConfigurada()
      : !!consultor.onboarding?.[id] || !!autoChecks[id]
  );

  async function alternar(id: string) {
    const novo = !marcado(id);
    await setDoc(doc(db, 'consultores', consultorId), { [`onboarding.${id}`]: novo }, { merge: true });
    await refresh();
  }

  async function conhecerComoAluno() {
    const user = auth.currentUser;
    if (!user) {
      setErroCurso('Entre novamente na plataforma para liberar o curso.');
      return;
    }
    setLiberandoCurso(true);
    setErroCurso('');
    try {
      const resposta = await fetch('/api/consultor/curso-demonstrativo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ consultorId }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível liberar o curso agora.');
      // O usuário pode precisar entrar no domínio do Israel uma única vez, mas usa
      // exatamente a mesma conta e senha — não criamos uma segunda conta.
      setCursoSolicitado(true);
    } catch (error: any) {
      setErroCurso(error?.message || 'Não foi possível liberar o curso agora.');
    } finally {
      setLiberandoCurso(false);
    }
  }

  const Checkbox = ({ id }: { id: string }) => (
    <button onClick={() => alternar(id)} className="shrink-0 mt-0.5">
      {marcado(id) ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Circle size={22} className="text-gray-300" />}
    </button>
  );

  const abrirVideo = (video: KnowledgeEntry) => {
    setVideoAberto(video);
    if (!video.id) return;
    setVideosAcessados((anterior) => {
      const atualizado = { ...anterior, [video.id!]: true };
      try { window.localStorage.setItem(`consultor-onboarding-videos-${consultorId}`, JSON.stringify(atualizado)); } catch { /* armazenamento é apenas um complemento visual */ }
      return atualizado;
    });
  };

  // A página e o checklist usam a mesma fonte: as playlists do vídeo. Quando
  // uma playlist é renomeada na Base de Conhecimento, o novo nome chega aqui.
  const gruposOrientacao = (() => {
    const etapaDoVideo = (video: KnowledgeEntry) => {
      const etapaAtual = consultorOnboardingStepId(video.playlist);
      if (etapaAtual) return etapaAtual;
      if (video.onboardingStep === 'comunidade' || video.onboardingStep === 'outros-consultores') return 'comunicacao';
      return video.onboardingStep;
    };
    const padrao = CONSULTOR_ONBOARDING_STEPS.map((etapa) => ({
      id: etapa.id,
      // Os dez passos têm títulos canônicos; playlists antigas continuam
      // agrupadas aqui sem reaparecerem com a numeração anterior.
      nome: etapa.playlist,
      videos: videosOrientacao.filter((video) => etapaDoVideo(video) === etapa.id),
    }));
    const extras = Array.from(new Set(videosOrientacao
      .filter((video) => !etapaDoVideo(video))
      .map((video) => video.playlist)))
      .map((nome) => ({ id: `extra-${nome}`, nome, videos: videosOrientacao.filter((video) => video.playlist === nome) }));
    return [...padrao, ...extras];
  })();

  const normalizarTexto = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const limparNumeroPlaylist = (valor: string) => valor.replace(/^\s*\d+\.\s*/, '').trim();
  const grupoDoVideo = (video: KnowledgeEntry) => gruposOrientacao.find((grupo) => grupo.videos.some((item) => item.id === video.id));
  const videosOrdenados = [...videosOrientacao].sort((a, b) => (
    (a.playlistOrder ?? 999) - (b.playlistOrder ?? 999) || (a.order ?? 0) - (b.order ?? 0)
  ));
  const videoIntroducao = videosOrdenados.find((video) => normalizarTexto(video.title).includes('consultor - introducao'))
    || videosOrdenados.find((video) => video.onboardingStep === 'boas-vindas');
  const videosRestantes = videosOrdenados.filter((video) => video.id !== videoIntroducao?.id);
  const videosProgresso = videosOrientacao.filter((video) => video.id);
  const videosAcessadosTotal = videosProgresso.filter((video) => !!videosAcessados[video.id!]).length;
  const progressoPercentual = videosProgresso.length ? Math.round((videosAcessadosTotal / videosProgresso.length) * 100) : 0;
  const renderVideoCard = (video: KnowledgeEntry | undefined, numero: number | null) => {
    const grupo = video ? grupoDoVideo(video) : gruposOrientacao.find((item) => item.id === 'boas-vindas');
    const tarefa = grupo ? ITENS.find((item) => item.id === grupo.id) : undefined;
    const nomePlaylist = limparNumeroPlaylist(grupo?.nome || 'Boas-vindas ao Programa de Consultores LBW');
    const etiquetaPlaylist = numero === null ? nomePlaylist : `${numero}. ${nomePlaylist}`;
    return (
      <div key={video?.id || 'boas-vindas-placeholder'} className="overflow-hidden rounded-[4px] border border-[#ccc] bg-white">
        <button type="button" disabled={!video} onClick={() => video && abrirVideo(video)} className="group w-full text-left disabled:cursor-default">
          <div className={`relative ${grupo?.id === 'boas-vindas' ? 'aspect-square' : 'aspect-video'} overflow-hidden ${video ? 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100' : 'bg-slate-50'}`}>
            {video?.bunnyThumbnailUrl ? <img src={video.bunnyThumbnailUrl} alt={video.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(evento) => { evento.currentTarget.style.display = 'none'; }} /> : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-300 bg-white/80 shadow-sm">
                  <Video size={24} className="text-blue-600" />
                </span>
                <span className="text-center text-xs font-bold">{video ? 'Vídeo em preparação' : 'Vídeo será adicionado depois'}</span>
              </div>
            )}
            {video && <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100"><span className="grid h-11 w-11 place-items-center rounded-full bg-white/25 text-white backdrop-blur"><PlayCircle size={27} /></span></div>}
          </div>
          <div className="p-4"><h3 className="font-bold text-[16px] leading-tight text-gray-800">{video?.title || 'Vídeo ainda não cadastrado'}</h3><p className="mt-2 text-[13px] text-gray-500">{etiquetaPlaylist}</p></div>
        </button>
        {tarefa && grupo?.id !== 'experiencia-aluno' && <div className="border-t border-[#eee] bg-slate-50 p-4 text-[15px] leading-6 text-gray-600">
          <p>{tarefa.texto}</p>
          {tarefa.botao && tarefa.path && <button onClick={() => navigate(tarefa.path!)} className="mt-2 text-[13px] font-bold text-blue-600 hover:text-blue-800">{tarefa.botao} →</button>}
        </div>}
      </div>
    );
  };

  return (
    <div className="w-full max-w-none pb-12">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><Rocket size={20} /></div>
        <h1 className="text-2xl font-black text-gray-800">Consultor Comece por aqui</h1>
      </div>
      <p className="text-gray-500 text-base mb-6">
        Um passo a passo para você deixar a sua plataforma pronta para os seus clientes.
      </p>

      <div className="space-y-3">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-800">Vídeos passo a passo</h2>
          </div>
          {videoAberto && (
            <div className="p-5 border-b border-gray-100 bg-slate-50">
              <p className="mb-3 font-bold text-gray-800">{videoAberto.title}</p>
              <div className={`${videoAberto?.onboardingStep === 'boas-vindas' ? 'aspect-square' : 'aspect-video'} overflow-hidden rounded-xl bg-slate-900`}>
                <iframe
                  title={videoAberto.title}
                  src={`https://iframe.mediadelivery.net/embed/${videoAberto.bunnyLibraryId}/${videoAberto.bunnyVideoId}?autoplay=true&preload=true`}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          <div className="p-5">
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700"><GraduationCap size={21} /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3 text-sm font-black uppercase tracking-wide text-slate-700"><span>Seu progresso nesta orientação</span><span className="whitespace-nowrap text-blue-700">{videosAcessadosTotal} / {videosProgresso.length} vídeos · {progressoPercentual}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressoPercentual}%` }} /></div><p className="mt-2 text-sm text-slate-600">Abra os vídeos na sequência para acompanhar sua preparação como consultor.</p></div>
              </div>
            </div>
            <div className="mx-auto max-w-md">{renderVideoCard(videoIntroducao, null)}</div>
            {videosRestantes.length > 0 && <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{videosRestantes.map((video, indice) => renderVideoCard(video, indice + 1))}</div>}
          </div>
        </section>
        {/* Checklist temporariamente oculto: será redesenhado após definirmos a
            confirmação automática por vídeo e por tarefa concluída. */}
        <section className="hidden pt-4">
          <h2 className="px-1 text-lg font-black text-gray-800">Checklist de implantação</h2>
          <p className="px-1 mt-1 mb-3 text-sm text-gray-500">Use as 11 etapas abaixo para acompanhar sua preparação. Você pode marcar ou desmarcar os itens manualmente.</p>
          <div className="space-y-3">
            {ITENS.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-3">
                <Checkbox id={item.id} />
                <div className="min-w-0 flex-1">
                  <div className={`font-bold ${marcado(item.id) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{nomesPlaylistChecklist[item.id] || CONSULTOR_ONBOARDING_STEPS.find((etapa) => etapa.id === item.id)?.playlist || item.titulo}</div>
                  <p className="text-sm text-gray-500 mt-1">{item.texto}</p>
                  {item.botao && item.path && (
                    <button onClick={() => navigate(item.path!)} className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800">
                      {item.botao} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {cursoSolicitado && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-gray-800">Acesso liberado</h2><p className="mt-3 text-sm leading-6 text-gray-600">Você receberá um e-mail com as orientações para acessar o curso gratuito como aluno.</p><button type="button" onClick={() => setCursoSolicitado(false)} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Entendi</button></div></div>}
    </div>
  );
}
