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

export const DEFAULT_APPROVAL_OPTIONS: readonly ToolApprovalOption[] = [
  { id: "allow-once", kind: "allow-once" },
  { id: "allow-always", kind: "allow-always" },
  { id: "reject-once", kind: "reject-once" },
];

const APPROVAL_TIMEOUT_MS = 120_000;

export type WebMcpApprovalGateConfig = {
  approval?: "always" | "never" | undefined;
  requestUserInteraction?: (() => Promise<void>) | undefined;
  store?: WebMcpApprovalStore | undefined;
  allowAlwaysMemory?: Set<string> | undefined;
};

export const createWebMcpApprovalGate = (
  config: WebMcpApprovalGateConfig = {},
): WebMcpApprovalGate => {
  const {
    approval = "always",
    requestUserInteraction,
    store = webMcpApprovalStore,
    allowAlwaysMemory = new Set<string>(),
  } = config;

  return async ({ toolName, args, abortSignal }) => {
    if (approval === "never") return { approved: true };
    if (allowAlwaysMemory.has(toolName)) return { approved: true };
    if (abortSignal?.aborted)
      return { approved: false, resolution: "cancelled" };

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
        APPROVAL_TIMEOUT_MS,
      );
      abortSignal?.addEventListener("abort", onAbort);
      store.push({
        id,
        toolName,
        args,
        options: DEFAULT_APPROVAL_OPTIONS,
        respond: (response) => {
          if (settled) return;
          const resolved = resolveToolApprovalResponse(
            { id, options: DEFAULT_APPROVAL_OPTIONS },
            response,
          );
          if (resolved.approved) {
            const option = DEFAULT_APPROVAL_OPTIONS.find(
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
      Promise.resolve()
        .then(requestUserInteraction)
        .catch(() => {});
    });
  };
};
