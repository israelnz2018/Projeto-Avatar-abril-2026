/**
 * ComecePorAqui — checklist de onboarding do consultor. Cada item tem um texto
 * explicando o que fazer e um botão que leva direto pra tela certa. O check é
 * marcado manualmente pelo próprio consultor (não é detectado automaticamente).
 * O item "Comunidade" é diferente: edita e publica o texto de boas-vindas ali
 * mesmo, sem precisar navegar pra outro lugar.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { CheckCircle2, Circle, GraduationCap, Rocket, Video } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getInitiatives } from '../../services/configService';
import { getQuiz } from '../../services/quizService';
import { getAllKnowledge, INTRO_COURSE_CONSULTOR, type KnowledgeEntry } from '../../services/knowledgeService';

interface Item {
  id: string;
  titulo: string;
  texto: string;
  botao: string;
  path: string;
}

const ITENS: Item[] = [
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
    id: 'fases',
    titulo: 'Ferramentas de cada projeto',
    texto: 'Escolha quais ferramentas de qualidade (as que a plataforma já aprovou) ficam disponíveis em cada fase do seu curso.',
    botao: 'Configurar ferramentas',
    path: '/configuracao?aba=fases',
  },
  {
    id: 'prova',
    titulo: 'Prova',
    texto: 'Configure as perguntas, alternativas e o gabarito de cada curso.',
    botao: 'Configurar a prova',
    path: '/configuracao?aba=prova',
  },
  {
    id: 'certificado',
    titulo: 'Certificado',
    texto: 'Envie o seu próprio modelo de certificado — é o que o aluno recebe ao concluir o curso.',
    botao: 'Configurar certificado',
    path: '/configuracao?aba=certificados',
  },
  {
    id: 'depoimento',
    titulo: 'Depoimento pré-prova',
    texto: 'Decida se o aluno preenche um depoimento antes de fazer a prova, e revise os itens que ele avalia.',
    botao: 'Configurar depoimento',
    path: '/configuracao?aba=prova',
  },
  {
    id: 'coordenadores',
    titulo: 'Coordenadores e alunos',
    texto: 'Adicione um coordenador, ou decida atender os alunos diretamente (sem coordenador) — depois adicione os alunos.',
    botao: 'Ir para Meus Clientes',
    path: '/configuracao?aba=coordenadores',
  },
];

export default function ComecePorAqui() {
  const navigate = useNavigate();
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();
  const [autoChecks, setAutoChecks] = useState<Record<string, boolean>>({});
  const [videosOrientacao, setVideosOrientacao] = useState<KnowledgeEntry[]>([]);
  const [videoAberto, setVideoAberto] = useState<KnowledgeEntry | null>(null);
  const [liberandoCurso, setLiberandoCurso] = useState(false);
  const [erroCurso, setErroCurso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarChecksAutomaticos() {
      try {
        const [cursos, usersSnap, opiniaoSnap] = await Promise.all([
          getInitiatives().catch(() => []),
          getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId))).catch(() => null),
          getDoc(doc(db, 'config', consultorId === 'israel' ? 'opiniaoItens' : `opiniaoItens_${consultorId}`)).catch(() => null),
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
        const depoimentoConfigurado = consultor.depoimentoPreProvaAtivo !== undefined || !!opiniaoSnap?.exists();
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
          fases: temFaseConfigurada,
          prova: temProvaConfigurada,
          certificado: certificadoConfigurado,
          depoimento: depoimentoConfigurado,
          coordenadores: temClienteOuAluno,
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
      })
      .catch(() => setVideosOrientacao([]));
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
      window.location.assign(dados.destino || 'https://israel.educacaopelotrabalho.com/education');
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

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><Rocket size={20} /></div>
        <h1 className="text-2xl font-black text-gray-800">Consultor Comece por aqui</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Um passo a passo pra deixar <b>{consultor.branding.nome}</b> pronta. Marque o que já fez — nada aqui bloqueia o resto da plataforma, é só um guia.
      </p>

      <div className="space-y-3">
        {consultorId !== 'israel' && (
          <section className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-white/15 grid place-items-center"><GraduationCap size={21} /></div>
              <div>
                <h2 className="font-black">Conheça a plataforma como aluno</h2>
                <p className="text-sm text-blue-100 mt-1">
                  Libere gratuitamente o curso Como Resolver Problemas no Trabalho — Kit 90 Dias. Assim você verá, na prática, a experiência que seus futuros alunos terão.
                </p>
                <button
                  type="button"
                  disabled={liberandoCurso}
                  onClick={conhecerComoAluno}
                  className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  {liberandoCurso ? 'Liberando seu curso…' : 'Acessar o curso como aluno'}
                </button>
                {erroCurso && <p className="mt-2 text-xs font-medium text-red-100">{erroCurso}</p>}
              </div>
            </div>
          </section>
        )}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-800">Vídeos de orientação</h2>
            <p className="text-sm text-gray-500 mt-1">Os vídeos cadastrados em “Consultor Comece por aqui” aparecem aqui. Você organiza a lista por playlists na Base de Conhecimento.</p>
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
          {videosOrientacao.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">Ainda não há vídeos aqui. Para criar a lista, vá em Base de Conhecimento → Adicionar vídeo → Consultor Comece por aqui → criar playlist.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {videosOrientacao.map((video) => (
                <button key={video.id} type="button" onClick={() => setVideoAberto(video)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-blue-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Video size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-blue-600">{video.playlist}</span><span className="block truncate font-bold text-gray-800">{video.title}</span></span>
                  <span className="text-xs font-bold text-blue-600">Assistir →</span>
                </button>
              ))}
            </div>
          )}
        </section>
        {ITENS.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-3">
            <Checkbox id={item.id} />
            <div className="min-w-0 flex-1">
              <div className={`font-bold ${marcado(item.id) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.titulo}</div>
              <p className="text-sm text-gray-500 mt-1">{item.texto}</p>
              <button
                onClick={() => navigate(item.path)}
                className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                {item.botao} →
              </button>
            </div>
          </div>
        ))}

        {/* Comunidade */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-3">
          <Checkbox id="comunidade" />
          <div className="min-w-0 flex-1">
            <div className={`font-bold ${marcado('comunidade') ? 'text-gray-400 line-through' : 'text-gray-800'}`}>Comunidade</div>
            <p className="text-sm text-gray-500 mt-1">
              Edite e confirme o primeiro texto diretamente na página da Comunidade dos Meus Clientes.
            </p>
            <button
              onClick={() => navigate('/comunidade-coordenador')}
              className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Ir para Comunidade →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
