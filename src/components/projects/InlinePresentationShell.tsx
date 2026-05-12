import { ReactNode, useEffect, useState } from 'react';
import { Project } from '@/src/types';
import { generateExecutiveAnalysis } from '@/src/services/executiveAnalysisService';

const NAVY = '#1E3A5F';
const MUTED = '#6B7280';
const HAIRLINE = '#D1D5DB';
const PANEL = '#F4F4F2';
const INK = '#2A2F3A';

interface Props {
  project: Project;
  toolId: string;
  toolData: any;
  toolTitle: string;
  toolPhase: string;
  initialAnalysis?: string;
  onAnalysisChange: (text: string) => void;
  onClose: () => void;
  children: ReactNode;
}

export function InlinePresentationShell({
  project, toolId, toolData, toolTitle, toolPhase,
  initialAnalysis, onAnalysisChange, onClose, children
}: Props) {
  const [analysis, setAnalysis] = useState(initialAnalysis || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftAnalysis, setDraftAnalysis] = useState('');
  const today = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    if (!analysis && !isGenerating) generateAnalysis();
  }, []);

  const generateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const text = await generateExecutiveAnalysis({ project, toolId, toolData });
      setAnalysis(text);
      onAnalysisChange(text);
    } catch (e) {
      console.error('Erro gerando análise:', e);
      setAnalysis('(não foi possível gerar a análise automaticamente — clique em Editar para escrever manualmente)');
    } finally {
      setIsGenerating(false);
    }
  };

  const startEdit = () => { setDraftAnalysis(analysis); setIsEditing(true); };
  const cancelEdit = () => setIsEditing(false);
  const saveEdit = () => {
    setAnalysis(draftAnalysis);
    onAnalysisChange(draftAnalysis);
    setIsEditing(false);
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .lbw-print-area, .lbw-print-area * { visibility: visible !important; }
          .lbw-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; box-shadow: none !important; border: none !important; }
          .lbw-no-print { display: none !important; }
        }
      `}</style>

      <div style={{ marginTop: '24px', borderTop: `2px solid ${HAIRLINE}`, paddingTop: '20px' }}>
        <div className="lbw-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>📊 Apresentação executiva</div>
          <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', color: MUTED, border: `1px solid ${HAIRLINE}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Fechar</button>
        </div>

        <div className="lbw-print-area" style={{
          width: '100%', maxWidth: '1100px', aspectRatio: '1123 / 794',
          background: '#FFFFFF', border: `1px solid ${HAIRLINE}`,
          margin: '0 auto', padding: '20px', boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '10px' }}>
            <div style={{ width: '70px', height: '32px', background: NAVY, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, letterSpacing: '3px', borderRadius: '4px', marginRight: '14px' }}>LBW</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: NAVY }}>{toolTitle}</h1>
              <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px' }}>Projeto: {project.name || ''} · Fase {toolPhase} · {today}</div>
            </div>
          </div>

          <div style={{ position: 'relative', flex: 1, minHeight: '300px', marginTop: '12px' }}>
            {children}
          </div>

          <div style={{ background: PANEL, padding: '12px 14px', borderRadius: '6px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: NAVY, letterSpacing: '2px' }}>ANÁLISE EXECUTIVA</div>
              <div className="lbw-no-print" style={{ display: 'flex', gap: '6px' }}>
                {!isEditing && <button onClick={startEdit} style={{ padding: '4px 10px', fontSize: '10px', background: 'transparent', color: NAVY, border: `1px solid ${NAVY}`, borderRadius: '3px', cursor: 'pointer' }}>Editar</button>}
                {!isEditing && <button onClick={generateAnalysis} disabled={isGenerating} style={{ padding: '4px 10px', fontSize: '10px', background: 'transparent', color: NAVY, border: `1px solid ${NAVY}`, borderRadius: '3px', cursor: isGenerating ? 'wait' : 'pointer' }}>{isGenerating ? 'Gerando...' : 'Regenerar IA'}</button>}
                {isEditing && <button onClick={cancelEdit} style={{ padding: '4px 10px', fontSize: '10px', background: 'transparent', color: MUTED, border: `1px solid ${HAIRLINE}`, borderRadius: '3px', cursor: 'pointer' }}>Cancelar</button>}
                {isEditing && <button onClick={saveEdit} style={{ padding: '4px 10px', fontSize: '10px', background: NAVY, color: '#FFF', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Salvar</button>}
              </div>
            </div>
            {isEditing ? (
              <textarea value={draftAnalysis} onChange={e => setDraftAnalysis(e.target.value)} style={{ width: '100%', minHeight: '70px', fontSize: '12px', fontFamily: 'inherit', color: INK, lineHeight: 1.5, border: `1px solid ${HAIRLINE}`, borderRadius: '4px', padding: '8px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: INK, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {analysis || (isGenerating ? 'Gerando análise...' : '(análise não preenchida)')}
              </p>
            )}
          </div>

          <div style={{ fontSize: '8px', color: MUTED, marginTop: '8px' }}>LBW · Continuous Improvement Copilot · Fase {toolPhase} · {toolTitle}</div>
        </div>

        <div className="lbw-no-print" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={() => window.print()} style={{ padding: '10px 20px', background: NAVY, color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>🖨️ Imprimir / Salvar como PDF</button>
        </div>
      </div>
    </>
  );
}
