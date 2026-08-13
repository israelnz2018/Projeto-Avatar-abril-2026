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
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getInitiatives } from '../../services/configService';
import { getQuiz } from '../../services/quizService';

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
