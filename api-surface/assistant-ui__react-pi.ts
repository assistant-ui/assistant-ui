import { createAgentSession } from "@earendil-works/pi-coding-agent";

import { StandardSchemaV1 } from "@standard-schema/spec";

type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: ReadonlyJSONValue;
  isError: boolean;
  artifact?: ReadonlyJSONValue | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
};

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

type AppendMessage = Omit<ThreadMessage, "id"> & {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig | undefined;
  startRun?: boolean | undefined;
  steer?: boolean | undefined;
};

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type AssistantClient = {
  [K in ClientNames]: AssistantClientAccessor<K>;
} & {
  subscribe(listener: () => void): Unsubscribe$1;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe$1;
};

type AssistantClientAccessor<K extends ClientNames> = (() => ClientSchemas[K]["methods"]) & (ClientMeta<K> | {
  source: "root";
  query: Record<string, never>;
} | {
  source: null;
  query: null;
}) & {
  name: K;
};

type AssistantEventCallback<TEvent extends AssistantEventName> = (payload: AssistantEventPayload[TEvent]) => void;

type AssistantEventName = keyof AssistantEventPayload;

type AssistantEventPayload = ClientEventMap & {
  "*": WildcardPayload;
};

type AssistantEventScope<TEvent extends AssistantEventName> = "*" | EventSource<TEvent> | (EventSource<TEvent> extends ClientNames ? AncestorsOf<EventSource<TEvent>> : never);

type AssistantEventSelector<TEvent extends AssistantEventName> = TEvent | {
  scope: AssistantEventScope<TEvent>;
  event: TEvent;
};

type AssistantRuntime = {
  readonly threads: ThreadListRuntime;
  readonly thread: ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
};

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type Attachment = PendingAttachment | CompleteAttachment;

type AttachmentAdapter = {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
};

type AttachmentAddErrorEvent = {
  readonly reason: AttachmentAddErrorReason;
  readonly message: string;
  readonly attachmentId?: string;
  readonly error?: Error;
};

type AttachmentAddErrorReason = "adapter-error" | "no-adapter" | "not-accepted";

type AttachmentRuntime<TSource extends AttachmentRuntimeSource = AttachmentRuntimeSource> = {
  readonly path: AttachmentRuntimePath & {
    attachmentSource: TSource;
  };
  readonly source: TSource;
  getState(): AttachmentState & {
    source: TSource;
  };
  remove(): Promise<void>;
  subscribe(callback: () => void): Unsubscribe;
};

type AttachmentRuntimePath = ((MessageRuntimePath & {
  readonly attachmentSource: "edit-composer" | "message";
}) | (ThreadRuntimePath & {
  readonly attachmentSource: "thread-composer";
})) & {
  readonly attachmentSelector: {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "index";
    readonly index: number;
  };
};

type AttachmentRuntimeSource = AttachmentState["source"];

type AttachmentState = ThreadComposerAttachmentState | EditComposerAttachmentState | MessageAttachmentState;

type BackendTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "backend";
  description?: undefined;
  parameters?: undefined;
  disabled?: undefined;
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: undefined;
};

type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
};

type BaseComposerState = {
  readonly canCancel: boolean;
  readonly canSend: boolean;
  readonly isEditing: boolean;
  readonly isEmpty: boolean;
  readonly isSending: boolean;
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly attachmentAccept: string;
  readonly dictation: DictationState | undefined;
  readonly quote: QuoteInfo | undefined;
  readonly queue: readonly QueueItemState[];
};

type BaseThreadMessage = {
  readonly status?: ThreadAssistantMessage["status"];
  readonly metadata: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[];
    readonly unstable_data?: readonly ReadonlyJSONValue[];
    readonly steps?: readonly ThreadStep[];
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
    };
    readonly timing?: MessageTiming;
    readonly isOptimistic?: boolean;
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
};

type ChatModelRunOptions = {
  readonly messages: readonly ThreadMessage[];
  readonly runConfig: RunConfig;
  readonly abortSignal: AbortSignal;
  readonly context: ModelContext;
  readonly unstable_assistantMessageId?: string | undefined;
  readonly unstable_threadId?: string | undefined;
  readonly unstable_parentId?: string | null | undefined;
  unstable_getMessage(): ThreadMessage;
};

type ChatModelRunResult = {
  readonly content?: readonly ThreadAssistantMessagePart[] | undefined;
  readonly status?: MessageStatus | undefined;
  readonly metadata?: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly custom?: Record<string, unknown> | undefined;
  };
};

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: {
    source: ClientNames;
    query: Record<E, E>;
  };
  events: Record<`${E}.`, E>;
};

type ClientEventMap = UnionToIntersection<{
  [K in ClientNames]: ClientEvents<K>;
}[ClientNames]>;

type ClientEvents<K extends ClientNames> = "events" extends keyof ClientSchemas[K] ? ClientSchemas[K]["events"] extends ClientEventsType<K> ? ClientSchemas[K]["events"] : never : never;

type ClientEventsType<K extends ClientNames> = Record<`${K}.${string}`, unknown>;

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "query" | "source"> : never;

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientNames = keyof ClientSchemas extends infer U ? U : never;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K>;
};

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type CompleteAttachmentStatus = {
  type: "complete";
};

type ComposerRuntime = {
  readonly path: ComposerRuntimePath;
  readonly type: "edit" | "thread";
  getState(): ComposerState;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  reset(): Promise<void>;
  clearAttachments(): Promise<void>;
  send(options?: SendOptions): void;
  cancel(): void;
  steerQueueItem(queueItemId: string): void;
  removeQueueItem(queueItemId: string): void;
  subscribe(callback: () => void): Unsubscribe;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe;
};

type ComposerRuntimeEventCallback<E extends ComposerRuntimeEventType> = (payload: ComposerRuntimeEventPayload[E]) => void;

type ComposerRuntimeEventPayload = {
  send: Record<string, never>;
  attachmentAdd: Record<string, never>;
  attachmentAddError: AttachmentAddErrorEvent;
};

type ComposerRuntimeEventType = keyof ComposerRuntimeEventPayload;

type ComposerRuntimePath = (ThreadRuntimePath & {
  readonly composerSource: "thread";
}) | (MessageRuntimePath & {
  readonly composerSource: "edit";
});

type ComposerState = ThreadComposerState | EditComposerState;

type ContentPart = Exclude<ThreadMessageLike["content"], string>[number];

type CreateAppendMessage = string | {
  parentId?: string | null | undefined;
  sourceId?: string | null | undefined;
  role?: AppendMessage["role"] | undefined;
  content: AppendMessage["content"];
  attachments?: AppendMessage["attachments"] | undefined;
  metadata?: AppendMessage["metadata"] | undefined;
  createdAt?: Date | undefined;
  runConfig?: AppendMessage["runConfig"] | undefined;
  startRun?: boolean | undefined;
};

type CreateAttachment = {
  id?: string;
  type?: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string;
  content: ThreadUserMessagePart[];
};

type CreateResumeRunConfig = CreateStartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};

type CreateStartRunConfig = {
  parentId: string | null;
  sourceId?: string | null | undefined;
  runConfig?: RunConfig | undefined;
};

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
};

type DataPrefixedPart = {
  readonly type: `data-${string}`;
  readonly data: any;
};

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: EventLog[];
}

interface DevToolsHook {
  apis: Map<number, DevToolsApiEntry>;
  nextId: number;
  listeners: Set<(apiId: number) => void>;
}

