export type WorkspaceEnvFile = ".env" | ".env.local";

export type SessionCommand =
  | { type: "sendMessage"; payload: { content: string; files?: Array<{ data: string; mediaType: string; filename?: string }> } }
  | { type: "abort"; payload?: Record<string, never> }
  | { type: "switchModel"; payload: { modelId: string; scope?: "global" | "thread" } }
  | { type: "switchMode"; payload: { modeId: string } }
  | { type: "setThinkingLevel"; payload: { level: "off" | "low" | "medium" | "high" | "xhigh" } }
  | { type: "approveToolCall"; payload: { decision: "approve" | "decline" | "always_allow_category" } }
  | { type: "respondToToolSuspension"; payload: { resumeData: unknown } }
  | {
      type: "submitWorkspaceEnv";
      payload: {
        requestId: string;
        appPath?: string;
        values: Array<{
          name: string;
          value: string;
          secret: boolean;
          envFile: WorkspaceEnvFile;
          description?: string;
        }>;
      };
    }
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
