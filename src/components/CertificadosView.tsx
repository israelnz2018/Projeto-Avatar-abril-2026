/** Editor completo e prévia do certificado white-label do consultor. */
import { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Award, BookOpen, FileUp, Image as ImageIcon, LockKeyhole, RotateCcw, Save, ShieldCheck, Type } from 'lucide-react';
import Certificate from './Certificate';
import { getInitiatives } from '../services/configService';
import { useConsultor } from '../contexts/ConsultorContext';
import { useUserAccess } from '../hooks/useUserAccess';
import { db } from '../lib/firebase';
import { uploadBrandingImage, type BrandingAsset } from '../services/brandingUploadService';
import type { ConsultorCertificateConfig, Initiative } from '../types';

const ALUNO_EXEMPLO = 'Maria da Silva';
const DATA_EXEMPLO = '2026-06-22T12:00:00.000Z';
const semPrefixo = (nome: string) => nome.replace(/^\d+\s*[-–—]?\s*/, '');

function montarConfig(config: ConsultorCertificateConfig | undefined, nome: string, consultorId: string, cores: any): ConsultorCertificateConfig {
  return {
    modo: config?.modo || (consultorId === 'israel' ? 'padrao' : 'proprio'),
    fundoUrl: config?.fundoUrl || '',
    assinaturaUrl: config?.assinaturaUrl || '',
    instituicao: config?.instituicao || nome,
    emissorNome: config?.emissorNome || nome,
    emissorCargo: config?.emissorCargo || 'Responsável pela formação',
    textoRodape: config?.textoRodape || '',
    titulo: config?.titulo || 'CERTIFICADO DE CONCLUSÃO',
    textoCertificamos: config?.textoCertificamos || 'Certificamos que',
    textoConclusao: config?.textoConclusao || 'concluiu com êxito o curso',
    textoAprovacao: config?.textoAprovacao || 'tendo sido aprovado na avaliação final.',
    corPrincipal: config?.corPrincipal || cores?.navy || '#1E2D6E',
    corDestaque: config?.corDestaque || cores?.blue || '#0033CC',
    corTexto: config?.corTexto || cores?.ink || '#0F172A',
    fonte: config?.fonte || 'moderna',
    mostrarLogo: config?.mostrarLogo !== false,
    mostrarAssinatura: config?.mostrarAssinatura !== false,
    mostrarQrCode: config?.mostrarQrCode !== false,
    cursos: config?.cursos || {},
    versao: config?.versao || 0,
  };
}

