/**
 * Certificate — página de certificado da trilha (1 por trilha concluída).
 *
 * Design: usa a IMAGEM do certificado oficial do Israel (feita no Canva,
 * /certificados/modelo-base.png — ondas navy+dourado, moldura, selo,
 * credenciais e assinatura do Israel) como FUNDO, e sobrepõe por código
 * apenas os campos dinâmicos: título da trilha, nome do aluno, carga horária,
 * data, nº e QR de verificação. Assim fica idêntico ao modelo aprovado.
 *
 * Proporção da arte: 926×680 (~4:3 landscape).
 *
 * Modos:
 *   - mode="student" (default): aluno olhando o próprio cert — botões Imprimir/Copiar
 *   - mode="public" (rota /verificar): qualquer pessoa verificando
 *
 * Print: window.print(); CSS @media print isola a folha. "Salvar como PDF".
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

const LBW = { navy: '#1E2D6E', blue: '#0033CC', ink: '#0F172A' };
const MODELO_BG = '/certificados/modelo-base.png';

// Extrai número da trilha do nome (ex: "9- Trilha X" → 9, "Trilha 3: Y" → 3).
function extractTrilhaNumero(name: string): number {
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

// Carga horária por trilha (definida pelo Israel: vídeo real × ~2,5+, múltiplo de 4,
// cobrindo exercícios, pesquisa e revisão — boa prática de cursos livres no Brasil).
const CARGA_HORARIA: Record<number, number> = {
  1: 16, 2: 40, 3: 8, 4: 12, 5: 8, 6: 16, 7: 60, 8: 120,
};

function formatDataPorExtenso(iso: string): string {
  // Sempre no fuso do Brasil (America/Sao_Paulo), independente de onde o app roda.
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'numeric', year: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (t: string) => partes.find((p) => p.type === t)?.value || '';
  const dia = parseInt(get('day'), 10);
  const mes = parseInt(get('month'), 10) - 1;
  const ano = get('year');
  return `${dia} de ${meses[mes]} de ${ano}`;
}

export default function Certificate({ alunoNome, initiativeName, issuedAt, certId, mode = 'student' }: Props) {
  const numero = extractTrilhaNumero(initiativeName);
  const carga = CARGA_HORARIA[numero];
  const nomeTrilha = initiativeName.replace(/^\d+\s*[-·]\s*/, '');
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
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          /* Esconde TUDO na página… */
          body * { visibility: hidden !important; }
          /* …e mostra apenas a folha do certificado e seu conteúdo. */
          .cert-paper, .cert-paper * { visibility: visible !important; }
          /* A folha preenche o A4 paisagem inteiro (297×210mm), página única. */
          .cert-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: none !important;
            aspect-ratio: auto !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .cert-bg-print { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Toolbar (oculto na impressão) */}
      <div className="no-print w-full max-w-4xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-600">
          {mode === 'public' ? (
            <><ShieldCheck size={18} className="text-emerald-600" /><span className="text-sm font-bold">Certificado verificado · {certId}</span></>
          ) : (
            <><Award size={18} className="text-amber-600" /><span className="text-sm font-bold">Seu certificado · {certId}</span></>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors">
            {copied ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} />}
            {copied ? 'Link copiado' : 'Copiar link de verificação'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-bold transition-colors" style={{ background: LBW.navy }}>
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Folha — imagem do Canva como fundo + sobreposição dos campos dinâmicos */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        className="cert-paper cert-bg-print relative w-full max-w-4xl overflow-hidden"
        style={{
          aspectRatio: '926 / 680',
          backgroundImage: `url(${MODELO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 6,
          boxShadow: '0 30px 80px -30px rgba(15,23,42,0.35)',
          fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Camada de texto, posicionada em % sobre a arte (escala junto com a folha) */}
        <div className="absolute inset-0" style={{ color: LBW.navy }}>

          {/* Logomarca LBW (topo centro) */}
          <div className="absolute w-full flex flex-col items-center" style={{ top: '11%' }}>
            <img src="/favicon.png" alt="Learning by Working" style={{ height: 'clamp(20px,3vw,34px)', width: 'auto' }} />
            <span style={{ fontSize: 'clamp(7px,1vw,11px)', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', color: '#5B6472', marginTop: 4 }}>
              Educação pelo Trabalho
            </span>
          </div>

          {/* Eyebrow */}
          <div className="absolute w-full text-center" style={{ top: '20%' }}>
            <span style={{ fontSize: 'clamp(8px,1.2vw,12px)', letterSpacing: '0.34em', fontWeight: 700, color: '#5B6472' }}>
              CERTIFICADO DE CONCLUSÃO
            </span>
          </div>

          {/* Certificamos que + nome do aluno */}
          <div className="absolute w-full text-center px-[14%]" style={{ top: '27%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(9px,1.3vw,13px)', color: '#5B6472' }}>Certificamos que</p>
            <p className="m-0 mt-1" style={{ fontFamily: "'Instrument Serif','Georgia',serif", fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(20px,3.1vw,36px)', color: LBW.blue }}>
              {alunoNome}
            </p>
          </div>

          {/* Frase de conclusão (trilha + carga + aprovação) */}
          <div className="absolute w-full text-center px-[15%]" style={{ top: '46%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(10px,1.45vw,16px)', color: '#3A4150', lineHeight: 1.5 }}>
              concluiu com êxito a formação <b style={{ color: LBW.navy }}>{nomeTrilha}</b>
              {carga ? <>, com carga horária de <b style={{ color: LBW.navy }}>{carga} horas</b></> : null}, tendo sido aprovado na avaliação final.
            </p>
          </div>

          {/* Data */}
          <div className="absolute w-full text-center" style={{ top: '62%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', color: '#5B6472' }}>
              {formatDataPorExtenso(issuedAt)}
            </p>
          </div>

          {/* Credenciais do Israel (acima da assinatura manuscrita da imagem) */}
          <div className="absolute w-full text-center" style={{ top: '69%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(11px,1.6vw,17px)', fontWeight: 800, color: LBW.navy }}>Israel Cavalcanti de Souza</p>
            <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', fontWeight: 700, color: LBW.navy }}>CEO Learning by Working</p>
            <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', fontWeight: 600, color: '#3A4150' }}>Consultor Sênior em Melhoria de Negócios</p>
          </div>

          {/* QR (canto inferior esquerdo, dentro da moldura) */}
          <div className="absolute flex items-end gap-2" style={{ left: '5%', bottom: '12%', maxWidth: '30%' }}>
            <div style={{ background: '#fff', padding: 3, borderRadius: 4, border: '1px solid #E2E8F0', flexShrink: 0 }}>
              <img src={qrUrl} alt={`Verificação ${certId}`} style={{ width: 'clamp(38px,5vw,62px)', height: 'clamp(38px,5vw,62px)', display: 'block' }} />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <p className="m-0" style={{ fontSize: 'clamp(6px,0.8vw,8.5px)', fontWeight: 700, letterSpacing: '0.1em', color: '#5B6472' }}>VERIFIQUE EM</p>
              <p className="m-0" style={{ fontSize: 'clamp(6px,0.8vw,8.5px)', fontFamily: 'monospace', color: '#5B6472', whiteSpace: 'nowrap' }}>{verifyUrl.replace(/^https?:\/\//, '').replace(/\/verificar\/.*$/, '')}</p>
            </div>
          </div>

          {/* Rodapé: link completo de verificação + Nº, numa linha só na base */}
          <div className="absolute w-full text-center" style={{ bottom: '3.5%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(6px,0.78vw,8.5px)', fontFamily: 'monospace', color: '#8A94A6', whiteSpace: 'nowrap' }}>
              {verifyUrl.replace(/^https?:\/\//, '')} · Nº {certId}
            </p>
          </div>
        </div>

        {/* Marca d'água "VERIFICADO" no modo público */}
        {mode === 'public' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'rotate(-20deg)' }}>
            <span style={{ fontSize: 'clamp(48px,10vw,120px)', fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(0,51,204,0.05)', textTransform: 'uppercase' }}>
              Verificado
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
