/**
 * Etapa 3 — a OUTRA porta de entrada: começar por uma pesquisa, não por um vídeo.
 *
 * A porta normal parte de uma aula gravada: a IA recorta a fala do consultor e
 * nada é inventado, só selecionado. Aqui o assunto vem de fora, e a garantia
 * muda de natureza — o que segura a pauta no chão são as FONTES, e é por isso
 * que elas aparecem no cartão antes de qualquer aprovação.
 *
 * Esta entrega para na pauta aprovada, de propósito: antes de investir em
 * transformar pauta em copy e em peça, o consultor precisa ver se o que a
 * pesquisa traz presta. Se as pautas vierem genéricas, o ajuste é no prompt —
 * e sai muito mais barato descobrir isso aqui.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, doc, getDocs, query, updateDoc, where,
} from 'firebase/firestore';
import {
  Check, ExternalLink, Globe, Loader2, RotateCcw, Search, Trash2,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import { COLECOES, MarketingConfig, PautaPesquisa } from '../../../types/marketing';

/** Os focos que já existem hoje. "Outro" abre um campo livre. */
const FOCOS = [
  'Atrair consultores para a plataforma',
  'Atrair alunos para os cursos',
  'Atrair empresas como clientes',
];

export function usePautas(consultorId: string) {
  const [pautas, setPautas] = useState<PautaPesquisa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!consultorId) return;
    let vivo = true;
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, COLECOES.pautas),
          where('consultorId', '==', consultorId),
        ));
        if (!vivo) return;
        setPautas(snap.docs.map((d) => d.data() as PautaPesquisa));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [consultorId, versao]);

  return { pautas, carregando, recarregar: () => setVersao((v) => v + 1) };
}

