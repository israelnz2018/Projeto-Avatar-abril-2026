/**
 * ComecePorAqui — checklist de onboarding do consultor. Cada item tem um texto
 * explicando o que fazer e um botão que leva direto pra tela certa. O check é
 * marcado manualmente pelo próprio consultor (não é detectado automaticamente).
 * O item "Comunidade" é diferente: edita e publica o texto de boas-vindas ali
 * mesmo, sem precisar navegar pra outro lugar.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { CheckCircle2, Circle, PlayCircle, Rocket, Video } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getInitiatives } from '../../services/configService';
import { getQuiz } from '../../services/quizService';
import { CONSULTOR_ONBOARDING_STEPS, getAllKnowledge, INTRO_COURSE_CONSULTOR, type KnowledgeEntry } from '../../services/knowledgeService';

interface Item {
  id: string;
  titulo: string;
  texto: string;
  botao?: string;
  path?: string;
}

const ITENS: Item[] = [
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

export default function ComecePorAqui() {
  const navigate = useNavigate();
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();
  const [autoChecks, setAutoChecks] = useState<Record<string, boolean>>({});
  const [videosOrientacao, setVideosOrientacao] = useState<KnowledgeEntry[]>([]);
  const [nomesPlaylistChecklist, setNomesPlaylistChecklist] = useState<Record<string, string>>({});
  const [videoAberto, setVideoAberto] = useState<KnowledgeEntry | null>(null);
  const [liberandoCurso, setLiberandoCurso] = useState(false);
  const [erroCurso, setErroCurso] = useState('');
  const [cursoSolicitado, setCursoSolicitado] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarChecksAutomaticos() {
      try {
        const [cursos, usersSnap] = await Promise.all([
          getInitiatives().catch(() => []),
          getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId))).catch(() => null),
        ]);

        const cursosComProjeto = cursos.filter((curso: any) => curso.temProjeto !== false);
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
  }, [consultorId, consultor.certificado, consultor.comunidadeBoasVindas, consultor.depoimentoPreProvaAtivo]);

  useEffect(() => {
    getAllKnowledge(consultorId)
      .then((videos) => {
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
      })
      .catch(() => { setVideosOrientacao([]); setNomesPlaylistChecklist({}); });
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

  // A página e o checklist usam a mesma fonte: as playlists do vídeo. Quando
  // uma playlist é renomeada na Base de Conhecimento, o novo nome chega aqui.
  const gruposOrientacao = (() => {
    const etapaDoVideo = (video: KnowledgeEntry) => video.onboardingStep
      || CONSULTOR_ONBOARDING_STEPS.find((item) => item.playlist === video.playlist)?.id;
    const padrao = CONSULTOR_ONBOARDING_STEPS.map((etapa) => ({
      id: etapa.id,
      nome: nomesPlaylistChecklist[etapa.id] || etapa.playlist,
      videos: videosOrientacao.filter((video) => etapaDoVideo(video) === etapa.id),
    }));
    const extras = Array.from(new Set(videosOrientacao
      .filter((video) => !etapaDoVideo(video))
      .map((video) => video.playlist)))
      .map((nome) => ({ id: `extra-${nome}`, nome, videos: videosOrientacao.filter((video) => video.playlist === nome) }));
    return [...padrao, ...extras];
  })();

  return (
    <div className="w-full max-w-none pb-12">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><Rocket size={20} /></div>
        <h1 className="text-2xl font-black text-gray-800">Consultor Comece por aqui</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Um passo a passo para você deixar a sua plataforma pronta para os seus clientes.
      </p>

      <div className="space-y-3">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-800">Vídeos passo a passo</h2>
          </div>
          {videoAberto && (
            <div className="p-5 border-b border-gray-100 bg-slate-50">
              <p className="mb-3 font-bold text-gray-800">{videoAberto.title}</p>
              <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
                <iframe
                  title={videoAberto.title}
                  src={`https://iframe.mediadelivery.net/embed/${videoAberto.bunnyLibraryId}/${videoAberto.bunnyVideoId}?autoplay=true&preload=true&captions=pt`}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          <div className="grid gap-6 p-5 md:grid-cols-2 xl:grid-cols-3">
            {gruposOrientacao.map((grupo) => {
              const tarefa = ITENS.find((item) => item.id === grupo.id);
              const videos = grupo.videos.length ? grupo.videos : [null];
              return videos.map((video, indice) => (
                <div key={video?.id || `${grupo.id}-${indice}`} className="overflow-hidden rounded-[4px] border border-[#ccc] bg-white">
                  <button type="button" disabled={!video} onClick={() => video && setVideoAberto(video)} className="group w-full text-left disabled:cursor-default">
                    <div className="relative aspect-video overflow-hidden bg-slate-900">
                      {video?.bunnyThumbnailUrl ? <img src={video.bunnyThumbnailUrl} alt={video.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center"><PlayCircle className="text-white/70" size={44} /></div>}
                      {video && <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100"><span className="grid h-11 w-11 place-items-center rounded-full bg-white/25 text-white backdrop-blur"><PlayCircle size={27} /></span></div>}
                    </div>
                    <div className="p-4"><h3 className="font-bold text-[14px] leading-tight text-gray-800">{video?.title || 'Vídeo ainda não cadastrado'}</h3><p className="mt-2 text-[11px] text-gray-500">{grupo.nome}</p></div>
                  </button>
                  {tarefa && <div className="border-t border-[#eee] bg-slate-50 p-4 text-sm text-gray-600">
                    {grupo.id === 'experiencia-aluno' ? <div><button type="button" disabled={liberandoCurso} onClick={consultorId === 'israel' ? () => navigate('/education') : conhecerComoAluno} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{consultorId === 'israel' ? 'Acessar como aluno' : (liberandoCurso ? 'Liberando acesso…' : 'Quero acessar como aluno')}</button><button type="button" onClick={() => alternar('experiencia-aluno')} className={`ml-3 text-xs font-bold ${marcado('experiencia-aluno') ? 'text-emerald-700' : 'text-blue-600'}`}>{marcado('experiencia-aluno') ? '✓ Curso acessado como aluno' : 'Confirmar que já acessei o curso'}</button></div> : <><p>{tarefa.texto}</p>{tarefa.botao && tarefa.path && <button onClick={() => navigate(tarefa.path!)} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800">{tarefa.botao} →</button>}</>}
                  </div>}
                </div>
              ));
            })}
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
