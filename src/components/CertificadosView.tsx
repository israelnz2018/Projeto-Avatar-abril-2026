/** Configuração e prévia do certificado white-label do consultor. */
import { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Award, FileUp, Image as ImageIcon, Save, ShieldCheck } from 'lucide-react';
import Certificate from './Certificate';
import { getInitiatives } from '../services/configService';
import { useConsultor } from '../contexts/ConsultorContext';
import { useUserAccess } from '../hooks/useUserAccess';
import { db } from '../lib/firebase';
import { uploadBrandingImage, type BrandingAsset } from '../services/brandingUploadService';
import type { ConsultorCertificateConfig } from '../types';
import { isSiteConsultor } from '../services/consultorService';

const ALUNO_EXEMPLO = 'Francisco Cavalcanti de Souza';
const DATA_EXEMPLO = '2026-06-22T12:00:00.000Z';
const semPrefixo = (n: string) => n.replace(/^\d+\s*[-—]?\s*/, '');

export default function CertificadosView() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAccess } = useUserAccess();
  const [cursos, setCursos] = useState<string[]>([]);
  const [ativa, setAtiva] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [config, setConfig] = useState<ConsultorCertificateConfig>({ modo: 'padrao' });
  const [enviando, setEnviando] = useState<BrandingAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    setConfig({
      modo: consultor.certificado?.modo || 'padrao',
      fundoUrl: consultor.certificado?.fundoUrl || '',
      assinaturaUrl: consultor.certificado?.assinaturaUrl || '',
      instituicao: consultor.certificado?.instituicao || consultor.branding?.nome || consultor.nome,
      emissorNome: consultor.certificado?.emissorNome || (consultorId === 'israel' ? 'Israel Cavalcanti de Souza' : consultor.nome),
      emissorCargo: consultor.certificado?.emissorCargo || (consultorId === 'israel' ? 'CEO Learning by Working' : 'Responsável pela formação'),
      textoRodape: consultor.certificado?.textoRodape || '',
      versao: consultor.certificado?.versao || 0,
    });
  }, [consultor, consultorId]);

  useEffect(() => {
    getInitiatives()
      .then((inits) => setCursos(inits.map((i) => i.name).filter(Boolean)))
      .catch(() => setCursos([]))
      .finally(() => setCarregando(false));
  }, []);

  const patch = <K extends keyof ConsultorCertificateConfig>(key: K, value: ConsultorCertificateConfig[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));

  async function enviar(file: File | undefined, tipo: BrandingAsset, key: 'fundoUrl' | 'assinaturaUrl') {
    if (!file) return;
    setEnviando(tipo);
    setMensagem('');
    try {
      const url = await uploadBrandingImage(file, tipo);
      patch(key, url);
    } catch (error: any) {
      setMensagem(`❌ ${error?.message || 'Erro ao enviar imagem.'}`);
    } finally {
      setEnviando(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    setMensagem('');
    try {
      const novaConfig: ConsultorCertificateConfig = {
        ...config,
        instituicao: config.instituicao?.trim(),
        emissorNome: config.emissorNome?.trim(),
        emissorCargo: config.emissorCargo?.trim(),
        textoRodape: config.textoRodape?.trim(),
        versao: (consultor.certificado?.versao || 0) + 1,
        atualizadoEm: new Date().toISOString(),
      };
      await setDoc(doc(db, 'consultores', consultorId), { certificado: novaConfig }, { merge: true });
      setConfig(novaConfig);
      await refresh();
      setMensagem('✅ Modelo de certificado salvo.');
    } catch (error: any) {
      setMensagem(`❌ Erro ao salvar: ${error?.message || error}`);
    } finally {
      setSalvando(false);
    }
  }

  if (loadingAccess) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor edita o certificado.</div>;
  // No subdomínio israel.* o certificado LBW é somente leitura. A edição dos
  // dados oficiais da LBW existe exclusivamente no hub administrativo app.*.
  if (consultorId === 'israel' && isSiteConsultor()) {
    return <IsraelCertificatePreview cursos={cursos} ativa={ativa} setAtiva={setAtiva} carregando={carregando} />;
  }

  const isLbwAdmin = consultorId === 'israel';

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'mb-1 block text-xs font-black uppercase tracking-wide text-gray-500';

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-1 flex items-center gap-3">
        <Award className="h-6 w-6 text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Certificados</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {isLbwAdmin
          ? 'Edite os dados institucionais do certificado oficial LBW. O modelo visual e os campos de validação permanecem protegidos.'
          : 'Personalize a identidade do certificado. Nome do aluno, curso, carga horária, data, número e QR Code permanecem protegidos pela plataforma.'}
      </p>

      <div className="mb-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-black text-gray-800">{isLbwAdmin ? 'Certificado oficial LBW' : '1. Escolha o modelo'}</h2>
            <p className="mt-1 text-xs text-gray-500">A configuração vale para todos os seus cursos.</p>
          </div>

          {!isLbwAdmin && <label className={`block cursor-pointer rounded-xl border p-4 ${config.modo === 'padrao' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <input type="radio" checked={config.modo === 'padrao'} onChange={() => patch('modo', 'padrao')} />
              Modelo padrão da plataforma
            </div>
            <p className="ml-6 mt-1 text-xs text-gray-500">Usa a arte profissional da plataforma com seu logo, suas cores e seus dados.</p>
          </label>}

          {!isLbwAdmin && <label className={`block cursor-pointer rounded-xl border p-4 ${config.modo === 'proprio' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <input type="radio" checked={config.modo === 'proprio'} onChange={() => patch('modo', 'proprio')} />
              Meu próprio design
            </div>
            <p className="ml-6 mt-1 text-xs text-gray-500">Crie no PowerPoint ou Canva, exporte em PNG/JPG no formato A4 paisagem e envie abaixo.</p>
          </label>}

          {!isLbwAdmin && config.modo === 'proprio' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              Deixe o centro e o canto inferior esquerdo livres. A plataforma colocará os dados oficiais e o QR Code sobre a sua arte.
            </div>
          )}

          {!isLbwAdmin && <AssetUpload
            titulo="Fundo do certificado"
            descricao="PNG ou JPG em A4 paisagem (proporção aproximada 1,414:1)."
            url={config.fundoUrl || ''}
            disabled={config.modo !== 'proprio'}
            loading={enviando === 'certificado-fundo'}
            onFile={(file) => enviar(file, 'certificado-fundo', 'fundoUrl')}
          />}

          <div className="border-t border-gray-100 pt-5">
            <h2 className="mb-4 font-black text-gray-800">{isLbwAdmin ? 'Dados institucionais e do emissor' : '2. Dados do emissor'}</h2>
            <div className="space-y-3">
              <div><label className={label}>Instituição</label><input className={campo} value={config.instituicao || ''} onChange={(e) => patch('instituicao', e.target.value)} /></div>
              <div><label className={label}>Nome de quem assina</label><input className={campo} value={config.emissorNome || ''} onChange={(e) => patch('emissorNome', e.target.value)} /></div>
              <div><label className={label}>Cargo</label><input className={campo} value={config.emissorCargo || ''} onChange={(e) => patch('emissorCargo', e.target.value)} /></div>
              <div><label className={label}>Texto complementar</label><input className={campo} value={config.textoRodape || ''} onChange={(e) => patch('textoRodape', e.target.value)} placeholder="Ex.: Consultor Sênior em Melhoria de Processos" /></div>
            </div>
          </div>

          {!isLbwAdmin && <AssetUpload
            titulo="Assinatura"
            descricao="Prefira PNG com fundo transparente."
            url={config.assinaturaUrl || ''}
            loading={enviando === 'certificado-assinatura'}
            onFile={(file) => enviar(file, 'certificado-assinatura', 'assinaturaUrl')}
          />}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex gap-2 text-xs text-emerald-800"><ShieldCheck size={16} className="shrink-0" /><span>Os campos oficiais não fazem parte da imagem enviada e não podem ser alterados pelo consultor.</span></div>
          </div>

          <button onClick={salvar} disabled={salvando || !!enviando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">
            <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar modelo de certificado'}
          </button>
          {mensagem && <p className="text-sm text-gray-600">{mensagem}</p>}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2"><ImageIcon size={17} className="text-blue-600" /><h2 className="font-black text-gray-800">Prévia com dados protegidos</h2></div>
          {carregando ? <div className="text-gray-500">Carregando cursos…</div> : cursos.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Crie um curso para visualizar o certificado.</div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {cursos.map((nome, index) => (
                  <button key={nome} onClick={() => setAtiva(index)} className={`max-w-[220px] truncate rounded-lg border px-3 py-2 text-xs font-semibold ${ativa === index ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600'}`}>{semPrefixo(nome)}</button>
                ))}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-2">
                <Certificate alunoNome={ALUNO_EXEMPLO} initiativeName={cursos[ativa] || ''} issuedAt={DATA_EXEMPLO} certId="EXEMPLO-PREVIEW" mode="public" consultorId={consultorId} configOverride={config} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IsraelCertificatePreview({ cursos, ativa, setAtiva, carregando }: {
  cursos: string[]; ativa: number; setAtiva: (index: number) => void; carregando: boolean;
}) {
  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-1 flex items-center gap-3"><Award className="h-6 w-6 text-blue-700" /><h1 className="text-2xl font-bold text-gray-900">Certificados</h1></div>
      <p className="mb-6 text-sm text-gray-500">Prévia do certificado oficial LBW. Este modelo permanece protegido e sem alterações.</p>
      {carregando ? <div className="text-gray-500">Carregando cursos…</div> : cursos.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Nenhum curso disponível.</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {cursos.map((nome, index) => (
              <button key={nome} onClick={() => setAtiva(index)} className={`max-w-[220px] truncate rounded-lg border px-3 py-2 text-xs font-semibold ${ativa === index ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600'}`}>{semPrefixo(nome)}</button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <Certificate alunoNome={ALUNO_EXEMPLO} initiativeName={cursos[ativa] || ''} issuedAt={DATA_EXEMPLO} certId="EXEMPLO-PREVIEW" mode="public" consultorId="israel" />
          </div>
        </>
      )}
    </div>
  );
}

function AssetUpload({ titulo, descricao, url, loading, disabled = false, onFile }: {
  titulo: string; descricao: string; url: string; loading: boolean; disabled?: boolean; onFile: (file?: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={disabled ? 'opacity-45' : ''}>
      <div className="mb-1 text-xs font-black uppercase tracking-wide text-gray-500">{titulo}</div>
      {url && <img src={url} alt={titulo} className="mb-2 max-h-28 max-w-full rounded-lg border border-gray-200 bg-gray-50 object-contain" />}
      <button type="button" disabled={disabled || loading} onClick={() => input.current?.click()} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed">
        <FileUp size={14} /> {loading ? 'Enviando…' : url ? 'Trocar arquivo' : 'Enviar imagem'}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <p className="mt-1 text-[11px] text-gray-400">{descricao}</p>
    </div>
  );
}
