import React, { useRef, useState, useEffect } from 'react';
import {
  Lightbulb,
  Building2,
  Settings2,
  AlertTriangle,
  BarChart3,
  Zap,
  Loader2,
  CheckCircle2,
  FileText,
  Users,
  Calendar,
  Search,
  Sparkles,
  PlayCircle,
  ClipboardList,
  Target,
  TrendingDown,
  Clock,
  Briefcase,
  Share2,
  Info,
  ChevronDown,
  Plus,
  Trash2,
  X,
  Map,
  ArrowRight,
} from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AIPromptCard } from './ToolWrapper';

// Exemplos prontos (read-only) pro modal "Ver exemplo" — Escritório + Manufatura.
// Cada exemplo usa um perfil real ('Atividades') e seus campos reais:
// contexto (minhaFuncao) + itens com 4 vozes (rótulos do ITEM_CONFIG) + oportunidade.
const IDEA_EXEMPLOS = [
  {
    id: 'escritorio',
    rotulo: 'Escritório',
    perfil: 'Atividades' as const,
    minhaFuncao: 'Analista de Faturamento',
    itens: [
      {
        nome: 'Emitir notas fiscais do fechamento mensal',
        voz1: 'Perco horas conferindo dados que chegam errados de outras áreas.',
        voz2: 'Meu gerente reclama que o faturamento fecha sempre no limite do prazo.',
        voz3: 'Colegas dependem da minha nota pronta pra liberar o pedido.',
        voz4: 'O cliente reclama quando a nota sai com dados divergentes.',
        oportunidade: 'Reduzir o retrabalho de conferência criando uma validação na entrada dos dados.',
      },
    ],
  },
  {
    id: 'manufatura',
    rotulo: 'Manufatura',
    perfil: 'Atividades' as const,
    minhaFuncao: 'Operador de Injeção Plástica',
    itens: [
      {
        nome: 'Fazer o setup do molde no início do turno',
        voz1: 'Demoro pra acertar os parâmetros e perco peças até estabilizar.',
        voz2: 'Meu supervisor cobra que o setup leva tempo demais.',
        voz3: 'O turno seguinte reclama que pego a máquina já ajustada de outro jeito.',
        voz4: 'A qualidade aponta refugo alto nas primeiras peças após o setup.',
        oportunidade: 'Padronizar os parâmetros de setup por molde pra reduzir as peças perdidas no arranque.',
      },
    ],
  },
];

interface ImprovementProjectIdeaProps {
  onSave: (data: any, options?: { silent?: boolean }) => void;
  initialData?: any;
}

// Perfis NOVOS — por ESCOPO de melhoria, não por cargo.
// Mantemos os antigos como aliases pra retrocompatibilidade de dados salvos.
type UserProfile = 'Atividades' | 'Area' | 'Empresa' | null;
type LegacyProfile = 'Analista' | 'Gestor' | 'Black Belt';

const LEGACY_PROFILE_MAP: Record<LegacyProfile, UserProfile> = {
  'Analista': 'Atividades',
  'Gestor': 'Area',
  'Black Belt': 'Empresa',
};

function normalizeProfile(p: any): UserProfile {
  if (!p) return null;
  if (p === 'Atividades' || p === 'Area' || p === 'Empresa') return p;
  if (LEGACY_PROFILE_MAP[p as LegacyProfile]) return LEGACY_PROFILE_MAP[p as LegacyProfile];
  return null;
}

function genItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getActivitiesFingerprint(data: any): string {
  const itens = Array.isArray(data?.itens) ? data.itens : [];
  return JSON.stringify(itens
    .map((item: any) => ({
      nome: String(item?.nome || '').trim(),
      voz1: String(item?.voz1 || '').trim(),
      voz2: String(item?.voz2 || '').trim(),
      voz3: String(item?.voz3 || '').trim(),
      voz4: String(item?.voz4 || '').trim(),
      oportunidade: String(item?.oportunidade || '').trim(),
    }))
    .filter((item: any) => Object.values(item).some(Boolean)));
}

function unwrapIdeaData(raw: any): any {
  let data = raw;
  if (data?.content?.toolData) data = data.content.toolData;
  else if (data?.content) data = data.content;
  if (data?.toolData) data = data.toolData;
  return data && typeof data === 'object' ? data : {};
}

function inferIdeaProfile(raw: any): UserProfile {
  const data = raw?.formData || raw || {};
  if (normalizeProfile(raw?.userProfile)) return normalizeProfile(raw.userProfile);
  if (data.minhaFuncao || data.atividadesQueExecuto || data.problemasQueEnfrento) return 'Atividades';
  if (data.tamanhoEquipe || data.processCritical || data.principaisProcessos) return 'Area';
  if (data.tamanhoEmpresa || data.meuPapelEmpresa || data.doresExecutivas) return 'Empresa';
  return null;
}

// Rótulos dos itens e das 4 vozes — adaptados por nível (perfil).
// Cada perfil olha o problema por 4 ângulos diferentes, conforme o escopo.
const ITEM_CONFIG: Record<Exclude<UserProfile, null>, {
  itemLabel: string;
  itemPlaceholder: string;
  addLabel: string;
  vozes: { campo: 'voz1' | 'voz2' | 'voz3' | 'voz4'; label: string; placeholder: string }[];
}> = {
  Atividades: {
    itemLabel: 'Atividade que você faz ou é responsável',
    itemPlaceholder: 'Ex: Fechar o relatório mensal',
    addLabel: 'Adicionar outra atividade',
    vozes: [
      { campo: 'voz1', label: '1. Problemas que VOCÊ vê', placeholder: 'Ex: Perco 2h num relatório que ninguém usa...' },
      { campo: 'voz2', label: '2. Problemas que seu GERENTE aponta (opcional)', placeholder: 'Não sabe? Tudo bem. Ex: ele reclama que o dado chega atrasado...' },
      { campo: 'voz3', label: '3. Problemas que seus COLEGAS comentam (opcional)', placeholder: 'Ex: pares dependem de mim pra começar o trabalho deles...' },
      { campo: 'voz4', label: '4. Reclamações de QUEM RECEBE o resultado (opcional)', placeholder: 'Ex: a área X reclama de info errada...' },
    ],
  },
  Area: {
    itemLabel: 'Processo crítico da sua área',
    itemPlaceholder: 'Ex: Atendimento de chamados',
    addLabel: 'Adicionar outro processo',
    vozes: [
      { campo: 'voz1', label: '1. Problemas que VOCÊ (gestor) vê', placeholder: 'Ex: SLA furado nos pedidos urgentes...' },
      { campo: 'voz2', label: '2. O que sua DIRETORIA cobra / aponta (opcional)', placeholder: 'Ex: cobram redução de custo sem perder qualidade...' },
      { campo: 'voz3', label: '3. O que sua EQUIPE relata (opcional)', placeholder: 'Ex: time sobrecarregado às sextas, ferramenta lenta...' },
      { campo: 'voz4', label: '4. Reclamações de ÁREAS VIZINHAS (clientes internos) (opcional)', placeholder: 'Ex: Comercial reclama de prazo, Faturamento de info errada...' },
    ],
  },
  Empresa: {
    itemLabel: 'Frente / processo sistêmico',
    itemPlaceholder: 'Ex: Fluxo pedido-a-entrega entre 4 áreas',
    addLabel: 'Adicionar outra frente',
    vozes: [
      { campo: 'voz1', label: '1. Dores que aparecem na DIRETORIA / comitê', placeholder: 'Ex: margem caindo, atraso recorrente em entregas...' },
      { campo: 'voz2', label: '2. Problemas nas CONEXÕES entre áreas (opcional)', placeholder: 'Ex: Vendas promete prazo que Operações não cumpre...' },
      { campo: 'voz3', label: '3. O que os DONOS DE PROCESSO (gerentes) relatam (opcional)', placeholder: 'Ex: gerentes apontam retrabalho entre setores...' },
      { campo: 'voz4', label: '4. O que o CLIENTE FINAL / mercado reclama (opcional)', placeholder: 'Ex: NPS baixo, reclamação de prazo no pós-venda...' },
    ],
  },
};

