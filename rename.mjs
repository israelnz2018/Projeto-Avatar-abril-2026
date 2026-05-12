import fs from 'fs';

let content = fs.readFileSync('src/components/projects/MeasureAdkar.tsx', 'utf8');

content = content.replace('interface StakeholderAdkarProps', 'interface MeasureAdkarProps');
content = content.replace('export default function StakeholderAdkar({', 'export default function MeasureAdkar({');
content = content.replace('}: StakeholderAdkarProps) {', '}: MeasureAdkarProps) {');
content = content.replace("currentPhase = 'Define'", "currentPhase = 'Measure'");

content = content.replace(
`const AWARENESS_ACTIONS: Record<string, Record<string, string>> = {
  'Gerenciar de Perto': {
    'Vermelho': 'Conversa individual imediata para explicar o motivo da mudança e o impacto direto. Repetir semanalmente até a pessoa entender.',
    'Amarelo': 'Conversa individual para reforçar entendimento com dados concretos. Confirmar que ela sabe explicar o motivo da mudança.',
    'Verde': ''
  },
  'Manter Satisfeito': {
    'Vermelho': 'Reunião de alinhamento com a área dela para explicar como a mudança os favorece. Trazer dados de dores atuais.',
    'Amarelo': 'Incluir em apresentações mensais mostrando o impacto do projeto para a área dela.',
    'Verde': ''
  },
  'Manter Informado': {
    'Vermelho': 'E-mail direcionado e/ou newsletter detalhando o impacto (que tende a ser pequeno) para evitar boatos.',
    'Amarelo': 'Convite para sessão de tira-dúvidas opcional. E-mail mensal de status geral.',
    'Verde': ''
  },
  'Monitorar': {
    'Vermelho': 'Desfazer boatos num canal de grande circulação ou na Intranet. Evitar reuniões um a um a menos que essencial.',
    'Amarelo': 'Lembrete da mudança em comunicações regulares. Reforçar contexto quando houver novidade.',
    'Verde': ''
  }
};`,
`const DESIRE_ACTIONS: Record<string, Record<string, string>> = {
  'Gerenciar de Perto': {
    'Vermelho': 'Conversa individual para entender o que está bloqueando o engajamento. Endereçar a preocupação específica e mostrar o que ela ganha com a mudança.',
    'Amarelo': 'Convite ativo para participar das próximas etapas. Reforçar como a contribuição dela é valiosa.',
    'Verde': ''
  },
  'Manter Satisfeito': {
    'Vermelho': 'Reapresentar os benefícios do projeto com dados. Solicitar apoio visível e ativo.',
    'Amarelo': 'Apresentar progresso e pedir endosso público nas próximas comunicações.',
    'Verde': ''
  },
  'Manter Informado': {
    'Vermelho': 'Conversa direta para entender resistência. Validar que o impacto na área é positivo ou neutro.',
    'Amarelo': 'Atualização destacando como a contribuição dela é essencial. Pedir disponibilidade para envolvimento.',
    'Verde': ''
  },
  'Monitorar': {
    'Vermelho': 'Comunicação clara do porquê o engajamento dela importa. Endereçar diretamente boatos ou desinformação.',
    'Amarelo': 'Reforçar valor da mudança nas comunicações regulares. Citar exemplos de quem já apoia.',
    'Verde': ''
  }
};`
);

content = content.replace(
`const getRecommendedAction = (s: Stakeholder): string => {
  const quadrant = getQuadrant(s.power, s.interest);
  const awareness = calculateAwareness(s.currentEngagement, s.desiredEngagement);
  if (awareness === 'Verde') {
    return 'Sem ação imediata — manter alinhado nas próximas fases';
  }
  return AWARENESS_ACTIONS[quadrant]?.[awareness] || '';
};`,
`const getRecommendedAction = (s: Stakeholder): string => {
  const quadrant = getQuadrant(s.power, s.interest);
  const color = calculateColorForPhase(s, 'Measure');
  if (color === 'Verde') {
    return 'Sem ação imediata — manter alinhado nas próximas fases';
  }
  if (color === 'Cinza') return '';
  return DESIRE_ACTIONS[quadrant]?.[color] || '';
};`
);

// We need to match the previous useEffect securely. Let's just use string replace carefully, or a regex for the entire useEffect body.
const startMarker = "useEffect(() => {";
const endMarker = "}, [initialData, allProjectData]);";
const startIndex = content.indexOf(startMarker, content.indexOf("const [isEngagementRoleGuideOpen"));
const endIndex = content.indexOf(endMarker, startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) +
`useEffect(() => {
    // Se já tem dados salvos da própria ferramenta, usar
    if (initialData?.stakeholders && initialData.stakeholders.length > 0) {
      setStakeholders(initialData.stakeholders.map((s: any) => ({
        ...s,
        currentEngagementMeasure: s.currentEngagementMeasure || undefined,
        customAction: ''
      })));
      return;
    }

    // Senão, puxar da ferramenta StakeholderAdkar (fase Define)
    const previousData = allProjectData?.stakeholderAdkar;
    if (previousData?.stakeholders && previousData.stakeholders.length > 0) {
      const imported = previousData.stakeholders.map((s: any) => ({
        ...s,
        currentEngagementMeasure: undefined,
        customAction: ''
      }));
      setStakeholders(imported);
    }
  ` + content.slice(endIndex);
}

content = content.replace(
  '<h2 className="text-[14px] font-black tracking-tight text-gray-800">Stakeholder & ADKAR</h2>',
  '<h2 className="text-[14px] font-black tracking-tight text-gray-800">Stakeholder & ADKAR — Medir (Desire)</h2>'
);

content = content.replace(
  '<span className="text-xs font-medium">Ações Recomendadas — Fase Definir (Awareness)</span>',
  '<span className="text-xs font-medium">Ações Recomendadas — Fase Medir (Desire)</span>'
);

content = content.replace(
  'Foco: Awareness — Fazer cada pessoa SABER e ENTENDER a necessidade da mudança (o projeto e seu impacto).',
  'Foco: Desire — Fazer cada pessoa QUERER cooperar com o mapeamento do processo e a coleta de dados.'
);

fs.writeFileSync('src/components/projects/MeasureAdkar.tsx', content);
