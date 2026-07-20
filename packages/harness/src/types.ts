// --- Message parts ---

export type HarnessTextPart = {
  readonly type: "text";
  readonly text: string;
  readonly state?: "streaming" | "done";
};

export type HarnessReasoningPart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly state?: "streaming" | "done";
};

export type HarnessToolPart = {
  readonly type: "tool";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly isError?: boolean;
  readonly state: "running" | "complete" | "error";
};

export type HarnessUserPart = HarnessTextPart;

export type HarnessAssistantPart =
  | HarnessTextPart
  | HarnessReasoningPart
  | HarnessToolPart;

// --- Messages ---

type HarnessMessageBase = {
  readonly id: string;
  /**
   * The preceding message id, a tool call id, or null at the start of the
   * main thread. A tool call id as parent roots a nested transcript: task
   * subagents and programmatic tool sub-calls both nest through this single
   * primitive.
   */
  readonly parentId: string | null;
};

export type HarnessUserMessage = HarnessMessageBase & {
  readonly role: "user";
  readonly parts: readonly HarnessUserPart[];
};

export type HarnessAssistantMessage = HarnessMessageBase & {
  readonly role: "assistant";
  readonly parts: readonly HarnessAssistantPart[];
};

export type HarnessMessage = HarnessUserMessage | HarnessAssistantMessage;

// --- State ---

export type HarnessFile = {
  readonly content?: string;
  readonly size?: number;
  /** Epoch seconds. */
  readonly modifiedAt?: number;
};

export type HarnessTodo = {
  readonly content: string;
  readonly status: "pending" | "in_progress" | "completed";
};

/** A user message accepted while a run was active, awaiting the next step. */
export type HarnessQueueItem = {
  readonly id: string;
  readonly parts: readonly HarnessUserPart[];
};

export type HarnessInterrupt = {
  readonly id: string;
  readonly value: unknown;
  readonly resumable: boolean;
};

export type HarnessErrorInfo = {
  readonly message: string;
  readonly code?: string;
};

/**
 * The canonical thread state. The server owns it: every transport snapshot
 * replaces the previous one wholesale.
 */
export type HarnessState<TExtras = unknown> = {
  /** Id-keyed message tree; insertion order is arrival order. */
  readonly messages: Readonly<Record<string, HarnessMessage>>;
  readonly queue: readonly HarnessQueueItem[];
  readonly files: Readonly<Record<string, HarnessFile>>;
  readonly todos: readonly HarnessTodo[];
  readonly status: { readonly phase: "idle" | "running" };
  readonly interrupt: HarnessInterrupt | null;
  /** Terminal error of the last run; cleared by the server on next run start. */
  readonly error: HarnessErrorInfo | null;
  readonly title?: string;
  /** App-specific server state. */
  readonly extras?: TExtras;
};

export const createInitialState = (): HarnessState => ({
  messages: {},
  queue: [],
  files: {},
  todos: [],
  status: { phase: "idle" },
  interrupt: null,
  error: null,
});

export const normalizeState = (snapshot: unknown): HarnessState => ({
  ...createInitialState(),
  ...(snapshot as Partial<HarnessState>),
});

// --- Commands ---

export type SendMessageCommand = {
  readonly type: "send-message";
  /** Client-generated; becomes the user message id and the queue item id. */
  readonly id: string;
  readonly parts: readonly HarnessUserPart[];
  /** "queue": process after the current run; "steer": process next. */
  readonly behavior: "queue" | "steer";
};

/** Module-augmentation slot for app-specific commands. */
export interface HarnessCustomCommands {}

export type HarnessCommand =
  | SendMessageCommand
  | {
      readonly type: "add-tool-result";
      readonly toolCallId: string;
      readonly output: unknown;
      readonly isError?: boolean;
    }
  | {
      readonly type: "resume";
      /** The interrupt.id this resume answers. */
      readonly interruptId: string;
      readonly value: unknown;
    }
  | { readonly type: "cancel" }
  | { readonly type: "cancel-queued"; readonly id: string }
  | { readonly type: "send-now"; readonly id: string }
  | HarnessCustomCommands[keyof HarnessCustomCommands];
