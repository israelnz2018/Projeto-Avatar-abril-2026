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
  Plus, Trash2, Save, AlertTriangle, CheckCircle2, Circle, ImageOff, Pencil,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { ConsultorBranding } from '../../types';
import { COLECOES, MarketingConfig } from '../../types/marketing';
import {
  EtapaRedes, EtapaVideos, EtapaRevisao, EtapaAgenda, useDadosMarketing,
} from './marketing/EtapasPreenchidas';
import { FormularioVideo } from './marketing/AcoesMarketing';
import { PainelCriativos, useCriativos } from './marketing/Criativos';
import { EtapaCriativosAprovados } from './marketing/CriativosAprovados';

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
    oQueFaz: 'Confira a marca que vai nas peças e o link que elas divulgam.',
  },
  {
    id: 'redes', numero: 2, nome: 'Redes sociais', icon: Share2, pronta: false,
    oQueFaz: 'Conecte o Instagram e o LinkedIn. Você autoriza no site da própria rede — nenhuma senha é digitada aqui.',
  },
  {
    id: 'videos', numero: 3, nome: 'Meus vídeos', icon: Video, pronta: false,
    oQueFaz: 'Envie as suas aulas longas e escolha, dentro de cada uma, os trechos que viram peça.',
  },
  {
    id: 'campanhas', numero: 4, nome: 'Criativos aprovados', icon: Sparkles, pronta: false,
    oQueFaz: 'Os trechos que você aprovou, prontos para virar Reel, carrossel e PDF.',
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
  const criativos = useCriativos(consultorId);

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
    campanhas: criativos.criativos.some((c) => c.status === 'aprovado'),
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
          branding={consultor?.branding}
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
                  <EtapaVideos
                    videos={dados.videos}
                    criativos={criativos.criativos}
                    onMudou={() => { dados.recarregar(); criativos.recarregar(); }}
                  />
                  <PainelCriativos
                    videos={dados.videos}
                    criativos={criativos.criativos}
                    carregando={criativos.carregando}
                    onMudou={criativos.recarregar}
                  />
                </div>
              )}

              {etapaAtiva === 'campanhas' && (
                <div className="space-y-6">
                  <EtapaCriativosAprovados
                    criativos={criativos.criativos}
                    videos={dados.videos}
                    pecas={dados.pecas}
                    onMudou={() => { criativos.recarregar(); dados.recarregar(); }}
                  />
                </div>
              )}

              {etapaAtiva === 'revisao' && <EtapaRevisao campanhas={dados.campanhas} pecas={dados.pecas} />}
              {etapaAtiva === 'agenda' && <EtapaAgenda campanhas={dados.campanhas} pecas={dados.pecas} />}

              {(etapaAtiva === 'redes' || etapaAtiva === 'revisao' || etapaAtiva === 'agenda') && (
                <p className="text-xs text-gray-500 mt-5 pt-3 border-t border-gray-100">
                  Esta etapa ainda é somente leitura. Os botões de ação entram na próxima entrega.
                </p>
              )}

              {/* A produção roda fora da tela; nada avisa o navegador quando termina. */}
              <button
                onClick={() => { dados.recarregar(); criativos.recarregar(); }}
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

/**
 * Etapa 1 — Configuração.
 *
 * Nome da empresa e logo NÃO são cadastrados aqui: já existem em "Minha Marca" e
 * esta tela só mostra o que já está lá, com um link para editar. Cadastrar de novo
 * seria uma segunda fonte de verdade para a mesma coisa.
 *
 * Crédito da fonte e chamada para ação também saíram daqui — não são "padrão", mudam
 * a cada vídeo/campanha. O crédito vem do campo "curso" cadastrado no vídeo (etapa 3);
 * a chamada para ação é parte do texto que o consultor escreve na campanha (etapa 4).
 *
 * O que sobra aqui é o que vale para toda campanha: a marca e o link principal.
 *
 * O dicionário técnico foi embora: ele corrigia por semelhança e comia palavra
 * vizinha ("juntou o Lean com Six Sigma" virava "Lean Lean Six Sigma"). Agora o
 * consultor lê e conserta o texto na revisão do criativo, que é onde ele passa de
 * qualquer jeito — um lugar só, e sem a plataforma adivinhando por cima.
 */
function EtapaConfiguracao({
  consultorId,
  branding,
  onCompletaChange,
}: {
  consultorId: string;
  branding?: ConsultorBranding;
  onCompletaChange: (v: boolean) => void;
}) {
  const [linkPrincipal, setLinkPrincipal] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  const marcaPronta = Boolean(branding?.nome && branding?.logoUrl);

  // A etapa 1 não pede mais nada de obrigatório: ela conta como concluída assim
  // que a marca (cadastrada em "Minha Marca") existe de verdade.
  useEffect(() => {
    onCompletaChange(marcaPronta);
  }, [marcaPronta, onCompletaChange]);

  useEffect(() => {
    if (!consultorId) return;
    let vivo = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, COLECOES.config, consultorId));
        if (!vivo) return;
        const d = snap.data() as MarketingConfig | undefined;
        setLinkPrincipal(d?.linkPrincipal || '');
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
      const payload: MarketingConfig = {
        consultorId,
        linkPrincipal: linkPrincipal.trim(),
        atualizadoEm: new Date().toISOString(),
      };
      await setDoc(doc(db, COLECOES.config, consultorId), payload, { merge: true });
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
      <CartaoMarca branding={branding} />

      <section>
        <Campo label="Página ou link principal" valor={linkPrincipal} onChange={setLinkPrincipal}
          dica="Usado quando a peça precisar apontar para algum lugar." />
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button
          onClick={salvar}
          disabled={salvando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando…' : 'Salvar'}
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
 * Mostra a marca já cadastrada em "Minha Marca" — nome e logo. Não dá pra editar
 * aqui de propósito: ter dois lugares que guardam a mesma logo é como ela acaba
 * divergindo (uma tela atualiza, a outra fica pra trás).
 */
function CartaoMarca({ branding }: { branding?: ConsultorBranding }) {
  const temLogo = Boolean(branding?.logoUrl);
  return (
    <section className="p-4 rounded-lg bg-blue-50 border border-blue-200">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0 overflow-hidden">
          {temLogo
            ? <img src={branding!.logoUrl} alt={branding?.nome || 'Logo'} className="w-full h-full object-contain p-1.5" />
            : <ImageOff className="w-6 h-6 text-gray-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-blue-900">
            <strong>{branding?.nome || 'Marca ainda não configurada'}</strong>
          </p>
          <p className="text-xs text-blue-800 mt-0.5">
            {temLogo
              ? 'Esta logo é a que entra em todas as peças geradas.'
              : 'Cadastre a logo em "Minha Marca" antes de gerar peças — sem ela as imagens saem sem identidade visual.'}
          </p>
        </div>
        <a
          href="/configuracao?aba=marca"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" /> Editar em Minha Marca
        </a>
      </div>
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
