/**
 * ConfiguracaoConsultor — agrupa TODAS as abas de gestão do consultor numa página
 * só, com abas HORIZONTAIS no topo. A sidebar fica enxuta (só o dia a dia do
 * aluno/coordenador) + esta única aba "Configuração". Ver PLANO-WHITELABEL.md.
 */
import React, { Suspense, lazy, useState } from 'react';
import { LayoutDashboard, BookOpen, Users, Users2, Megaphone, Store, Palette, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const SuperRelatorio = lazy(() => import('./SuperRelatorio'));
const MeusCursos = lazy(() => import('../KnowledgeManagerView'));
const MinhasFases = lazy(() => import('../ProjectToolsConfig'));
const MeusAlunos = lazy(() => import('./MeusAlunos'));
const MeusCoordenadores = lazy(() => import('./MeusCoordenadores'));
const MinhaVitrine = lazy(() => import('./MinhaVitrine'));
const VitrinePublica = lazy(() => import('../VitrinePublica'));
const MinhaMarca = lazy(() => import('./MinhaMarca'));

const ABAS = [
  { id: 'relatorio', nome: 'Super-relatório', icon: LayoutDashboard, Comp: SuperRelatorio },
  { id: 'cursos', nome: 'Meus Cursos', icon: BookOpen, Comp: MeusCursos },
  { id: 'fases', nome: 'Fases e Ferramentas', icon: Settings, Comp: MinhasFases },
  { id: 'alunos', nome: 'Meus Alunos', icon: Users, Comp: MeusAlunos },
  { id: 'coordenadores', nome: 'Meus Coordenadores', icon: Users2, Comp: MeusCoordenadores },
  { id: 'vitrine', nome: 'Minha Vitrine', icon: Megaphone, Comp: MinhaVitrine },
  { id: 'consultores', nome: 'Vitrine', icon: Store, Comp: VitrinePublica },
  { id: 'marca', nome: 'Minha Marca', icon: Palette, Comp: MinhaMarca },
];

export default function ConfiguracaoConsultor() {
  const [ativa, setAtiva] = useState('relatorio');
  const AtivaComp = ABAS.find((a) => a.id === ativa)?.Comp || SuperRelatorio;

  return (
    <div>
      {/* Abas horizontais no topo */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6 -mt-2 sticky top-0 bg-[#f0f2f5] z-10 pt-1">
        {ABAS.map((a) => {
          const on = a.id === ativa;
          return (
            <button
              key={a.id}
              onClick={() => setAtiva(a.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-lg border-b-2 transition-colors',
                on
                  ? 'text-blue-700 border-blue-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-white/60'
              )}
            >
              <a.icon size={15} />
              {a.nome}
            </button>
          );
        })}
      </div>

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
