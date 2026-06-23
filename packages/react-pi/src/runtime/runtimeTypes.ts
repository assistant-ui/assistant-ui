import type {
  ExternalStoreAdapter,
  ExternalStoreSharedOptions,
  ThreadMessageLike,
} from "@assistant-ui/react";
import type { PiThreadControllerLike } from "./ThreadController";
import type { PiInterruptAnswer } from "./hostUi";
import type { PiThreadState } from "./threadState";
import type {
  PiClient,
  PiContextUsage,
  PiHostUiRequest,
  PiHostUiResponse,
  PiRuntimeReadiness,
  PiThinkingLevel,
  PiThreadMetadata,
  PiThreadStatus,
} from "../types";

export type PiRuntimeOptions = ExternalStoreSharedOptions & {
  /** The transport-agnostic Pi client (HTTP/SSE, RPC, IPC). */
  client: PiClient;
  /** Workspace scoping for the thread list. */
  workspacePath?: string;
  includeArchived?: boolean;
  initialThreadId?: string;
  threadId?: string;
  /** Notified when the active thread's settled remote ID changes; `undefined` while still optimistic. */
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  onError?: (error: unknown) => void;
  adapters?: ExternalStoreAdapter<ThreadMessageLike>["adapters"];
};

export interface PiRuntimeExtras {
  state: PiThreadState;
  metadata: PiThreadMetadata;
  status: PiThreadStatus;
  readiness: PiRuntimeReadiness | undefined;
  contextUsage: PiContextUsage | undefined;
  /** Pending side-channel (free-standing) host-UI requests — those not attached
   * to a tool call. Tool-associated requests render as native approval/interrupt
   * on the message instead. */
  hostUiRequests: readonly PiHostUiRequest[];
  /** All pending host-UI requests, including tool-associated ones. */
  allHostUiRequests: readonly PiHostUiRequest[];
  queue: PiThreadState["queue"];
  compaction: PiThreadState["compaction"];
  retry: PiThreadState["retry"];
  lastError: string | undefined;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Clear Pi's queued (steering + follow-up) messages; resolves with the
   * cleared text so it can be restored into the composer. */
  clearQueue: () => Promise<{ steering: string[]; followUp: string[] }>;
  setModel: (input: { provider: string; modelId: string }) => Promise<void>;
  setThinkingLevel: (level: PiThinkingLevel) => Promise<void>;
  respondToHostUiRequest: (response: PiHostUiResponse) => Promise<void>;
  respondToToolApproval: (id: string, approved: boolean) => Promise<void>;
  resumeToolCall: (
    toolCallId: string,
    payload: PiInterruptAnswer,
  ) => Promise<void>;
}

export type PiRuntimeExtrasInternal = PiRuntimeExtras & {
  controller: PiThreadControllerLike;
};
