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
  wave: string;          // cor principal das ondas (varia por trilha)
  waveDark: string;      // tom escuro da onda
  gold: string;          // dourado (moldura/selo/assinatura)
}

const GOLD = '#C9A24B';
const GOLD_DK = '#9A7A2E';

// Carga horária por trilha (definida pelo Israel: vídeo real × ~2-2,7, cobrindo
// exercícios, pesquisa e revisão — dentro da boa prática de cursos livres no Brasil).
const CARGA_HORARIA: Record<number, number> = {
  1: 16, 2: 40, 3: 8, 4: 12, 5: 8, 6: 16, 7: 60, 8: 120,
};

function getTierStyle(numero: number): TierStyle {
  // Base comum: fundo branco, texto navy, moldura e selo dourados (modelo Canva).
  // O que muda por trilha é a COR DAS ONDAS (wave). A T8 fica navy (igual ao modelo).
  const base = {
    bg: '#FFFFFF', text: LBW.ink, textMuted: '#5B6472', isDark: false,
    gold: GOLD, border: GOLD,
  };
  const make = (wave: string, waveDark: string): TierStyle => ({
    ...base, wave, waveDark, ribbon: wave, accent: LBW.navy,
  });
  switch (numero) {
    case 1: return make('#10B981', '#064a32');   // verde
    case 2: return make('#0EA5C9', '#0e4a6a');   // ciano
    case 3: return make('#E08A0B', '#7a3b06');   // âmbar
    case 4: return make('#DB2777', '#6b1239');   // rosa
    case 5: return make('#DC2626', '#5e1414');   // vermelho
    case 6: return make('#0D9488', '#064E3B');   // teal
    case 7: return make('#7C3AED', '#2e1065');   // violeta
    case 8: return { ...base, wave: LBW.navy, waveDark: '#0A1538', ribbon: LBW.navy, accent: LBW.navy, selo: 'FORMAÇÃO LBW' };
    case 9: return { ...base, wave: LBW.navy, waveDark: '#0A1538', ribbon: LBW.navy, accent: LBW.navy, selo: 'FORMAÇÃO LBW' };
    default: return { ...base, wave: LBW.navy, waveDark: '#0A1538', ribbon: LBW.navy, accent: LBW.navy };
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
        {/* Ondas fluidas nos cantos (sup-esq e inf-dir) — cor da trilha + dourado */}
        <svg aria-hidden viewBox="0 0 926 654" preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Canto superior esquerdo */}
          <path d="M0,0 L300,0 C190,70 150,150 120,250 C95,335 40,360 0,300 Z" fill={tier.waveDark} />
          <path d="M0,0 L235,0 C150,60 120,135 96,225 C74,300 30,315 0,250 Z" fill={tier.wave} />
          <path d="M0,0 L300,0 C190,70 150,150 120,250 C95,335 40,360 0,300" fill="none" stroke={tier.gold} strokeWidth="3" opacity="0.9" />
          {/* Canto inferior direito */}
          <path d="M926,654 L626,654 C736,584 776,504 806,404 C831,319 886,294 926,354 Z" fill={tier.waveDark} />
          <path d="M926,654 L691,654 C776,594 806,519 830,429 C852,354 896,339 926,404 Z" fill={tier.wave} />
          <path d="M926,654 L626,654 C736,584 776,504 806,404 C831,319 886,294 926,354" fill="none" stroke={tier.gold} strokeWidth="3" opacity="0.9" />
        </svg>

        {/* Moldura dourada dupla */}
        <div aria-hidden className="absolute pointer-events-none" style={{ inset: 16, border: `2px solid ${tier.gold}`, borderRadius: 4 }} />
        <div aria-hidden className="absolute pointer-events-none" style={{ inset: 22, border: `1px solid ${tier.gold}66`, borderRadius: 3 }} />

        {/* Selo dourado (canto superior direito) */}
        <svg aria-hidden width="76" height="76" viewBox="0 0 76 76" className="absolute" style={{ top: 34, right: 40 }}>
          <g>
            {Array.from({ length: 16 }).map((_, k) => (
              <rect key={k} x="36" y="2" width="4" height="12" rx="1" fill={tier.gold}
                transform={`rotate(${k * 22.5} 38 38)`} opacity="0.85" />
            ))}
            <circle cx="38" cy="38" r="24" fill={tier.gold} />
            <circle cx="38" cy="38" r="24" fill="none" stroke={GOLD_DK} strokeWidth="1.5" />
            <circle cx="38" cy="38" r="18" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
            <text x="38" y="35" textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFFFFF" fontFamily="Geist, sans-serif">LBW</text>
            <text x="38" y="46" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#FFFFFF" fontFamily="Geist, sans-serif" opacity="0.9">CERT.</text>
          </g>
        </svg>

        {/* Conteúdo */}
        <div className="relative h-full flex flex-col px-12 py-10 md:px-16 md:py-12">

          {/* TOPO — logomarca LBW + selo da formação */}
          <div className="flex items-start justify-between mb-6 md:mb-8" style={{ paddingRight: 90 }}>
            <div>
              <img src="/favicon.png" alt="Learning by Working" style={{ height: 30, width: 'auto', display: 'block', marginBottom: 4 }} />
              <p className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase m-0" style={{ color: tier.textMuted }}>
                Educação pelo Trabalho
              </p>
              {tier.selo && (
                <p className="text-[10px] md:text-[11px] font-black tracking-[0.32em] uppercase mt-2" style={{ color: tier.gold }}>
                  {tier.selo}
                </p>
              )}
            </div>
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

            {CARGA_HORARIA[numero] && (
              <p className="text-[12px] md:text-[13px] m-0 mt-4" style={{ color: tier.textMuted }}>
                Carga horária: <span style={{ fontWeight: 700, color: tier.text }}>{CARGA_HORARIA[numero]} horas</span>
              </p>
            )}
          </div>

          {/* RODAPÉ — data + assinatura + QR */}
          <div className="flex items-end justify-between gap-6 mt-6 md:mt-8">

            {/* Data + Assinatura (centro/esquerda) */}
            <div className="flex-1">
              <p className="text-[11px] md:text-[12px] m-0 mb-6" style={{ color: tier.textMuted }}>
                São Paulo, {formatDataPorExtenso(issuedAt)}
              </p>
              <p className="m-0 mb-1 leading-none" style={{ fontFamily: "'Instrument Serif', 'Georgia', serif", fontStyle: 'italic', fontSize: 30, color: tier.gold }}>
                Israel Souza
              </p>
              <div className="w-56 border-t" style={{ borderColor: tier.gold }} />
              <p className="text-[13px] md:text-[14px] font-black tracking-tight m-0 mt-2 leading-tight" style={{ color: tier.text }}>
                Israel Cavalcanti de Souza
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
