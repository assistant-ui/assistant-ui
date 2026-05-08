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

export interface CreateSessionOptions {
  modelId?: string;
  modeId?: string;
  workspacePolicy?: WorkspacePolicy;
  sandboxProvider?: "blaxel";
  cleanupWorkspaceOnDestroy?: boolean;
}

export interface SessionStateResponse {
  session: AgentSession;
  displayState: Record<string, unknown> & {
    isRunning?: boolean;
    activeTools?: Record<string, unknown>;
  };
  messages: unknown[];
  threads: Array<{
    id: string;
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}
