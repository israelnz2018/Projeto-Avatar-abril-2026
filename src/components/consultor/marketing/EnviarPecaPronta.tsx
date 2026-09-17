/**
 * O criativo que o consultor já tem pronto, feito fora da plataforma.
 *
 * Nem tudo precisa nascer aqui: quem já fez o carrossel no Canva, gravou o Reel no
 * celular ou tem o PDF da apresentação quer só pôr na esteira — aprovar, agendar e
 * publicar junto com o resto. A peça enviada entra com `origem: 'enviada'` e segue o
 * mesmo caminho das geradas, menos o Refazer, que não tem de onde refazer.
 *
 * Pode entrar de dois jeitos:
 *   - dentro de um criativo aprovado, ao lado das peças geradas daquele trecho;
 *   - avulso, sem vídeo nenhum por trás — aí nasce uma campanha só para ele, com o
 *     título que o consultor der, que é o nome que aparece no calendário.
 */
import React, { useState } from 'react';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { ArrowDown, ArrowUp, Check, FileUp, Loader2, Trash2, X } from 'lucide-react';
import { db, storage } from '../../../lib/firebase';
import { COLECOES, Peca, TipoPeca } from '../../../types/marketing';

interface Formato {
  id: TipoPeca;
  nome: string;
  ajuda: string;
  aceita: string[];
  multiplos: boolean;
  maximoMb: number;
}

const FORMATOS_ENVIO: Formato[] = [
  {
    id: 'carrossel-feed',
    nome: 'Carrossel ou imagem única',
    ajuda: 'De 1 a 10 imagens, na ordem em que vão aparecer. Formato 4:5 (1080×1350) fica melhor no feed.',
    aceita: ['image/png', 'image/jpeg', 'image/webp'],
    multiplos: true,
    maximoMb: 15,
  },
  {
    id: 'reel',
    nome: 'Reel',
    ajuda: 'Um vídeo vertical 9:16. A capa é opcional — sem ela, o Instagram usa o primeiro quadro.',
    aceita: ['video/mp4', 'video/quicktime'],
    multiplos: false,
    maximoMb: 300,
  },
  {
    id: 'carrossel-video',
    nome: 'Carrossel em vídeo',
    ajuda: 'Um vídeo vertical 9:16, sem voz, para os Reels.',
    aceita: ['video/mp4', 'video/quicktime'],
    multiplos: false,
    maximoMb: 300,
  },
  {
    id: 'linkedin-pdf',
    nome: 'Carrossel do LinkedIn',
    ajuda: 'O PDF que vira carrossel no LinkedIn. Cada página do PDF é uma página do carrossel.',
    aceita: ['application/pdf'],
    multiplos: false,
    maximoMb: 50,
  },
];

const extensaoDe = (f: File) => {
  const pelaMime: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'application/pdf': 'pdf',
  };
  return pelaMime[f.type] || (f.name.split('.').pop() || 'bin').toLowerCase();
};

