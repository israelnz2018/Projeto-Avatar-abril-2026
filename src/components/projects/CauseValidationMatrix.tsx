import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Database,
  HelpCircle,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildCauseEvidenceCandidates,
  CauseDecision,
  CauseValidationRow,
} from '@/src/services/causeValidationService';

interface CauseValidationMatrixProps {
  onSave: (data: any) => void;
  initialData?: any;
  allProjectData?: any;
  onGenerateAI?: (customContext?: any) => Promise<void>;
  isGeneratingAI?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

const decisionLabel: Record<Exclude<CauseDecision, null>, string> = {
  contribui: 'Contribui',
  nao_contribui: 'Não contribui',
  inconclusivo: 'Inconclusivo',
};

const decisionClass: Record<Exclude<CauseDecision, null>, string> = {
  contribui: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  nao_contribui: 'border-red-300 bg-red-50 text-red-700',
  inconclusivo: 'border-amber-300 bg-amber-50 text-amber-700',
};

const unwrap = (data: any) => data?.toolData || data || {};

const mergeRows = (candidates: ReturnType<typeof buildCauseEvidenceCandidates>, saved: any): CauseValidationRow[] => {
  const savedRows: CauseValidationRow[] = Array.isArray(unwrap(saved)?.rows) ? unwrap(saved).rows : [];
  const savedById = new Map(savedRows.map((row) => [row.sourceId, row]));
  return candidates.map((candidate) => {
    const linha: CauseValidationRow = {
      ...candidate,
      ...(savedById.get(candidate.sourceId) || {}),
    };

    // A IA disse que contribui: ja deixa a linha marcada em vez de exigir dois
    // cliques por causa. So vale enquanto o aluno nao tiver decidido nada — a
    // escolha dele nunca e sobrescrita, e ele pode desmarcar.
    if (linha.aiDecision === 'contribui' && !linha.humanDecision) {
      linha.humanDecision = 'contribui';
      linha.confirmed = true;
      linha.includeInBrainstorming = true;
    }
    return linha;
  });
};

export default function CauseValidationMatrix({
  onSave,
  initialData,
  allProjectData,
  onGenerateAI,
  isGeneratingAI,
  onDirtyChange,
}: CauseValidationMatrixProps) {
  const candidates = useMemo(() => buildCauseEvidenceCandidates(allProjectData), [allProjectData]);
  const [rows, setRows] = useState<CauseValidationRow[]>(() => mergeRows(candidates, initialData));
  const lastSyncedKey = useRef<string | null>(null);

  useEffect(() => {
    // O wrapper cria novos objetos ao re-renderizar. Sincronizar por identidade
    // faria uma decisão recém-clicada desaparecer quando o status "não salvo"
    // fosse atualizado. Só recarregamos quando candidatos ou dados persistidos
    // realmente mudam.
    const key = JSON.stringify({
      candidates: candidates.map((candidate) => candidate.sourceId),
      saved: unwrap(initialData)?.rows || [],
    });
    if (lastSyncedKey.current === key) return;
    lastSyncedKey.current = key;
    setRows(mergeRows(candidates, initialData));
    onDirtyChange?.(false);
  }, [candidates, initialData, onDirtyChange]);

  const setDecision = (sourceId: string, decision: Exclude<CauseDecision, null>) => {
    setRows((current) => current.map((row) => row.sourceId === sourceId ? {
      ...row,
      humanDecision: decision,
      confirmed: true,
      includeInBrainstorming: decision === 'contribui' ? true : false,
    } : row));
    onDirtyChange?.(true);
  };

  const setInclude = (sourceId: string, include: boolean) => {
    setRows((current) => current.map((row) => row.sourceId === sourceId ? {
      ...row,
      includeInBrainstorming: include && row.humanDecision === 'contribui',
    } : row));
    onDirtyChange?.(true);
  };

  const handleSave = () => {
    onSave({
      version: 1,
      updatedAt: new Date().toISOString(),
      rows,
    });
    onDirtyChange?.(false);
    toast.success('Validações das causas salvas.');
  };

  const handleGenerate = async () => {
    if (!onGenerateAI) {
      toast.error('A geração com IA não está disponível neste momento.');
      return;
    }
    if (!candidates.length) {
      toast.error('Ainda não há análises ou evidências salvas para avaliar.');
      return;
    }
    await onGenerateAI({ candidates });
  };

  const confirmedCount = rows.filter((row) => row.confirmed).length;
  const includedCount = rows.filter((row) => row.humanDecision === 'contribui' && row.includeInBrainstorming).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="rounded-xl bg-blue-600 p-3 text-white"><Database size={22} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Validação das Causas — X → Y</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Reúna as análises feitas no projeto e na Data Analysis. A IA sugere uma leitura,
                mas somente a sua confirmação define quais causas poderão alimentar o Brainstorming de Soluções.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={Boolean(isGeneratingAI) || !candidates.length}
            className="flex min-h-14 items-center justify-center gap-3 rounded-xl border-0 bg-blue-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGeneratingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {isGeneratingAI ? 'Avaliando...' : 'Avaliar com IA'}
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-white px-3 py-2">{rows.length} evidência(s) encontradas</span>
          <span className="rounded-full bg-white px-3 py-2">{confirmedCount} decisão(ões) confirmada(s)</span>
          <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-800">{includedCount} no Brainstorming de Soluções</span>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-2"><CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span><strong>Atenção:</strong> associação estatística não prova causalidade. As linhas que a IA leu como <strong>Contribui</strong> já vêm marcadas — revise e desmarque o que não fizer sentido. Só o que ficar marcado segue para o Brainstorming de Soluções.</span>
        </div>
      </div>

      {!rows.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <HelpCircle className="mx-auto mb-3 text-slate-400" size={32} />
          <p className="font-bold">Nenhuma análise ou evidência encontrada.</p>
          <p className="mt-1 text-sm">Salve uma análise na Data Analysis ou preencha as ferramentas do projeto primeiro.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-4">X investigado</th>
                  {/* O Y e o mesmo em todas as linhas — e o indicador do projeto.
                      Repeti-lo 24 vezes so ocupava a tela. */}
                  <th className="px-4 py-4">Análise</th>
                  <th className="px-4 py-4">Resultado / evidência</th>
                  <th className="px-4 py-4">Sugestão da IA</th>
                  <th className="px-4 py-4">Sua confirmação</th>
                  <th className="px-4 py-4">Brainstorming de Soluções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const decision = row.humanDecision;
                  return (
                    <tr key={row.sourceId} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-5 font-bold text-slate-900">{row.x}</td>
                      <td className="px-4 py-5 font-semibold text-slate-800">{row.analysis}</td>
                      <td className="max-w-[270px] px-4 py-5 text-slate-600">{row.evidence}</td>
                      <td className="px-4 py-5">
                        {row.aiDecision ? (
                          <div className="space-y-1">
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${decisionClass[row.aiDecision]}`}>
                              {decisionLabel[row.aiDecision]}
                            </span>
                            <p className="max-w-[210px] text-xs leading-5 text-slate-500">{row.aiReason || 'Sem justificativa registrada.'}</p>
                          </div>
                        ) : <span className="text-xs italic text-slate-400">Clique em “Avaliar com IA”.</span>}
                      </td>
                      <td className="min-w-[230px] px-4 py-5">
                        <div className="flex flex-wrap gap-2">
                          {(['contribui', 'nao_contribui', 'inconclusivo'] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setDecision(row.sourceId, option)}
                              className={`rounded-lg border px-2.5 py-2 text-xs font-bold transition ${decision === option ? decisionClass[option] : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700'}`}
                            >
                              {decisionLabel[option]}
                            </button>
                          ))}
                        </div>
                        {!decision && <p className="mt-2 text-xs text-slate-400">Escolha uma decisão para confirmar.</p>}
                      </td>
                      <td className="px-4 py-5">
                        <label className={`flex items-start gap-2 text-xs font-bold ${decision === 'contribui' ? 'cursor-pointer text-slate-700' : 'cursor-not-allowed text-slate-300'}`}>
                          <input
                            type="checkbox"
                            checked={Boolean(row.includeInBrainstorming && decision === 'contribui')}
                            disabled={decision !== 'contribui'}
                            onChange={(event) => setInclude(row.sourceId, event.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-emerald-600"
                          />
                          Usar no Brainstorming de Soluções
                        </label>
                        {decision === 'contribui' && row.includeInBrainstorming && <CheckCircle2 size={16} className="mt-2 text-emerald-600" />}
                        {decision === 'nao_contribui' && <X size={16} className="mt-2 text-red-500" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Revise as decisões e use o botão <strong>Salvar</strong> no cabeçalho da ferramenta.</p>
            <button type="button" onClick={handleSave} className="flex items-center justify-center gap-2 rounded-lg border-0 bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700">
              <Check size={15} /> Salvar validações
            </button>
          </div>
        </div>
      )}

      <button data-save-trigger onClick={handleSave} className="hidden" />
    </div>
  );
}
