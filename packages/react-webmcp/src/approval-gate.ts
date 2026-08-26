import type { Tool } from "assistant-stream";

export type WebMcpApprovalDecision =
  | { approved: true }
  | { approved: false; reason?: string };

export type WebMcpApprovalGate = (request: {
  toolName: string;
  tool: Tool<any, any>;
  args: Record<string, unknown>;
  abortSignal: AbortSignal | undefined;
}) => Promise<WebMcpApprovalDecision>;

// Stage-4 placeholder: the real gate (spec §3) adds requestUserInteraction,
// the useWebMcpApprovals queue, core's ToolApprovalResponse vocabulary,
// allow-always memory, and timeout/abort handling. Until it lands, every
// WebMCP-invoked call is approved.
export const placeholderApprovalGate: WebMcpApprovalGate = () =>
  Promise.resolve({ approved: true });