declare namespace DictationAdapter {
  type Status = {
    type: "running" | "starting";
  } | {
    type: "ended";
    reason: "cancelled" | "error" | "stopped";
  };
  type Result = {
    transcript: string;
    isFinal?: boolean;
  };
  type Session = {
    status: Status;
    stop: () => Promise<void>;
    cancel: () => void;
    onSpeechStart: (callback: () => void) => Unsubscribe;
    onSpeechEnd: (callback: (result: Result) => void) => Unsubscribe;
    onSpeech: (callback: (result: Result) => void) => Unsubscribe;
  };
}

type DictationAdapter = {
  listen: () => DictationAdapter.Session;
  disableInputDuringDictation?: boolean;
};

type DictationState = {
  readonly status: DictationAdapter.Status;
  readonly transcript?: string;
  readonly inputDisabled?: boolean;
};

type EditComposerAttachmentState = Attachment & {
  readonly source: "edit-composer";
};

type EditComposerRuntime = Omit<ComposerRuntime, "getAttachmentByIndex" | "getState"> & {
  readonly path: ComposerRuntimePath & {
    composerSource: "edit";
  };
  readonly type: "edit";
  getState(): EditComposerState;
  beginEdit(): void;
  getAttachmentByIndex(idx: number): AttachmentRuntime & {
    source: "edit-composer";
  };
};

type EditComposerState = BaseComposerState & {
  readonly type: "edit";
  readonly parentId: string | null;
  readonly sourceId: string | null;
};

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type ExportedMessageRepository = {
  headId?: string | null;
  messages: Array<{
    message: ThreadMessage;
    parentId: string | null;
    runConfig?: RunConfig;
  }>;
};

declare const ExportedMessageRepository: {
  fromArray: (messages: readonly ThreadMessageLike[]) => ExportedMessageRepository;
  fromBranchableArray: (items: readonly {
    message: ThreadMessageLike;
    parentId: string | null;
  }[], options?: {
    headId?: string | null;
  }) => ExportedMessageRepository;
};

type ExternalStoreAdapter<T = ThreadMessage> = ExternalStoreAdapterBase<T> & (T extends ThreadMessage ? object : ExternalStoreMessageConverterAdapter<T>);

type ExternalStoreAdapterBase<T> = {
  isDisabled?: boolean | undefined;
  isSendDisabled?: boolean | undefined;
  isRunning?: boolean | undefined;
  isLoading?: boolean | undefined;
  messages?: readonly T[];
  messageRepository?: ExportedMessageRepository;
  suggestions?: readonly ThreadSuggestion[] | undefined;
  state?: ReadonlyJSONValue | undefined;
  extras?: unknown;
  setMessages?: ((messages: readonly T[]) => void) | undefined;
  unstable_onBranchChange?: ((event: ExternalStoreBranchChange) => void) | undefined;
  onImport?: ((messages: readonly ThreadMessage[]) => void) | undefined;
  onExportExternalState?: (() => any) | undefined;
  onLoadExternalState?: ((state: any) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  queue?: ExternalThreadQueueAdapter | undefined;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onDelete?: ((messageId: string) => Promise<void> | void) | undefined;
  onReload?: ((parentId: string | null, config: StartRunConfig) => Promise<void>) | undefined;
  onResume?: ((config: ResumeRunConfig) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => Promise<void> | void) | undefined;
  onResumeToolCall?: ((options: {
    toolCallId: string;
    payload: unknown;
  }) => void) | undefined;
  onRespondToToolApproval?: ((options: RespondToToolApprovalOptions) => Promise<void> | void) | undefined;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
  adapters?: {
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    voice?: RealtimeVoiceAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    threadList?: ExternalStoreThreadListAdapter | undefined;
  } | undefined;
  unstable_capabilities?: {
    copy?: boolean | undefined;
  } | undefined;
  unstable_enableToolInvocations?: boolean | undefined;
  setToolStatuses?: ((statuses: Record<string, ToolExecutionStatus>) => void) | undefined;
};

type ExternalStoreBranchChange = {
  headId: string | null;
  visibleMessageIds: readonly string[];
};

type ExternalStoreMessageConverter<T> = (message: T, idx: number) => ThreadMessageLike;

type ExternalStoreMessageConverterAdapter<T> = {
  convertMessage: ExternalStoreMessageConverter<T>;
};

type ExternalStoreSharedOptions = Pick<ExternalStoreAdapter, "isDisabled" | "isSendDisabled" | "suggestions" | "unstable_capabilities">;

type ExternalStoreThreadData<TState extends "archived" | "regular"> = {
  status: TState;
  id: string;
  remoteId?: string | undefined;
  externalId?: string | undefined;
  title?: string | undefined;
  custom?: Record<string, unknown> | undefined;
};

type ExternalStoreThreadListAdapter = {
  threadId?: string | undefined;
  isLoading?: boolean | undefined;
  threads?: readonly ExternalStoreThreadData<"regular">[] | undefined;
  archivedThreads?: readonly ExternalStoreThreadData<"archived">[] | undefined;
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;
  onSwitchToThread?: ((threadId: string) => Promise<void> | void) | undefined;
  onRename?: (threadId: string, newTitle: string) => (Promise<void> | void) | undefined;
  onUpdateCustom?: ((threadId: string, custom: Record<string, unknown> | undefined) => Promise<void> | void) | undefined;
  onArchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onUnarchive?: ((threadId: string) => Promise<void> | void) | undefined;
  onDelete?: ((threadId: string) => Promise<void> | void) | undefined;
};

type ExternalThreadQueueAdapter = {
  items: readonly QueueItemState[];
  enqueue: (message: AppendMessage, options: {
    steer: boolean;
  }) => void;
  steer: (queueItemId: string) => void;
  remove: (queueItemId: string) => void;
  clear: (reason: "cancel-run" | "edit" | "reload") => void;
};

type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "negative" | "positive";
};

type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
};

type FrontendTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "frontend";
  description?: string | undefined;
  parameters: StandardSchemaV1<TArgs> | JSONSchema7;
  disabled?: boolean;
  execute?: ToolExecuteFunction<TArgs, TResult>;
  toModelOutput?: ToolModelOutputFunction<TArgs, TResult>;
  experimental_onSchemaValidationError?: OnSchemaValidationErrorFunction<TResult>;
  providerOptions?: ProviderOptions;
};

type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  readonly spec: GenerativeUISpec;
  readonly id?: string;
  readonly parentId?: string;
};

type GenerativeUINode = string | {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly GenerativeUINode[];
  readonly key?: string;
};

type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

type HumanTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "human";
  description?: string | undefined;
  parameters: StandardSchemaV1<TArgs> | JSONSchema7;
  disabled?: boolean;
  display?: "standalone";
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: ProviderOptions;
};

type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
};

