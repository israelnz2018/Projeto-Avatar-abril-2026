/**
 * ConfiguracaoConsultor — agrupa as telas de gestão do consultor numa página só.
 * A navegação principal dessas telas agora fica no menu lateral, via ?aba=...
 */
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Users2, Palette, Settings, ClipboardCheck, Award, FolderUp } from 'lucide-react';
import { useUserAccess } from '../../hooks/useUserAccess';

const SuperRelatorio = lazy(() => import('./SuperRelatorio'));
const MeusCursos = lazy(() => import('../KnowledgeManagerView'));
const MinhasFases = lazy(() => import('../ProjectToolsConfig'));
const MeusAlunos = lazy(() => import('./MeusAlunos'));
const MeusCoordenadores = lazy(() => import('./MeusCoordenadores'));
const MinhaVitrine = lazy(() => import('./MinhaVitrine'));
const VitrinePublica = lazy(() => import('../VitrinePublica'));
const MinhaMarca = lazy(() => import('./MinhaMarca'));
const ProvaCertificacao = lazy(() => import('../AvaliacaoAdminView'));
const Certificados = lazy(() => import('../CertificadosView'));
const MateriaisApoio = lazy(() => import('./MateriaisApoio'));

const ABAS = [
  { id: 'cursos', nome: 'Meus Cursos', icon: BookOpen, Comp: MeusCursos },
  { id: 'materiais', nome: 'Material de Apoio', icon: FolderUp, Comp: MateriaisApoio },
  { id: 'prova', nome: 'Teste de Avaliação', icon: ClipboardCheck, Comp: ProvaCertificacao },
  { id: 'certificados', nome: 'Certificados', icon: Award, Comp: Certificados },
  { id: 'fases', nome: 'Projetos, Fases e Ferramentas', icon: Settings, Comp: MinhasFases },
  { id: 'alunos', nome: 'Alunos na Plataforma', icon: Users, Comp: MeusAlunos },
  { id: 'coordenadores', nome: 'Meus Clientes', icon: Users2, Comp: MeusCoordenadores },
  // Minha Vitrine e Vitrine escondidas por ora (discutir depois).
  { id: 'marca', nome: 'Minha Marca', icon: Palette, Comp: MinhaMarca },
  { id: 'relatorio', nome: 'Relatórios', icon: LayoutDashboard, Comp: SuperRelatorio },
];

export default function ConfiguracaoConsultor() {
  const { isAdmin, isConsultor } = useUserAccess();
  // Modelo B2B: o consultor coloca EMPRESAS (coordenadores), não alunos diretos.
  // Só o admin (Israel, base legada B2C) mantém "Meus Alunos".
  const abas = ABAS.filter((a) => a.id !== 'alunos' || isAdmin || isConsultor);
  // Deep-link do "Comece por Aqui" (ex.: /configuracao?aba=marca) — só lido no
  // primeiro render; trocar de aba depois é sempre local (clique nas abas).
  const [searchParams] = useSearchParams();
  const abaUrl = searchParams.get('aba');
  const [ativa, setAtiva] = useState(abaUrl && ABAS.some((a) => a.id === abaUrl) ? abaUrl : 'cursos');
  useEffect(() => {
    if (abaUrl && ABAS.some((a) => a.id === abaUrl)) setAtiva(abaUrl);
  }, [abaUrl]);
  const AtivaComp = abas.find((a) => a.id === ativa)?.Comp || MeusCursos;

  return (
    <div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        }
      >
        <AtivaComp />
      </Suspense>
    </div>
  );
}
