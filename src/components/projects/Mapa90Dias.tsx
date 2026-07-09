/**
 * Mapa90Dias — ferramenta de projeto "Mapa dos 90 Dias".
 * Mesmo conteúdo e visual do checklist da aba Recursos (importa SEMANAS/FASE_META),
 * mas em formato de ferramenta: salva o progresso POR PROJETO via onSave.
 * Associe à Trilha 1 pela tela "Configuração de Ferramentas por Projeto".
 */
import React, { useEffect, useMemo, useState } from 'react';
import { SEMANAS, FASE_META, type Fase, type Semana } from '../recursos/ChecklistMapa90Dias';

interface Mapa90DiasProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function Mapa90Dias({ onSave, initialData, onDirtyChange }: Mapa90DiasProps) {
  // Desembrulho defensivo (initialData pode vir puro ou dentro de toolData).
  const inicial: string[] = (() => {
    const raw = initialData?.toolData || initialData;
    return Array.isArray(raw?.marcados) ? raw.marcados : [];
  })();

  const [marcados, setMarcados] = useState<Set<string>>(new Set(inicial));
  const [dirty, setDirty] = useState(false);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const toggle = (k: string) => {
    setMarcados((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
    setDirty(true);
  };

  const total = 60;
  const feitos = marcados.size;
  const pct = Math.round((feitos / total) * 100);

  const fases: Fase[] = ['f1', 'f2', 'f3'];
  const porFase = useMemo(() => {
    const m: Record<Fase, Semana[]> = { f1: [], f2: [], f3: [] };
    SEMANAS.forEach((s) => m[s.fase].push(s));
    return m;
  }, []);

  const salvar = () => { onSave({ marcados: Array.from(marcados) }); setDirty(false); };

  return (
    <div>
      {/* Barra de progresso + salvar (fora do "documento", pra não mexer no design do checklist) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ background: '#e2e6f0', borderRadius: 100, height: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: '#0F9D58', borderRadius: 100, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginTop: 6 }}>{feitos} de {total} concluídos · {pct}%</div>
        </div>
        <button
          onClick={salvar}
          disabled={!dirty}
          style={{ background: dirty ? '#0033CC' : '#9CA3AF', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: dirty ? 'pointer' : 'default' }}
        >
          {dirty ? 'Salvar progresso' : 'Progresso salvo'}
        </button>
      </div>

      {/* Documento — mesmo visual do checklist da aba Recursos */}
      <div style={{ border: '3px double #1E2D6E', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
        <div style={{ border: '1px solid #dfe4f0', margin: 6, borderRadius: 3 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#1E2D6E,#0033CC)', color: '#fff', padding: '20px 26px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .85, marginBottom: 6 }}>
              Kit 90 Dias · LBW — Educação pelo Trabalho
            </div>
            <h1 style={{ fontSize: 25, fontWeight: 800, margin: '0 0 5px', fontFamily: "'Space Grotesk', Inter, sans-serif" }}>O Mapa dos 90 Dias</h1>
            <p style={{ fontSize: 12, opacity: .92, margin: 0, maxWidth: 600, lineHeight: 1.4 }}>
              Seu checklist de progresso — 60 ações, uma por dia. Marque cada item conforme avança.
            </p>
          </div>

          {/* Fases */}
          {fases.map((f) => {
            const meta = FASE_META[f];
            return (
              <div key={f} style={{ padding: '12px 24px 2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.5px solid #dfe4f0', paddingBottom: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, color: '#fff', background: meta.cor, whiteSpace: 'nowrap' }}>{meta.num}</span>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0F24', margin: 0, fontFamily: "'Space Grotesk', Inter, sans-serif" }}>{meta.nome}</h2>
                </div>
                <div style={{ fontSize: 10.5, color: '#6B7280', fontStyle: 'italic', marginBottom: 10 }}>{meta.meta}</div>

                {porFase[f].map((sem) => (
                  <div key={sem.sw} style={{ marginBottom: 9 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0A0F24', marginBottom: 3, display: 'flex', gap: 7, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, color: '#fff', background: meta.cor }}>{sem.sw}</span>
                      {sem.titulo}
                    </div>
                    {sem.dias.map((dia) => {
                      const k = sem.sw + dia.d;
                      const on = marcados.has(k);
                      return (
                        <label key={k} onClick={() => toggle(k)} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 4px 3px 22px', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, lineHeight: 1.32 }}>
                          <span style={{ fontWeight: 800, color: '#6B7280', flexShrink: 0, fontSize: 10, minWidth: 34 }}>{dia.d}</span>
                          <span style={{ width: 14, height: 14, border: `1.6px solid ${on ? meta.cor : '#c3cbe0'}`, background: on ? meta.cor : '#fff', borderRadius: 4, flexShrink: 0, marginTop: 1, position: 'relative', display: 'inline-block' }}>
                            {on && <span style={{ position: 'absolute', color: '#fff', fontSize: 10, fontWeight: 900, top: -3, left: 1.5 }}>✓</span>}
                          </span>
                          <span style={{ textDecoration: on ? 'line-through' : 'none', color: on ? '#6B7280' : '#2A2F3A' }}>{dia.txt}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Entrega final */}
          <div style={{ margin: '8px 24px 4px', background: 'linear-gradient(135deg,#0F9D58,#0b7a44)', color: '#fff', borderRadius: 10, padding: '12px 18px' }}>
            <h3 style={{ fontSize: 13, marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>🏁 Ao final dos 90 dias, você terá nas mãos:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 10.5 }}>
              {['Um SIPOC + mapa da sua área', 'Um projeto escolhido com critério', 'A análise de causa raiz', 'Um plano de ação executado', 'Um antes × depois com números', 'Um PPT da sua primeira melhoria'].map((t) => (
                <span key={t} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, background: 'rgba(255,255,255,.22)', borderRadius: '50%', width: 15, height: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div style={{ margin: '6px 24px 16px', fontSize: 11, fontStyle: 'italic', color: '#1E2D6E', borderLeft: '3px solid #0033CC', padding: '7px 14px', background: '#F0F2FA', borderRadius: '0 8px 8px 0', lineHeight: 1.4 }}>
            Enquanto a maioria passou 90 dias "tentando entender", você entendeu, agiu e entregou. MEUS PARABÉNS!
          </div>
        </div>
      </div>
    </div>
  );
}
