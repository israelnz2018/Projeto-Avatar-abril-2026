const unwrap = (sourceData: any) => sourceData?.toolData || sourceData || {};

const textKey = (value: any) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('pt-BR');

/** Converte Ideias de Projetos ou Brainstorming em linhas de GUT/RAB. */
export const prioritizationItemsFromSource = (sourceData: any): any[] => {
  const data = unwrap(sourceData);
  const projects = (Array.isArray(data.generatedProjects) ? data.generatedProjects : [])
    .filter((project: any) => project?.aprovado !== false)
    .map((project: any) => ({
      id: String(project?.id || ''),
      description: String(project?.title || project?.description || '').trim(),
      sourceType: 'projectIdea',
    }));

  const ideas = (Array.isArray(data.ideas) ? data.ideas : [])
    .map((idea: any) => ({
      id: String(idea?.id || ''),
      description: String(idea?.text || idea?.description || '').trim(),
      sourceType: 'brainstorming',
      sourceIdeaId: String(idea?.id || ''),
      sourceCauseId: String(idea?.causeSourceId || ''),
      sourceCause: String(idea?.category || '').trim(),
    }));

  const seen = new Set<string>();
  return [...projects, ...ideas]
    .filter((item) => item.description)
    .filter((item) => {
      const key = `${item.sourceCauseId || item.sourceCause || ''}|${textKey(item.description)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, index) => ({
      ...item,
      id: item.id || String(index + 1),
    }));
};