interface JSONSchema7 {
  $id?: string | undefined;
  $ref?: string | undefined;
  $schema?: JSONSchema7Version | undefined;
  $comment?: string | undefined;
  $defs?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  type?: JSONSchema7TypeName | JSONSchema7TypeName[] | undefined;
  enum?: JSONSchema7Type[] | undefined;
  const?: JSONSchema7Type | undefined;
  multipleOf?: number | undefined;
  maximum?: number | undefined;
  exclusiveMaximum?: number | undefined;
  minimum?: number | undefined;
  exclusiveMinimum?: number | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;
  items?: JSONSchema7Definition | JSONSchema7Definition[] | undefined;
  additionalItems?: JSONSchema7Definition | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  uniqueItems?: boolean | undefined;
  contains?: JSONSchema7Definition | undefined;
  maxProperties?: number | undefined;
  minProperties?: number | undefined;
  required?: string[] | undefined;
  properties?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  patternProperties?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  additionalProperties?: JSONSchema7Definition | undefined;
  dependencies?: {
    [key: string]: JSONSchema7Definition | string[];
  } | undefined;
  propertyNames?: JSONSchema7Definition | undefined;
  if?: JSONSchema7Definition | undefined;
  then?: JSONSchema7Definition | undefined;
  else?: JSONSchema7Definition | undefined;
  allOf?: JSONSchema7Definition[] | undefined;
  anyOf?: JSONSchema7Definition[] | undefined;
  oneOf?: JSONSchema7Definition[] | undefined;
  not?: JSONSchema7Definition | undefined;
  format?: string | undefined;
  contentMediaType?: string | undefined;
  contentEncoding?: string | undefined;
  definitions?: {
    [key: string]: JSONSchema7Definition;
  } | undefined;
  title?: string | undefined;
  description?: string | undefined;
  default?: JSONSchema7Type | undefined;
  readOnly?: boolean | undefined;
  writeOnly?: boolean | undefined;
  examples?: JSONSchema7Type | undefined;
}

interface JSONSchema7Array extends Array<JSONSchema7Type> {
}

type JSONSchema7Definition = JSONSchema7 | boolean;

interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

type JSONSchema7Type = string | number | boolean | JSONSchema7Object | JSONSchema7Array | null;

type JSONSchema7TypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

type JSONSchema7Version = string;

type LanguageModelConfig = {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  reasoningEffort?: string;
};

type LanguageModelV1CallSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  headers?: Record<string, string | undefined>;
};

type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("app" | "model")[];
};

type McpServerConfig = {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
  redirect?: "error" | "follow";
  connectionTimeout?: number | undefined;
} | {
  type: "stdio";
  command: string;
  args?: readonly string[];
  env?: Record<string, string>;
  cwd?: string;
  connectionTimeout?: number | undefined;
};

type McpTool = ToolBase<Record<string, unknown>, unknown> & {
  type: "mcp";
  server: McpServerConfig;
  description?: undefined;
  parameters?: undefined;
  disabled?: boolean;
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: undefined;
};

type MessageAttachmentState = CompleteAttachment & {
  readonly source: "message";
};

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
};

type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): void;
  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe;
};

type MessagePartRuntimePath = MessageRuntimePath & {
  readonly messagePartSelector: {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "toolCallId";
    readonly toolCallId: string;
  };
};

type MessagePartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type MessagePartStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
  readonly error?: unknown;
};

type MessageRole = ThreadMessage["role"];

type MessageRuntime = {
  readonly path: MessageRuntimePath;
  readonly composer: EditComposerRuntime;
  getState(): MessageState;
  delete(): void | Promise<void>;
  reload(config?: ReloadConfig): void;
  speak(): void;
  stopSpeaking(): void;
  submitFeedback(_param0: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param1: {
    position?: "previous" | "next" | undefined;
    branchId?: string | undefined;
  }): void;
  unstable_getCopyText(): string;
  subscribe(callback: () => void): Unsubscribe;
  getMessagePartByIndex(idx: number): MessagePartRuntime;
  getMessagePartByToolCallId(toolCallId: string): MessagePartRuntime;
  getAttachmentByIndex(idx: number): AttachmentRuntime & {
    source: "message";
  };
};

type MessageRuntimePath = ThreadRuntimePath & {
  readonly messageSelector: {
    readonly type: "messageId";
    readonly messageId: string;
  } | {
    readonly type: "index";
    readonly index: number;
  };
};

type MessageState = ThreadMessage & {
  readonly parentId: string | null;
  readonly index: number;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
};

type MessageStatus = {
  readonly type: "running";
} | {
  readonly type: "requires-action";
  readonly reason: "interrupt" | "tool-calls";
} | {
  readonly type: "complete";
  readonly reason: "stop" | "unknown";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other" | "tool-calls";
  readonly error?: ReadonlyJSONValue;
};

type MessageTiming = {
  readonly streamStartTime: number;
  readonly firstTokenTime?: number;
  readonly totalStreamTime?: number;
  readonly tokenCount?: number;
  readonly tokensPerSecond?: number;
  readonly totalChunks: number;
  readonly toolCallCount: number;
};

type ModelContext = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
  unstable_composerMetadata?: Record<string, unknown> | undefined;
};

type ModelContextProvider = {
  getModelContext: () => ModelContext;
  subscribe?: (callback: () => void) => Unsubscribe;
};

type ObjectKey<T> = keyof T & (string | number);

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type ParentOf<K extends ClientNames> = AssistantClientAccessor<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PendingAttachment = BaseAttachment & {
  status: PendingAttachmentStatus;
  file: File;
};

type PendingAttachmentStatus = {
  type: "running";
  reason: "uploading";
  progress: number;
} | {
  type: "requires-action";
  reason: "composer-send";
} | {
  type: "incomplete";
  reason: "error" | "upload-paused";
  message?: string;
};

type PiAgentMessage = PiKnownAgentMessage | PiUnknownAgentMessage;

type PiAnyClientEvent = PiClientEvent | (PiUnknownClientEventBody & PiClientEventEnvelope);

type PiAssistantContent = PiTextContent | PiThinkingContent | PiToolCall;

interface PiAssistantMessage {
  role: "assistant";
  content: PiAssistantContent[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  usage: PiUsage;
  stopReason: PiStopReason;
  errorMessage?: string;
  timestamp: number;
}

type PiAssistantMessageDelta = {
  type: "start";
  partial: PiAssistantMessage;
} | {
  type: "text_start";
  contentIndex: number;
  partial: PiAssistantMessage;
} | {
  type: "text_delta";
  contentIndex: number;
  delta: string;
  partial: PiAssistantMessage;
} | {
  type: "text_end";
  contentIndex: number;
  content: string;
  partial: PiAssistantMessage;
} | {
  type: "thinking_start";
  contentIndex: number;
  partial: PiAssistantMessage;
} | {
  type: "thinking_delta";
  contentIndex: number;
  delta: string;
  partial: PiAssistantMessage;
} | {
  type: "thinking_end";
  contentIndex: number;
  content: string;
  partial: PiAssistantMessage;
} | {
  type: "toolcall_start";
  contentIndex: number;
  partial: PiAssistantMessage;
} | {
  type: "toolcall_delta";
  contentIndex: number;
  delta: string;
  partial: PiAssistantMessage;
} | {
  type: "toolcall_end";
  contentIndex: number;
  toolCall: PiToolCall;
  partial: PiAssistantMessage;
} | {
  type: "done";
  reason: "length" | "stop" | "toolUse";
  message: PiAssistantMessage;
} | {
  type: "error";
  reason: "aborted" | "error";
  error: PiAssistantMessage;
};

interface PiBashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  timestamp: number;
  excludeFromContext?: boolean;
}

interface PiBranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
  timestamp: number;
}