export function EnviarPecaPronta({
  consultorId, campanhaId, aoEnviar, aoCancelar,
}: {
  consultorId: string;
  /** Sem campanha, a peça é avulsa e o consultor dá um título a ela. */
  campanhaId?: string;
  aoEnviar: () => void;
  aoCancelar?: () => void;
}) {
  const [formatoId, setFormatoId] = useState<TipoPeca>('carrossel-feed');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [capa, setCapa] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [legenda, setLegenda] = useState('');
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState('');

  const formato = FORMATOS_ENVIO.find((f) => f.id === formatoId)!;
  const avulsa = !campanhaId;
  const enviando = progresso !== null;

  function escolher(lista: FileList | null) {
    setErro('');
    const novos = Array.from(lista || []);
    const recusado = novos.find((f) => !formato.aceita.includes(f.type));
    if (recusado) { setErro(`"${recusado.name}" não é um formato aceito aqui.`); return; }
    const grande = novos.find((f) => f.size > formato.maximoMb * 1024 * 1024);
    if (grande) { setErro(`"${grande.name}" passa de ${formato.maximoMb} MB.`); return; }
    // Imagens se somam às já escolhidas, na ordem do nome — é como vem de uma pasta
    // exportada ("pagina-01", "pagina-02"). Vídeo e PDF são um arquivo só.
    const juntos = formato.multiplos
      ? [...arquivos, ...novos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))]
      : novos.slice(0, 1);
    if (juntos.length > 10) { setErro('No máximo 10 imagens — é o limite do carrossel do Instagram.'); return; }
    setArquivos(juntos);
  }

  function mover(i: number, delta: number) {
    setArquivos((atual) => {
      const j = i + delta;
      if (j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  /** Sobe um arquivo mostrando o andamento do conjunto. Vídeo de celular tem centenas de MB. */
  function subir(caminho: string, arquivo: File, jaEnviado: number, total: number) {
    return new Promise<void>((resolve, reject) => {
      const tarefa = uploadBytesResumable(storageRef(storage, caminho), arquivo, {
        contentType: arquivo.type,
        cacheControl: 'private, max-age=300',
      });
      tarefa.on(
        'state_changed',
        (s) => setProgresso(Math.round(((jaEnviado + s.bytesTransferred) / total) * 100)),
        reject,
        () => resolve(),
      );
    });
  }

  async function enviar() {
    if (!arquivos.length) { setErro('Escolha o arquivo antes de enviar.'); return; }
    if (avulsa && !titulo.trim()) { setErro('Dê um título — é o nome que aparece no calendário.'); return; }
    setErro('');
    setProgresso(0);
    try {
      const agora = new Date().toISOString();
      // Um carimbo de tempo no caminho: enviar de novo nunca sobrescreve a peça
      // anterior, e o navegador nunca mostra a versão velha do cache.
      const versao = Date.now();
      let campanha = campanhaId;
      if (!campanha) {
        campanha = `${consultorId}__avulsa__${versao}`;
        await setDoc(doc(db, COLECOES.campanhas, campanha), {
          id: campanha,
          consultorId,
          videoId: '',
          titulo: titulo.trim(),
          objetivo: 'autoridade',
          status: 'revisar',
          origem: 'enviada',
          criadoEm: agora,
        });
      }

      const pasta = `marketing/${consultorId}/${campanha}/enviado-${versao}`;
      const envios: { caminho: string; arquivo: File }[] = arquivos.map((f, i) => ({
        arquivo: f,
        // As imagens se chamam slide-01, slide-02… porque é assim que a tela reconhece
        // as páginas de um carrossel — as geradas e as enviadas, do mesmo jeito.
        caminho: formato.id === 'carrossel-feed'
          ? `${pasta}/slide-${String(i + 1).padStart(2, '0')}.${extensaoDe(f)}`
          : formato.id === 'linkedin-pdf'
            ? `${pasta}/documento.pdf`
            : `${pasta}/video.${extensaoDe(f)}`,
      }));
      if (capa && formato.id === 'reel') envios.push({ arquivo: capa, caminho: `${pasta}/capa.${extensaoDe(capa)}` });

      const total = envios.reduce((s, e) => s + e.arquivo.size, 0) || 1;
      let enviado = 0;
      for (const e of envios) {
        await subir(e.caminho, e.arquivo, enviado, total);
        enviado += e.arquivo.size;
      }

      const caminhos = envios.map((e) => e.caminho);
      const capaUrl = caminhos.find((c) => /\/capa\.[a-z]+$/i.test(c));
      const principais = caminhos.filter((c) => c !== capaUrl);
      const peca: Peca = {
        id: `${campanha}__enviada-${versao}`,
        consultorId,
        campanhaId: campanha,
        tipo: formato.id,
        status: 'revisar',
        versao: 1,
        origem: 'enviada',
        arquivoUrl: principais[0],
        arquivos: caminhos,
        criadoEm: agora,
      };
      await setDoc(doc(db, COLECOES.pecas, peca.id), {
        ...peca,
        ...(capaUrl ? { capaUrl } : {}),
        ...(legenda.trim() ? { legenda: legenda.trim() } : {}),
      });

      setArquivos([]);
      setCapa(null);
      setTitulo('');
      setLegenda('');
      aoEnviar();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setProgresso(null);
    }
  }

  return (
    <div className="space-y-3">
      {avulsa && (
        <label className="block">
          <span className="block text-xs font-bold text-gray-700 mb-1">Título</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={80}
            placeholder="Ex.: 5 sinais de que o seu processo tem gargalo"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
        </label>
      )}

      <div>
        <span className="block text-xs font-bold text-gray-700 mb-1">O que você vai enviar</span>
        <div className="flex flex-wrap gap-1.5">
          {FORMATOS_ENVIO.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFormatoId(f.id); setArquivos([]); setCapa(null); setErro(''); }}
              disabled={enviando}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                formatoId === f.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.nome}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-1">{formato.ajuda}</p>
      </div>

      <input
        type="file"
        multiple={formato.multiplos}
        accept={formato.aceita.join(',')}
        onChange={(e) => { escolher(e.target.files); e.target.value = ''; }}
        disabled={enviando}
        className="block text-xs text-gray-700 file:mr-2 file:px-2.5 file:py-1 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-xs file:font-semibold"
      />

      {arquivos.length > 0 && (
        <ol className="space-y-1">
          {arquivos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs text-gray-700 px-2 py-1 rounded bg-gray-50 border border-gray-200">
              <span className="font-bold text-gray-400 w-5">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate">{f.name}</span>
              <span className="text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              {formato.multiplos && (
                <>
                  <button onClick={() => mover(i, -1)} disabled={enviando || i === 0} title="Subir" className="disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={enviando || i === arquivos.length - 1} title="Descer" className="disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))}
                disabled={enviando}
                title="Tirar"
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {formato.id === 'reel' && arquivos.length > 0 && (
        <label className="block text-xs text-gray-700">
          <span className="block font-bold mb-1">Capa (opcional)</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setCapa(e.target.files?.[0] || null)}
            disabled={enviando}
            className="block text-xs file:mr-2 file:px-2.5 file:py-1 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-xs file:font-semibold"
          />
        </label>
      )}

      <label className="block">
        <span className="block text-xs font-bold text-gray-700 mb-1">Legenda ou texto do post (opcional)</span>
        <textarea
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          rows={4}
          disabled={enviando}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-y"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={enviar}
          disabled={enviando || !arquivos.length}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          {enviando ? `Enviando… ${progresso}%` : 'Enviar peça'}
        </button>
        {aoCancelar && !enviando && (
          <button onClick={aoCancelar} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
    </div>
  );
}

/**
 * O texto de uma peça enviada, editável — a legenda que vai junto na publicação.
 *
 * Peça gerada guarda o texto no criativo; peça enviada não tem criativo, então o
 * texto mora na própria peça.
 */
export function LegendaDaPecaEnviada({ peca, aoMudar }: { peca: Peca; aoMudar: () => void }) {
  const [texto, setTexto] = useState(peca.legenda || '');
  const [salvando, setSalvando] = useState(false);
  const mudou = texto !== (peca.legenda || '');

  async function salvar() {
    setSalvando(true);
    try {
      await updateDoc(doc(db, COLECOES.pecas, peca.id), { legenda: texto, atualizadoEm: new Date().toISOString() });
      aoMudar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-800 mb-1">Legenda</p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        placeholder="O texto que vai junto na publicação."
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-y"
      />
      {mudou && (
        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
        >
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar legenda
        </button>
      )}
    </div>
  );
}

/**
 * Tira a peça enviada da esteira.
 *
 * Apaga a ficha, não os arquivos: um clique errado não pode destruir o que o
 * consultor levou horas fazendo fora daqui.
 */
export function BotaoRemoverPecaEnviada({ peca, aoMudar }: { peca: Peca; aoMudar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  async function remover() {
    setRemovendo(true);
    try {
      await deleteDoc(doc(db, COLECOES.pecas, peca.id));
      aoMudar();
    } finally {
      setRemovendo(false);
      setConfirmando(false);
    }
  }

  if (confirmando) {
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-600">Tirar esta peça?</span>
        <button onClick={remover} disabled={removendo} className="font-bold text-red-700 hover:underline">
          {removendo ? 'Tirando…' : 'Sim'}
        </button>
        <button onClick={() => setConfirmando(false)} className="font-semibold text-gray-500 hover:underline">Não</button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      title="Tira a peça da esteira. Os arquivos continuam guardados."
      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50"
    >
      <Trash2 className="w-3 h-3" /> Tirar
    </button>
  );
}
