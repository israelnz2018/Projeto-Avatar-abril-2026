/**
 * CertificadosView — prévia do template de certificado de CADA CURSO do consultor.
 * Puxa os cursos reais (initiatives, escopadas por consultorId) — um certificado por
 * curso, com o NOME do curso (não "Trilha N"). Multi-tenant: cada consultor vê os
 * cursos dele. O template real é Certificate.tsx (aqui usamos mode="public" + exemplo).
 */
import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import Certificate from './Certificate';
import { getInitiatives } from '../services/configService';

const ALUNO_EXEMPLO = 'Francisco Cavalcanti de Souza';
const DATA_EXEMPLO = '2026-06-22T12:00:00.000Z';
const semPrefixo = (n: string) => n.replace(/^\d+\s*[-—]?\s*/, '');

export default function CertificadosView() {
  const [cursos, setCursos] = useState<string[]>([]);
  const [ativa, setAtiva] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    getInitiatives()
      .then((inits) => setCursos(inits.map((i) => i.name).filter(Boolean)))
      .catch(() => setCursos([]))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Award className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Certificados</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Prévia do template de certificado de cada curso (com dados de exemplo). Escolha um curso
        abaixo para ver o certificado.
      </p>

      {carregando ? (
        <div className="text-gray-500">Carregando cursos…</div>
      ) : cursos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
          Nenhum curso ainda. Crie um curso em <b>Meus Cursos</b> para ver o certificado dele.
        </div>
      ) : (
        <>
          {/* Seletor de curso (pelo NOME do curso) */}
          <div className="flex flex-wrap gap-2 mb-6">
            {cursos.map((nome, i) => (
              <button
                key={nome}
                onClick={() => setAtiva(i)}
                title={nome}
                className={
                  'px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors max-w-[220px] truncate ' +
                  (ativa === i
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
                }
              >
                {semPrefixo(nome)}
              </button>
            ))}
          </div>

          <div className="mb-4 text-sm text-gray-700">
            <span className="font-semibold">Curso selecionado:</span> {semPrefixo(cursos[ativa] || '')}
          </div>

          {/* Prévia do certificado (modo público, dados de exemplo) */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
            <Certificate
              alunoNome={ALUNO_EXEMPLO}
              initiativeName={cursos[ativa] || ''}
              issuedAt={DATA_EXEMPLO}
              certId="EXEMPLO-PREVIEW"
              mode="public"
            />
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Dados de exemplo: aluno "{ALUNO_EXEMPLO}", emitido em 22/06/2026. O certificado real usa o
            nome do aluno, a data de conclusão e um código de verificação único.
          </p>
        </>
      )}
    </div>
  );
}
