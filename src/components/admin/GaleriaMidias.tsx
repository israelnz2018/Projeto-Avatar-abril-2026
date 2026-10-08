/**
 * GaleriaMidias — fotos e vídeos para usar dentro do chatbot.
 *
 * POR QUE EXISTE: o Typebot mostra mídia por ENDEREÇO, não por arquivo. Colar
 * ali o link de um resultado do Google Imagens não funciona — aquele endereço
 * é a página de busca, não o arquivo. Foi o que deixou a foto quebrada
 * ("Bubble image") no bot da Plataforma LBW.
 *
 * Aqui o arquivo vai para o nosso Storage e volta um endereço direto e
 * permanente. O botão "Copiar link" entrega exatamente o que se cola no bloco
 * de imagem ou vídeo do Typebot.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Copy, Check, Trash2, Image as IconeImagem, Film, Loader2 } from 'lucide-react';
import { auth } from '../../lib/firebase';

type Midia = {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  bytes: number;
  ehVideo: boolean;
  criadoEm: string;
};

const ACEITOS = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

function tamanhoLegivel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GaleriaMidias() {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState('');
  const entradaArquivo = useRef<HTMLInputElement>(null);

  const comToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Faça login novamente.');
    return { Authorization: `Bearer ${token}` };
  }, []);

  const listar = useCallback(async () => {
    try {
      const r = await fetch('/api/midias', { headers: await comToken() });
      if (!r.ok) throw new Error('Não consegui listar as mídias.');
      const j = await r.json();
      setMidias(j.midias || []);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao listar.');
    } finally {
      setCarregando(false);
    }
  }, [comToken]);

  useEffect(() => { void listar(); }, [listar]);

  async function enviar(arquivo: File) {
    setErro('');
    setEnviando(true);
    try {
      // FileReader devolve "data:tipo;base64,XXXX" — o servidor espera só o XXXX.
      const base64: string = await new Promise((ok, falha) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(String(leitor.result).split(',')[1] || '');
        leitor.onerror = () => falha(new Error('Não consegui ler o arquivo.'));
        leitor.readAsDataURL(arquivo);
      });

      const r = await fetch('/api/midias', {
        method: 'POST',
        headers: { ...(await comToken()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: arquivo.name, tipo: arquivo.type, conteudo: base64 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não consegui enviar.');
      await listar();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao enviar.');
    } finally {
      setEnviando(false);
      if (entradaArquivo.current) entradaArquivo.current.value = '';
    }
  }

  async function apagar(id: string) {
    if (!confirm('Apagar esta mídia? Se ela estiver sendo usada no chatbot, vai parar de aparecer lá.')) return;
    try {
      const r = await fetch(`/api/midias/${id}`, { method: 'DELETE', headers: await comToken() });
      if (!r.ok) throw new Error('Não consegui apagar.');
      setMidias((lista) => lista.filter((m) => m.id !== id));
    } catch (e: any) {
      setErro(e?.message || 'Erro ao apagar.');
    }
  }

  async function copiar(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(id);
      setTimeout(() => setCopiado(''), 1800);
    } catch {
      setErro('Não consegui copiar. Selecione o endereço e copie na mão.');
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Fotos e vídeos do chatbot</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Suba aqui e cole o link no bloco de imagem ou vídeo do Typebot.
            Link do Google Imagens não funciona — ele aponta para a página de busca, não para o arquivo.
          </p>
        </div>
        <button
          onClick={() => entradaArquivo.current?.click()}
          disabled={enviando}
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-blue-400"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {enviando ? 'Enviando…' : 'Subir foto ou vídeo'}
        </button>
        <input
          ref={entradaArquivo}
          type="file"
          accept={ACEITOS}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviar(f); }}
        />
      </div>

      {erro && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}

      {carregando ? (
        <p className="mt-6 text-sm text-slate-500">Carregando…</p>
      ) : midias.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Nenhuma mídia ainda. Suba sua foto para usar no chatbot.
        </p>
      ) : (
        <ul className="mt-5 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {midias.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex h-32 items-center justify-center bg-slate-100">
                {m.ehVideo
                  ? <video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  : <img src={m.url} alt={m.nome} className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="p-2.5">
                <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-800" title={m.nome}>
                  {m.ehVideo ? <Film className="h-3.5 w-3.5 shrink-0" /> : <IconeImagem className="h-3.5 w-3.5 shrink-0" />}
                  {m.nome}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{tamanhoLegivel(m.bytes)}</p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => void copiar(m.url, m.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiado === m.id ? <><Check className="h-3 w-3 text-emerald-600" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar link</>}
                  </button>
                  <button
                    onClick={() => void apagar(m.id)}
                    title="Apagar"
                    className="rounded border border-slate-300 px-2 py-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