export default function ImprovementProjectIdea({ onSave, initialData }: ImprovementProjectIdeaProps) {
  const [loading, setLoading] = useState(false);
  const savedData = unwrapIdeaData(initialData);
  const [userProfile, setUserProfile] = useState<UserProfile>(inferIdeaProfile(savedData));
  const [formData, setFormData] = useState(Object.keys(savedData).length > 0 ? (savedData?.formData || savedData) : {
    // Comuns
    sector: '',
    area: '',
    participantCount: '',
    clientType: '',
    automationLevel: '',
    problemVolume: '',
    financialImpact: '',
    frequency: '',
    affectedClient: '',
    clientPerception: '',
    processVariation: '',
    worseningContext: '',
    rootCauseHypothesis: '',
    dataAvailability: '',
    leadershipSupport: '',
    previousAttempts: '',
    systemsUsed: '',
    timeHorizon: '',
    futureVision: '',
    successIndicator: '',
    replicability: '',
    // Específicos por perfil (preservados se algum migrar de antigo)
    processDetail: '',     // Atividades
    processCritical: '',   // Area
    processVolume: '',     // Area
    areaPriority: '',      // Empresa
    // NOVOS — Perfil "Atividades"
    minhaFuncao: '',
    tempoNaFuncao: '',
    atividadesQueExecuto: '',
    problemasQueEnfrento: '',
    reclamacoesQueRecebo: '',
    ideiasJaPensadas: '',
    // Perfil "Atividades" — as 4 vozes (jun/2026): problema visto por cada ângulo
    vozEu: '',          // problemas que EU vejo
    vozGerente: '',     // problemas que meu gerente imediato vê
    vozColegas: '',     // problemas que meus colegas veem
    vozCliente: '',     // reclamações de quem RECEBE meu resultado
    oportunidadesMelhoria: '', // oportunidades (ONDE melhorar, não solução pronta)
    // NOVO modelo (jun/2026): itens dinâmicos. Cada item (atividade/processo/frente)
    // tem nome + 4 vozes (rótulos variam por perfil) + oportunidade. Vale pros 3 perfis.
    itens: [] as Array<{ id: string; nome: string; voz1: string; voz2: string; voz3: string; voz4: string; oportunidade: string }>,
    // NOVOS — Perfil "Area"
    tamanhoEquipe: '',
    principaisProcessos: '',
    indicadorChaveArea: '',
    valorAtualIndicador: '',
    pontosFracosArea: '',
    areasQueReclamam: '',
    areasComConflito: '',
    // NOVOS — Perfil "Empresa"
    tamanhoEmpresa: '',
    meuPapelEmpresa: '',
    doresExecutivas: '',
    areasCriticasEmpresa: '',
    conexoesProblematicas: '',
    jaTemProgramaOpEx: '',
    historicoOpEx: '',
    numeroEstrategico: '',
  });

  // Normaliza nivel_projeto pros 3 níveis sem jargão.
  // Aceita variações (e o antigo belt_level de dados salvos) e mapeia:
  //   Implementação | Complexidade baixa | Complexidade média
  const normalizeProjects = (projects: any[]) => {
    return projects.map(p => {
      const raw = (p.nivel_projeto || p.belt_level || p.beltLevel || '').toString().toLowerCase();

      if (raw.includes('implement') || raw.includes('ver') || raw.includes('agir') || raw.includes('quick') || raw.includes('kaizen')) {
        p.nivel_projeto = 'Implementação';
      } else if (raw.includes('baixa') || raw.includes('yellow') || raw.includes('amarelo') || raw.includes('simples')) {
        p.nivel_projeto = 'Complexidade baixa';
      } else if (raw.includes('média') || raw.includes('media') || raw.includes('green') || raw.includes('verde') || raw.includes('black') || raw.includes('preto')) {
        p.nivel_projeto = 'Complexidade média';
      } else {
        p.nivel_projeto = 'Complexidade baixa'; // default seguro
      }
      // Aprovada por padrão. Só desmarcação explícita (false) reprova — assim as
      // ideias salvas antes deste campo existir continuam valendo pra próxima etapa.
      p.aprovado = p.aprovado !== false;
      // Remove o campo antigo pra não vazar jargão em dados salvos
      delete p.belt_level;
      delete p.beltLevel;

      p.priority_score = Number(p.priority_score) || 50;
      return p;
    });
  };

  const [generatedProjects, setGeneratedProjects] = useState<any[]>(savedData?.generatedProjects ? normalizeProjects(savedData.generatedProjects) : []);
  const [lastGeneratedActivitiesFingerprint, setLastGeneratedActivitiesFingerprint] = useState<string>(() => {
    if (typeof savedData?.lastGeneratedActivitiesFingerprint === 'string') {
      return savedData.lastGeneratedActivitiesFingerprint;
    }
    return (savedData?.generatedProjects || []).length > 0
      ? getActivitiesFingerprint(savedData?.formData || savedData)
      : '';
  });
  const [nivelFilter, setNivelFilter] = useState<string>('Todos');
  // Itens que a IA avaliou e concluiu que não rendem projeto — com o motivo.
  // Sem isso, item ignorado e item descartado ficavam indistinguíveis (os dois sumiam).
  const [itensSemProjeto, setItensSemProjeto] = useState<any[]>(savedData?.itensSemProjeto || []);
  // Questionário fechado depois de gerar; o aluno reabre pra editar e regerar.
  const [formColapsado, setFormColapsado] = useState<boolean>((savedData?.generatedProjects || []).length > 0);
  const resultadosRef = useRef<HTMLDivElement>(null);

  // Modal "Ver exemplo" (read-only) — não altera os dados do aluno.
  const [showExemplo, setShowExemplo] = useState(false);
  const [exemploIdx, setExemploIdx] = useState(0); // 0 = escritório, 1 = manufatura

  useEffect(() => {
    if (initialData) {
      const nextData = unwrapIdeaData(initialData);
      const nextProfile = inferIdeaProfile(nextData);
      if (nextProfile) setUserProfile(nextProfile);
      if (nextData.formData || Object.keys(nextData).length > 0) setFormData(nextData.formData || nextData);
      if (nextData.generatedProjects) setGeneratedProjects(normalizeProjects(nextData.generatedProjects));
      if (typeof nextData.lastGeneratedActivitiesFingerprint === 'string') {
        setLastGeneratedActivitiesFingerprint(nextData.lastGeneratedActivitiesFingerprint);
      }
    }
  }, [initialData]);

  const handleInputChange = (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    onSave({
      userProfile,
      formData: newFormData,
      generatedProjects,
      lastGeneratedActivitiesFingerprint,
    }, { silent: true });
  };

  // ===== Itens dinâmicos (atividade/processo/frente) com 4 vozes + oportunidade.
  // Rótulos das vozes mudam por perfil. Os dados ficam em formData.itens.
  const persistItens = (novosItens: any[]) => {
    const newFormData = { ...formData, itens: novosItens };
    setFormData(newFormData);
    onSave({ userProfile, formData: newFormData, generatedProjects, lastGeneratedActivitiesFingerprint }, { silent: true });
  };
  const addItem = () => {
    persistItens([...(formData.itens || []), { id: genItemId(), nome: '', voz1: '', voz2: '', voz3: '', voz4: '', oportunidade: '' }]);
  };
  const updateItem = (id: string, campo: string, valor: string) => {
    persistItens((formData.itens || []).map((it: any) => it.id === id ? { ...it, [campo]: valor } : it));
  };
  const removeItem = (id: string) => {
    persistItens((formData.itens || []).filter((it: any) => it.id !== id));
  };

  // Quando aluno clica num card de perfil: vai DIRETO pra ferramenta.
  // O popup de recomendação de trilha foi removido (a pedido) — o aluno
  // escolhe o perfil e a ferramenta já fica pronta, sem interrupção.
  const handleProfileClick = (profile: Exclude<UserProfile, null>) => {
    confirmProfileSelection(profile);
  };

  // Aluno decide: aceitar recomendação (vira pra trilha) ou continuar nessa ferramenta.
  // De qualquer forma, define o perfil pra que se ele decidir continuar, a ferramenta esteja pronta.
  const confirmProfileSelection = (profile: Exclude<UserProfile, null>) => {
    setUserProfile(profile);
    onSave({
      userProfile: profile,
      formData,
      generatedProjects,
      lastGeneratedActivitiesFingerprint,
    }, { silent: true });
  };



  const handleSave = () => {
    onSave({
      userProfile,
      formData,
      generatedProjects,
      lastGeneratedActivitiesFingerprint,
    });
  };

  // "Atividade 2 · Conferência de notas" — de onde a ideia veio. A IA devolve o
  // nome do item em item_nome; aqui traduzimos pro número que o aluno vê no form.
  const origemDoProjeto = (project: any): string | null => {
    const nome = String(project?.item_nome || '').trim();
    if (!nome) return null;
    const lista = (formData.itens || []);
    const chave = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const pos = lista.findIndex((it: any) => chave(String(it.nome || '')) === chave(nome));
    const rotulo = userProfile === 'Area' ? 'Processo' : userProfile === 'Empresa' ? 'Frente' : 'Atividade';
    return pos >= 0 ? `${rotulo} ${pos + 1} · ${lista[pos].nome}` : nome;
  };

  const generateProjects = async () => {
    setLoading(true);
    try {
      // Os itens vão para o prompt como lista numerada explícita — antes iam
      // dentro do JSON.stringify(formData) e a IA acabava concentrando tudo no
      // item com mais texto, ignorando os demais em silêncio.
      const itensValidosPrompt = (formData.itens || []).filter((it: any) =>
        !!it.nome && !!(it.voz1 || it.voz2 || it.voz3 || it.voz4 || it.oportunidade)
      );
      const vozLabels = (userProfile ? ITEM_CONFIG[userProfile].vozes : []).map((v) => v.label);
      const focoDescritivo =
        userProfile === 'Atividades' ? 'O aluno quer melhorar SUAS PRÓPRIAS ATIVIDADES no dia a dia. Foco em ações individuais — não propor projetos que dependam de várias áreas ou alto patrocínio. Quick wins, ideias acionáveis sem aprovação executiva.' :
        userProfile === 'Area' ? 'O aluno é coordenador/gerente de área e quer melhorar SUA ÁREA. Foco em projetos de escopo de área (1-3 processos), com possíveis interfaces com áreas vizinhas. Não propor projetos corporativos amplos.' :
        userProfile === 'Empresa' ? 'O aluno é especialista/consultor com visão SISTÊMICA da empresa. Pode propor projetos transversais grandes, programa de excelência operacional, mudanças estruturais, projetos complexos com 5+ áreas envolvidas.' :
        '';
      const prompt = `
Você é o Israel Souza, especialista sênior em gestão de projetos de melhoria.

FOCO ESCOLHIDO PELO ALUNO: ${userProfile}
CONTEXTO DO FOCO: ${focoDescritivo}
INTERPRETAÇÃO DOS DADOS — campo "itens": é uma LISTA. Cada item é uma ${
        userProfile === 'Atividades' ? 'atividade que o aluno executa' :
        userProfile === 'Area' ? 'processo crítico da área' :
        'frente/processo sistêmico'
      }, com:
- nome: o que é o item
- voz1, voz2, voz3, voz4: os problemas vistos por 4 ÂNGULOS diferentes (${
        userProfile === 'Atividades' ? 'o próprio aluno / o gerente dele / os colegas / quem recebe o resultado' :
        userProfile === 'Area' ? 'o gestor / a diretoria / a equipe / as áreas vizinhas (clientes internos)' :
        'a diretoria-comitê / as conexões entre áreas / os donos de processo / o cliente final-mercado'
      })
- oportunidade: ONDE o aluno acha que dá pra melhorar
CRUZE as vozes: problema citado por mais de uma voz tem mais lastro e vira projeto prioritário.
Trate "oportunidade" como vetor de investigação (o aluno aponta a direção; você propõe o projeto
que investiga a causa). Se o aluno cravou uma solução pronta (ex: "comprar máquina"), NÃO finja
que é investigativo: classifique honestamente como Implementação.

LISTA DE ITENS INFORMADOS PELO ALUNO — leia um por um:
${itensValidosPrompt.map((it: any, i: number) => `
[ITEM ${i + 1}] ${it.nome}
  - ${vozLabels[0]}: ${it.voz1 || '(não informado)'}
  - ${vozLabels[1]}: ${it.voz2 || '(não informado)'}
  - ${vozLabels[2]}: ${it.voz3 || '(não informado)'}
  - ${vozLabels[3]}: ${it.voz4 || '(não informado)'}
  - Oportunidade apontada: ${it.oportunidade || '(não informada)'}`).join('\n')}

COBERTURA DOS ITENS — regra importante:
Percorra TODOS os itens acima, um a um. Não concentre tudo no item que tem mais texto:
item com pouca informação também pode conter um bom projeto.
NÃO invente projeto só para preencher cota — qualidade acima de quantidade. É melhor
devolver 3 ideias boas do que 8 fracas.
Se algum item honestamente NÃO rende um projeto de melhoria, não force: em vez disso,
explique o motivo no campo "itens_sem_projeto".
Em cada projeto, informe em "item_nome" o nome EXATO do item que originou a ideia
(copie o texto do item). Se a ideia nasceu de mais de um item, use o item principal.

OUTROS DADOS DO CONTEXTO:
${JSON.stringify({ ...formData, itens: undefined }, null, 2)}

Ordene as ideias por prioridade (a melhor primeiro). RESPEITE o foco escolhido — não fuja do escopo.

CLASSIFICAÇÃO — preencha o campo nivel_projeto com UM destes 3 (NÃO use jargão técnico,
NÃO mencione Belt, Six Sigma, DMAIC):

1. "Implementação": a solução JÁ está clara e a causa é conhecida — é só executar.
   Ação direta, rápida, sem investigação. (Ex: padronizar um formulário, criar um checklist.)

2. "Complexidade baixa": projeto INVESTIGATIVO simples. A causa não está 100% clara,
   exige olhar alguns dados e achar a causa, mas é de 1 pessoa/1 processo, prazo curto.

3. "Complexidade média": projeto INVESTIGATIVO mais elaborado. Exige coletar dados,
   analisar com mais cuidado, envolve mais de uma pessoa ou processo, prazo maior.

PERMITA os 3 tipos — todos são úteis. Seja honesto: solução pronta = "Implementação".

REGRAS:
1. Título começa com Reduzir, Aumentar, Melhorar ou Otimizar — máximo 10 palavras
2. y_indicator: APENAS o nome do indicador sem meta ou prazo. Ex: "Taxa de defeitos"
3. priority_score: número de 0 a 100

Retorne APENAS um objeto JSON com as chaves "projects" e "itens_sem_projeto":
{
  "projects": [{
    "title": "...",
    "problem": "descrição do problema em 1 frase",
    "y_indicator": "nome do indicador apenas",
    "financial_impact": "estimativa de impacto",
    "nivel_projeto": "Implementação | Complexidade baixa | Complexidade média",
    "priority_score": 85,
    "justification": "Por que esse nível — com base no que precisa investigar, pessoas e prazo",
    "item_nome": "nome exato do item que originou esta ideia"
  }],
  "itens_sem_projeto": [{
    "item_nome": "nome exato do item",
    "motivo": "por que este item não rendeu projeto (1 frase, honesta)"
  }]
}
`;

      const { callAIJSON } = await import('../../services/aiRouter');
      const jsonResponse = await callAIJSON<{ projects?: any[]; itens_sem_projeto?: any[] }>({
        location: 'fill-tool',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
      });
      const projects = jsonResponse.projects || [];
      const semProjeto = Array.isArray(jsonResponse.itens_sem_projeto) ? jsonResponse.itens_sem_projeto : [];

      // ACRESCENTA — nunca substitui. O aluno pode ter aprovado/reprovado ideias e
      // editado texto; regerar preservava nada disso antes. Ideia repetida (mesmo
      // título) é descartada pra não duplicar a lista a cada nova geração.
      const chave = (v: any) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
      const jaExistem = new Set(generatedProjects.map((p: any) => chave(p.title)));
      const novos = normalizeProjects(projects)
        .filter((p: any) => p.title && !jaExistem.has(chave(p.title)))
        .map((p: any) => ({ ...p, aprovado: true }));   // nasce aprovado
      const normalized = [...generatedProjects, ...novos];
      const generatedFingerprint = getActivitiesFingerprint(formData);
      setGeneratedProjects(normalized);
      setItensSemProjeto(semProjeto);
      setLastGeneratedActivitiesFingerprint(generatedFingerprint);
      // Fecha o questionário e leva o aluno até as ideias: o formulário é longo
      // (várias atividades × 4 vozes) e antes as ideias nasciam fora do campo de visão.
      setFormColapsado(true);
      setTimeout(() => resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);

      onSave({
        userProfile,
        formData,
        generatedProjects: normalized,   // lista mesclada, não só as novas
        itensSemProjeto: semProjeto,
        lastGeneratedActivitiesFingerprint: generatedFingerprint,
      });
    } catch (error) {
      console.error("Erro ao gerar projetos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modelo enxuto (jun/2026): apenas 2 seções nos 3 perfis.
  // Seção 1 = quem é você / contexto. Seção 2 = lista de itens com 4 vozes.
  // Pra gerar: Seção 1 ok + pelo menos 1 item com nome E ao menos 1 voz/oportunidade preenchida.
  const itensValidos = (formData.itens || []).filter((it: any) =>
    !!it.nome && !!(it.voz1 || it.voz2 || it.voz3 || it.voz4 || it.oportunidade)
  );
  const temItemValido = itensValidos.length > 0;

  // Seção 1 — varia por perfil (contexto de quem responde).
  const sec1Filled =
    userProfile === 'Atividades' ? !!formData.minhaFuncao :
    userProfile === 'Area' ? !!(formData.sector && formData.area && formData.tamanhoEquipe && formData.clientType) :
    userProfile === 'Empresa' ? !!(formData.sector && formData.area && formData.tamanhoEmpresa && formData.meuPapelEmpresa) :
    false;

  const sectionsStatus = [
    { id: 1, filled: sec1Filled },
    { id: 2, filled: temItemValido },
  ];

  const activitiesChangedSinceGeneration = getActivitiesFingerprint(formData) !== lastGeneratedActivitiesFingerprint;
  const canGenerate = sec1Filled && temItemValido && (
    generatedProjects.length === 0 || activitiesChangedSinceGeneration
  );
  const progressPercent = (sectionsStatus.filter(s => s.filled).length / 2) * 100;

  // Modal "Ver exemplo" — definido uma vez, reusado nos dois returns (seleção + form).
  const exemploModal = showExemplo && (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setShowExemplo(false)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-blue-600" />
            <div>
              <h3 className="text-base font-black text-gray-800 m-0">Exemplo de Ideia de Projeto de Melhoria</h3>
              <p className="text-xs text-gray-500 m-0">Foco: Suas atividades · {IDEA_EXEMPLOS[exemploIdx].minhaFuncao}</p>
            </div>
          </div>
          <button
            onClick={() => setShowExemplo(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas — Escritório / Manufatura */}
        <div className="flex gap-2 px-6 pt-4">
          {IDEA_EXEMPLOS.map((ex, i) => (
            <button
              key={ex.id}
              onClick={() => setExemploIdx(i)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer',
                exemploIdx === i
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              )}
            >
              {ex.rotulo}
            </button>
          ))}
        </div>

        {(() => {
          const ex = IDEA_EXEMPLOS[exemploIdx];
          const cfg = ITEM_CONFIG[ex.perfil];
          return (
            <div className="p-6 space-y-6 text-left">
              {/* Seção 1 — contexto */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">Sua função / cargo na organização</span>
                <p className="text-sm font-bold text-gray-700 p-3 bg-[#f8fafc] border border-gray-200 rounded-xl m-0">{ex.minhaFuncao}</p>
              </div>

              {/* Seção 2 — itens com 4 vozes + oportunidade */}
              {ex.itens.map((item, idx) => (
                <div key={idx} className="rounded-2xl border-2 border-gray-100 bg-white p-5 space-y-5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black">{idx + 1}</span>
                  <div className="space-y-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">{cfg.itemLabel}</span>
                    <p className="text-sm font-bold text-gray-700 p-3 bg-[#f8fafc] border border-gray-200 rounded-xl m-0">{item.nome}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                    <p className="text-xs font-bold text-blue-800 m-0">Os problemas deste item — por 4 ângulos diferentes:</p>
                    {cfg.vozes.map((voz) => (
                      <div key={voz.campo} className="space-y-1.5">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">{voz.label}</span>
                        <p className="text-sm text-gray-700 p-3 bg-white border border-gray-200 rounded-xl m-0">{item[voz.campo as 'voz1' | 'voz2' | 'voz3' | 'voz4']}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">Oportunidade de melhoria que você enxerga aqui</span>
                    <p className="text-sm text-gray-700 p-3 bg-[#f8fafc] border border-gray-200 rounded-xl m-0">{item.oportunidade}</p>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 leading-relaxed m-0">
                  Este exemplo é só pra consulta — não altera os seus dados.
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  if (!userProfile) {
    return (
      <div className="max-w-5xl mx-auto p-12 space-y-12 text-center bg-[#f8fafc] min-h-screen">
        <div className="flex justify-end">
          <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Antes de tudo: qual é o ESCOPO da melhoria que você quer?</h2>
          <p className="text-gray-500 font-medium italic">Vou fazer perguntas diferentes pra cada caso. Escolhe o que descreve melhor a sua situação.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-xl mx-auto">
          {[
            {
              id: 'Atividades' as Exclude<UserProfile, null>,
              title: 'Quero gerar ideias de projetos',
              description: 'O que EU faço no dia a dia — re-trabalho, ferramenta ruim, espera, reclamação que recebo.',
              icon: ClipboardList,
            },
          ].map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleProfileClick(profile.id)}
              className="p-6 bg-white border-2 border-gray-100 rounded-3xl text-left hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                <profile.icon className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
              </div>
              <h3 className="text-[15px] font-black text-gray-900 mb-3 leading-tight">{profile.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed flex-1">{profile.description}</p>
            </button>
          ))}
        </div>

        {/* Popup de recomendação de trilha REMOVIDO (a pedido) — clicar no
            perfil leva direto pra ferramenta, sem interrupção. */}

        {exemploModal}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 bg-[#f8fafc] min-h-screen">
      {/* ProgressBar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-100 z-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">
              Bate-papo pra achar a melhor ideia
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest translate-y-[-2px]">
                {userProfile === 'Atividades' && 'Foco: Suas atividades'}
                {userProfile === 'Area' && 'Foco: Sua área'}
                {userProfile === 'Empresa' && 'Foco: A empresa'}
              </span>
            </h1>
            <p className="text-sm text-gray-500 font-bold">
              {userProfile === 'Atividades' && 'Vou te fazer perguntas sobre o que VOCÊ faz no dia a dia.'}
              {userProfile === 'Area' && 'Vou te fazer perguntas sobre os processos da sua ÁREA.'}
              {userProfile === 'Empresa' && 'Vou te fazer perguntas sistêmicas sobre a EMPRESA como um todo.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExemplo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2D6E] hover:bg-[#0033CC] text-white text-[11px] font-black uppercase tracking-widest transition cursor-pointer border-0"
          >
            <BookOpen size={14} /> Ver exemplo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 pb-20">
        {/* Cabeçalho do questionário colapsado — só aparece depois de gerar.
            O formulário é longo (N itens × 4 vozes) e enterrava as ideias. */}
        {formColapsado && (
          <button
            type="button"
            onClick={() => setFormColapsado(false)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-200 bg-white px-5 py-4 text-left cursor-pointer hover:border-blue-300 transition-colors"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Suas respostas</span>
              <span className="block text-sm font-bold text-gray-800 mt-0.5">
                {(formData.itens || []).filter((it: any) => !!it.nome).length}{' '}
                {userProfile === 'Area' ? 'processo(s)' : userProfile === 'Empresa' ? 'frente(s)' : 'atividade(s)'} — clique para editar
              </span>
            </span>
            <ChevronDown size={18} className="text-gray-400 shrink-0" />
          </button>
        )}

        {!formColapsado && (<>
        {/* SEÇÃO 1 — Contexto (varia por foco) */}
        <SectionCard
          step={1}
          title={
            userProfile === 'Atividades' ? 'Quem é você no jogo' :
            userProfile === 'Area' ? 'Contexto da sua área' :
            'Contexto da empresa'
          }
          icon={Building2}
          subtitle={
            userProfile === 'Atividades' ? 'Antes de tudo, preciso te conhecer um pouco.' :
            userProfile === 'Area' ? 'Vamos posicionar sua área no mapa.' :
            'Visão geral pra entender o terreno.'
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setor/área só pra Area e Empresa. Atividades pede só a função. */}
            {userProfile !== 'Atividades' && (
              <>
                <Field label="Setor da empresa">
                  <Input
                    value={formData.sector}
                    onChange={(v) => handleInputChange('sector', v)}
                    placeholder="Ex: Automotivo, Varejo, Saúde..."
                  />
                </Field>
                <Field label={
                  userProfile === 'Area' ? 'Nome da sua área' : 'Áreas que você acompanha'
                }>
                  <Input
                    value={formData.area}
                    onChange={(v) => handleInputChange('area', v)}
                    placeholder={
                      userProfile === 'Area' ? 'Ex: Atendimento, Manutenção, Suprimentos...' :
                      'Ex: todas, ou as 3-5 críticas'
                    }
                  />
                </Field>
              </>
            )}
            {userProfile === 'Atividades' && (
              <Field label="Sua função / cargo na organização *">
                <Input
                  value={formData.minhaFuncao}
                  onChange={(v) => handleInputChange('minhaFuncao', v)}
                  placeholder="Ex: Analista de processos, Coordenador de Logística..."
                />
              </Field>
            )}
            {userProfile === 'Area' && (
              <>
                <Field label="Tamanho da equipe que você coordena">
                  <Input
                    type="number"
                    value={formData.tamanhoEquipe}
                    onChange={(v) => handleInputChange('tamanhoEquipe', v)}
                    placeholder="Ex: 12"
                  />
                </Field>
                <Field label="Quem a sua área atende?">
                  <Select
                    value={formData.clientType}
                    onChange={(v) => handleInputChange('clientType', v)}
                    options={[
                      { label: 'Outras áreas (cliente interno)', value: 'Internos' },
                      { label: 'Cliente final (externo)', value: 'Externos' },
                      { label: 'Ambos', value: 'Ambos' },
                    ]}
                  />
                </Field>
              </>
            )}
            {userProfile === 'Empresa' && (
              <>
                <Field label="Tamanho da empresa">
                  <Select
                    value={formData.tamanhoEmpresa}
                    onChange={(v) => handleInputChange('tamanhoEmpresa', v)}
                    options={[
                      { label: 'Pequena (< 100 pessoas)', value: 'pequena' },
                      { label: 'Média (100 a 1000)', value: 'media' },
                      { label: 'Grande (> 1000)', value: 'grande' },
                    ]}
                  />
                </Field>
                <Field label="Seu papel na empresa">
                  <Input
                    value={formData.meuPapelEmpresa}
                    onChange={(v) => handleInputChange('meuPapelEmpresa', v)}
                    placeholder="Ex: Consultor interno, Especialista de melhoria, Gerente de OpEx..."
                  />
                </Field>
              </>
            )}
          </div>
        </SectionCard>

        {/* SEÇÃO 2 — Itens (atividades / processos / frentes) + 4 vozes cada */}
        {userProfile && (() => {
          const cfg = ITEM_CONFIG[userProfile];
          const itens = formData.itens || [];
          return (
            <SectionCard
              step={2}
              title={
                userProfile === 'Atividades' ? 'O que você FAZ no dia a dia' :
                userProfile === 'Area' ? 'Os processos críticos da sua área' :
                'As frentes onde a empresa mais dói'
              }
              icon={Settings2}
              subtitle={
                userProfile === 'Atividades' ? 'Liste cada atividade. Pra cada uma, traga os problemas por 4 ângulos diferentes.' :
                userProfile === 'Area' ? 'Liste cada processo crítico. Pra cada um, traga os problemas por 4 ângulos.' :
                'Liste cada frente sistêmica. Pra cada uma, traga os problemas por 4 ângulos.'
              }
            >
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 mb-8">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-amber-800 font-bold leading-relaxed m-0">
                  💡 Quanto mais NÚMERO você trouxer (% retrabalho, horas, custo), melhor a ideia que a IA vai gerar.
                  Preencha pelo menos a 1ª voz de cada item — as outras são opcionais, mas quanto mais ângulos, mais forte a ideia.
                </p>
              </div>

              <div className="space-y-6">
                {itens.length === 0 && (
                  <div className="text-center py-10 px-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <p className="text-sm text-gray-500 font-bold m-0">
                      Nenhum item ainda. Clique abaixo pra adicionar o primeiro.
                    </p>
                  </div>
                )}

                {itens.map((item: any, idx: number) => (
                  <div key={item.id} className="rounded-2xl border-2 border-gray-100 bg-white p-5 space-y-5 relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Remover item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <Field label={cfg.itemLabel} important>
                      <Input
                        value={item.nome}
                        onChange={(v) => updateItem(item.id, 'nome', v)}
                        placeholder={cfg.itemPlaceholder}
                      />
                    </Field>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                      <p className="text-xs font-bold text-blue-800 m-0">
                        Os problemas deste item — por 4 ângulos diferentes:
                      </p>
                      {cfg.vozes.map((voz) => (
                        <Field key={voz.campo} label={voz.label}>
                          <Textarea
                            value={item[voz.campo]}
                            onChange={(v) => updateItem(item.id, voz.campo, v)}
                            placeholder={voz.placeholder}
                          />
                        </Field>
                      ))}
                    </div>

                    <Field label="Oportunidade de melhoria que você enxerga aqui (opcional)">
                      <Textarea
                        value={item.oportunidade}
                        onChange={(v) => updateItem(item.id, 'oportunidade', v)}
                        placeholder="Diga ONDE dá pra melhorar (reduzir, otimizar, eliminar retrabalho). NÃO a solução pronta ('comprar máquina nova') — isso vira compra, não projeto."
                      />
                    </Field>
                  </div>
                ))}

                <button
                  onClick={addItem}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600 font-black text-sm uppercase tracking-wider hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  {cfg.addLabel}
                </button>
              </div>
            </SectionCard>
          );
        })()}

        </>)}

        {/* Action Section */}
        <div className="flex flex-col items-center gap-4 py-8 border-t-2 border-gray-100 border-dashed">
          <div className="relative group">
            <button
              onClick={generateProjects}
              disabled={loading || !canGenerate}
              className={cn(
                "w-72 py-5 px-8 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-4 shadow-2xl",
                loading || !canGenerate
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 active:scale-95 shadow-blue-200"
              )}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Sparkles size={24} />
              )}
              {loading ? "Processando..." : (generatedProjects.length > 0 ? "Regenerar Ideias de Projeto" : "Gerar Ideias de Projeto")}
            </button>
            
            {!canGenerate && (
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold px-4 py-2 rounded-xl whitespace-nowrap z-10 pointer-events-none shadow-xl">
                {generatedProjects.length > 0 && !activitiesChangedSinceGeneration
                  ? 'Adicione ou altere uma atividade para regenerar as ideias'
                  : 'Preencha seu contexto e adicione pelo menos 1 item com problema/oportunidade'}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSave}
            className="text-xs font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-[0.3em] flex items-center gap-3 pt-4"
          >
            <CheckCircle2 size={16} />
            Salvar Entrevista
          </button>
        </div>

        {/* Results Section — sem 'order-first': ele jogava as ideias ACIMA do
            formulário (order:-1 no flex), que é o motivo de elas nascerem fora
            do campo de visão do aluno. Agora vêm depois do questionário. */}
        {generatedProjects.length > 0 && (
          <div ref={resultadosRef} className="space-y-4">

            {/* Itens que a IA avaliou e não viraram projeto — com o motivo dela.
                Aparece antes da lista pra que a ausência seja explícita, não silenciosa. */}
            {itensSemProjeto.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 m-0 mb-2">
                  Itens que não geraram projeto
                </p>
                <ul className="m-0 pl-4 space-y-1">
                  {itensSemProjeto.map((it: any, i: number) => (
                    <li key={i} className="text-sm text-amber-900">
                      <strong>{it.item_nome}</strong> — {it.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Título da seção */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                Oportunidades Identificadas
              </div>
              <h2 className="text-2xl font-black text-gray-900">Carteira de Projetos</h2>
              <p className="text-sm text-gray-400">
                Projetos identificados com base na sua realidade. Clique para ver os detalhes.
              </p>
              <p className="text-sm font-bold text-emerald-700 m-0">
                {generatedProjects.filter((p: any) => p.aprovado !== false).length} de {generatedProjects.length} aprovadas para a próxima etapa
              </p>
              <p className="text-xs text-gray-400 m-0">
                Desmarque a caixa das ideias que você não quer levar adiante.
              </p>
            </div>

            {/* Filtros — 3 níveis sem jargão */}
            <div className="flex flex-wrap gap-2 justify-center">
              {['Todos', 'Implementação', 'Complexidade baixa', 'Complexidade média'].map(level => {
                const count = level === 'Todos'
                  ? generatedProjects.length
                  : generatedProjects.filter(p => p.nivel_projeto === level).length;
                const isActive = nivelFilter === level;
                const colors: Record<string, string> = {
                  'Todos': 'bg-gray-800 text-white border-gray-800',
                  'Implementação': 'bg-lime-500 text-white border-lime-500',
                  'Complexidade baixa': 'bg-blue-500 text-white border-blue-500',
                  'Complexidade média': 'bg-indigo-600 text-white border-indigo-600',
                };
                return (
                  <button
                    key={level}
                    onClick={() => setNivelFilter(level)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border-2 cursor-pointer ${
                      isActive ? colors[level] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {level} ({count})
                  </button>
                );
              })}
            </div>

            {/* Cards de projetos */}
            <div className="space-y-3">
              {generatedProjects
                .filter(p => nivelFilter === 'Todos' || p.nivel_projeto === nivelFilter)
                .map((project, idx) => {
                  // Precisamos do indice original para passar corretamente para o remove
                  const originalIndex = generatedProjects.indexOf(project);
                  return (
                  <ProjectResultCard
                    key={originalIndex}
                    project={project}
                    index={originalIndex}
                    origemLabel={origemDoProjeto(project)}
                    onToggleAprovado={(v) => {
                      const lista = [...generatedProjects];
                      lista[originalIndex] = { ...lista[originalIndex], aprovado: v };
                      setGeneratedProjects(lista);
                      onSave({ userProfile, formData, generatedProjects: lista, itensSemProjeto, lastGeneratedActivitiesFingerprint }, { silent: true });
                    }}
                    onUpdateProject={(updatedProject) => {
                        const updatedProjects = [...generatedProjects];
                        updatedProjects[originalIndex] = updatedProject;
                        setGeneratedProjects(updatedProjects);
                        onSave({ userProfile, formData, generatedProjects: updatedProjects, lastGeneratedActivitiesFingerprint }, { silent: true });
                    }}
                    onRemoveProject={() => {
                        const updatedProjects = generatedProjects.filter((_, i) => i !== originalIndex);
                        setGeneratedProjects(updatedProjects);
                        onSave({ userProfile, formData, generatedProjects: updatedProjects, lastGeneratedActivitiesFingerprint }, { silent: true });
                    }}
                  />
                  );
                })
              }
              
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    const newProject = {
                      title: 'Nova Ideia de Projeto',
                      nivel_projeto: 'Complexidade baixa',
                      what: '',
                      why: '',
                      where: '',
                      who: '',
                      how: '',
                      when: '',
                      howMuch: '',
                      expectedImpact: ''
                    };
                    const updatedProjects = [...generatedProjects, newProject];
                    setGeneratedProjects(updatedProjects);
                    setNivelFilter('Todos');
                    onSave({ userProfile, formData, generatedProjects: updatedProjects, lastGeneratedActivitiesFingerprint }, { silent: true });
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-100 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Adicionar Nova Ideia
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {exemploModal}
    </div>
  );
}

// Subcomponents
function SectionCard({ step, title, icon: Icon, subtitle, children }: { step: number, title: string, icon: any, subtitle?: string, children: React.ReactNode }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 md:p-10 relative overflow-hidden"
    >
      <div className="absolute top-6 right-6">
        <span className="w-10 h-10 border border-blue-50 rounded-full flex items-center justify-center text-blue-200 font-black text-sm">
          {String(step).padStart(2, '0')}
        </span>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-700">
            <Icon size={24} className="text-blue-600" />
            <h3 className="text-xl font-black tracking-tight">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{subtitle}</p>
          )}
        </div>
        <div className="pt-2">
          {children}
        </div>
      </div>
    </motion.section>
  );
}

function Field({ label, labelIcon: Icon, children, important }: { label: string, labelIcon?: any, children: React.ReactNode, important?: boolean }) {
  return (
    <div className={cn("space-y-3", important && "border-l-4 border-blue-900 pl-4")}>
      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block pl-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string, onChange: (v: string) => void, placeholder?: string, type?: string }) {
  return (
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-normal"
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea 
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-normal resize-none bg-transparent whitespace-normal break-words"
      style={{ height: 'auto', minHeight: '60px' }}
    />
  );
}

function Select({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { label: string, value: string }[] }) {
  return (
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-4 bg-[#f8fafc] border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
    >
      <option value="">Selecione uma opção...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ProjectResultCard({ project, index, origemLabel, onToggleAprovado, onUpdateProject, onRemoveProject }: { project: any, index: number, origemLabel?: string | null, onToggleAprovado?: (v: boolean) => void, onUpdateProject: (updatedProject: any) => void, onRemoveProject?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Config visual dos 3 níveis (sem jargão Belt/Six Sigma).
  const nivelConfig: Record<string, {
    color: string;
    bg: string;
    border: string;
    dot: string;
    label: string;
  }> = {
    'Implementação': {
      color: 'text-lime-700', bg: 'bg-lime-50',
      border: 'border-lime-200', dot: 'bg-lime-500',
      label: 'Implementação'
    },
    'Complexidade baixa': {
      color: 'text-blue-700', bg: 'bg-blue-50',
      border: 'border-blue-200', dot: 'bg-blue-500',
      label: 'Complexidade baixa'
    },
    'Complexidade média': {
      color: 'text-indigo-700', bg: 'bg-indigo-50',
      border: 'border-indigo-200', dot: 'bg-indigo-600',
      label: 'Complexidade média'
    },
  };

  const title = project.title || '';
  const nivelProjeto = project.nivel_projeto || project.belt_level || project.beltLevel || 'Complexidade baixa';
  const priorityScore = project.priority_score || 0;

  const [editForm, setEditForm] = useState({
    title: project.title || '',
    nivel_projeto: nivelProjeto,
    what: project.what || project.problem || '',
    why: project.why || project.justification || '',
    where: project.where || '',
    who: project.who || '',
    when: project.when || '',
    how: project.how || '',
    howMuch: project.howMuch || project.financial_impact || '',
    expectedImpact: project.expectedImpact || ''
  });

  useEffect(() => {
    setEditForm({
      title: project.title || '',
      nivel_projeto: project.nivel_projeto || project.belt_level || project.beltLevel || 'Complexidade baixa',
      what: project.what || project.problem || '',
      why: project.why || project.justification || '',
      where: project.where || '',
      who: project.who || '',
      when: project.when || '',
      how: project.how || '',
      howMuch: project.howMuch || project.financial_impact || '',
      expectedImpact: project.expectedImpact || ''
    });
  }, [project]);

  const belt = nivelConfig[nivelProjeto] || nivelConfig['Complexidade baixa'];
  const priorityColor = priorityScore >= 80 ? 'bg-red-500' : priorityScore >= 60 ? 'bg-orange-400' : 'bg-blue-400';

  const handleSave = () => {
    onUpdateProject({ ...project, ...editForm });
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${belt.border} hover:shadow-md`}
    >
      {/* Header — sempre visível */}
      <div className="w-full flex items-center gap-3 px-5 py-4">
        {/* Aprovação para a próxima etapa. Fica FORA do botão de expandir pra que
            clicar na caixa não abra/feche o card. */}
        <input
          type="checkbox"
          checked={project.aprovado !== false}
          onChange={(e) => { e.stopPropagation(); onToggleAprovado?.(e.target.checked); }}
          title={project.aprovado !== false ? 'Aprovada para a próxima etapa' : 'Não vai para a próxima etapa'}
          aria-label={`Aprovar ideia ${index + 1} para a próxima etapa`}
          className="w-5 h-5 shrink-0 cursor-pointer accent-emerald-600"
        />
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex-1 min-w-0 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        {/* Número */}
        <div className="w-7 h-7 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
          {index + 1}
        </div>

        {/* Badge do nível do projeto */}
        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shrink-0 ${belt.bg} ${belt.color} border ${belt.border}`}>
          {belt.label}
        </span>

        {/* Título + de qual atividade a ideia nasceu */}
        <span className="flex-1 text-left leading-tight">
          <span className="block text-sm font-bold text-gray-900">{title}</span>
          {origemLabel && (
            <span className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1 truncate">
              {origemLabel}
            </span>
          )}
        </span>

        {/* Expand icon */}
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      </div>

      {/* Detalhes — colapsável */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isEditing ? (
              <div className={`px-4 sm:px-5 pb-5 pt-4 space-y-4 border-t ${belt.border} ${belt.bg}`}>
                <Field label="Título">
                  <Input value={editForm.title} onChange={(v) => setEditForm({...editForm, title: v})} />
                </Field>

                <Field label="Nível do projeto">
                    <Select value={editForm.nivel_projeto} onChange={(v) => setEditForm({...editForm, nivel_projeto: v})} options={[
                        {label: 'Implementação', value: 'Implementação'},
                        {label: 'Complexidade baixa', value: 'Complexidade baixa'},
                        {label: 'Complexidade média', value: 'Complexidade média'}
                    ]} />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="O que será feito (What)">
                    <Textarea value={editForm.what} onChange={(v) => setEditForm({...editForm, what: v})} />
                  </Field>
                  <Field label="Por que é importante (Why)">
                    <Textarea value={editForm.why} onChange={(v) => setEditForm({...editForm, why: v})} />
                  </Field>
                  <Field label="Onde será implementado (Where)">
                    <Input value={editForm.where} onChange={(v) => setEditForm({...editForm, where: v})} />
                  </Field>
                  <Field label="Quem são os envolvidos (Who)">
                    <Input value={editForm.who} onChange={(v) => setEditForm({...editForm, who: v})} />
                  </Field>
                  <Field label="Como será feito (How)">
                    <Textarea value={editForm.how} onChange={(v) => setEditForm({...editForm, how: v})} />
                  </Field>
                  <Field label="Quando será feito (When)">
                    <Input value={editForm.when} onChange={(v) => setEditForm({...editForm, when: v})} />
                  </Field>
                  <Field label="Custo / Impacto Financeiro (How Much)">
                    <Input value={editForm.howMuch} onChange={(v) => setEditForm({...editForm, howMuch: v})} />
                  </Field>
                  <Field label="Impacto Esperado Geral">
                    <Input value={editForm.expectedImpact} onChange={(v) => setEditForm({...editForm, expectedImpact: v})} />
                  </Field>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-white text-gray-500 border border-gray-200 hover:bg-gray-50`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    className={`flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-none cursor-pointer ${belt.bg} ${belt.color} border ${belt.border} hover:opacity-80`}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              <div className={`px-4 sm:px-5 pb-5 pt-2 space-y-4 border-t ${belt.border} ${belt.bg}`}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">O que (What)</span>
                    <p className="text-sm font-medium text-gray-800">{editForm.what || '-'}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Por que (Why)</span>
                    <p className="text-sm font-medium text-gray-800">{editForm.why || '-'}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Como (How)</span>
                    <p className="text-sm font-medium text-gray-800">{editForm.how || '-'}</p>
                  </div>
                  <div className="flex flex-col gap-4">
                      <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Onde / Quem / Quando</span>
                        <p className="text-xs text-gray-600 mt-1"><strong>Onde:</strong> {editForm.where || '-'}</p>
                        <p className="text-xs text-gray-600 mt-1"><strong>Quem:</strong> {editForm.who || '-'}</p>
                        <p className="text-xs text-gray-600 mt-1"><strong>Quando:</strong> {editForm.when || '-'}</p>
                      </div>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Custo / Estimativa em $ (How Much)</span>
                    <p className="text-sm font-bold text-gray-900">{editForm.howMuch || '-'}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-xl border ${belt.border}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Impacto Esperado</span>
                    <p className="text-sm font-bold text-gray-900">{editForm.expectedImpact || '-'}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3 pt-2">
                  {onRemoveProject && (
                    <button
                      className="p-3 rounded-xl font-black text-gray-400 bg-white border border-gray-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center"
                      onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if(onRemoveProject) onRemoveProject();
                      }}
                      title="Remover Ideia"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-white text-gray-600 border border-gray-200 hover:bg-gray-50`}
                    onClick={() => setIsEditing(true)}
                  >
                    Editar Ideia
                  </button>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