interface PiClient {
  listThreads(input?: {
    workspacePath?: string;
    includeArchived?: boolean;
  }): Promise<PiThreadMetadata[]>;
  createThread(input?: {
    workspacePath?: string;
    title?: string;
    initialMessage?: PiSendMessageInput;
  }): Promise<PiThreadSnapshot>;
  getThread(threadId: string): Promise<PiThreadSnapshot>;
  sendMessage(threadId: string, input: PiSendMessageInput): Promise<void>;
  cancelRun(threadId: string): Promise<void>;
  clearQueue(threadId: string): Promise<{
    steering: string[];
    followUp: string[];
  }>;
  getAvailableModels(input?: {
    workspacePath?: string;
  }): Promise<PiModelInfo[]>;
  setModel(threadId: string, input: {
    provider: string;
    modelId: string;
  }): Promise<void>;
  setThinkingLevel(threadId: string, level: PiThinkingLevel): Promise<void>;
  renameThread(threadId: string, title: string): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
  unarchiveThread(threadId: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  respondToHostUiRequest(threadId: string, response: PiHostUiResponse): Promise<void>;
  subscribe(threadId: string, listener: (event: PiClientEvent) => void, options?: {
    includeSnapshot?: boolean;
  }): () => void;
}

type PiClientEvent = PiClientEventBody & PiClientEventEnvelope;

type PiClientEventBody = {
  type: "snapshot";
  snapshot: PiThreadSnapshot;
} | {
  type: "agent_start";
} | {
  type: "agent_end";
  willRetry?: boolean;
} | {
  type: "turn_start";
  turnIndex: number;
} | {
  type: "turn_end";
  turnIndex: number;
} | {
  type: "message_start";
  message: PiAgentMessage;
} | {
  type: "message_update";
  message: PiAgentMessage;
  assistantMessageEvent: PiAssistantMessageDelta;
} | {
  type: "message_end";
  message: PiAgentMessage;
} | {
  type: "tool_execution_start";
  toolCallId: string;
  toolName: string;
  args: unknown;
} | {
  type: "tool_execution_update";
  toolCallId: string;
  toolName?: string;
  partialResult: unknown;
} | {
  type: "tool_execution_end";
  toolCallId: string;
  result: unknown;
  isError: boolean;
} | {
  type: "queue_update";
  steering: readonly string[];
  followUp: readonly string[];
} | {
  type: "compaction_start";
  reason: "manual" | "overflow" | "threshold";
} | {
  type: "compaction_end";
  aborted: boolean;
  willRetry: boolean;
} | {
  type: "auto_retry_start";
  attempt: number;
  delayMs: number;
} | {
  type: "auto_retry_end";
  success: boolean;
} | {
  type: "session_info_changed";
  name?: string;
} | {
  type: "thinking_level_changed";
  level: string;
} | {
  type: "context_usage";
  contextUsage: PiContextUsage;
} | {
  type: "extension_ui_request";
  request: PiHostUiRequest;
} | {
  type: "extension_ui_resolved";
  requestId: string;
} | {
  type: "error";
  error: string;
};

type PiClientEventEnvelope = {
  threadId: string;
  seq: number;
};

interface PiCompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}

interface PiContextUsage {
  tokens: number | null;
  contextWindow: number;
  percent: number | null;
}

interface PiCustomMessage {
  role: "custom";
  customType: string;
  content: string | PiUserContent[];
  display: boolean;
  details?: unknown;
  timestamp: number;
}

interface PiEventStreamOptions {
  url: string;
  onEvent: (event: PiAnyClientEvent) => void;
  onError?: (error: unknown) => void;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
  reconnectDelay?: () => Promise<void>;
}

type PiHostUiRequest = {
  id: string;
  kind: "confirm";
  title: string;
  message: string;
  toolCallId?: string;
  timeoutMs?: number;
} | {
  id: string;
  kind: "select";
  title: string;
  options: readonly string[];
  toolCallId?: string;
  timeoutMs?: number;
} | {
  id: string;
  kind: "input";
  title: string;
  placeholder?: string;
  toolCallId?: string;
  timeoutMs?: number;
} | {
  id: string;
  kind: "editor";
  title: string;
  prefill?: string;
  toolCallId?: string;
  timeoutMs?: number;
};

type PiHostUiRequestKind = "confirm" | "editor" | "input" | "select";

type PiHostUiResponse = {
  requestId: string;
  confirmed: boolean;
} | {
  requestId: string;
  value: string;
} | {
  requestId: string;
  dismissed: true;
};

interface PiHttpClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
  onStreamError?: (error: unknown) => void;
  reconnectDelay?: () => Promise<void>;
  streamCloseDelayMs?: number;
}

interface PiImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

type PiInputAttachment = PiImageContent;

type PiInterruptAnswer = string | {
  value?: string | null;
  dismissed?: boolean;
} | null | undefined;

type PiKnownAgentMessage = PiUserMessage | PiAssistantMessage | PiToolResultMessage | PiBashExecutionMessage | PiCustomMessage | PiBranchSummaryMessage | PiCompactionSummaryMessage;

type PiLoadState = "loaded" | "loading" | "pending";

type PiModelInfo = {
  provider: string;
  modelId: string;
  name?: string;
  supportsThinking?: boolean;
  availableThinkingLevels?: readonly PiThinkingLevel[];
};

type PiNodeClientOptions = PiThreadSupervisorOptions;

type PiNotificationScheduler = (flush: () => void) => void;

interface PiProjectionInput {
  messages: readonly PiAgentMessage[];
  toolExecutions: PiThreadState["toolExecutions"];
  runStatus: PiThreadState["runStatus"];
  hostUiRequests: readonly PiHostUiRequest[];
}

type PiQueueMode = "followUp" | "steer";

type PiQueuedMessage = {
  id: string;
  mode: "followUp" | "steer";
  content: string;
};

type PiRunStatus = "failed" | "idle" | "running";

interface PiRuntimeExtras {
  state: PiThreadState;
  metadata: PiThreadMetadata;
  status: PiThreadStatus;
  readiness: PiRuntimeReadiness | undefined;
  contextUsage: PiContextUsage | undefined;
  hostUiRequests: readonly PiHostUiRequest[];
  allHostUiRequests: readonly PiHostUiRequest[];
  queue: PiThreadState["queue"];
  compaction: PiThreadState["compaction"];
  retry: PiThreadState["retry"];
  lastError: string | undefined;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  clearQueue: () => Promise<{
    steering: string[];
    followUp: string[];
  }>;
  setModel: (input: {
    provider: string;
    modelId: string;
  }) => Promise<void>;
  setThinkingLevel: (level: PiThinkingLevel) => Promise<void>;
  respondToHostUiRequest: (response: PiHostUiResponse) => Promise<void>;
  respondToToolApproval: (id: string, approved: boolean) => Promise<void>;
  resumeToolCall: (toolCallId: string, payload: PiInterruptAnswer) => Promise<void>;
}

type PiRuntimeOptions = ExternalStoreSharedOptions & {
  client: PiClient;
  workspacePath?: string;
  includeArchived?: boolean;
  initialThreadId?: string;
  threadId?: string;
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  onError?: (error: unknown) => void;
  adapters?: ExternalStoreAdapter<ThreadMessageLike>["adapters"];
};

type PiRuntimeReadiness = {
  state: "ready";
  selection: {
    provider: string;
    modelId: string;
  };
  source: "env" | "pi-default" | "session";
} | {
  state: "missing-model";
  message: string;
} | {
  state: "missing-credentials";
  provider?: string;
  message: string;
} | {
  state: "unavailable-model";
  selection: {
    provider: string;
    modelId: string;
  };
  message: string;
};

type PiSendMessageInput = {
  content: string;
  attachments?: PiInputAttachment[];
  streamingBehavior?: "followUp" | "steer";
};

type PiSendOptions = {
  streamingBehavior?: "followUp" | "steer";
};

type PiSessionModel = NonNullable<Parameters<typeof createAgentSession>[0]>["model"];

type PiStopReason = "aborted" | "error" | "length" | "stop" | "toolUse";

interface PiTextContent {
  type: "text";
  text: string;
  textSignature?: string;
}

interface PiThinkingContent {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
}

type PiThinkingLevel = "high" | "low" | "medium" | "minimal" | "off" | "xhigh";

