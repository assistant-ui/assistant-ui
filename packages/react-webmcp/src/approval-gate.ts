import type {
  ToolApprovalOption,
  ToolApprovalResponse,
} from "@assistant-ui/core";
import { resolveToolApprovalResponse } from "@assistant-ui/core/internal";
import type { Tool } from "assistant-stream";

export type WebMcpApprovalDecision =
  | { approved: true }
  | {
      approved: false;
      reason?: string | undefined;
      resolution?: "cancelled" | "expired" | undefined;
    };

export type WebMcpApprovalGate = (request: {
  toolName: string;
  tool: Tool<any, any>;
  args: Record<string, unknown>;
  abortSignal: AbortSignal | undefined;
}) => Promise<WebMcpApprovalDecision>;

export type WebMcpPendingApproval = {
  readonly id: string;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly options: readonly ToolApprovalOption[];
  readonly respond: (response: ToolApprovalResponse) => void;
};

export type WebMcpApprovalStore = {
  getSnapshot(): readonly WebMcpPendingApproval[];
  subscribe(listener: () => void): () => void;
  push(approval: WebMcpPendingApproval): void;
  remove(id: string): void;
};

export const createWebMcpApprovalStore = (): WebMcpApprovalStore => {
  let snapshot: readonly WebMcpPendingApproval[] = [];
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push: (approval) => {
      snapshot = [...snapshot, approval];
      emit();
    },
    remove: (id) => {
      if (!snapshot.some((approval) => approval.id === id)) return;
      snapshot = snapshot.filter((approval) => approval.id !== id);
      emit();
    },
  };
};

export const webMcpApprovalStore = createWebMcpApprovalStore();

const sessionAllowAlways = new Set<string>();

export const DEFAULT_APPROVAL_OPTIONS: readonly ToolApprovalOption[] = [
  { id: "allow-once", kind: "allow-once" },
  { id: "allow-always", kind: "allow-always" },
  { id: "reject-once", kind: "reject-once" },
];

export type WebMcpApprovalGateConfig = {
  approval?:
    | "always"
    | "never"
    | ((
        name: string,
        tool: Tool<any, any>,
        args: Record<string, unknown>,
      ) => boolean)
    | undefined;
  approvalTimeoutMs?: number | undefined;
  requestUserInteraction?: (() => Promise<void>) | undefined;
  store?: WebMcpApprovalStore | undefined;
  approvalOptions?: readonly ToolApprovalOption[] | undefined;
  allowAlwaysMemory?: Set<string> | undefined;
};

export const createWebMcpApprovalGate = (
  config: WebMcpApprovalGateConfig = {},
): WebMcpApprovalGate => {
  const {
    approval = "always",
    approvalTimeoutMs = 120_000,
    requestUserInteraction,
    store = webMcpApprovalStore,
    approvalOptions = DEFAULT_APPROVAL_OPTIONS,
    allowAlwaysMemory = sessionAllowAlways,
  } = config;

  return async ({ toolName, tool, args, abortSignal }) => {
    if (approval === "never") return { approved: true };
    if (typeof approval === "function" && !approval(toolName, tool, args))
      return { approved: true };
    if (allowAlwaysMemory.has(toolName)) return { approved: true };
    if (abortSignal?.aborted)
      return { approved: false, resolution: "cancelled" };

    if (requestUserInteraction) {
      try {
        await requestUserInteraction();
      } catch {
        // ignore: a failed attention request must not block or decide the approval
      }
    }

    return new Promise<WebMcpApprovalDecision>((resolve) => {
      const id = crypto.randomUUID();
      let settled = false;
      const settle = (decision: WebMcpApprovalDecision) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        abortSignal?.removeEventListener("abort", onAbort);
        store.remove(id);
        resolve(decision);
      };
      const onAbort = () =>
        settle({ approved: false, resolution: "cancelled" });
      const timer = setTimeout(
        () => settle({ approved: false, resolution: "expired" }),
        approvalTimeoutMs,
      );
      abortSignal?.addEventListener("abort", onAbort);
      store.push({
        id,
        toolName,
        args,
        options: approvalOptions,
        respond: (response) => {
          const resolved = resolveToolApprovalResponse(
            { id, options: approvalOptions },
            response,
          );
          if (settled) return;
          if (resolved.approved) {
            const option = approvalOptions.find(
              (candidate) => candidate.id === resolved.optionId,
            );
            if (option?.kind === "allow-always")
              allowAlwaysMemory.add(toolName);
            settle({ approved: true });
          } else {
            settle({
              approved: false,
              ...(resolved.reason != null && { reason: resolved.reason }),
            });
          }
        },
      });
    });
  };
};
