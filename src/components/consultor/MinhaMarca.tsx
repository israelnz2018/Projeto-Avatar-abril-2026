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
  const [importando, setImportando] = useState<BrandingAsset | null>(null);
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

  async function importarGoogleSlides(
    link: string,
    tipo: 'ppt-capa' | 'ppt-interna',
    aplicar: (url: string) => void,
    aplicarPrevia: (url: string) => void,
  ) {
    setImportando(tipo);
    setMsg('');
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Você precisa estar logado.');
      const resposta = await fetch('/api/ppt/importar-google-slides', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ consultorId, tipo, url: link.trim() }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || `HTTP ${resposta.status}`);
      aplicar(String(dados.url || ''));
      aplicarPrevia('');
      await refresh();
      setMsg('✅ Google Slides importado e salvo como modelo editável de PowerPoint.');
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setImportando(null);
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
                salvo={pptCapaUrl === (consultor.branding.pptCapaUrl || '')}
                carregando={enviando === 'ppt-capa'}
                importando={importando === 'ppt-capa'}
                onFile={(f) => enviarImagem(f, 'ppt-capa', setPptCapaUrl, setPptCapaPreviaUrl)}
                onGoogleSlides={(link) => importarGoogleSlides(link, 'ppt-capa', setPptCapaUrl, setPptCapaPreviaUrl)}
              />
              <FundoUpload
                rotulo="Página interna"
                url={pptInternaUrl}
                previaUrl={pptInternaPreviaUrl}
                consultorId={consultorId}
                arquivoModelo="pagina-interna.pptx"
                salvo={pptInternaUrl === (consultor.branding.pptInternaUrl || '')}
                carregando={enviando === 'ppt-interna'}
                importando={importando === 'ppt-interna'}
                onFile={(f) => enviarImagem(f, 'ppt-interna', setPptInternaUrl, setPptInternaPreviaUrl)}
                onGoogleSlides={(link) => importarGoogleSlides(link, 'ppt-interna', setPptInternaUrl, setPptInternaPreviaUrl)}
              />
            </div>
            <p className="text-xs text-gray-400">
              Aceita <b>PowerPoint .PPTX</b> ou um <b>link do Google Slides</b>. O Google Slides é convertido para PPTX para que os PowerPoints gerados pelos alunos continuem editáveis.
              Em cada link, o primeiro slide será usado como o modelo daquele cartão. Arquivos .PPT antigos e imagens não são aceitos.
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

function FundoUpload({
  rotulo, url, previaUrl, consultorId, arquivoModelo, salvo, carregando, importando, onFile, onGoogleSlides,
}: {
  rotulo: string;
  url: string;
  previaUrl: string;
  consultorId: string;
  arquivoModelo: string;
  salvo: boolean;
  carregando: boolean;
  importando: boolean;
  onFile: (f?: File) => void;
  onGoogleSlides: (link: string) => void;
}) {
  const isPowerPoint = /\.pptx?(\?|$)/i.test(url);
  const [miniatura, setMiniatura] = useState('');
  const [tentativaPreviaConcluida, setTentativaPreviaConcluida] = useState(false);
  const [urlVisualizacao, setUrlVisualizacao] = useState('');
  const [linkGoogle, setLinkGoogle] = useState('');
  const urlOffice = urlVisualizacao
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(urlVisualizacao)}`
    : '';
  const urlOfficeEmbed = urlVisualizacao
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlVisualizacao)}`
    : '';

  useEffect(() => {
    let ativo = true;
    setUrlVisualizacao('');
    if (!url || !isPowerPoint || !salvo) return;

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
  }, [url, isPowerPoint, salvo, consultorId, arquivoModelo]);

  useEffect(() => {
    let objectUrl = '';
    let ativo = true;
    setMiniatura('');
    setTentativaPreviaConcluida(false);
    // A leitura passa pelo endereço temporário da própria plataforma. Buscar a
    // URL do Storage direto daqui é bloqueado por CORS em alguns navegadores.
    if (!urlVisualizacao) return;

    void (async () => {
      try {
        const resposta = await fetch(urlVisualizacao);
        if (!resposta.ok) return;
        const blob = await gerarPreviaPptx(await resposta.blob());
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        if (ativo) setMiniatura(objectUrl);
      } catch {
        // O visualizador do Office continua sendo o último fallback.
      } finally {
        if (ativo) setTentativaPreviaConcluida(true);
      }
    })();

    return () => {
      ativo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [urlVisualizacao]);

  const imagemPrevia = miniatura || (salvo && tentativaPreviaConcluida ? '' : previaUrl);

  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">{rotulo}</div>
      <div className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden mb-2 grid place-items-center">
        {url ? (
          isPowerPoint
            ? (
              <div className="relative w-full h-full bg-slate-100">
                {/* O desenho local do PPTX é apenas aproximado: fontes, rotações e
                    alguns grupos podem sair do lugar. Depois que o modelo está salvo,
                    o Office renderiza o slide fielmente e por isso tem prioridade. */}
                {urlOfficeEmbed ? (
                  <iframe
                    title={`Prévia do PowerPoint: ${rotulo}`}
                    src={urlOfficeEmbed}
                    className="w-full h-full border-0 pointer-events-none"
                    loading="lazy"
                  />
                ) : imagemPrevia ? (
                  <img src={imagemPrevia} alt={`Prévia: ${rotulo}`} className="w-full h-full object-contain bg-white" />
                ) : (
                  <div className="w-full h-full grid place-items-center px-3 text-center text-[11px] font-bold text-gray-400">
                    Envie o arquivo de novo pra gerar a prévia
                  </div>
                )}
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
      <div className="mt-2 flex items-stretch gap-2">
        <input
          type="url"
          value={linkGoogle}
          onChange={(e) => setLinkGoogle(e.target.value)}
          placeholder="Ou cole o link do Google Slides"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs"
        />
        <button
          type="button"
          disabled={importando || !linkGoogle.trim()}
          onClick={() => onGoogleSlides(linkGoogle)}
          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        >
          {importando ? 'Importando…' : 'Usar link'}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-gray-400">
        No Google Slides, libere “qualquer pessoa com o link”. O primeiro slide será usado.
      </p>
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