declare class PiThreadController implements PiThreadControllerLike {
  private readonly client;
  private readonly threadId;
  private readonly options;
  private state;
  private projectedMessages;
  private messageRepository;
  private version;
  private readonly allListeners;
  private readonly metadataListeners;
  private readonly messageListeners;
  private connectionRetainers;
  private readonly optimisticUserMessages;
  private unsubscribeFromEvents;
  private disconnectTimer;
  private loadPromise;
  private messageFlushScheduled;
  private readonly localSnapshotSeq;
  constructor(client: PiClient, threadId: string, options?: {
    scheduleNotify?: PiNotificationScheduler;
  });
  getState(): PiThreadState;
  getProjectedMessages(): readonly ThreadMessageLike[];
  getMessageRepository(): ExportedMessageRepository;
  getVersion(): number;
  connect(): () => void;
  subscribe(listener: () => void): () => void;
  subscribeMetadata(listener: () => void): () => void;
  subscribeMessages(listener: () => void): () => void;
  dispose(): void;
  private ensureEventSubscription;
  private hasConsumers;
  private maybeDisconnectFromEvents;
  private clearDisconnectTimer;
  load(force?: boolean): Promise<void>;
  refresh(): Promise<void>;
  private refreshInBackground;
  sendMessage(message: AppendMessage, options?: PiSendOptions): Promise<void>;
  private sendQueued;
  clearQueue(): Promise<{
    steering: string[];
    followUp: string[];
  }>;
  cancel(): Promise<void>;
  setModel(input: {
    provider: string;
    modelId: string;
  }): Promise<void>;
  setThinkingLevel(level: PiThinkingLevel): Promise<void>;
  respondToToolApproval(approvalId: string, approved: boolean): Promise<void>;
  resumeToolCall(toolCallId: string, payload: unknown): Promise<void>;
  respondToHostUiRequest(response: PiHostUiResponse): Promise<void>;
  private respond;
  private applySnapshot;
  private dispatch;
  private setState;
  private projectedInputMessages;
  private reconcileOptimisticUserMessages;
  private projectMessages;
  private recomputeProjectedMessagesAndNotify;
  private scheduleProjectedMessageFlush;
  private bumpVersion;
  private notifyMetadataListeners;
  private notifyMessageListeners;
}

interface PiThreadControllerLike {
  getState(): PiThreadState;
  getProjectedMessages(): readonly ThreadMessageLike[];
  getMessageRepository(): ExportedMessageRepository;
  getVersion(): number;
  connect(): () => void;
  subscribe(listener: () => void): () => void;
  subscribeMetadata(listener: () => void): () => void;
  subscribeMessages(listener: () => void): () => void;
  load(force?: boolean): Promise<void>;
  refresh(): Promise<void>;
  sendMessage(message: AppendMessage, options?: PiSendOptions): Promise<void>;
  cancel(): Promise<void>;
  clearQueue(): Promise<{
    steering: string[];
    followUp: string[];
  }>;
  setModel(input: {
    provider: string;
    modelId: string;
  }): Promise<void>;
  setThinkingLevel(level: PiThinkingLevel): Promise<void>;
  respondToToolApproval(approvalId: string, approved: boolean): Promise<void>;
  resumeToolCall(toolCallId: string, payload: unknown): Promise<void>;
  respondToHostUiRequest(response: PiHostUiResponse): Promise<void>;
  dispose(): void;
}

type PiThreadMetadata = {
  id: string;
  title?: string;
  workspacePath?: string;
  archived?: boolean;
  status: PiThreadStatus;
  runningRunId?: string;
  queuedMessages?: readonly PiQueuedMessage[];
  config?: {
    provider?: string;
    modelId?: string;
    thinkingLevel?: PiThinkingLevel | string;
  };
  contextUsage?: PiContextUsage;
  sessionFile?: string;
  parentSessionPath?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type PiThreadSnapshot = {
  metadata: PiThreadMetadata;
  messages: PiTranscriptMessage[];
  hostUiRequests?: readonly PiHostUiRequest[];
  readiness?: PiRuntimeReadiness;
  lastError?: string;
};

interface PiThreadState {
  threadId: string;
  metadata: PiThreadMetadata;
  messages: readonly PiAgentMessage[];
  streamingMessageIndex: number | undefined;
  toolExecutions: Readonly<Record<string, PiToolExecutionState>>;
  runStatus: PiRunStatus;
  queue: {
    steering: readonly string[];
    followUp: readonly string[];
  };
  contextUsage: PiContextUsage | undefined;
  compaction: {
    active: boolean;
    reason?: "manual" | "overflow" | "threshold";
  };
  retry: {
    active: boolean;
    attempt: number;
  };
  hostUiRequests: readonly PiHostUiRequest[];
  readiness: PiRuntimeReadiness | undefined;
  lastError: string | undefined;
  loadState: PiLoadState;
  lastSeq: number;
}

type PiThreadStatus = "failed" | "idle" | "running";

declare class PiThreadSupervisor {
  private readonly records;
  private readonly pendingOpens;
  private readonly recordsBySessionFile;
  private readonly workspacePath;
  private readonly agentDir;
  private readonly model;
  private readonly modelRegistry;
  private readonly archivedSessionFiles;
  private readonly catalogCache;
  private readonly catalogInfoByThreadId;
  constructor(options?: PiThreadSupervisorOptions);
  listThreads(input?: {
    workspacePath?: string;
    includeArchived?: boolean;
  }): Promise<PiThreadMetadata[]>;
  createThread(input?: {
    workspacePath?: string;
    title?: string;
    initialMessage?: PiSendMessageInput;
  }): Promise<PiThreadSnapshot>;
  getThread(threadId: string): Promise<PiThreadSnapshot>;
  sendMessage(threadId: string, input: PiSendMessageInput): Promise<void>;
  cancelRun(threadId: string): Promise<void>;
  clearQueue(threadId: string): Promise<{
    steering: string[];
    followUp: string[];
  }>;
  getAvailableModels(): Promise<PiModelInfo[]>;
  setModel(threadId: string, input: {
    provider: string;
    modelId: string;
  }): Promise<void>;
  setThinkingLevel(threadId: string, level: PiThinkingLevel): Promise<void>;
  renameThread(threadId: string, title: string): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
  unarchiveThread(threadId: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  respondToHostUiRequest(threadId: string, response: PiHostUiResponse): Promise<void>;
  subscribe(threadId: string, listener: (event: PiClientEvent) => void, options?: {
    includeSnapshot?: boolean;
  }): () => void;
  dispose(): Promise<void>;
  private openSession;
  private ensureOpen;
  private openCold;
  private listSessionInfos;
  private invalidateCatalog;
  private findSessionInfo;
  private rememberSessionInfos;
  private send;
  private onSessionEvent;
  private emitContextUsage;
  private emit;
  private liveStatusFor;
  private runStatus;
  private readinessOf;
  private queuedMessagesOf;
  private metadataOf;
  private snapshotOf;
  private snapshotFromSessionFile;
}

interface PiThreadSupervisorOptions {
  workspacePath?: string;
  agentDir?: string;
  model?: PiSessionModel;
}

interface PiToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  thoughtSignature?: string;
}

interface PiToolExecutionState {
  toolCallId: string;
  toolName?: string;
  args?: unknown;
  partialResult?: unknown;
  status: "complete" | "error" | "running";
}

type PiToolResultContent = PiTextContent | PiImageContent;

interface PiToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: PiToolResultContent[];
  details?: unknown;
  isError: boolean;
  timestamp: number;
}

type PiTranscriptMessage = PiAgentMessage;

