/**
 * MarketingConsultor — aba "Marketing para Consultores" da Área do Consultor.
 *
 * Transforma uma aula longa em Reel, carrossel de feed, carrossel em vídeo e PDF de
 * LinkedIn, com a marca do próprio consultor, revisão peça a peça e publicação agendada.
 *
 * A navegação é uma SEQUÊNCIA NUMERADA, não um menu solto: o consultor novo abre a aba e
 * vê exatamente o que precisa fazer, na ordem, e em qual etapa ele está.
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
import {
  Settings2, Share2, Video, Sparkles, ClipboardCheck, CalendarClock,
  Plus, Trash2, Save, AlertTriangle, CheckCircle2, Circle,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { COLECOES, MarketingConfig, TermoTecnico } from '../../types/marketing';
import {
  EtapaRedes, EtapaVideos, EtapaCampanhas, EtapaRevisao, EtapaAgenda, useDadosMarketing,
} from './marketing/EtapasPreenchidas';
import { FormularioVideo, FormularioCampanha } from './marketing/AcoesMarketing';

type EtapaId = 'config' | 'redes' | 'videos' | 'campanhas' | 'revisao' | 'agenda';

interface Etapa {
  id: EtapaId;
  numero: number;
  nome: string;
  /** O que o consultor faz aqui, em uma frase. */
  oQueFaz: string;
  icon: typeof Settings2;
  pronta: boolean;
}

const ETAPAS: Etapa[] = [
  {
    id: 'config', numero: 1, nome: 'Configuração', icon: Settings2, pronta: true,
    oQueFaz: 'Diga quem é o seu público, sua área e os termos técnicos que não podem sair errados.',
  },
  {
    id: 'redes', numero: 2, nome: 'Redes sociais', icon: Share2, pronta: false,
    oQueFaz: 'Conecte o Instagram e o LinkedIn. Você autoriza no site da própria rede — nenhuma senha é digitada aqui.',
  },
  {
    id: 'videos', numero: 3, nome: 'Meus vídeos', icon: Video, pronta: false,
    oQueFaz: 'Envie as suas aulas longas. É delas que sai todo o conteúdo.',
  },
  {
    id: 'campanhas', numero: 4, nome: 'Criar campanha', icon: Sparkles, pronta: false,
    oQueFaz: 'Escolha um vídeo e um objetivo. O sistema gera o Reel, os carrosséis e o PDF.',
  },
  {
    id: 'revisao', numero: 5, nome: 'Revisão', icon: ClipboardCheck, pronta: false,
    oQueFaz: 'Veja cada peça, aprove ou peça uma melhoria escrevendo o que quer mudar.',
  },
  {
    id: 'agenda', numero: 6, nome: 'Publicação', icon: CalendarClock, pronta: false,
    oQueFaz: 'Defina quando cada peça vai ao ar. A publicação acontece sozinha.',
  },
];

