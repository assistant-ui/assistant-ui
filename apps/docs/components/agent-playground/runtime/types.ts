export type SessionStatus = "idle" | "running" | "waiting" | "failed";

export type WorkspaceRef = {
  kind: "sandbox";
  sandboxId: string;
  provider: "blaxel";
};

export type WorkspacePolicy = "auto" | "none" | "required";

export interface AgentSession {
  id: string;
  threadId: string | null;
  status: SessionStatus;
  modeId: string;
  modelId: string;
  thinkingLevel: string;
  workspacePolicy: WorkspacePolicy;
  workspace?: WorkspaceRef;
  createdAt: string;
  updatedAt: string;
}

export interface ServerEvent<TPayload = unknown> {
  id: string;
  sessionId: string;
  threadId?: string | null;
  type: string;
  payload: TPayload;
  createdAt: string;
}

export type CreateSessionInput = Partial<{
  modelId: string;
  modeId: string;
  workspacePolicy: WorkspacePolicy;
  sandboxProvider: "blaxel";
  yolo: boolean;
}>;

export type SessionCommand =
  | { type: "sendMessage"; payload: { content: string; files?: Array<{ data: string; mediaType: string; filename?: string }> } }
  | { type: "abort"; payload?: Record<string, never> }
  | { type: "switchModel"; payload: { modelId: string; scope?: "global" | "thread" } }
  | { type: "switchMode"; payload: { modeId: string } }
  | { type: "setThinkingLevel"; payload: { level: "off" | "low" | "medium" | "high" | "xhigh" } }
  | { type: "approveToolCall"; payload: { decision: "approve" | "decline" | "always_allow_category" } }
  | { type: "respondToToolSuspension"; payload: { resumeData: unknown } }
  | { type: "submitWorkspaceEnv"; payload: SubmitWorkspaceEnvInput }
  | { type: "skipWorkspaceEnv"; payload: { requestId: string } }
  | { type: "respondToQuestion"; payload: { questionId: string; answer: string } }
  | { type: "respondToPlanApproval"; payload: { planId: string; action: "approved" | "rejected"; feedback?: string } }
  | { type: "createThread"; payload?: Record<string, never> }
  | { type: "switchThread"; payload: { threadId: string } };

export interface CommandResult {
  accepted: boolean;
  error?: string;
  traceId?: string;
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
  description?: string;
}

export interface WorkspaceEnvRequestItem {
  name: string;
  required: boolean;
  secret: boolean;
  envFile: WorkspaceEnvFile;
  description?: string;
}

export interface SubmitWorkspaceEnvInput {
  requestId: string;
  appPath?: string;
  values: WorkspaceEnvValueInput[];
}

export interface SessionStateResponse {
  session: AgentSession;
  displayState?: {
    isRunning?: boolean;
    activeTools?: Record<string, unknown>;
    pendingApproval?: unknown;
    pendingQuestion?: unknown;
    pendingSuspension?: unknown;
  };
  messages?: unknown[];
  threads?: Array<{ id: string; title?: string; createdAt?: string; updatedAt?: string }>;
}

export interface FrontendExampleSummary {
  id: string;
  label: string;
  teaser: string;
  description: string;
  kind: "template" | "example";
  tags: string[];
  capabilities: string[];
  preview: {
    status: "live" | "stale" | "missing";
    url?: string;
    screenshot?: string;
    builtFromRef?: string;
  };
}