interface PiUnknownAgentMessage {
  role: string;
  timestamp?: number;
  [key: string]: unknown;
}

type PiUnknownClientEventBody = {
  type: string;
  [key: string]: unknown;
};

declare class PiUnsupportedHostUiError extends Error {
  readonly method: string;
  constructor(method: string);
}

interface PiUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

type PiUserContent = PiTextContent | PiImageContent;

interface PiUserMessage {
  role: "user";
  content: string | PiUserContent[];
  timestamp: number;
}

type ProviderOptions = Record<string, Record<string, unknown>>;

type ProviderTool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "provider";
  providerId: `${string}.${string}`;
  parameters?: StandardSchemaV1<TArgs> | JSONSchema7 | undefined;
  args: Record<string, unknown>;
  supportsDeferredResults?: boolean;
  description?: undefined;
  disabled?: boolean;
  execute?: undefined;
  toModelOutput?: undefined;
  experimental_onSchemaValidationError?: undefined;
  providerOptions?: ProviderOptions;
};

type QueueItemState = {
  readonly id: string;
  readonly prompt: string;
};

type QuoteInfo = {
  readonly text: string;
  readonly messageId: string;
};

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

declare namespace RealtimeVoiceAdapter {
  type Status = {
    type: "running" | "starting";
  } | {
    type: "ended";
    reason: "cancelled" | "error" | "finished";
    error?: unknown;
  };
  type Mode = "listening" | "speaking";
  type TranscriptItem = {
    role: "assistant" | "user";
    text: string;
    isFinal?: boolean;
  };
  type Session = {
    status: Status;
    isMuted: boolean;
    disconnect: () => void;
    mute: () => void;
    unmute: () => void;
    onStatusChange: (callback: (status: Status) => void) => Unsubscribe;
    onTranscript: (callback: (transcript: TranscriptItem) => void) => Unsubscribe;
    onModeChange: (callback: (mode: Mode) => void) => Unsubscribe;
    onVolumeChange: (callback: (volume: number) => void) => Unsubscribe;
  };
}

type RealtimeVoiceAdapter = {
  connect: (options: {
    abortSignal?: AbortSignal;
  }) => RealtimeVoiceAdapter.Session;
};

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly parentId?: string;
};

type ReloadConfig = {
  runConfig?: RunConfig;
};

type RespondToToolApprovalOptions = {
  approvalId: string;
  approved: boolean;
  optionId?: string;
  reason?: string;
};

type ResumeRunConfig = StartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};

type RunConfig = {
  readonly custom?: Record<string, unknown>;
};

type RuntimeCapabilities = {
  readonly switchToBranch: boolean;
  readonly switchBranchDuringRun: boolean;
  readonly edit: boolean;
  readonly reload: boolean;
  readonly delete: boolean;
  readonly cancel: boolean;
  readonly unstable_copy: boolean;
  readonly speech: boolean;
  readonly dictation: boolean;
  readonly voice: boolean;
  readonly attachments: boolean;
  readonly feedback: boolean;
  readonly queue: boolean;
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type SendOptions = {
  startRun?: boolean;
  steer?: boolean;
};

type SharedStream = {
  listeners: Set<(event: PiClientEvent) => void>;
  close: () => void;
  closeTimer: ReturnType<typeof setTimeout> | undefined;
};

type SourceMessagePart = {
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly providerMetadata?: SourceProviderMetadata;
  readonly parentId?: string;
} | {
  readonly type: "source";
  readonly sourceType: "document";
  readonly id: string;
  readonly url?: undefined;
  readonly title: string;
  readonly mediaType: string;
  readonly filename?: string;
  readonly providerMetadata?: SourceProviderMetadata;
  readonly parentId?: string;
};

type SourceProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechState = {
  readonly messageId: string;
  readonly status: SpeechSynthesisAdapter.Status;
};

declare namespace SpeechSynthesisAdapter {
  type Status = {
    type: "running" | "starting";
  } | {
    type: "ended";
    reason: "cancelled" | "error" | "finished";
    error?: unknown;
  };
  type Utterance = {
    status: Status;
    cancel: () => void;
    subscribe: (callback: () => void) => Unsubscribe;
  };
}

type SpeechSynthesisAdapter = {
  speak: (text: string) => SpeechSynthesisAdapter.Utterance;
};

interface SplitHostUiRequests {
  toolAssociated: Map<string, PiHostUiRequest>;
  freeStanding: PiHostUiRequest[];
}

interface SseFrame {
  event?: string;
  data: string;
  id?: string;
}

type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly parentId?: string;
};

type ThreadAssistantMessage = MessageCommonProps & {
  readonly role: "assistant";
  readonly content: readonly ThreadAssistantMessagePart[];
  readonly status: MessageStatus;
  readonly metadata: {
    readonly unstable_state: ReadonlyJSONValue;
    readonly unstable_annotations: readonly ReadonlyJSONValue[];
    readonly unstable_data: readonly ReadonlyJSONValue[];
    readonly steps: readonly ThreadStep[];
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
    };
    readonly timing?: MessageTiming;
    readonly isOptimistic?: boolean;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadAssistantMessagePart = TextMessagePart | ReasoningMessagePart | ToolCallMessagePart | SourceMessagePart | FileMessagePart | ImageMessagePart | DataMessagePart | GenerativeUIMessagePart;

type ThreadComposerAttachmentState = Attachment & {
  readonly source: "thread-composer";
};

type ThreadComposerRuntime = Omit<ComposerRuntime, "getAttachmentByIndex" | "getState"> & {
  readonly path: ComposerRuntimePath & {
    composerSource: "thread";
  };
  readonly type: "thread";
  getState(): ThreadComposerState;
  getAttachmentByIndex(idx: number): AttachmentRuntime & {
    source: "thread-composer";
  };
};

type ThreadComposerState = BaseComposerState & {
  readonly type: "thread";
};

type ThreadListItemEventCallback<E extends ThreadListItemEventType> = (payload: ThreadListItemEventPayload[E]) => void;

type ThreadListItemEventPayload = {
  switchedTo: Record<string, never>;
  switchedAway: Record<string, never>;
};

type ThreadListItemEventType = keyof ThreadListItemEventPayload;

type ThreadListItemRuntime = {
  readonly path: ThreadListItemRuntimePath;
  getState(): ThreadListItemState;
  initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(): Promise<void>;
  switchTo(options?: {
    unarchive?: boolean;
  }): Promise<void>;
  rename(newTitle: string): Promise<void>;
  updateCustom(custom: Record<string, unknown> | undefined): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  detach(): void;
  subscribe(callback: () => void): Unsubscribe;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe;
  __internal_getRuntime(): ThreadListItemRuntime;
};

type ThreadListItemRuntimePath = {
  readonly ref: string;
  readonly threadSelector: {
    readonly type: "main";
  } | {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "archiveIndex";
    readonly index: number;
  } | {
    readonly type: "threadId";
    readonly threadId: string;
  };
};

type ThreadListItemState = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

type ThreadListItemStatus = "archived" | "deleted" | "new" | "regular";

type ThreadListRuntime = {
  getState(): ThreadListState;
  subscribe(callback: () => void): Unsubscribe;
  readonly main: ThreadRuntime;
  getById(threadId: string): ThreadRuntime;
  readonly mainItem: ThreadListItemRuntime;
  getItemById(threadId: string): ThreadListItemRuntime;
  getItemByIndex(idx: number): ThreadListItemRuntime;
  getArchivedItemByIndex(idx: number): ThreadListItemRuntime;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  loadMore(): Promise<void>;
};

type ThreadListState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadItems: Readonly<Record<string, Omit<ThreadListItemState, "isMain" | "threadId">>>;
};

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

