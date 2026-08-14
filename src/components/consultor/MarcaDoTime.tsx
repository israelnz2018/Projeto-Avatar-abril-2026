/** MarcaDoTime — escolha entre os dois fundos do consultor ou dois fundos próprios. */
import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { Building2, Download, FileImage, Upload, X } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { uploadBrandingImage, type BrandingAsset } from '../../services/brandingUploadService';

export default function MarcaDoTime() {
  const [searchParams] = useSearchParams();
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, isCoordenador, loading, empresaId, pptFonte, pptCapaUrl: capaSalva, pptInternaUrl: internaSalva } = useUserAccess();
  const modoPreview = searchParams.get('modo') === 'coordenador' && (isAdmin || isConsultor);
  const [times, setTimes] = useState<{ empresaId: string; nome: string }[]>([]);
  const [empresaPreview, setEmpresaPreview] = useState('');
  const [fonte, setFonte] = useState<'consultor' | 'proprio'>('consultor');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pptCapaUrl, setPptCapaUrl] = useState('');
  const [pptInternaUrl, setPptInternaUrl] = useState('');
  const [enviando, setEnviando] = useState<BrandingAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const empresaEfetiva = modoPreview ? empresaPreview : empresaId;

  useEffect(() => {
    if (modoPreview) return;
    setFonte(pptFonte === 'proprio' ? 'proprio' : 'consultor');
    setPptCapaUrl(capaSalva || '');
    setPptInternaUrl(internaSalva || '');
  }, [pptFonte, capaSalva, internaSalva, modoPreview]);

  useEffect(() => {
    if (!modoPreview) return;
    getDocs(query(collection(db, 'users'), where('consultorId', '==', consultorId), where('tipoUsuario', '==', 'coordenador')))
      .then((snap) => {
        const lista = snap.docs.map((item) => item.data() as any).filter((item) => item.empresaId).map((item) => ({ empresaId: String(item.empresaId), nome: String(item.empresaNome || item.nome || item.empresaId) }));
        setTimes(lista);
        setEmpresaPreview((atual) => atual || lista[0]?.empresaId || '');
      }).catch(() => setTimes([]));
  }, [modoPreview, consultorId]);

  useEffect(() => {
    if (!empresaEfetiva) return;
    getDoc(doc(db, 'team_branding', empresaEfetiva)).then((snap) => {
      if (!snap.exists()) {
        setNomeEmpresa(''); setLogoUrl(''); setFonte('consultor'); setPptCapaUrl(''); setPptInternaUrl('');
        return;
      }
      const data = snap.data() as any;
      setNomeEmpresa(typeof data.nomeEmpresa === 'string' ? data.nomeEmpresa : '');
      setLogoUrl(typeof data.logoUrl === 'string' ? data.logoUrl : '');
      setFonte(data.pptFonte === 'proprio' ? 'proprio' : 'consultor');
      setPptCapaUrl(typeof data.pptCapaUrl === 'string' ? data.pptCapaUrl : '');
      setPptInternaUrl(typeof data.pptInternaUrl === 'string' ? data.pptInternaUrl : '');
    }).catch(() => {});
  }, [empresaEfetiva]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isCoordenador && !modoPreview) return <div className="p-8 text-red-600 font-bold">Só o coordenador edita a marca do time.</div>;

  async function enviar(file: File | undefined, tipo: BrandingAsset, aplicar: (url: string) => void) {
    if (!file) return;
    setEnviando(tipo); setMsg('');
    try { aplicar(await uploadBrandingImage(file, tipo)); }
    catch (e: any) { setMsg('❌ ' + (e?.message || e)); }
    finally { setEnviando(null); }
  }

  async function salvar() {
    setMsg('');
    if (fonte === 'proprio' && (!pptCapaUrl || !pptInternaUrl)) {
      setMsg('❌ Envie a capa e o modelo dos demais slides antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      if (!auth.currentUser?.uid) throw new Error('Sessão expirada.');
      if (!empresaEfetiva) throw new Error('Selecione uma empresa/time.');
      await setDoc(doc(db, 'team_branding', empresaEfetiva), {
        empresaId: empresaEfetiva,
        consultorId,
        nomeEmpresa: nomeEmpresa.trim(),
        logoUrl: logoUrl || null,
        pptFonte: fonte,
        pptCapaUrl: fonte === 'proprio' ? pptCapaUrl : null,
        pptInternaUrl: fonte === 'proprio' ? pptInternaUrl : null,
        atualizadoEm: new Date().toISOString(),
      }, { merge: true });
      setMsg('✅ Modelo de PowerPoint salvo para todo o time.');
    } catch (e: any) { setMsg('❌ ' + (e?.message || e)); }
    finally { setSalvando(false); }
  }

  const capaConsultor = consultor.branding.pptCapaUrl || '';
  const internaConsultor = consultor.branding.pptInternaUrl || '';

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Marca do time (PPT)</h1>
      <p className="text-gray-500 text-sm mb-6">Escolha o modelo usado nos PowerPoints exportados pela sua turma.</p>

      {modoPreview && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-amber-700">Visualizar como coordenador do time</label>
          <select value={empresaPreview} onChange={(e) => setEmpresaPreview(e.target.value)} className="w-full max-w-md rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm">
            {times.length === 0 && <option value="">Nenhum coordenador cadastrado</option>}
            {times.map((time) => <option key={time.empresaId} value={time.empresaId}>{time.nome}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-5">
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-black text-gray-800 mb-1">Identidade da empresa/time</h2>
          <p className="text-sm text-gray-500 mb-4">Configure o nome e a logo que representam este time.</p>
          <div className="grid md:grid-cols-[1fr_auto] gap-5 items-end">
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Nome da empresa</label>
              <input
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                placeholder="Ex.: Empresa X"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-28 h-16 rounded-xl border border-gray-200 bg-gray-50 grid place-items-center overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Logo da empresa" className="max-w-full max-h-full object-contain p-1" /> : <Building2 size={24} className="text-gray-300" />}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <Upload size={14} />
                  {enviando === 'logo' ? 'Enviando...' : logoUrl ? 'Trocar logo' : 'Fazer upload'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { enviar(e.target.files?.[0], 'logo', setLogoUrl); e.target.value = ''; }} />
                </label>
                {logoUrl && <button type="button" onClick={() => setLogoUrl('')} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><X size={14} /> Remover</button>}
              </div>
            </div>
          </div>
        </section>

        <section className={`bg-white border rounded-2xl p-6 ${fonte === 'consultor' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="fontePpt" checked={fonte === 'consultor'} onChange={() => setFonte('consultor')} />
            <span className="font-black text-gray-800">Usar o modelo do consultor</span>
          </label>
          <p className="text-sm text-gray-500 mt-1 ml-6">Visualize e baixe os dois slides do modelo de <b>{consultor.branding.nome}</b>.</p>
          <div className="grid sm:grid-cols-2 gap-5 mt-5 ml-6">
            <ModeloConsultor numero="1" titulo="Capa" url={capaConsultor} />
            <ModeloConsultor numero="2" titulo="Demais slides" url={internaConsultor} />
          </div>
        </section>

        <section className={`bg-white border rounded-2xl p-6 ${fonte === 'proprio' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="fontePpt" checked={fonte === 'proprio'} onChange={() => setFonte('proprio')} />
            <span className="font-black text-gray-800">Usar o meu próprio PPT</span>
          </label>
          <p className="text-sm text-gray-500 mt-1 ml-6">Envie obrigatoriamente os dois fundos no formato 16:9.</p>

          {fonte === 'proprio' && <div className="grid md:grid-cols-2 gap-6 mt-5 ml-6">
            <FundoUpload rotulo="1. Upload da capa" url={pptCapaUrl} carregando={enviando === 'ppt-capa'} onFile={(f) => enviar(f, 'ppt-capa', setPptCapaUrl)} />
            <div>
              <FundoUpload rotulo="2. Upload do restante" url={pptInternaUrl} carregando={enviando === 'ppt-interna'} onFile={(f) => enviar(f, 'ppt-interna', setPptInternaUrl)} />
              <AreaSegura />
            </div>
          </div>}
        </section>

        <div className="flex items-center gap-4">
          <button onClick={salvar} disabled={salvando || !!enviando} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
            {salvando ? 'Salvando…' : 'Salvar modelo do time'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

function ModeloConsultor({ numero, titulo, url }: { numero: string; titulo: string; url: string }) {
  return <div>
    <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Slide {numero} — {titulo}</div>
    <div className="aspect-video rounded-xl border border-gray-200 bg-gray-50 overflow-hidden grid place-items-center">
      {url ? <img src={url} alt={`Slide ${numero}: ${titulo}`} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 px-4 text-center">O consultor ainda não enviou este slide.</span>}
    </div>
    {url && <a href={url} download target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800"><Download size={14} /> Baixar slide</a>}
  </div>;
}

function FundoUpload({ rotulo, url, carregando, onFile }: { rotulo: string; url: string; carregando: boolean; onFile: (f?: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return <div>
    <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">{rotulo}</div>
    <div className="aspect-video rounded-xl border border-gray-200 bg-gray-50 overflow-hidden grid place-items-center mb-2">
      {url ? <img src={url} alt={rotulo} className="w-full h-full object-cover" /> : <FileImage size={30} className="text-gray-300" />}
    </div>
    <button type="button" onClick={() => ref.current?.click()} disabled={carregando} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
      <Upload size={15} /> {carregando ? 'Enviando…' : url ? 'Trocar arquivo' : 'Selecionar arquivo'}
    </button>
    <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
  </div>;
}

function AreaSegura() {
  return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
    <div className="text-xs font-black text-amber-900 mb-2">Área que deve ficar livre no segundo slide</div>
    <div className="aspect-video relative rounded-md bg-slate-700 border-2 border-slate-800 overflow-hidden shadow-inner">
      <div className="absolute inset-x-[8%] top-[16%] bottom-[12%] rounded border-2 border-dashed border-emerald-400 bg-emerald-100/90 grid place-items-center text-center px-3">
        <span className="text-[10px] sm:text-xs font-black text-emerald-800">ÁREA LIVRE PARA<br />TÍTULOS, GRÁFICOS E DADOS</span>
      </div>
      <span className="absolute top-1 left-2 text-[8px] text-white/80">Sua identidade pode ficar nas bordas</span>
    </div>
    <p className="text-[11px] leading-relaxed text-amber-900 font-bold mt-2">
      Importante: nao coloque logo, textos, imagens ou elementos decorativos dentro da area util.
    </p>
    <p className="text-[11px] leading-relaxed text-amber-800 mt-1">
      Os dados automaticos do slide serao inseridos nessa regiao e qualquer item ali pode causar sobreposicionamento.
    </p>
    <p className="text-[11px] leading-relaxed text-amber-800 mt-2">No modelo dos demais slides, deixe o centro livre. Use logotipo, faixas e elementos decorativos somente nas bordas para não conflitar com o conteúdo inserido automaticamente.</p>
  </div>;
}
