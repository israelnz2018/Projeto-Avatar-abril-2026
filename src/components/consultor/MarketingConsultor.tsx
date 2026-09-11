/**
 * MarketingConsultor — aba "Marketing para Consultores" da Área do Consultor.
 *
 * Transforma uma aula longa em Reel, carrossel de feed, carrossel em vídeo e PDF de
 * LinkedIn, com a marca do próprio consultor, revisão peça a peça e publicação agendada.
 *
 * FASE 1: admin-only, usuário único (Israel). Os dados já nascem multi-tenant
 * (tudo por consultorId) para não precisar refazer a estrutura na fase 2.
 *
 * Não confundir com components/MarketingView.tsx, que é a aba de e-mail marketing do admin.
 *
 * Ver MARKETING-PARA-NOVOS-CONSULTORES.md na raiz do projeto "Empresa de Gestão LBW".
 */
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Settings2, Video, Layers, Plus, Trash2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { COLECOES, MarketingConfig, TermoTecnico } from '../../types/marketing';

type SubAba = 'config' | 'videos' | 'campanhas';

const SUB_ABAS: { id: SubAba; nome: string; icon: typeof Settings2 }[] = [
  { id: 'config', nome: 'Configuração', icon: Settings2 },
  { id: 'videos', nome: 'Meus vídeos', icon: Video },
  { id: 'campanhas', nome: 'Campanhas', icon: Layers },
];

