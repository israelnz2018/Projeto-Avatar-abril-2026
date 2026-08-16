/**
 * MinhaMarca — o consultor monta a própria marca: identidade (nome, mentor,
 * foto, logo, texto da marca) + modelo de PPT (nosso template com 3 cores OU template
 * próprio via upload). Salva em consultores/{consultorId} e o app re-veste ao
 * vivo (refresh). Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import JSZip from 'jszip';
import { Upload, Palette, AlertTriangle, User, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { uploadBrandingImage, BrandingAsset } from '../../services/brandingUploadService';

export default function MinhaMarca() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();

  const [nome, setNome] = useState('');
  const [slogan, setSlogan] = useState('');
  const [mentor, setMentor] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pptCapaUrl, setPptCapaUrl] = useState('');
  const [pptInternaUrl, setPptInternaUrl] = useState('');

  const [enviando, setEnviando] = useState<BrandingAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  // Pré-popula com a marca atual assim que carrega.
  useEffect(() => {
    const b = consultor.branding;
    setNome(b.nome || '');
    setSlogan(b.slogan || '');
    setMentor(consultor.mentorNome || '');
    setFotoUrl(b.fotoUrl || '');
    setLogoUrl(b.logoUrl || '');
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
      try {
        await setDoc(
          doc(db, 'consultores', consultorId),
          {
            mentorNome: mentor.trim(),
            branding: {
              ...consultor.branding,
              nome: nome.trim(),
              slogan: slogan.trim(),
              fotoUrl: fotoUrl.trim(),
              logoUrl: logoUrl.trim(),
              pptModo: 'proprio',
              pptCapaUrl: pptCapaUrl.trim(),
              pptInternaUrl: pptInternaUrl.trim(),
            },
            'onboarding.marca': true,
          },
          { merge: true }
        );
      } catch (e: any) {
        throw new Error(`Não foi possível salvar a marca do consultor “${consultorId}”: ${e?.message || e}`);
      }
      // Foto também no doc do usuário (comunidade e avatar).
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid), { fotoUrl: fotoUrl.trim() }, { merge: true });
        } catch (e: any) {
          throw new Error(`A marca foi salva, mas não foi possível atualizar a foto do perfil: ${e?.message || e}`);
        }
      }
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
          <label className={label}>Texto abaixo da logo</label>
          <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Ex.: Educação pelo Trabalho" className={campo} />
          <p className="text-xs text-gray-400 mt-1">
            Aparece no menu lateral, junto da sua logo. Se ficar vazio, usamos o padrão LBW: <b>Educação pelo Trabalho</b>.
          </p>
        </div>

        <div>
          <label className={label}>Nome do mentor (o "digital" da IA)</label>
          <input value={mentor} onChange={(e) => setMentor(e.target.value)} placeholder="Ex.: João Silva" className={campo} />
          <p className="text-xs text-gray-400 mt-1">É o nome que a IA usa ao se apresentar aos seus alunos.</p>
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
            Se você não enviar uma logo, o sistema usa a logo padrão LBW.
          </p>
        </div>
      </div>

      {/* ===== MODELO DE PPT ===== */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 mb-6">
        <h2 className="flex items-center gap-2 font-black text-gray-800"><Palette size={16} /> Modelo de PPT</h2>
        <p className="text-xs text-gray-500">Como os slides que seus alunos exportam vão parecer.</p>

        <div className="border border-gray-200 rounded-xl p-4">
          <span className="font-bold text-gray-800 text-sm">Seu template de PPT</span>
          <p className="text-xs text-gray-500 mt-1">
            Envie dois arquivos <b>PowerPoint .pptx</b>: a <b>capa</b> e a <b>página interna</b> (repetida em todos os slides de conteúdo).
          </p>
          <div className="mt-3 space-y-4">
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
              <b>Formato permitido: .PPTX</b> (PowerPoint moderno). Arquivos <b>.PPT</b> antigos e imagens não são aceitos neste modelo, pois não permitem inserir os dados mantendo o design editável.
              Se o seu arquivo estiver em .PPT, abra-o no PowerPoint e use <b>Arquivo → Salvar como → Apresentação do PowerPoint (.pptx)</b>. Envie os dois arquivos .pptx para ativar seu modelo; se faltar um deles, fica o modelo padrão LBW.
            </p>
          </div>
        </div>
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

function FundoUpload({ rotulo, url, carregando, onFile }: { rotulo: string; url: string; carregando: boolean; onFile: (f?: File) => void }) {
  const isPowerPoint = /\.pptx?(\?|$)/i.test(url);
  const [miniatura, setMiniatura] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let ativo = true;
    setMiniatura('');
    if (!url || !isPowerPoint) return;

    void (async () => {
      try {
        const resposta = await fetch(url);
        if (!resposta.ok) return;
        const zip = await JSZip.loadAsync(await resposta.arrayBuffer());
        const arquivo = Object.values(zip.files).find((item) => /(^|\/)thumbnail\.(jpe?g|png)$/i.test(item.name));
        if (!arquivo) return;
        objectUrl = URL.createObjectURL(await arquivo.async('blob'));
        if (ativo) setMiniatura(objectUrl);
      } catch {
        // Alguns PowerPoints não incluem miniatura; o arquivo continua disponível.
      }
    })();

    return () => {
      ativo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, isPowerPoint]);

  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">{rotulo}</div>
      <div className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden mb-2 grid place-items-center">
        {url ? (
          isPowerPoint
            ? (
              <div className="relative w-full h-full bg-slate-100">
                {miniatura && <img src={miniatura} alt={`Prévia: ${rotulo}`} className="w-full h-full object-cover" />}
                <iframe
                  title={`Prévia do PowerPoint: ${rotulo}`}
                  src="about:blank"
                  className="hidden"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-2 py-1 text-center text-[10px] font-bold text-white">
                  Prévia do PowerPoint
                </div>
              </div>
            )
            : <img src={url} alt={rotulo} className="w-full h-full object-cover" />
        ) : <span className="text-xs text-gray-300">Somente .PPTX</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <UploadArquivoBtn titulo={url ? 'Trocar' : 'Enviar'} carregando={carregando} onFile={onFile} />
        {url && isPowerPoint && (
          <a
            href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-sm font-bold text-blue-700 hover:bg-blue-50"
          >
            <ExternalLink size={15} /> Ver PowerPoint
          </a>
        )}
      </div>
    </div>
  );
}

function UploadArquivoBtn({ titulo, carregando, onFile }: { titulo: string; carregando: boolean; onFile: (f?: File) => void }) {
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
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </>
  );
}
