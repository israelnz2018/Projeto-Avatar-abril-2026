/**
 * MinhaMarca — o consultor monta a própria marca: identidade (nome, mentor,
 * sigla, foto, logo) + modelo de PPT (nosso template com 3 cores OU template
 * próprio via upload). Salva em consultores/{consultorId} e o app re-veste ao
 * vivo (refresh). Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Upload, Palette, AlertTriangle, User, Image as ImageIcon } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { uploadBrandingImage, BrandingAsset } from '../../services/brandingUploadService';

const comHash = (c?: string) => (c ? (c.startsWith('#') ? c : `#${c}`) : '');

export default function MinhaMarca() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();

  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [mentor, setMentor] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pptModo, setPptModo] = useState<'padrao' | 'proprio'>('padrao');
  const [corEscura, setCorEscura] = useState('#1E2D6E');
  const [corDestaque, setCorDestaque] = useState('#0033CC');
  const [corClara, setCorClara] = useState('#F0F2FA');
  const [pptCapaUrl, setPptCapaUrl] = useState('');
  const [pptInternaUrl, setPptInternaUrl] = useState('');

  const [enviando, setEnviando] = useState<BrandingAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  // Pré-popula com a marca atual assim que carrega.
  useEffect(() => {
    const b = consultor.branding;
    setNome(b.nome || '');
    setSigla(b.sigla || '');
    setMentor(consultor.mentorNome || '');
    setFotoUrl(b.fotoUrl || '');
    setLogoUrl(b.logoUrl || '');
    setPptModo(b.pptModo === 'proprio' ? 'proprio' : 'padrao');
    setCorEscura(comHash(b.cores?.navy) || '#1E2D6E');
    setCorDestaque(comHash(b.cores?.blue) || '#0033CC');
    setCorClara(comHash(b.cores?.light) || '#F0F2FA');
    setPptCapaUrl(b.pptCapaUrl || '');
    setPptInternaUrl(b.pptInternaUrl || '');
  }, [consultor]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor edita a marca.</div>;

  async function enviarImagem(file: File | undefined, tipo: BrandingAsset, aplicar: (url: string) => void) {
    if (!file) return;
    setEnviando(tipo);
    setMsg('');
    try {
      const url = await uploadBrandingImage(file, tipo);
      aplicar(url);
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setEnviando(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    setMsg('');
    try {
      await setDoc(
        doc(db, 'consultores', consultorId),
        {
          mentorNome: mentor.trim(),
          branding: {
            ...consultor.branding,
            nome: nome.trim(),
            sigla: sigla.trim().toUpperCase().slice(0, 7),
            fotoUrl: fotoUrl.trim(),
            logoUrl: logoUrl.trim(),
            pptModo,
            pptCapaUrl: pptCapaUrl.trim(),
            pptInternaUrl: pptInternaUrl.trim(),
            cores: {
              ...consultor.branding.cores,
              navy: corEscura,
              blue: corDestaque,
              light: corClara,
            },
          },
        },
        { merge: true }
      );
      // Foto também no doc do usuário (comunidade e avatar).
      const uid = auth.currentUser?.uid;
      if (uid) await setDoc(doc(db, 'users', uid), { fotoUrl: fotoUrl.trim() }, { merge: true });
      await refresh(); // re-veste o app ao vivo
      setMsg('✅ Marca salva. O app já atualizou.');
    } catch (e: any) {
      setMsg('❌ Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  const label = 'block text-xs font-black uppercase tracking-wide text-gray-500 mb-1';
  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Minha Marca</h1>
      <p className="text-gray-500 text-sm mb-6">
        A identidade do seu site (<b>{consultorId}.educacaopelotrabalho.com</b>). Salvou, o app re-veste na hora.
      </p>

      {/* ===== IDENTIDADE ===== */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 mb-6">
        <h2 className="flex items-center gap-2 font-black text-gray-800"><User size={16} /> Identidade</h2>

        <div>
          <label className={label}>Nome / empresa</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Consultoria João Silva" className={campo} />
        </div>

        <div>
          <label className={label}>Nome do mentor (o "digital" da IA)</label>
          <input value={mentor} onChange={(e) => setMentor(e.target.value)} placeholder="Ex.: João Silva" className={campo} />
          <p className="text-xs text-gray-400 mt-1">É o nome que a IA usa ao se apresentar aos seus alunos.</p>
        </div>

        <div>
          <label className={label}>Sigla</label>
          <input
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase().slice(0, 7))}
            placeholder="Ex.: JSC"
            className="w-40 border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Marca curta (até 7 letras) que aparece no <b>cabeçalho de cada slide</b> dos PPTs exportados —
            é assim que sua marca assina os relatórios. Hoje o Israel usa <b>“LBW”</b>.
          </p>
        </div>

        {/* FOTO — upload */}
        <div>
          <label className={label}>Sua foto (aparece no avatar, no lugar das iniciais)</label>
          <div className="flex items-center gap-4">
            {fotoUrl
              ? <img src={fotoUrl} alt="Prévia" className="h-16 w-16 rounded-full object-cover border border-gray-200" />
              : <div className="h-16 w-16 rounded-full bg-gray-100 grid place-items-center text-gray-300"><User size={26} /></div>}
            <UploadBtn
              titulo={fotoUrl ? 'Trocar foto' : 'Enviar foto'}
              carregando={enviando === 'foto'}
              onFile={(f) => enviarImagem(f, 'foto', setFotoUrl)}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">PNG ou JPG. Reduzimos pra até 512px automaticamente.</p>
        </div>

        {/* LOGO — upload */}
        <div>
          <label className={label}>Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl
              ? <img src={logoUrl} alt="Prévia do logo" className="h-14 w-auto max-w-[160px] object-contain border border-gray-100 rounded bg-gray-50 p-1" />
              : <div className="h-14 w-24 rounded bg-gray-100 grid place-items-center text-gray-300"><ImageIcon size={22} /></div>}
            <UploadBtn
              titulo={logoUrl ? 'Trocar logo' : 'Enviar logo'}
              carregando={enviando === 'logo'}
              onFile={(f) => enviarImagem(f, 'logo', setLogoUrl)}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Aparece no <b>cabeçalho do seu site</b>. Ideal PNG com fundo transparente — reduzimos pra até 600px, preservando a transparência.
            Nos slides do PPT, sua marca assina pela <b>sigla</b>.
          </p>
        </div>
      </div>

      {/* ===== MODELO DE PPT ===== */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 mb-6">
        <h2 className="flex items-center gap-2 font-black text-gray-800"><Palette size={16} /> Modelo de PPT</h2>
        <p className="text-xs text-gray-500">Como os slides que seus alunos exportam vão parecer.</p>

        {/* Opção 1 — nosso modelo */}
        <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${pptModo === 'padrao' ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-2">
            <input type="radio" name="pptModo" checked={pptModo === 'padrao'} onChange={() => setPptModo('padrao')} />
            <span className="font-bold text-gray-800 text-sm">Usar o nosso modelo + suas cores</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            O template pronto da plataforma, com a <b>sua sigla</b> no topo de cada slide (igual ao “LBW” do Israel). Escolha 3 cores:
          </p>
          {pptModo === 'padrao' && (
            <div className="grid grid-cols-3 gap-3 mt-3 ml-6">
              <CorPicker rotulo="Escura (cabeçalho)" valor={corEscura} onChange={setCorEscura} />
              <CorPicker rotulo="Destaque (chips/linhas)" valor={corDestaque} onChange={setCorDestaque} />
              <CorPicker rotulo="Clara (painéis)" valor={corClara} onChange={setCorClara} />
            </div>
          )}
        </label>

        {/* Opção 2 — template próprio */}
        <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${pptModo === 'proprio' ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-2">
            <input type="radio" name="pptModo" checked={pptModo === 'proprio'} onChange={() => setPptModo('proprio')} />
            <span className="font-bold text-gray-800 text-sm">Usar o meu próprio template</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Envie dois fundos de slide (16:9): a <b>capa</b> e a <b>página interna</b> (usada em todos os slides de conteúdo).
          </p>
          {pptModo === 'proprio' && (
            <div className="ml-6 mt-3 space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <b>Atenção:</b> a área útil do slide (cabeçalho, título, conteúdo e rodapé) é preenchida pela plataforma e
                  <b> pode conflitar com o design do seu template</b>. Deixe as bordas e o miolo do slide livres — evite textos
                  ou elementos importantes onde o conteúdo será inserido.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FundoUpload
                  rotulo="Capa"
                  url={pptCapaUrl}
                  carregando={enviando === 'ppt-capa'}
                  onFile={(f) => enviarImagem(f, 'ppt-capa', setPptCapaUrl)}
                />
                <FundoUpload
                  rotulo="Página interna"
                  url={pptInternaUrl}
                  carregando={enviando === 'ppt-interna'}
                  onFile={(f) => enviarImagem(f, 'ppt-interna', setPptInternaUrl)}
                />
              </div>
              <p className="text-xs text-gray-400">
                Enquanto ativamos a renderização do seu template nos slides, o PPT continua usando o modelo padrão com suas cores.
              </p>
            </div>
          )}
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={salvar}
          disabled={salvando || !!enviando}
          className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {salvando ? 'Salvando…' : 'Salvar marca'}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

/* ---------- sub-componentes ---------- */

function UploadBtn({ titulo, carregando, onFile }: { titulo: string; carregando: boolean; onFile: (f?: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={carregando}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        <Upload size={15} /> {carregando ? 'Enviando…' : titulo}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </>
  );
}

function CorPicker({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-gray-500 mb-1">{rotulo}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer bg-white" />
        <span className="text-xs text-gray-500 uppercase" style={{ fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
      </div>
    </div>
  );
}

function FundoUpload({ rotulo, url, carregando, onFile }: { rotulo: string; url: string; carregando: boolean; onFile: (f?: File) => void }) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">{rotulo}</div>
      <div className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden mb-2 grid place-items-center">
        {url ? <img src={url} alt={rotulo} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-300">16:9</span>}
      </div>
      <UploadBtn titulo={url ? 'Trocar' : 'Enviar'} carregando={carregando} onFile={onFile} />
    </div>
  );
}
