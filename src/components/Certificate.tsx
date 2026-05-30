/**
 * Certificate — página de certificado da trilha (1 por trilha concluída).
 *
 * Design:
 *   - Landscape, proporção 16:9, pensado pra imprimir A4 paisagem
 *   - 9 tiers visuais (escala fria → premium):
 *       T1 cinza-claro → T8 verde discreto → T9 navy profundo + champagne (ÂNCORA)
 *   - Dual signature: LBW (institucional) no topo + Israel (pessoal) no rodapé
 *   - QR code (qrserver.com) aponta pra /verificar/{certId}
 *   - Tudo enxuto, sem porcentagem/contagem
 *
 * Modos:
 *   - mode="student" (default): aluno olhando o próprio cert — mostra botões Imprimir/Copiar
 *   - mode="public" (rota /verificar): qualquer pessoa verificando — mostra badge "VERIFICADO"
 *
 * Print:
 *   - window.print() do browser. CSS @media print esconde tudo exceto a folha.
 *   - "Salvar como PDF" no diálogo de impressão gera o PDF.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Printer, Link2, Check, Award, ShieldCheck } from 'lucide-react';

interface Props {
  alunoNome: string;
  initiativeName: string;
  /** ISO string */
  issuedAt: string;
  certId: string;
  mode?: 'student' | 'public';
}

const LBW = { navy: '#1E2D6E', blue: '#0033CC', ink: '#0F172A', champagne: '#C9A659' };