export default function CertificadosView() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAccess } = useUserAccess();
  const [cursos, setCursos] = useState<Initiative[]>([]);
  const [ativa, setAtiva] = useState(0);
  const [config, setConfig] = useState<ConsultorCertificateConfig>({ modo: 'padrao' });
  const [enviando, setEnviando] = useState<BrandingAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setConfig(montarConfig(consultor.certificado, consultor.branding?.nome || consultor.nome, consultorId, consultor.branding?.cores));
  }, [consultor, consultorId]);

  useEffect(() => {
    getInitiatives()
      .then((lista) => setCursos(lista.filter((curso) => !!curso.name).sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999))))
      .catch(() => setCursos([]))
      .finally(() => setCarregando(false));
  }, []);

  const patch = <K extends keyof ConsultorCertificateConfig>(key: K, value: ConsultorCertificateConfig[K]) =>
    setConfig((atual) => ({ ...atual, [key]: value }));

  const patchCurso = (cursoId: string, value: number) =>
    setConfig((atual) => ({
      ...atual,
      cursos: { ...atual.cursos, [cursoId]: { cargaHoraria: value } },
    }));

  async function enviar(file: File | undefined, tipo: BrandingAsset, key: 'fundoUrl' | 'assinaturaUrl') {
    if (!file) return;
    setEnviando(tipo);
    setMensagem('');
    try {
      patch(key, await uploadBrandingImage(file, tipo));
      setMensagem('✅ Imagem enviada. Salve o certificado para confirmar.');
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
        modo: config.fundoUrl ? 'proprio' : 'padrao',
        instituicao: config.instituicao?.trim(), emissorNome: config.emissorNome?.trim(),
        emissorCargo: config.emissorCargo?.trim(), textoRodape: config.textoRodape?.trim(),
        titulo: config.titulo?.trim(), textoCertificamos: config.textoCertificamos?.trim(),
        textoConclusao: config.textoConclusao?.trim(), textoAprovacao: config.textoAprovacao?.trim(),
        versao: (consultor.certificado?.versao || 0) + 1,
        atualizadoEm: new Date().toISOString(),
      };
      await setDoc(doc(db, 'consultores', consultorId), { certificado: novaConfig }, { merge: true });
      setConfig(novaConfig);
      await refresh();
      setMensagem('✅ Certificado salvo com sucesso.');
    } catch (error: any) {
      setMensagem(`❌ Erro ao salvar: ${error?.message || error}`);
    } finally {
      setSalvando(false);
    }
  }

  function restaurarPadrao() {
    if (!window.confirm('Restaurar o modelo padrão? As alterações ainda não salvas serão descartadas.')) return;
    setConfig(montarConfig(undefined, consultor.branding?.nome || consultor.nome, consultorId, consultor.branding?.cores));
    setMensagem('Modelo padrão carregado. Clique em salvar para confirmar.');
  }

  if (loadingAccess) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 font-bold text-red-600">Só o consultor edita o certificado.</div>;

  const cursoAtivo = cursos[ativa];
  const campo = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const label = 'mb-1 block text-xs font-black uppercase tracking-wide text-gray-500';

  return (
    <div className="mx-auto max-w-[1440px] p-6 pb-24">
      <div className="mb-1 flex items-center gap-3"><Award className="text-blue-700" /><h1 className="text-2xl font-black text-gray-900">Certificados</h1></div>
      <p className="mb-5 text-sm text-gray-500">Toda a edição do certificado fica aqui e é exclusiva deste consultor.</p>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <LockKeyhole className="mt-0.5 shrink-0" size={19} />
        <div><b>Campos automáticos protegidos:</b> nome do aluno, nome do curso, data de emissão, número do certificado e QR Code. Eles aparecem na prévia, mas não podem ser escritos ou adulterados pelo consultor.</div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <EditorTitle icon={<ImageIcon size={17} />} title="1. Modelo visual" />
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Envie PNG ou JPG em A4 paisagem. Deixe livres as áreas onde aparecerão os campos automáticos para evitar sobreposição.</div>
          <AssetUpload titulo="Fundo do certificado" descricao="PNG ou JPG — A4 paisagem." url={config.fundoUrl || ''} loading={enviando === 'certificado-fundo'} onFile={(file) => enviar(file, 'certificado-fundo', 'fundoUrl')} />

          <section className="border-t border-gray-100 pt-5">
            <EditorTitle icon={<Type size={17} />} title="2. Textos fixos" />
            <div className="mt-4 space-y-3">
              <Field label="Instituição (topo)" value={config.instituicao || ''} onChange={(v) => patch('instituicao', v)} campo={campo} />
              <Field label="Título" value={config.titulo || ''} onChange={(v) => patch('titulo', v)} campo={campo} />
              <Field label="Texto antes do nome" value={config.textoCertificamos || ''} onChange={(v) => patch('textoCertificamos', v)} campo={campo} />
              <Field label="Texto antes do nome do curso" value={config.textoConclusao || ''} onChange={(v) => patch('textoConclusao', v)} campo={campo} />
              <Field label="Texto de aprovação (depois da carga horária)" value={config.textoAprovacao || ''} onChange={(v) => patch('textoAprovacao', v)} campo={campo} />
              <Field label="Nome de quem assina" value={config.emissorNome || ''} onChange={(v) => patch('emissorNome', v)} campo={campo} />
              <Field label="Cargo abaixo do nome (ex.: CEO Learning by Working)" value={config.emissorCargo || ''} onChange={(v) => patch('emissorCargo', v)} campo={campo} />
              <Field label="Descrição profissional abaixo do cargo" value={config.textoRodape || ''} onChange={(v) => patch('textoRodape', v)} campo={campo} />
            </div>
          </section>

          <section className="border-t border-gray-100 pt-5">
            <EditorTitle icon={<Type size={17} />} title="3. Fonte" />
            <label className={`${label} mt-4`}>Fonte do certificado</label>
            <select className={campo} value={config.fonte || 'moderna'} onChange={(e) => patch('fonte', e.target.value as any)}><option value="moderna">Moderna</option><option value="classica">Clássica</option><option value="serifada">Serifada</option></select>
          </section>

          <section className="border-t border-gray-100 pt-5">
            <EditorTitle icon={<ShieldCheck size={17} />} title="4. Imagens e elementos" />
            <div className="mt-4"><AssetUpload titulo="Assinatura" descricao="PNG transparente recomendado." url={config.assinaturaUrl || ''} loading={enviando === 'certificado-assinatura'} onFile={(file) => enviar(file, 'certificado-assinatura', 'assinaturaUrl')} /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Toggle label="Logo" checked={config.mostrarLogo !== false} onChange={(v) => patch('mostrarLogo', v)} />
              <Toggle label="Assinatura" checked={config.mostrarAssinatura !== false} onChange={(v) => patch('mostrarAssinatura', v)} />
              <Toggle label="QR Code" checked={config.mostrarQrCode !== false} onChange={(v) => patch('mostrarQrCode', v)} />
            </div>
          </section>

          <section className="border-t border-gray-100 pt-5">
            <EditorTitle icon={<BookOpen size={17} />} title="5. Carga horária por curso" />
            <p className="mt-1 text-xs text-gray-500">O nome do curso é automático. Aqui o consultor informa somente a carga horária.</p>
            <div className="mt-3 space-y-2">
              {cursos.map((curso, index) => {
                const aberto = ativa === index;
                const regra = config.cursos?.[curso.id] || {};
                return <div key={curso.id} className="overflow-hidden rounded-xl border border-gray-200">
                  <button type="button" onClick={() => setAtiva(index)} className={`w-full border-0 px-3 py-3 text-left text-sm font-bold ${aberto ? 'bg-blue-50 text-blue-800' : 'bg-white text-gray-700'}`}>{curso.name}</button>
                  {aberto && <div className="space-y-3 border-t border-gray-100 bg-gray-50 p-3">
                    <div><label className={label}>Carga horária</label><input type="number" min="0" className={campo} value={regra.cargaHoraria ?? ''} placeholder="Ex.: 20" onChange={(e) => patchCurso(curso.id, Math.max(0, Number(e.target.value)))} /></div>
                  </div>}
                </div>;
              })}
            </div>
          </section>

          <div className="flex gap-2 border-t border-gray-100 pt-5">
            <button type="button" onClick={restaurarPadrao} className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"><RotateCcw size={16} /> Restaurar padrão</button>
            <button type="button" onClick={salvar} disabled={salvando || !!enviando} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"><Save size={16} /> {salvando ? 'Salvando…' : 'Salvar certificado'}</button>
          </div>
          {mensagem && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{mensagem}</p>}
        </div>

        <div className="min-w-0 xl:sticky xl:top-4">
          <div className="mb-3 flex items-center gap-2"><ImageIcon size={17} className="text-blue-600" /><h2 className="font-black text-gray-800">Prévia em tempo real</h2></div>
          {carregando ? <div className="text-gray-500">Carregando cursos…</div> : !cursoAtivo ? <div className="rounded-2xl border bg-white p-8 text-center text-gray-500">Crie um curso para visualizar o certificado.</div> : <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-2"><Certificate alunoNome={ALUNO_EXEMPLO} initiativeName={cursoAtivo.name} initiativeId={cursoAtivo.id} issuedAt={DATA_EXEMPLO} certId="EXEMPLO-PREVIEW" mode="student" consultorId={consultorId} configOverride={config} /></div>}
        </div>
      </div>
    </div>
  );
}

function EditorTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="flex items-center gap-2 font-black text-gray-900">{icon}{title}</div>; }
function Field({ label, value, onChange, campo }: { label: string; value: string; onChange: (value: string) => void; campo: string }) { return <div><label className="mb-1 block text-xs font-black uppercase tracking-wide text-gray-500">{label}</label><input className={campo} value={value} onChange={(e) => onChange(e.target.value)} /></div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-2 text-xs font-bold text-gray-700"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }

function AssetUpload({ titulo, descricao, url, loading, onFile }: { titulo: string; descricao: string; url: string; loading: boolean; onFile: (file?: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <div><div className="mb-1 text-xs font-black uppercase tracking-wide text-gray-500">{titulo}</div>{url && <img src={url} alt={titulo} className="mb-2 max-h-28 max-w-full rounded-lg border bg-gray-50 object-contain" />}<button type="button" disabled={loading} onClick={() => input.current?.click()} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><FileUp size={14} />{loading ? 'Enviando…' : url ? 'Trocar arquivo' : 'Enviar imagem'}</button><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} /><p className="mt-1 text-[11px] text-gray-400">{descricao}</p></div>;
}
