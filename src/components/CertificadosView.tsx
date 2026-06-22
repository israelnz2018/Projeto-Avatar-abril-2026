/**
 * CertificadosView — aba "Certificados" (só admin).
 * Mostra uma PRÉVIA do template de certificado de cada uma das 8 trilhas,
 * com dados de exemplo, pra o admin revisar o visual e pedir alterações.
 *
 * O template real é o componente Certificate.tsx (mode="student"/"public").
 * Aqui usamos mode="public" e dados fictícios só pra visualização.
 */
import { useState } from 'react';
import { Award } from 'lucide-react';
import Certificate from './Certificate';

// Nome de cada trilha — o número no início define o "tier" visual do certificado.
const TRILHAS = [
  '1 - Como Chegar em uma Área Nova e Entregar Resultado Rapidamente',
  '2 - Como Recomendar Melhorias com Base em Análise de Dados',
  '3 - Como Conduzir Mudanças com Menos Resistência',
  '4 - Como Criar Apresentações que Convencem',
  '5 - Como Antecipar Riscos Antes que Virem Problemas',
  '6 - Cultura Lean na Prática',
  '7 - Como Fazer Análises Estatísticas Aplicadas a Negócios',
  '8 - Como Se Tornar um Especialista em Gestão de Projetos de Melhoria',
];

const ALUNO_EXEMPLO = 'Maria Silva';
const DATA_EXEMPLO = '2026-06-22T12:00:00.000Z';

export default function CertificadosView() {
  const [ativa, setAtiva] = useState(0);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Award className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Certificados</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Prévia do template de certificado de cada trilha (com dados de exemplo). Escolha uma trilha
        abaixo para ver o certificado. Para alterar o design, é só me dizer o que quer mudar.
      </p>

      {/* Seletor de trilha */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TRILHAS.map((nome, i) => (
          <button
            key={i}
            onClick={() => setAtiva(i)}
            className={
              'px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ' +
              (ativa === i
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
            }
          >
            Trilha {i + 1}
          </button>
        ))}
      </div>

      <div className="mb-4 text-sm text-gray-700">
        <span className="font-semibold">Trilha selecionada:</span> {TRILHAS[ativa].replace(/^\d+\s*-\s*/, '')}
      </div>

      {/* Prévia do certificado (modo público, dados de exemplo) */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
        <Certificate
          alunoNome={ALUNO_EXEMPLO}
          initiativeName={TRILHAS[ativa]}
          issuedAt={DATA_EXEMPLO}
          certId="EXEMPLO-PREVIEW"
          mode="public"
        />
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Dados de exemplo: aluno "{ALUNO_EXEMPLO}", emitido em 22/06/2026. O certificado real usa o
        nome do aluno, a data de conclusão e um código de verificação único.
      </p>
    </div>
  );
}