// Extrai número da trilha do nome (ex: "9- Trilha X" → 9, "Trilha 3: Y" → 3).
function extractTrilhaNumero(name: string): number {
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

interface TierStyle {
  bg: string;
  ribbon: string;        // faixa decorativa do canto
  border: string;
  accent: string;
  text: string;          // cor de texto principal
  textMuted: string;
  isDark: boolean;
  selo?: string;         // texto extra (T9)
}

function getTierStyle(numero: number): TierStyle {
  switch (numero) {
    case 1: return { bg: '#FAFBFC', ribbon: '#E2E8F0', border: '#CBD5E1', accent: LBW.navy, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 2: return { bg: '#F2F6FC', ribbon: '#C7D2FE', border: '#A5B4FC', accent: LBW.blue, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 3: return { bg: '#EBF5FB', ribbon: '#93C5FD', border: '#60A5FA', accent: LBW.blue, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 4: return { bg: '#E5ECFA', ribbon: '#93C5FD', border: '#3B82F6', accent: LBW.blue, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 5: return { bg: '#DDE5F3', ribbon: '#8597C4', border: '#6B7BA8', accent: LBW.navy, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 6: return { bg: '#FFFFFF', ribbon: '#1E2D6E', border: LBW.navy, accent: LBW.navy, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 7: return { bg: '#FFFFFF', ribbon: LBW.blue, border: LBW.blue, accent: LBW.blue, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 8: return { bg: '#F2FAF5', ribbon: '#34D399', border: '#10B981', accent: LBW.navy, text: LBW.ink, textMuted: '#475569', isDark: false };
    case 9: return { bg: '#0B1538', ribbon: LBW.champagne, border: LBW.champagne, accent: LBW.champagne, text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.72)', isDark: true, selo: 'ÂNCORA · FORMAÇÃO LBW' };
    default: return { bg: '#FFFFFF', ribbon: '#E2E8F0', border: '#CBD5E1', accent: LBW.navy, text: LBW.ink, textMuted: '#475569', isDark: false };
  }
}

function formatDataPorExtenso(iso: string): string {
  const d = new Date(iso);
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export default function Certificate({ alunoNome, initiativeName, issuedAt, certId, mode = 'student' }: Props) {
  const numero = extractTrilhaNumero(initiativeName);
  const tier = getTierStyle(numero);
  const [copied, setCopied] = useState(false);

  const verifyUrl = `${window.location.origin}/verificar/${certId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(verifyUrl)}`;

  const handlePrint = () => window.print();
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Certificate] erro ao copiar link:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-100 print:bg-white print:p-0 print:block">
      {/* CSS print: esconde controles + força background fidedigno + uma folha apenas */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .cert-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            height: 100vh !important;
            page-break-after: avoid;
          }
          .cert-bg-print {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Toolbar (oculto na impressão) */}
      <div className="no-print w-full max-w-5xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-600">
          {mode === 'public' ? (
            <>
              <ShieldCheck size={18} className="text-emerald-600" />
              <span className="text-sm font-bold">Certificado verificado · {certId}</span>
            </>
          ) : (
            <>
              <Award size={18} className="text-amber-600" />
              <span className="text-sm font-bold">Seu certificado · {certId}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} />}
            {copied ? 'Link copiado' : 'Copiar link de verificação'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-bold transition-colors"
            style={{ background: LBW.navy }}
          >
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Folha do certificado */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        className="cert-paper cert-bg-print relative w-full max-w-5xl aspect-[1.414] overflow-hidden"
        style={{
          background: tier.bg,
          color: tier.text,
          border: `1px solid ${tier.border}`,
          borderRadius: 8,
          boxShadow: '0 30px 80px -30px rgba(15,23,42,0.35)',
          fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Decoração de canto — faixas geométricas */}
        <div aria-hidden className="absolute top-0 right-0 w-48 h-48"
          style={{
            background: `linear-gradient(135deg, transparent 0%, transparent 50%, ${tier.ribbon} 50%, ${tier.ribbon} 100%)`,
            opacity: tier.isDark ? 0.85 : 0.65,
          }}
        />
        <div aria-hidden className="absolute bottom-0 left-0 w-32 h-32"
          style={{
            background: `linear-gradient(315deg, transparent 0%, transparent 50%, ${tier.ribbon} 50%, ${tier.ribbon} 100%)`,
            opacity: tier.isDark ? 0.85 : 0.5,
          }}
        />

        {/* Linhas finas decorativas (pattern de "circuitos" sutil) */}
        <svg aria-hidden className="absolute inset-0 pointer-events-none" style={{ opacity: tier.isDark ? 0.18 : 0.08 }}>
          <defs>
            <pattern id={`grid-${certId}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={tier.accent} strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${certId})`} />
        </svg>

        {/* Conteúdo */}
        <div className="relative h-full flex flex-col px-12 py-10 md:px-16 md:py-12">

          {/* TOPO — LBW logo + cert ID */}
          <div className="flex items-start justify-between mb-6 md:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded flex items-center justify-center font-black text-base"
                  style={{ background: tier.accent, color: tier.isDark ? LBW.navy : '#FFFFFF' }}>
                  L
                </div>
                <div>
                  <p className="text-[16px] md:text-[18px] font-black tracking-tight leading-none m-0" style={{ color: tier.isDark ? '#FFFFFF' : LBW.navy }}>
                    LEARNING BY WORKING
                  </p>
                  <p className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase m-0 mt-0.5" style={{ color: tier.textMuted }}>
                    Educação pelo Trabalho
                  </p>
                </div>
              </div>
              {tier.selo && (
                <p className="text-[10px] md:text-[11px] font-black tracking-[0.32em] uppercase mt-3" style={{ color: tier.accent }}>
                  {tier.selo}
                </p>
              )}
            </div>
            <p className="text-[10px] md:text-[11px] font-mono font-bold tracking-wider" style={{ color: tier.textMuted }}>
              Nº {certId}
            </p>
          </div>

          {/* CORPO */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-[12px] md:text-[13px] tracking-[0.32em] uppercase font-bold m-0 mb-4" style={{ color: tier.textMuted }}>
              Eu, Israel Souza, registro que
            </p>

            <h1
              className="m-0 mb-6 leading-[1.05]"
              style={{
                fontFamily: "'Instrument Serif', 'Georgia', serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(36px, 5vw, 56px)',
                color: tier.accent,
              }}
            >
              {alunoNome}
            </h1>

            <p className="text-[13px] md:text-[14px] m-0 mb-3" style={{ color: tier.textMuted }}>
              concluiu a formação em
            </p>

            <h2 className="text-[20px] md:text-[26px] font-black tracking-tight m-0 leading-tight max-w-3xl" style={{ color: tier.text }}>
              {initiativeName.replace(/^\d+\s*[-·]\s*/, '')}
            </h2>
          </div>

          {/* RODAPÉ — data + assinatura + QR */}
          <div className="flex items-end justify-between gap-6 mt-6 md:mt-8">

            {/* Data + Assinatura (centro/esquerda) */}
            <div className="flex-1">
              <p className="text-[11px] md:text-[12px] m-0 mb-6" style={{ color: tier.textMuted }}>
                São Paulo, {formatDataPorExtenso(issuedAt)}
              </p>
              <div className="w-56 border-t" style={{ borderColor: tier.text + '60' }} />
              <p className="text-[13px] md:text-[14px] font-black tracking-tight m-0 mt-2 leading-tight" style={{ color: tier.text }}>
                Israel Souza
              </p>
              <p className="text-[10px] md:text-[11px] font-medium m-0 mt-1" style={{ color: tier.textMuted }}>
                Lean Six Sigma Master Black Belt · PMP · MBA
              </p>
            </div>

            {/* QR code (verificação) */}
            <div className="flex items-end gap-3">
              <div className="flex flex-col items-end">
                <p className="text-[9px] md:text-[10px] font-bold tracking-wider uppercase m-0 mb-1 text-right" style={{ color: tier.textMuted }}>
                  Verifique em
                </p>
                <p className="text-[9px] md:text-[10px] font-mono m-0 max-w-[180px] text-right break-all leading-tight" style={{ color: tier.textMuted }}>
                  {verifyUrl.replace(/^https?:\/\//, '')}
                </p>
              </div>
              <div
                className="rounded-md p-1.5 flex-shrink-0"
                style={{
                  background: tier.isDark ? '#FFFFFF' : '#FFFFFF',
                  border: `1px solid ${tier.border}`,
                }}
              >
                <img
                  src={qrUrl}
                  alt={`QR code de verificação ${certId}`}
                  width={88}
                  height={88}
                  className="block"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Marca d'água "VERIFICADO" no modo público */}
        {mode === 'public' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: 'rotate(-20deg)' }}
          >
            <span
              className="font-black tracking-[0.3em] uppercase"
              style={{
                fontSize: 'clamp(64px, 12vw, 140px)',
                color: tier.isDark ? 'rgba(201,166,89,0.07)' : 'rgba(0,51,204,0.05)',
                letterSpacing: '0.2em',
              }}
            >
              Verificado
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
