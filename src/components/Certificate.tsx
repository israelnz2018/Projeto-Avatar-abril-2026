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

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Printer, Link2, Check, Award, ShieldCheck } from 'lucide-react';
import { useConsultor } from '../contexts/ConsultorContext';
import { getConsultor } from '../services/consultorService';
import type { Consultor, ConsultorCertificateConfig } from '../types';

interface Props {
  alunoNome: string;
  initiativeName: string;
  /** ISO string */
  issuedAt: string;
  certId: string;
  mode?: 'student' | 'public';
  consultorId?: string;
  /** Usado pela tela de edição para prévia antes de salvar. */
  configOverride?: ConsultorCertificateConfig;
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

// Título FORMAL exibido no certificado (mais profissional que o nome comercial
// da landing). Indexado pelo número da trilha.
const TITULO_CERTIFICADO: Record<number, string> = {
  1: 'Sobreviva em uma Nova Área e se Destaque no Trabalho',
  2: 'Recomendação de Melhoria com Base em Dados',
  3: 'Gestão de Mudanças e Engajamento de Pessoas',
  4: 'Apresentações Eficazes',
  5: 'Gerenciamento de Risco Baseado em FMEA e PMI',
  6: 'Fundamentos Lean e Eliminação dos Desperdícios',
  7: 'Estatística Aplicada à Tomada de Decisão',
  8: 'Formação em Gestão de Projetos de Melhoria',
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

export default function Certificate({ alunoNome, initiativeName, issuedAt, certId, mode = 'student', consultorId, configOverride }: Props) {
  const { consultor: consultorAtual } = useConsultor();
  const [consultor, setConsultor] = useState<Consultor>(consultorAtual);

  useEffect(() => {
    if (!consultorId || consultorId === consultorAtual.id) {
      setConsultor(consultorAtual);
      return;
    }
    getConsultor(consultorId).then(setConsultor);
  }, [consultorId, consultorAtual]);

  const numero = extractTrilhaNumero(initiativeName);
  const isIsrael = consultor.id === 'israel';
  const carga = isIsrael ? CARGA_HORARIA[numero] : undefined;
  // Usa o título formal do certificado; cai pro nome da trilha se não houver mapa.
  const nomeTrilha = (consultor.id === 'israel' ? TITULO_CERTIFICADO[numero] : undefined)
    || initiativeName.replace(/^\d+\s*[-·]\s*/, '');
  const [copied, setCopied] = useState(false);
  // No LBW, somente o admin do app pode salvar estes dados; no site israel.* a tela
  // permanece somente leitura. Sem configuração salva, o modelo original é idêntico.
  const certificado = configOverride || consultor.certificado;
  const branding = consultor.branding;
  const usaFundoProprio = certificado?.modo === 'proprio' && !!certificado.fundoUrl;
  const fundo = isIsrael ? MODELO_BG : (usaFundoProprio ? certificado!.fundoUrl! : MODELO_BG);
  const corNavy = isIsrael ? LBW.navy : (branding?.cores?.navy || LBW.navy);
  const corBlue = isIsrael ? LBW.blue : (branding?.cores?.blue || LBW.blue);
  const corInk = isIsrael ? LBW.ink : (branding?.cores?.ink || LBW.ink);
  const corMuted = isIsrael ? '#5B6472' : (branding?.cores?.muted || '#5B6472');
  const instituicao = certificado?.instituicao || (isIsrael ? 'Educação pelo Trabalho' : (branding?.nome || consultor.nome));
  const emissorNome = certificado?.emissorNome || (isIsrael ? 'Israel Cavalcanti de Souza' : consultor.nome);
  const emissorCargo = certificado?.emissorCargo || (isIsrael ? 'CEO Learning by Working' : 'Responsável pela formação');

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
          html, body {
            background: white !important;
            margin: 0 !important; padding: 0 !important;
            width: 297mm !important; height: 210mm !important;
            overflow: hidden !important;
          }
          .no-print { display: none !important; }
          /* Esconde TUDO… */
          body * { visibility: hidden !important; }
          /* …e mostra só a folha do certificado. */
          .cert-paper, .cert-paper * { visibility: visible !important; }
          /* A folha preenche o A4 paisagem, página única (altura < 210mm evita 2ª folha). */
          .cert-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 297mm !important;
            height: 209mm !important;
            max-width: none !important;
            aspect-ratio: auto !important;
            overflow: hidden !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
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
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-bold transition-colors" style={{ background: corNavy }}>
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
          backgroundImage: `url(${fundo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 6,
          boxShadow: '0 30px 80px -30px rgba(15,23,42,0.35)',
          fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Camada de texto, posicionada em % sobre a arte (escala junto com a folha) */}
        {!usaFundoProprio && consultor.id !== 'israel' && (
          <div className="absolute bg-white" style={{ left: '38%', bottom: '8%', width: '28%', height: '16%' }} />
        )}

        <div className="absolute inset-0" style={{ color: corNavy }}>

          {/* Logomarca LBW (topo centro) */}
          <div className="absolute w-full flex flex-col items-center" style={{ top: '11%' }}>
            <img src={isIsrael ? '/favicon.png' : (branding?.logoUrl || '/favicon.png')} alt={instituicao} style={{ height: 'clamp(20px,3vw,34px)', maxWidth: '24%', objectFit: 'contain' }} />
            <span style={{ fontSize: 'clamp(7px,1vw,11px)', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', color: corMuted, marginTop: 4 }}>
              {instituicao}
            </span>
          </div>

          {/* Eyebrow */}
          <div className="absolute w-full text-center" style={{ top: '19.5%' }}>
            <span style={{ fontSize: 'clamp(11px,1.7vw,18px)', letterSpacing: '0.3em', fontWeight: 800, color: corMuted }}>
              CERTIFICADO DE CONCLUSÃO
            </span>
          </div>

          {/* Certificamos que + nome do aluno */}
          <div className="absolute w-full text-center px-[14%]" style={{ top: '27%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(9px,1.3vw,13px)', color: corMuted }}>Certificamos que</p>
            <p className="m-0 mt-1" style={{ fontFamily: "'Instrument Serif','Georgia',serif", fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(20px,3.1vw,36px)', color: LBW.blue }}>
              <span style={{ color: corBlue }}>{alunoNome}</span>
            </p>
          </div>

          {/* Frase de conclusão (trilha + carga + aprovação) */}
          <div className="absolute w-full text-center px-[15%]" style={{ top: '46%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(10px,1.45vw,16px)', color: corInk, lineHeight: 1.5 }}>
              concluiu com êxito a formação <b style={{ color: corNavy, textTransform: 'uppercase' }}>{nomeTrilha}</b>
              {carga ? <>, com carga horária de <b style={{ color: corNavy }}>{carga} horas</b></> : null}, tendo sido aprovado na avaliação final.
            </p>
          </div>

          {/* Data */}
          <div className="absolute w-full text-center" style={{ top: '62%' }}>
            <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', color: corMuted }}>
              {formatDataPorExtenso(issuedAt)}
            </p>
          </div>

          {isIsrael ? (
            <div className="absolute w-full text-center" style={{ top: '69%' }}>
              <p className="m-0" style={{ fontSize: 'clamp(11px,1.6vw,17px)', fontWeight: 800, color: corNavy }}>{emissorNome}</p>
              <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', fontWeight: 700, color: corNavy }}>{emissorCargo}</p>
              <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', fontWeight: 600, color: corInk }}>{certificado?.textoRodape || 'Consultor Sênior em Melhoria de Processos e Negócios'}</p>
            </div>
          ) : (
            <div className="absolute w-full text-center flex flex-col items-center" style={{ top: '68%' }}>
              {certificado?.assinaturaUrl && (
                <img src={certificado.assinaturaUrl} alt="Assinatura" style={{ height: 'clamp(24px,4vw,48px)', maxWidth: '24%', objectFit: 'contain', marginBottom: 2 }} />
              )}
              <p className="m-0" style={{ fontSize: 'clamp(11px,1.6vw,17px)', fontWeight: 800, color: corNavy }}>{emissorNome}</p>
              <p className="m-0" style={{ fontSize: 'clamp(8px,1.1vw,12px)', fontWeight: 700, color: corNavy }}>{emissorCargo}</p>
              {certificado?.textoRodape && (
                <p className="m-0" style={{ fontSize: 'clamp(7px,1vw,10px)', fontWeight: 600, color: corInk }}>{certificado.textoRodape}</p>
              )}
            </div>
          )}

          {/* QR + verificação: QR em cima, texto em 2 linhas logo abaixo */}
          <div className="absolute flex flex-col items-start" style={{ left: '8%', bottom: '13%' }}>
            <div style={{ background: '#fff', padding: 3, borderRadius: 4, border: '1px solid #E2E8F0' }}>
              <img src={qrUrl} alt={`Verificação ${certId}`} style={{ width: 'clamp(38px,5vw,62px)', height: 'clamp(38px,5vw,62px)', display: 'block' }} />
            </div>
            <p className="m-0 mt-1" style={{ fontSize: 'clamp(6px,0.78vw,8.5px)', fontFamily: 'monospace', color: corMuted, whiteSpace: 'nowrap', lineHeight: 1.4 }}>
              {verifyUrl.replace(/^https?:\/\//, '')}<br />Nº {certId}
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
