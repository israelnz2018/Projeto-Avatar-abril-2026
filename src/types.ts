export type DMAICPhase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control';

export interface Project {
  id: string;
  name: string;
  description?: string;
  problem?: string;
  goal?: string;
  scope?: string;
  currentPhase: string;
  initiativeId?: string; // New field to link project to an initiative
  ownerUid?: string;
  ownerEmail?: string;
  createdAt?: any;
  updatedAt?: string;
  completedTools?: string[];
}

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  phases?: { id: string, name: string }[];
  createdAt: string;
}

export interface InitiativePhaseConfig {
  initiativeId: string;
  phaseId: string; // e.g., 'Define', 'Measure', etc.
  toolIds: string[]; // List of tool IDs assigned to this phase in this initiative
}

export interface ToolDefinition {
  id: string;
  name: string;
  defaultPhase: string;
}

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  columns: string[];
  createdAt: string;
}

export interface AnalysisRun {
  id: string;
  datasetId: string;
  type: string;
  parameters: any;
  results: any;
  createdAt: string;
}

export interface VideoChunk {
  id: string;
  videoId: string;
  title: string;
  url: string;
  topic: string;
  dmaicPhase: DMAICPhase;
  text: string;
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
  createdAt: string;
}