export default function MarketingConsultor() {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, loading } = useUserAccess();
  const [aba, setAba] = useState<SubAba>('config');

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;

  // Fase 1: só o admin. Na fase 2 isso passa a aceitar isConsultor.
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Em construção</p>
            <p className="text-sm text-amber-800">
              Esta área ainda está em teste e será liberada para os consultores em breve.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing para Consultores</h1>
        <p className="text-sm text-gray-600 mt-1">
          Transforme uma aula longa em Reel, carrossel e documento de LinkedIn, com a sua marca.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-gray-200 mb-6">
        {SUB_ABAS.map(({ id, nome, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              aba === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {nome}
          </button>
        ))}
      </nav>

      {aba === 'config' && <AbaConfiguracao consultorId={consultorId} marcaNome={consultor?.branding?.nome} />}
      {aba === 'videos' && <AbaEmBreve titulo="Meus vídeos" descricao="Envio de aulas longas e ligação com a biblioteca Bunny do consultor." />}
      {aba === 'campanhas' && <AbaEmBreve titulo="Campanhas" descricao="Geração das peças, revisão e pedido de melhoria." />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AbaConfiguracao({ consultorId, marcaNome }: { consultorId: string; marcaNome?: string }) {
  const [publico, setPublico] = useState('');
  const [area, setArea] = useState('');
  const [linkPrincipal, setLinkPrincipal] = useState('');
  const [ctaPadrao, setCtaPadrao] = useState('');
  const [creditoFonte, setCreditoFonte] = useState('');
  const [termos, setTermos] = useState<TermoTecnico[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!consultorId) return;
    let vivo = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, COLECOES.config, consultorId));
        if (!vivo) return;
        const d = snap.data() as MarketingConfig | undefined;
        setPublico(d?.publico || '');
        setArea(d?.area || '');
        setLinkPrincipal(d?.linkPrincipal || '');
        setCtaPadrao(d?.ctaPadrao || '');
        setCreditoFonte(d?.creditoFonte || '');
        setTermos(d?.termos?.length ? d.termos : []);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [consultorId]);

  async function salvar() {
    if (!consultorId) return;
    setSalvando(true);
    setMsg('');
    try {
      const limpos = termos
        .map((t) => ({ errado: t.errado.trim(), correto: t.correto.trim() }))
        .filter((t) => t.errado && t.correto);
      const payload: MarketingConfig = {
        consultorId,
        publico: publico.trim(),
        area: area.trim(),
        linkPrincipal: linkPrincipal.trim(),
        ctaPadrao: ctaPadrao.trim(),
        creditoFonte: creditoFonte.trim(),
        termos: limpos,
        atualizadoEm: new Date().toISOString(),
      };
      await setDoc(doc(db, COLECOES.config, consultorId), payload, { merge: true });
      setTermos(limpos);
      setMsg('Configuração salva.');
    } catch (e: any) {
      setMsg(`Não foi possível salvar: ${e?.message || e}`);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="text-gray-500">Carregando configuração…</div>;

  return (
    <div className="space-y-8">
      <section className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>A sua marca já está cadastrada.</strong>{' '}
          {marcaNome ? <>Os criativos usam <strong>{marcaNome}</strong>, com a logo e as cores de “Minha Marca”.</> :
            <>Os criativos usam a logo e as cores definidas em “Minha Marca”.</>}{' '}
          Não é preciso cadastrar de novo aqui.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Campo label="Meu público" valor={publico} onChange={setPublico}
          dica="Quem você quer alcançar. Ex.: analistas e gestores de operação." />
        <Campo label="Minha área de atuação" valor={area} onChange={setArea}
          dica="Ex.: melhoria de processos, qualidade, cardiologia." />
        <Campo label="Página ou link principal" valor={linkPrincipal} onChange={setLinkPrincipal}
          dica="Usado quando a peça precisar apontar para algum lugar." />
        <Campo label="Crédito da fonte" valor={creditoFonte} onChange={setCreditoFonte}
          dica="Aparece no rodapé das peças. Ex.: curso White Belt." />
      </section>

      <section>
        <Campo label="Chamada para ação padrão" valor={ctaPadrao} onChange={setCtaPadrao}
          dica="Ex.: Comente a palavra MÉTODO e eu te explico." />
      </section>

      <DicionarioTecnico termos={termos} setTermos={setTermos} />

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button
          onClick={salvar}
          disabled={salvando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando…' : 'Salvar configuração'}
        </button>
        {msg && (
          <span className={`text-sm flex items-center gap-1.5 ${msg.startsWith('Não') ? 'text-red-600' : 'text-green-700'}`}>
            {!msg.startsWith('Não') && <CheckCircle2 className="w-4 h-4" />}
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Dicionário técnico: protege os termos que a legenda automática erra.
 * Hoje o gerador de legendas tem uma correção cravada no código que conserta
 * "LEAN SIGMA" para "LEAN SIX SIGMA" — serve só para a LBW. Aqui isso vira
 * tabela por consultor e passa a funcionar para qualquer área.
 */
function DicionarioTecnico({
  termos,
  setTermos,
}: {
  termos: TermoTecnico[];
  setTermos: (t: TermoTecnico[]) => void;
}) {
  function alterar(i: number, campo: keyof TermoTecnico, valor: string) {
    const copia = [...termos];
    copia[i] = { ...copia[i], [campo]: valor };
    setTermos(copia);
  }

  return (
    <section>
      <h2 className="text-base font-bold text-gray-900">Meu dicionário técnico</h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        A transcrição automática erra termos da sua área. Cadastre como o termo costuma sair
        errado e qual é a grafia correta — a correção entra na legenda e no texto das peças.
      </p>

      {termos.length === 0 && (
        <p className="text-sm text-gray-500 italic mb-3">Nenhum termo cadastrado ainda.</p>
      )}

      <div className="space-y-2">
        {termos.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={t.errado}
              onChange={(e) => alterar(i, 'errado', e.target.value)}
              placeholder="como sai errado"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400 text-sm shrink-0">vira</span>
            <input
              value={t.correto}
              onChange={(e) => alterar(i, 'correto', e.target.value)}
              placeholder="grafia correta"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => setTermos(termos.filter((_, j) => j !== i))}
              className="p-2 text-gray-400 hover:text-red-600"
              title="Remover termo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setTermos([...termos, { errado: '', correto: '' }])}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        <Plus className="w-4 h-4" />
        Adicionar termo
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Campo({
  label,
  valor,
  onChange,
  dica,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  dica?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-800 mb-1">{label}</span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {dica && <span className="block text-xs text-gray-500 mt-1">{dica}</span>}
    </label>
  );
}

function AbaEmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="p-6 rounded-lg border border-dashed border-gray-300 bg-gray-50">
      <h2 className="font-bold text-gray-800">{titulo}</h2>
      <p className="text-sm text-gray-600 mt-1">{descricao}</p>
      <p className="text-xs text-gray-500 mt-3">Próxima entrega da fase 1.</p>
    </div>
  );
}
