export type SessionStatus = "idle" | "running" | "waiting" | "failed";

export type WorkspaceRef =
  | { kind: "local"; rootPath: string }
  | { kind: "sandbox"; sandboxId: string; provider: string };

export type WorkspacePolicy = "auto" | "none" | "required";
export type WorkspaceProviderKind = "local" | "sandbox";
export type SandboxProviderKind = "blaxel" | "daytona";

export interface AgentSession {
  id: string;
  threadId: string | null;
  status: SessionStatus;
  modeId: string;
  modelId: string;
  thinkingLevel: string;
  workspacePolicy: WorkspacePolicy;
  workspace?: WorkspaceRef | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ServerEvent<TPayload = unknown> {
  id: string;
  sessionId: string;
  threadId?: string | null | undefined;
  type: string;
  payload: TPayload;
  createdAt: string;
}

export type CreateSessionInput = Partial<{
  modelId: string;
  modeId: string;
  workspacePolicy: WorkspacePolicy;
  workspace: WorkspaceRef;
  workspaceProvider: WorkspaceProviderKind;
  sandboxProvider: SandboxProviderKind;
  cwd: string;
  projectName: string;
  yolo: boolean;
}>;

export type SessionCommand =
  | {
      type: "sendMessage";
      payload: {
        content: string;
        files?: Array<{ data: string; mediaType: string; filename?: string }>;
      };
    }
  | { type: "abort"; payload?: Record<string, never> }
  | {
      type: "switchModel";
      payload: { modelId: string; scope?: "global" | "thread" };
    }
  | { type: "switchMode"; payload: { modeId: string } }
  | {
      type: "setThinkingLevel";
      payload: { level: "off" | "low" | "medium" | "high" | "xhigh" };
    }
  | {
      type: "approveToolCall";
      payload: { decision: "approve" | "decline" | "always_allow_category" };
    }
  | { type: "respondToToolSuspension"; payload: { resumeData: unknown } }
  | { type: "submitWorkspaceEnv"; payload: SubmitWorkspaceEnvInput }
  | { type: "skipWorkspaceEnv"; payload: { requestId: string } }
  | {
      type: "respondToQuestion";
      payload: { questionId: string; answer: string };
    }
  | {
      type: "respondToPlanApproval";
      payload: {
        planId: string;
        action: "approved" | "rejected";
        feedback?: string;
      };
    }
  | { type: "createThread"; payload?: Record<string, never> }
  | { type: "switchThread"; payload: { threadId: string } }
  | { type: "attachWorkspace"; payload: { workspace: WorkspaceRef } }
  | { type: "detachWorkspace"; payload?: Record<string, never> };

export interface CommandResult {
  accepted: boolean;
  error?: string | undefined;
}

export interface WorkspaceExportDownload {
  blob: Blob;
  filename: string;
  contentType: string;
}

export type WorkspaceEnvFile = ".env" | ".env.local";

export interface WorkspaceEnvValueInput {
  name: string;
  value: string;
  secret: boolean;
  envFile: WorkspaceEnvFile;
  description?: string | undefined;
}

export interface WorkspaceEnvRequestItem {
  name: string;
  required: boolean;
  secret: boolean;
  envFile: WorkspaceEnvFile;
  description?: string | undefined;
}

export interface WorkspaceEnvRequestCreatedPayload {
  requestId: string;
  appPath: string;
  reason: string;
  requested: WorkspaceEnvRequestItem[];
}

export interface WorkspaceEnvStatusVar {
  name: string;
  required: boolean;
  secret: boolean;
  hasValue: boolean;
  envFile: WorkspaceEnvFile;
  source: "recipe" | "user" | "env-file";
  description?: string | undefined;
}

export interface WorkspaceEnvStatus {
  appPath: string;
  vars: WorkspaceEnvStatusVar[];
}

export interface WorkspaceEnvUpdatedPayload {
  requestId: string;
  appPath: string;
  keysAdded: string[];
  keysUpdated: string[];
  missingRequired?: string[] | undefined;
  status: WorkspaceEnvStatus;
}

export interface SubmitWorkspaceEnvInput {
  requestId: string;
  appPath?: string | undefined;
  values: WorkspaceEnvValueInput[];
}

export type SessionDisplayTool = {
  name?: string | undefined;
  toolName?: string | undefined;
  args?: unknown | undefined;
  status?: string | undefined;
  result?: unknown | undefined;
  isError?: boolean | undefined;
  artifact?: unknown | undefined;
};

export type SessionDisplayState = {
  isRunning?: boolean | undefined;
  currentMessage?: unknown | undefined;
  activeTools?: Record<string, SessionDisplayTool> | undefined;
  pendingApproval?: unknown | undefined;
  pendingQuestion?: unknown | undefined;
  pendingSuspension?: unknown | undefined;
};

export interface SessionStateResponse {
  session: AgentSession;
  displayState?: SessionDisplayState | undefined;
  messages?: unknown[] | undefined;
  threads?: Array<{
    id: string;
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export type FrontendExampleCategory =
  | "Chat"
  | "Agents"
  | "UI Patterns"
  | "Integrations"
  | "Mobile";

export type FrontendExampleComplexity = "starter" | "intermediate" | "advanced";

export type FrontendExampleCapability =
  | "basic-chat"
  | "artifact-preview"
  | "form-copilot"
  | "persistent-threads"
  | "custom-backend"
  | "reasoning-display"
  | "mcp-tools"
  | "cloud-auth"
  | "external-store"
  | "parent-grouping"
  | "thread-list"
  | "voice-input"
  | "media-processing"
  | "agent-protocol";

export interface FrontendExampleEnvVar {
  name: string;
  required: boolean;
  scope: "server" | "client" | "runner";
  secret: boolean;
  description: string;
}

export interface FrontendExampleSummary {
  id: string;
  label: string;
  teaser: string;
  description: string;
  kind: "template" | "example";
  tags: string[];
  capabilities: FrontendExampleCapability[];
  preview: {
    status: "live" | "stale" | "missing";
    url?: string | undefined;
    screenshot?: string | undefined;
    builtFromRef?: string | undefined;
  };
  tech: {
    framework: "next" | "vite" | "react-router" | "tanstack" | "expo";
    runtime: "nodejs-api-route" | "edge-runtime" | "none";
    frontendPattern:
      | "useChat"
      | "useChatRuntime"
      | "useChatRuntime+threads"
      | "external-store"
      | "cloud-runtime";
    persistence: "none" | "localStorage" | "server-db" | "cloud";
    agentPattern:
      | "ai-sdk"
      | "langgraph"
      | "mcp"
      | "cloud"
      | "a2a"
      | "ag-ui"
      | "google-adk"
      | "custom";
  };
  verifyProfile: "next" | "vite" | "react-router" | "tanstack" | "custom";
  sourcePath: string;
  env?: FrontendExampleEnvVar[] | undefined;
  ui: {
    category: FrontendExampleCategory;
    complexity: FrontendExampleComplexity;
    featured: boolean;
  };
}