export default function MarketingConsultor() {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, loading } = useUserAccess();
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaId>('config');
  const [configCompleta, setConfigCompleta] = useState(false);
  const dados = useDadosMarketing(consultorId);

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

  const etapa = ETAPAS.find((e) => e.id === etapaAtiva)!;

  // Concluída é o que já tem dado real do consultor, não o que já foi programado.
  const concluidas: Record<EtapaId, boolean> = {
    config: configCompleta,
    redes: Boolean(dados.config?.instagram?.conectado || dados.config?.linkedin?.conectado),
    videos: dados.videos.length > 0,
    campanhas: dados.campanhas.length > 0,
    revisao: dados.pecas.some((p) => p.status === 'aprovado' || p.status === 'publicado'),
    agenda: dados.pecas.some((p) => p.status === 'publicado'),
  };
  // Primeira etapa ainda não concluída — é onde o consultor deve estar.
  const proximaPendente = ETAPAS.find((e) => !concluidas[e.id]);

  function estadoDaEtapa(e: Etapa): 'concluida' | 'atual' | 'pendente' {
    if (concluidas[e.id]) return 'concluida';
    if (proximaPendente?.id === e.id) return 'atual';
    return 'pendente';
  }

  return (
    <div className="p-6 max-w-5xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Marketing para Consultores</h1>
        <p className="text-sm text-gray-600 mt-1">
          Siga as etapas na ordem. Ao final, uma aula longa vira Reel, carrossel e documento de
          LinkedIn, com a sua marca.
        </p>
      </header>

      {/* Trilha numerada */}
      <nav className="flex flex-wrap gap-1.5 mb-5">
        {ETAPAS.map((e) => {
          const estado = estadoDaEtapa(e);
          const ativa = e.id === etapaAtiva;
          return (
            <button
              key={e.id}
              onClick={() => setEtapaAtiva(e.id)}
              title={e.oQueFaz}
              className={`flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                ativa
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              <span
                className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold ${
                  estado === 'concluida'
                    ? 'bg-green-600 text-white'
                    : estado === 'atual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {estado === 'concluida' ? <CheckCircle2 className="w-3.5 h-3.5" /> : e.numero}
              </span>
              {e.nome}
            </button>
          );
        })}
      </nav>

      {/* O que se faz nesta etapa */}
      <div className="flex items-start gap-2.5 mb-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <Circle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 fill-blue-600" />
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Etapa {etapa.numero} — {etapa.nome}.</strong>{' '}
          {etapa.oQueFaz}
        </p>
      </div>

      {etapaAtiva === 'config' && (
        <EtapaConfiguracao
          consultorId={consultorId}
          marcaNome={consultor?.branding?.nome}
          onCompletaChange={setConfigCompleta}
        />
      )}
      {etapaAtiva !== 'config' && (
        dados.carregando
          ? <div className="text-gray-500">Carregando…</div>
          : <>
              {etapaAtiva === 'redes' && <EtapaRedes config={dados.config} />}

              {etapaAtiva === 'videos' && (
                <div className="space-y-4">
                  <FormularioVideo consultorId={consultorId} onCriado={dados.recarregar} />
                  <EtapaVideos videos={dados.videos} />
                </div>
              )}

              {etapaAtiva === 'campanhas' && (
                <div className="space-y-4">
                  <FormularioCampanha
                    consultorId={consultorId}
                    videos={dados.videos}
                    config={dados.config}
                    onCriada={dados.recarregar}
                  />
                  <EtapaCampanhas campanhas={dados.campanhas} pecas={dados.pecas} />
                </div>
              )}

              {etapaAtiva === 'revisao' && <EtapaRevisao campanhas={dados.campanhas} pecas={dados.pecas} />}
              {etapaAtiva === 'agenda' && <EtapaAgenda campanhas={dados.campanhas} pecas={dados.pecas} />}

              {etapaAtiva !== 'videos' && etapaAtiva !== 'campanhas' && (
                <p className="text-xs text-gray-500 mt-5 pt-3 border-t border-gray-100">
                  Esta etapa ainda é somente leitura. Os botões de ação entram na próxima entrega.
                </p>
              )}

              {/* A produção roda fora da tela; nada avisa o navegador quando termina. */}
              <button
                onClick={dados.recarregar}
                className="block text-xs font-semibold text-blue-700 hover:underline mt-4"
              >
                Atualizar esta tela
              </button>
            </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EtapaConfiguracao({
  consultorId,
  marcaNome,
  onCompletaChange,
}: {
  consultorId: string;
  marcaNome?: string;
  onCompletaChange: (v: boolean) => void;
}) {
  const [publico, setPublico] = useState('');
  const [area, setArea] = useState('');
  const [linkPrincipal, setLinkPrincipal] = useState('');
  const [ctaPadrao, setCtaPadrao] = useState('');
  const [creditoFonte, setCreditoFonte] = useState('');
  const [termos, setTermos] = useState<TermoTecnico[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  // A etapa 1 conta como concluída quando público e área estão preenchidos.
  useEffect(() => {
    onCompletaChange(Boolean(publico.trim() && area.trim()));
  }, [publico, area, onCompletaChange]);

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
      setMsg('Configuração salva. Pode seguir para a etapa 2.');
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
        <Campo label="Meu público" valor={publico} onChange={setPublico} obrigatorio
          dica="Quem você quer alcançar. Ex.: analistas e gestores de operação." />
        <Campo label="Minha área de atuação" valor={area} onChange={setArea} obrigatorio
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
          {salvando ? 'Salvando…' : 'Salvar e concluir etapa 1'}
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
  obrigatorio,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  dica?: string;
  obrigatorio?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-800 mb-1">
        {label}
        {obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {dica && <span className="block text-xs text-gray-500 mt-1">{dica}</span>}
    </label>
  );
}

function EtapaEmBreve({ etapa }: { etapa: Etapa }) {
  return (
    <div className="p-6 rounded-lg border border-dashed border-gray-300 bg-gray-50">
      <div className="flex items-center gap-2 mb-1">
        <etapa.icon className="w-5 h-5 text-gray-500" />
        <h2 className="font-bold text-gray-800">Etapa {etapa.numero} — {etapa.nome}</h2>
      </div>
      <p className="text-sm text-gray-600">{etapa.oQueFaz}</p>
      <p className="text-xs text-gray-500 mt-3">Ainda não construída. Próxima entrega da fase 1.</p>
    </div>
  );
}
