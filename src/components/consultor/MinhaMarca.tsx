/**
 * Modelo de PPT do consultor. A identidade da empresa e da IA fica em Meu Perfil.
 */
import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Upload, Palette, AlertTriangle, ExternalLink } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { uploadBrandingImage, uploadPptPrevia, BrandingAsset } from '../../services/brandingUploadService';
import { gerarPreviaPptx } from '../../services/pptPreviewService';

export default function MinhaMarca() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();

  const [pptCapaUrl, setPptCapaUrl] = useState('');
  const [pptInternaUrl, setPptInternaUrl] = useState('');
  const [pptCapaPreviaUrl, setPptCapaPreviaUrl] = useState('');
  const [pptInternaPreviaUrl, setPptInternaPreviaUrl] = useState('');

  const [enviando, setEnviando] = useState<BrandingAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  // Pré-popula com a marca atual assim que carrega.
  useEffect(() => {
    const b = consultor.branding;
    setPptCapaUrl(b.pptCapaUrl || '');
    setPptInternaUrl(b.pptInternaUrl || '');
    setPptCapaPreviaUrl(b.pptCapaPreviaUrl || '');
    setPptInternaPreviaUrl(b.pptInternaPreviaUrl || '');
  }, [consultor]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor edita a marca.</div>;

  async function enviarImagem(
    file: File | undefined,
    tipo: BrandingAsset,
    aplicar: (url: string) => void,
    aplicarPrevia?: (url: string) => void,
  ) {
    if (!file) return;
    setEnviando(tipo);
    setMsg('');
    try {
      const url = await uploadBrandingImage(file, tipo);
      aplicar(url);
      // Prévia do .pptx: gerada aqui, do arquivo em memória, logo depois do upload.
      // Se falhar não atrapalha — o template já subiu, só fica sem miniatura.
      if (aplicarPrevia && (tipo === 'ppt-capa' || tipo === 'ppt-interna')) {
        aplicarPrevia(await uploadPptPrevia(file, tipo));
      }
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
            branding: {
              ...consultor.branding,
              pptModo: 'proprio',
              pptCapaUrl: pptCapaUrl.trim(),
              pptInternaUrl: pptInternaUrl.trim(),
              pptCapaPreviaUrl: pptCapaPreviaUrl.trim(),
              pptInternaPreviaUrl: pptInternaPreviaUrl.trim(),
            },
            'onboarding.marca': true,
          },
          { merge: true }
        );
      } catch (e: any) {
        throw new Error(`Não foi possível salvar o modelo de PPT do consultor “${consultorId}”: ${e?.message || e}`);
      }
      await refresh(); // re-veste o app ao vivo
      setMsg('✅ Modelo de PPT salvo. O app já atualizou.');
    } catch (e: any) {
      setMsg('❌ Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Modelo de PPT</h1>
      <p className="text-gray-500 text-sm mb-6">
        Envie os modelos usados nos slides exportados pelos seus alunos.
      </p>

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
                previaUrl={pptCapaPreviaUrl}
                consultorId={consultorId}
                arquivoModelo="capa.pptx"
                carregando={enviando === 'ppt-capa'}
                onFile={(f) => enviarImagem(f, 'ppt-capa', setPptCapaUrl, setPptCapaPreviaUrl)}
              />
              <FundoUpload
                rotulo="Página interna"
                url={pptInternaUrl}
                previaUrl={pptInternaPreviaUrl}
                consultorId={consultorId}
                arquivoModelo="pagina-interna.pptx"
                carregando={enviando === 'ppt-interna'}
                onFile={(f) => enviarImagem(f, 'ppt-interna', setPptInternaUrl, setPptInternaPreviaUrl)}
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
          {salvando ? 'Salvando…' : 'Salvar modelo de PPT'}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

function FundoUpload({ rotulo, url, previaUrl, consultorId, arquivoModelo, carregando, onFile }: {
  rotulo: string; url: string; previaUrl: string; consultorId: string; arquivoModelo: string; carregando: boolean; onFile: (f?: File) => void;
}) {
  const isPowerPoint = /\.pptx?(\?|$)/i.test(url);
  const [miniatura, setMiniatura] = useState('');
  const [urlVisualizacao, setUrlVisualizacao] = useState('');
  const urlOffice = urlVisualizacao
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(urlVisualizacao)}`
    : '';
  const urlOfficeEmbed = urlVisualizacao
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlVisualizacao)}`
    : '';

  useEffect(() => {
    let ativo = true;
    setUrlVisualizacao('');
    if (!url || !isPowerPoint) return;

    void (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) return;
        const resposta = await fetch('/api/ppt/modelo-url', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ consultorId, arquivo: arquivoModelo }),
        });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (ativo && dados.caminho) setUrlVisualizacao(new URL(dados.caminho, window.location.origin).href);
      } catch {
        // O botão permanece indisponível se não for possível criar o acesso temporário.
      }
    })();

    return () => { ativo = false; };
  }, [url, isPowerPoint, consultorId, arquivoModelo]);

  useEffect(() => {
    let objectUrl = '';
    let ativo = true;
    setMiniatura('');
    // Com a prévia já gerada no upload não precisa reler o arquivo do Storage
    // (leitura que, além de desnecessária, costuma esbarrar em CORS).
    if (!url || !isPowerPoint || previaUrl) return;

    void (async () => {
      try {
        // Template enviado ANTES da prévia existir: tenta reler do Storage e gerar
        // agora. Pode falhar por CORS — nesse caso o card orienta a reenviar.
        const resposta = await fetch(url);
        if (!resposta.ok) return;
        const blob = await gerarPreviaPptx(await resposta.blob());
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        if (ativo) setMiniatura(objectUrl);
      } catch {
        // Alguns PowerPoints não incluem miniatura; o arquivo continua disponível.
      }
    })();

    return () => {
      ativo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, isPowerPoint, previaUrl]);

  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">{rotulo}</div>
      <div className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden mb-2 grid place-items-center">
        {url ? (
          isPowerPoint
            ? (
              <div className="relative w-full h-full bg-slate-100">
                {/* Ordem: prévia gerada no upload (sempre funciona) → miniatura lida do
                    arquivo → visualizador do Office. As duas últimas são fallback pra
                    templates enviados antes da prévia existir. */}
                {previaUrl || miniatura ? (
                  <img src={previaUrl || miniatura} alt={`Prévia: ${rotulo}`} className="w-full h-full object-contain bg-white" />
                ) : urlOfficeEmbed ? (
                  <iframe
                    title={`Prévia do PowerPoint: ${rotulo}`}
                    src={urlOfficeEmbed}
                    className="w-full h-full border-0 pointer-events-none"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center px-3 text-center text-[11px] font-bold text-gray-400">
                    Envie o arquivo de novo pra gerar a prévia
                  </div>
                )}
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
        {url && isPowerPoint && urlOffice && (
          <a
            href={urlOffice}
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