export function PainelPesquisa({
  consultorId, config, pautas, carregando, onMudou,
}: {
  consultorId: string;
  config: MarketingConfig | null;
  pautas: PautaPesquisa[];
  carregando: boolean;
  onMudou: () => void;
}) {
  const [foco, setFoco] = useState(FOCOS[0]);
  const [focoLivre, setFocoLivre] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [erro, setErro] = useState('');
  const [relatorio, setRelatorio] = useState('');

  // O texto sobre a plataforma fica escondido até alguém querer mexer: ele é
  // escrito uma vez e reusado em toda pesquisa. Ocupar a tela todo dia com um
  // campo que muda uma vez por ano é ruído.
  const [abrirContexto, setAbrirContexto] = useState(false);
  const [sobre, setSobre] = useState('');
  const [salvandoSobre, setSalvandoSobre] = useState(false);

  useEffect(() => { setSobre(String(config?.sobrePlataforma || '')); }, [config?.sobrePlataforma]);

  const focoEfetivo = foco === 'Outro' ? focoLivre.trim() : foco;

  const ordenadas = useMemo(
    () => pautas.slice().sort((a, b) => {
      // Aprovada primeiro: é o que o consultor guardou, não pode se perder no meio
      // de uma rodada nova de pesquisa.
      const pesoA = a.status === 'aprovada' ? 0 : 1;
      const pesoB = b.status === 'aprovada' ? 0 : 1;
      return pesoA - pesoB || a.ordem - b.ordem;
    }),
    [pautas],
  );

  async function salvarSobre() {
    setSalvandoSobre(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.config, consultorId), {
        sobrePlataforma: sobre.trim(),
        atualizadoEm: new Date().toISOString(),
      });
      onMudou();
      setAbrirContexto(false);
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvandoSobre(false);
    }
  }

  async function pesquisar() {
    if (!focoEfetivo) return;
    setPesquisando(true);
    setErro('');
    setRelatorio('');
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const r = await fetch('/api/marketing-consultor/pesquisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ foco: focoEfetivo, sobrePlataforma: sobre.trim() }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`);
      setRelatorio(
        `A pesquisa leu ${corpo.fontes} fonte(s) e trouxe ${corpo.pautas?.length ?? 0} pauta(s).`
        + (corpo.aprovadasMantidas ? ` ${corpo.aprovadasMantidas} pauta(s) aprovada(s) antes foram preservadas.` : ''),
      );
      onMudou();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setPesquisando(false);
    }
  }

  return (
    <section className="pt-6 mt-6 border-t border-gray-200">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-500" />
        Começar por uma pesquisa
      </h3>
      <p className="text-sm text-gray-600 mt-1 mb-3">
        Quando o assunto não está em nenhuma aula sua. A pesquisa procura na internet
        o que conversa com o público que você escolher e devolve pautas — com as fontes
        que ela realmente abriu, para você conferir antes de aprovar.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select
          value={foco}
          onChange={(e) => setFoco(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm max-w-md"
        >
          {FOCOS.map((f) => <option key={f} value={f}>{f}</option>)}
          <option value="Outro">Outro público…</option>
        </select>

        {foco === 'Outro' && (
          <input
            value={focoLivre}
            onChange={(e) => setFocoLivre(e.target.value)}
            placeholder="Para quem é a peça?"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-64"
          />
        )}

        <button
          onClick={pesquisar}
          disabled={pesquisando || !focoEfetivo}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pesquisando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Pesquisando…</>
            : <><Search className="w-4 h-4" /> {ordenadas.length ? 'Pesquisar de novo' : 'Pesquisar'}</>}
        </button>
      </div>

      <button
        onClick={() => setAbrirContexto((v) => !v)}
        className="text-xs text-blue-700 hover:underline mb-3"
      >
        {sobre.trim()
          ? 'O que a pesquisa sabe sobre a sua plataforma'
          : 'A pesquisa ainda não sabe o que é a sua plataforma — contar melhora o resultado'}
      </button>

      {abrirContexto && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs text-gray-600 mb-2">
            Escreva uma vez o que você vende e para quem. Isso entra em toda pesquisa.
            Sem isso ela roda mesmo assim, só mira pior.
          </p>
          <textarea
            value={sobre}
            onChange={(e) => setSobre(e.target.value)}
            rows={6}
            placeholder="Ex.: plataforma onde consultores de melhoria de processos publicam os próprios cursos, acompanham alunos dentro de empresas e entregam projetos, relatórios e certificados com a marca deles…"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={salvarSobre}
              disabled={salvandoSobre}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-50"
            >
              {salvandoSobre ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-red-700 mb-3">{erro}</p>}
      {relatorio && (
        <p className="text-xs text-gray-600 mb-3 p-2 rounded bg-gray-50 border border-gray-200">
          {relatorio}
        </p>
      )}

      {carregando
        ? <p className="text-sm text-gray-500">Carregando…</p>
        : ordenadas.length === 0
          ? (
            <p className="text-sm text-gray-500">
              Nenhuma pauta ainda. Escolha o público e clique em Pesquisar.
            </p>
          )
          : (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Pautas encontradas
              </p>
              <div className="space-y-3">
                {ordenadas.map((pauta) => (
                  <CartaoPauta key={pauta.id} pauta={pauta} onMudou={onMudou} />
                ))}
              </div>
            </>
          )}
    </section>
  );
}

function CartaoPauta({ pauta, onMudou }: { pauta: PautaPesquisa; onMudou: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const aprovada = pauta.status === 'aprovada';

  async function mudarStatus(status: PautaPesquisa['status']) {
    setOcupado(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.pautas, pauta.id), {
        status,
        ...(status === 'aprovada' ? { aprovadoEm: new Date().toISOString() } : { aprovadoEm: null }),
      });
      onMudou();
    } catch (e: any) {
      setErro(e?.message || String(e));
      setOcupado(false);
    }
  }

  if (pauta.status === 'descartada') return null;

  return (
    <div className={`p-4 rounded-lg border bg-white ${aprovada ? 'border-green-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {aprovada && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-800">
              Aprovada
            </span>
          )}
          <p className="font-bold text-gray-900 mt-1.5">{pauta.titulo}</p>
          <p className="text-sm text-gray-700 mt-1.5">
            <span className="font-semibold text-gray-500">Ângulo: </span>
            {pauta.angulo}
          </p>
          {pauta.porQueAgora && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold text-gray-500">Por que agora: </span>
              {pauta.porQueAgora}
            </p>
          )}
        </div>

        {/* Mesma disposição dos criativos: ações à direita, na linha do título. */}
        <div className="flex items-center gap-1 shrink-0">
          {aprovada
            ? (
              <button
                onClick={() => mudarStatus('nova')}
                disabled={ocupado}
                title="Desfazer aprovação"
                className="p-2 rounded-lg text-gray-400 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )
            : (
              <button
                onClick={() => mudarStatus('aprovada')}
                disabled={ocupado}
                title="Aprovar esta pauta"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold shadow-sm hover:bg-green-700 hover:shadow disabled:opacity-50 disabled:cursor-wait transition"
              >
                {ocupado
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Check className="w-4 h-4" />}
                Aprovar
              </button>
            )}
          <button
            onClick={() => mudarStatus('descartada')}
            disabled={ocupado}
            title="Descartar — some da lista"
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {pauta.fontes?.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-gray-100">
          {/* "da pesquisa", e não "da pauta": o que o Gemini devolve é a lista de
              páginas que ele abriu na RODADA, não a fonte de cada pauta separada.
              Dizer só "Fontes" sugeriria uma precisão que o dado não tem. */}
          <span className="text-xs font-semibold text-gray-500">Fontes da pesquisa:</span>
          {pauta.fontes.map((fonte) => (
            <a
              key={fonte.url}
              href={fonte.url}
              target="_blank"
              rel="noopener noreferrer"
              title={fonte.url}
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline max-w-[18rem] truncate"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              {fonte.titulo || fonte.url}
            </a>
          ))}
        </div>
      )}

      {aprovada && (
        <p className="text-xs text-gray-500 mt-2.5">
          Guardada. Transformar pauta aprovada em copy e em peça é o próximo passo —
          ainda não está ligado.
        </p>
      )}

      {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
    </div>
  );
}
