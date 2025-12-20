export enum AgentType {
  User = 'User',
  Scout = 'Scout',
  Researcher = 'Researcher',
  Strategist = 'Strategist',
  Coder = 'Coder',
  Experimenter = 'Experimenter',
  Analyst = 'Analyst',
  Ensemble = 'Ensemble'
}

export interface KaggleCredentials {
  username: string;
  key: string;
}

export type AIProvider = 'gemini' | 'openrouter' | 'openai' | 'cerebras' | 'groq';

export interface AgentConfig {
  agentType: AgentType;
  customPrompt?: string;
  preferredProvider?: AIProvider;
  fallbackProviders?: AIProvider[];
  mcpIds?: string[];
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  // We can also store tool definitions if we want to cache them
}

export interface LLMKeys {
  provider: AIProvider;
  gemini?: string;
  openRouter?: string;
  openAI?: string;
  cerebras?: string;
  groq?: string;
  agentConfigs?: Record<string, AgentConfig>;
  mcpServers?: MCPServer[];
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  agentType?: AgentType;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  url?: string;
  tags: string[]; // e.g., "Regression", "Image Data", "Rank: 240"
  lastActive: string;
  status: 'active' | 'archived';
}

export type ViewMode = 'chat' | 'memory' | 'agents' | 'settings' | 'team';

export interface Resource {
  id: string;
  title: string;
  type: 'paper' | 'library' | 'dataset';
  url?: string;
  summary?: string;
  metadata?: {
    stars?: string;
    language?: string;
    updated?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface MemoryBlock {
  label: string;
  value: string;
  lastUpdated: string;
}

export interface SearchFilters {
  topic: string;
  language?: string;
  minStars?: number;
  lastUpdated?: string; // e.g. "2024" or "last 6 months"
}