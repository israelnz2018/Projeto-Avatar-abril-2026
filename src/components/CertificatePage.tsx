/**
 * CertificatePage / VerificarPage — páginas que renderizam o Certificate.
 *
 * - CertificatePage (autenticada): rota /certificado/:initiativeId — mostra o cert do aluno logado.
 * - VerificarPage (pública): rota /verificar/:certId — qualquer pessoa abre pra confirmar autenticidade.
 *
 * Ambas usam o mesmo componente <Certificate>, mudando só o `mode`.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { getUserProgress, getCertificadoPublico, type CertificadoEmitido, type CertificadoPublico } from '../services/videoProgressService';
import { getEducationCourses } from '../services/educationCourseService';
import { getUserData } from '../services/userService';
import { useUserAccess } from '../hooks/useUserAccess';
import type { Initiative } from '../types';
import Certificate from './Certificate';
import { ShieldAlert, Award, ArrowLeft } from 'lucide-react';

// =============================================================================
// PÁGINA DO ALUNO — /certificado/:initiativeId
// =============================================================================

export function CertificatePage() {
  const { initiativeId } = useParams<{ initiativeId: string }>();
  const { isAdmin } = useUserAccess();
  const [cert, setCert] = useState<CertificadoEmitido | null>(null);
  const [previewInitiative, setPreviewInitiative] = useState<Initiative | null>(null);
  const [previewNome, setPreviewNome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !initiativeId) {
      setErro('Sessão inválida.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const p = await getUserProgress(uid);
        const c = p.certificadosEmitidos[initiativeId];
        if (c) {
          setCert(c);
          return;
        }
        // Admin override: gera preview pra testar o visual de cada curso sem precisar concluir.
        if (isAdmin) {
          const [inits, userData] = await Promise.all([getEducationCourses(), getUserData(uid)]);
          const init = inits.find(i => i.id === initiativeId);
          if (!init) {
            setErro('Curso não encontrado.');
            return;
          }
          setPreviewInitiative(init);
          setPreviewNome(userData?.nome || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Admin');
          return;
        }
        setErro('Você ainda não concluiu este curso. Volte ao Dashboard pra ver seu progresso.');
      } catch (err) {
        console.error('[CertificatePage]', err);
        setErro('Erro ao carregar certificado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [initiativeId, isAdmin]);

  if (loading) return <Loading />;

  // Modo preview (admin) — gera dados falsos só pra renderizar
  if (previewInitiative) {
    return (
      <>
        <PreviewBanner trilhaName={previewInitiative.name} />
        <Certificate
          alunoNome={previewNome}
          initiativeName={previewInitiative.name}
          initiativeId={previewInitiative.id}
          issuedAt={new Date().toISOString()}
          certId={`PREVIEW-${previewInitiative.id.slice(0, 6).toUpperCase()}`}
          mode="student"
          consultorId={previewInitiative.consultorId}
        />
      </>
    );
  }

  if (erro || !cert) return <EmptyState message={erro || 'Certificado não encontrado.'} />;

  return (
    <Certificate
      alunoNome={cert.alunoNomeAtIssue}
      initiativeName={cert.initiativeNameAtIssue}
      initiativeId={initiativeId}
      issuedAt={cert.issuedAt}
      certId={cert.certId}
      mode="student"
      consultorId={cert.consultorId}
    />
  );
}

/** Banner que avisa que é preview de admin. Oculto na impressão pra você ver o cert limpo. */
function PreviewBanner({ trilhaName }: { trilhaName: string }) {
  return (
    <div className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-xs font-bold">
      <span>⚠️</span>
      <span>MODO PREVIEW (admin) · {trilhaName} · não é certificado emitido</span>
    </div>
  );
}

// =============================================================================
// PÁGINA PÚBLICA — /verificar/:certId
// =============================================================================

export function VerificarPage() {
  const { certId } = useParams<{ certId: string }>();
  const [cert, setCert] = useState<CertificadoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [naoExiste, setNaoExiste] = useState(false);

  useEffect(() => {
    if (!certId) {
      setNaoExiste(true);
      setLoading(false);
      return;
    }
    getCertificadoPublico(certId).then(c => {
      if (!c) setNaoExiste(true);
      else setCert(c);
    }).catch(err => {
      console.error('[VerificarPage]', err);
      setNaoExiste(true);
    }).finally(() => setLoading(false));
  }, [certId]);

  if (loading) return <Loading />;

  if (naoExiste || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-900 m-0 mb-2">Certificado não encontrado</h1>
          <p className="text-sm text-slate-600 m-0 mb-6">
            O ID <span className="font-mono font-bold">{certId}</span> não existe em nossa base.
            Pode ser um link quebrado ou um certificado falso.
          </p>
          <a
            href="https://learningbyworking.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
          >
            Conheça a LBW
          </a>
        </div>
      </div>
    );
  }

  return (
    <Certificate
      alunoNome={cert.alunoNome}
      initiativeName={cert.initiativeName}
      initiativeId={cert.initiativeId}
      issuedAt={cert.issuedAt}
      certId={cert.certId}
      mode="public"
      consultorId={cert.consultorId}
    />
  );
}

// =============================================================================
// Helpers visuais
// =============================================================================

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-sm">Carregando certificado…</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <Award size={28} />
        </div>
        <h1 className="text-xl font-black text-slate-900 m-0 mb-2">Sem certificado por enquanto</h1>
        <p className="text-sm text-slate-600 m-0 mb-6">{message}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
        >
          <ArrowLeft size={14} /> Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
