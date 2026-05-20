/**
 * Wrapper público do serviço de IA usado pelas ferramentas.
 * Em 2026-05-17 enxugamos: só sobrou generateToolData (botão "Preencher com IA").
 * As outras funções (chatWithMentor, getMentorSuggestions, generateAIToolReport)
 * eram código morto e foram removidas.
 */

import { generateToolData as claudeData } from './claudeAiService';

export const generateToolData = async (
  toolId: string,
  toolName: string,
  previousToolName: string | null,
  previousToolData: any,
  projectInfo?: { name: string; description?: string },
  allProjectData?: any
) => {
  return await claudeData(toolId, toolName, previousToolName, previousToolData, projectInfo, allProjectData);
};