type ThreadMessageLike = {
  readonly role: "assistant" | "system" | "user";
  readonly content: string | readonly (TextMessagePart | ReasoningMessagePart | SourceMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | GenerativeUIMessagePart | Unstable_AudioMessagePart | DataPrefixedPart | {
    readonly type: "tool-call";
    readonly toolCallId?: string;
    readonly toolName: string;
    readonly args?: ReadonlyJSONObject;
    readonly argsText?: string;
    readonly artifact?: any;
    readonly result?: any | undefined;
    readonly isError?: boolean | undefined;
    readonly parentId?: string | undefined;
    readonly messages?: readonly ThreadMessage[] | undefined;
    readonly interrupt?: {
      type: "human";
      payload: unknown;
    };
    readonly timing?: ToolCallTiming;
    readonly approval?: {
      readonly id: string;
      readonly approved?: boolean;
      readonly reason?: string;
      readonly isAutomatic?: boolean;
      readonly options?: readonly ToolApprovalOption[];
      readonly optionId?: string;
      readonly resolution?: "cancelled" | "expired";
    };
  })[];
  readonly id?: string | undefined;
  readonly createdAt?: Date | undefined;
  readonly status?: MessageStatus | undefined;
  readonly attachments?: readonly (Omit<CompleteAttachment, "content"> & {
    readonly content: readonly (ThreadUserMessagePart | DataPrefixedPart)[];
  })[] | undefined;
  readonly metadata?: {
    readonly unstable_state?: ReadonlyJSONValue;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
    };
    readonly isOptimistic?: boolean | undefined;
    readonly custom?: Record<string, unknown> | undefined;
  } | undefined;
};

type ThreadRuntime = {
  readonly path: ThreadRuntimePath;
  readonly composer: ThreadComposerRuntime;
  getState(): ThreadState;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(): any;
  importExternalState(state: any): void;
  subscribe(callback: () => void): Unsubscribe;
  cancelRun(): void;
  getModelContext(): ModelContext;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  getMessageByIndex(idx: number): MessageRuntime;
  getMessageById(messageId: string): MessageRuntime;
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  getVoiceVolume(): number;
  subscribeVoiceVolume(callback: () => void): Unsubscribe;
  muteVoice(): void;
  unmuteVoice(): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe;
};

type ThreadRuntimeEventCallback<E extends ThreadRuntimeEventType> = (payload: ThreadRuntimeEventPayload[E]) => void;

type ThreadRuntimeEventPayload = {
  runStart: Record<string, never>;
  runEnd: Record<string, never>;
  initialize: Record<string, never>;
  modelContextUpdate: Record<string, never>;
};

type ThreadRuntimeEventType = keyof ThreadRuntimeEventPayload;

type ThreadRuntimePath = {
  readonly ref: string;
  readonly threadSelector: {
    readonly type: "main";
  } | {
    readonly type: "threadId";
    readonly threadId: string;
  };
};

type ThreadState = {
  readonly threadId: string;
  readonly metadata: ThreadListItemState;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly capabilities: RuntimeCapabilities;
  readonly messages: readonly ThreadMessage[];
  readonly state: ReadonlyJSONValue;
  readonly suggestions: readonly ThreadSuggestion[];
  readonly extras: unknown;
  readonly speech: SpeechState | undefined;
  readonly voice: VoiceSessionState | undefined;
};

type ThreadStep = {
  readonly messageId?: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  } | undefined;
};

type ThreadSuggestion = {
  prompt: string;
};

type ThreadSystemMessage = MessageCommonProps & {
  readonly role: "system";
  readonly content: readonly [
    TextMessagePart
  ];
  readonly metadata: {
    readonly unstable_state?: undefined;
    readonly unstable_annotations?: undefined;
    readonly unstable_data?: undefined;
    readonly steps?: undefined;
    readonly submittedFeedback?: undefined;
    readonly timing?: undefined;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadUserMessage = MessageCommonProps & {
  readonly role: "user";
  readonly content: readonly ThreadUserMessagePart[];
  readonly attachments: readonly CompleteAttachment[];
  readonly metadata: {
    readonly unstable_state?: undefined;
    readonly unstable_annotations?: undefined;
    readonly unstable_data?: undefined;
    readonly steps?: undefined;
    readonly submittedFeedback?: undefined;
    readonly timing?: undefined;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadUserMessagePart = TextMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | Unstable_AudioMessagePart;

type Tool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendTool<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolApprovalOption = {
  readonly id: string;
  readonly kind: ToolApprovalOptionKind | (string & {});
  readonly label?: string;
  readonly description?: string;
  readonly grants?: readonly string[];
  readonly confirm?: boolean | {
    title?: string;
    description?: string;
  };
};

type ToolApprovalOptionKind = "allow-always" | "allow-once" | "reject-always" | "reject-once";

type ToolApprovalResponse = {
  readonly approved: boolean;
  readonly reason?: string;
} | {
  readonly optionId: string;
  readonly reason?: string;
} | {
  readonly approved: boolean;
  readonly optionId: string;
  readonly reason?: string;
};

type ToolBase<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = {
  streamCall?: ToolStreamCallFunction<TArgs, TResult>;
  display?: ToolDisplay;
};

interface ToolCallArgsReader<TArgs extends Record<string, unknown>> {
  get<PathT extends TypePath<TArgs>>(...fieldPath: PathT): Promise<TypeAtPath<TArgs, PathT>>;
  streamValues<PathT extends TypePath<TArgs>>(...fieldPath: PathT): AsyncIterableStream<DeepPartial<TypeAtPath<TArgs, PathT>>>;
  streamText<PathT extends TypePath<TArgs>>(...fieldPath: PathT): TypeAtPath<TArgs, PathT> extends string & (infer U) ? AsyncIterableStream<U> : never;
  forEach<PathT extends TypePath<TArgs>>(...fieldPath: PathT): NonNullable<TypeAtPath<TArgs, PathT>> extends Array<infer U> ? AsyncIterableStream<U> : never;
}

type ToolCallMessagePart<TArgs = ReadonlyJSONObject, TResult = unknown> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
  readonly argsText: string;
  readonly artifact?: unknown;
  readonly timing?: ToolCallTiming;
  readonly mcp?: ToolCallMessagePartMcpMetadata;
  readonly modelContent?: readonly ToolModelContentPart[] | undefined;
  readonly interrupt?: {
    type: "human";
    payload: unknown;
  };
  readonly approval?: {
    readonly id: string;
    readonly approved?: boolean;
    readonly reason?: string;
    readonly isAutomatic?: boolean;
    readonly options?: readonly ToolApprovalOption[];
    readonly optionId?: string;
    readonly resolution?: "cancelled" | "expired";
  };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
};

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolCallMessagePartStatus = {
  readonly type: "requires-action";
  readonly reason: "interrupt";
} | MessagePartStatus;

interface ToolCallReader<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  args: ToolCallArgsReader<TArgs>;
  response: ToolCallResponseReader<TResult>;
  result: {
    get: () => Promise<TResult>;
  };
}

interface ToolCallResponseReader<TResult> {
  get: () => Promise<ToolResponse<TResult>>;
}

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type ToolDisplay = "inline" | "standalone";

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
};

type ToolExecutionStatus = {
  type: "executing";
} | {
  type: "interrupt";
  payload: {
    type: "human";
    payload: unknown;
  };
};

type ToolModelContentPart = {
  readonly type: "text";
  readonly text: string;
} | {
  readonly type: "file";
  readonly data: string;
  readonly mediaType: string;
  readonly filename?: string;
};

type ToolModelOutputFunction<TArgs, TResult> = (options: {
  toolCallId: string;
  input: TArgs;
  output: TResult;
}) => readonly ToolModelContentPart[] | Promise<readonly ToolModelContentPart[]>;

declare class ToolResponse<TResult> {
  get [TOOL_RESPONSE_SYMBOL](): boolean;
  readonly artifact?: ReadonlyJSONValue;
  readonly result: TResult;
  readonly isError: boolean;
  readonly modelContent?: readonly ToolModelContentPart[];
  readonly messages?: ReadonlyJSONValue;
  constructor(options: ToolResponseLike<TResult>);
  static [Symbol.hasInstance](obj: unknown): obj is ToolResponse<ReadonlyJSONValue>;
  static toResponse(result: any | ToolResponse<any>): ToolResponse<any>;
}

type ToolResponseLike<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
  messages?: ReadonlyJSONValue | undefined;
};

