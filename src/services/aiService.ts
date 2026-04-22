import { 
  generateAIToolReport as claudeReport, 
  generateToolData as claudeData,
  chatWithMentor as claudeChat,
  getMentorSuggestions as claudeSuggestions
} from './claudeAiService';

export const generateAIToolReport = async (toolName: string, toolData: any, projectName: string) => {
  return await claudeReport(toolName, toolData, projectName);
};

export const generateToolData = async (
  toolId: string, 
  toolName: string, 
  previousToolName: string | null, 
  previousToolData: any, 
  projectInfo?: { name: string, description?: string }, 
  allProjectData?: any
) => {
  return await claudeData(toolId, toolName, previousToolName, previousToolData, projectInfo, allProjectData);
};

export const chatWithMentor = async (
  currentPhase: string | null,
  currentTool: string | null,
  projectData: any,
  projectInfo: { name: string, description?: string },
  history: { role: 'user' | 'assistant', content: string }[],
  allProjectData?: any
) => {
  // Map arguments to match claudeAiService.ts signature:
  // message: string, currentPhase: string, currentTool: string, projectData: any, history: Array
  const message = history[history.length - 1]?.content || "";
  return await claudeChat(
    message,
    currentPhase || "Geral",
    currentTool || "Dashboard",
    allProjectData || projectData,
    history.slice(0, -1) // chatWithMentor in claudeAiService appends the message, so we pass history without it
  );
};

export const getMentorSuggestions = async (
  phase: string | null,
  tool: string | null,
  completedTools: string[] = [],
  projectData: any = {}
) => {
  return await claudeSuggestions(
    phase || "Geral",
    tool || "Dashboard",
    completedTools,
    projectData
  );
};
