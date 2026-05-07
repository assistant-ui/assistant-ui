export type Framework = 'next' | 'vite' | 'react-router' | 'tanstack' | 'expo';

export type Runtime =
  | 'nodejs-api-route'
  | 'edge-runtime'
  | 'none';

export type FrontendPattern =
  | 'useChat'
  | 'useChatRuntime'
  | 'useChatRuntime+threads'
  | 'external-store'
  | 'cloud-runtime';

export type PersistenceModel =
  | 'none'
  | 'localStorage'
  | 'server-db'
  | 'cloud';

export type AgentPattern =
  | 'ai-sdk'
  | 'langgraph'
  | 'mcp'
  | 'cloud'
  | 'a2a'
  | 'ag-ui'
  | 'google-adk'
  | 'custom';

export type VerifyProfile = 'next' | 'vite' | 'react-router' | 'tanstack' | 'custom';

export type Capability =
  | 'basic-chat'
  | 'artifact-preview'
  | 'form-copilot'
  | 'persistent-threads'
  | 'custom-backend'
  | 'reasoning-display'
  | 'mcp-tools'
  | 'cloud-auth'
  | 'external-store'
  | 'parent-grouping'
  | 'thread-list'
  | 'voice-input'
  | 'media-processing'
  | 'agent-protocol';

export interface EnvVar {
  name: string;
  required: boolean;
  scope: 'server' | 'client' | 'runner';
  secret: boolean;
  description: string;
}

export interface PreviewMetadata {
  status: 'live' | 'stale' | 'missing';
  url?: string;
  screenshot?: string;
  builtFromRef?: string;
}

export interface RecipeAgentMeta {
  useWhen: string[];
  avoidWhen?: string[];
  keyFiles: {
    customizeUi?: string[];
    changeModel?: string[];
    addTools?: string[];
    changeRuntime?: string[];
    env?: string[];
  };
  limitations?: string[];
}

export interface RecipeTech {
  framework: Framework;
  runtime: Runtime;
  frontendPattern: FrontendPattern;
  persistence: PersistenceModel;
  agentPattern: AgentPattern;
}

export interface Recipe {
  productId: string;
  id: string;
  label: string;
  description: string;
  sourcePath: string;
  kind: 'template' | 'example';
  tech: RecipeTech;
  tags: string[];
  capabilities: Capability[];
  preview: PreviewMetadata;
  env: EnvVar[];
  agent: RecipeAgentMeta;
  verifyProfile: VerifyProfile;
}

export type RecipeSummary = Pick<Recipe, 'id' | 'label' | 'capabilities' | 'preview'>;