type ToolStreamCallFunction<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecutionContext) => void;

type ToolWithoutType<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (Omit<FrontendTool<TArgs, TResult>, "type"> | Omit<BackendTool<TArgs, TResult>, "type"> | Omit<HumanTool<TArgs, TResult>, "type"> | Omit<ProviderTool<TArgs, TResult>, "type">) & {
  type?: undefined;
};

type TupleIndex<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

type TypeAtPath<T, P extends readonly any[]> = P extends [
  infer Head,
  ...infer Rest
] ? Head extends keyof T ? TypeAtPath<T[Head], Rest> : never : T;

type TypePath<T> = [
] | (0 extends 1 & T ? any[] : T extends object ? T extends readonly any[] ? number extends T["length"] ? {
  [K in TupleIndex<T>]: [
    AsNumber<K>,
    ...TypePath<T[K]>
  ];
}[TupleIndex<T>] : [
  number,
  ...TypePath<T[number]>
] : {
  [K in ObjectKey<T>]: [
    K,
    ...TypePath<T[K]>
  ];
}[ObjectKey<T>] : [
]);

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

type Unsubscribe = () => void;

type Unsubscribe$1 = () => void;

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

type VoiceSessionState = {
  readonly status: RealtimeVoiceAdapter.Status;
  readonly isMuted: boolean;
  readonly mode: RealtimeVoiceAdapter.Mode;
};

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

declare const createPiHttpClient: (options?: PiHttpClientOptions) => PiClient;

declare const createPiNodeClient: (options?: PiNodeClientOptions) => PiClient;

declare const createPiThreadState: (threadId: string) => PiThreadState;

declare const createSseDecoder: () => {
  push(chunk: string): SseFrame[];
};

declare const getPiThreadSupervisor: (options?: PiNodeClientOptions) => PiThreadSupervisor;

declare global {
  var __assistantUiPiHttpStreams: Map<string, SharedStream> | undefined;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare global {
  interface Window {
    __ASSISTANT_UI_DEVTOOLS_HOOK__?: any;
  }
}

declare namespace entry_root_exports {
  export { PiAgentMessage, PiAnyClientEvent, PiAssistantContent, PiAssistantMessage, PiAssistantMessageDelta, PiBashExecutionMessage, PiBranchSummaryMessage, PiClient, PiClientEvent, PiClientEventBody, PiClientEventEnvelope, PiCompactionSummaryMessage, PiContextUsage, PiCustomMessage, PiEventStreamOptions, PiHostUiRequest, PiHostUiRequestKind, PiHostUiResponse, PiHttpClientOptions, PiImageContent, PiInputAttachment, PiInterruptAnswer, PiKnownAgentMessage, PiLoadState, PiModelInfo, ContentPart as PiProjectedContentPart, PiProjectionInput, PiQueueMode, PiQueuedMessage, PiRunStatus, PiRuntimeExtras, PiRuntimeOptions, PiRuntimeReadiness, PiSendMessageInput, PiSendOptions, PiStopReason, PiTextContent, PiThinkingContent, PiThinkingLevel, PiThreadController, PiThreadControllerLike, PiThreadMetadata, PiThreadSnapshot, PiThreadState, PiThreadStatus, PiToolCall, PiToolExecutionState, PiToolResultContent, PiToolResultMessage, PiTranscriptMessage, PiUnknownAgentMessage, PiUnknownClientEventBody, PiUsage, PiUserContent, PiUserMessage, SplitHostUiRequests, SseFrame, createPiHttpClient, createPiThreadState, createSseDecoder, isPiSteerQueueItemId, openPiEventStream, piQueueItemId, projectPiThreadMessages, projectPiThreadRepository, reducePiThreadState, responseForApproval, responseForInterrupt, responseForRequest, splitHostUiRequests, usePiHostUiRequests, usePiRuntime, usePiRuntimeExtras, usePiSession, usePiThreadState };
}

declare const isPiSteerQueueItemId: (id: string) => boolean;

declare namespace entry_node_exports {
  export { PiAgentMessage, PiAnyClientEvent, PiAssistantContent, PiAssistantMessage, PiAssistantMessageDelta, PiBashExecutionMessage, PiBranchSummaryMessage, PiClient, PiClientEvent, PiClientEventBody, PiClientEventEnvelope, PiCompactionSummaryMessage, PiContextUsage, PiCustomMessage, PiHostUiRequest, PiHostUiRequestKind, PiHostUiResponse, PiImageContent, PiInputAttachment, PiKnownAgentMessage, PiModelInfo, PiNodeClientOptions, PiQueuedMessage, PiRuntimeReadiness, PiSendMessageInput, PiStopReason, PiTextContent, PiThinkingContent, PiThinkingLevel, PiThreadMetadata, PiThreadSnapshot, PiThreadStatus, PiThreadSupervisor, PiThreadSupervisorOptions, PiToolCall, PiToolResultContent, PiToolResultMessage, PiTranscriptMessage, PiUnknownAgentMessage, PiUnknownClientEventBody, PiUnsupportedHostUiError, PiUsage, PiUserContent, PiUserMessage, createPiNodeClient, getPiThreadSupervisor };
}

declare const openPiEventStream: (options: PiEventStreamOptions) => (() => void);

declare const piQueueItemId: (mode: PiQueueMode, index: number) => string;

declare const projectPiThreadMessages: (input: PiProjectionInput) => ThreadMessageLike[];

declare const projectPiThreadRepository: (input: PiProjectionInput) => ExportedMessageRepository;

declare const reducePiThreadState: (state: PiThreadState, event: PiClientEvent) => PiThreadState;

declare const responseForApproval: (requestId: string, approved: boolean) => PiHostUiResponse;

declare const responseForInterrupt: (requestId: string, answer: PiInterruptAnswer) => PiHostUiResponse;

declare const responseForRequest: (request: PiHostUiRequest, answer: boolean | PiInterruptAnswer) => PiHostUiResponse;

declare const splitHostUiRequests: (requests: readonly PiHostUiRequest[]) => SplitHostUiRequests;

declare const usePiHostUiRequests: () => {
  requests: readonly PiHostUiRequest[];
  respond: (response: PiHostUiResponse) => Promise<void>;
};

declare const usePiRuntime: (options: PiRuntimeOptions) => AssistantRuntime;

declare const usePiRuntimeExtras: () => PiRuntimeExtras;

declare const usePiSession: () => PiThreadMetadata | null;

declare function usePiThreadState(): PiThreadState;

declare function usePiThreadState<T>(selector: (state: PiThreadState) => T): T;

export { entry_node_exports as entry_node, entry_root_exports as entry_root };
