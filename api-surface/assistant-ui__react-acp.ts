import { StandardSchemaV1 } from "@standard-schema/spec";

declare const ACP_PROTOCOL_VERSION = 1;

type AcpAgentCapabilities = {
  readonly loadSession?: boolean;
  readonly promptCapabilities?: AcpPromptCapabilities;
  readonly mcpCapabilities?: ReadonlyJSONObject;
};

type AcpAnnotations = {
  readonly audience?: readonly ("assistant" | "user")[];
  readonly priority?: number;
};

type AcpAudioContentBlock = {
  readonly type: "audio";
  readonly data: string;
  readonly mimeType: string;
  readonly annotations?: AcpAnnotations;
};

type AcpAvailableCommand = {
  readonly name: string;
  readonly description: string;
  readonly input?: {
    readonly hint: string;
  };
};

declare class AcpClient {
  #private;
  onSessionUpdate: ((sessionId: string, update: AcpSessionUpdate) => void) | undefined;
  permissionHandler: AcpPermissionHandler;
  onConnectionChange: ((state: AcpConnectionState) => void) | undefined;
  constructor(options: AcpClientOptions);
  get connectionState(): AcpConnectionState;
  get sessionId(): string | undefined;
  get agentInfo(): AcpImplementation | undefined;
  get agentCapabilities(): AcpAgentCapabilities | undefined;
  connect(): Promise<AcpInitializeResponse>;
  ensureSession(): Promise<string>;
  prompt(content: readonly AcpContentBlock[]): Promise<AcpStopReason>;
  cancel(): Promise<void>;
  respondPermission(requestId: JsonRpcId, outcome: AcpPermissionOutcome): void;
  dispose(): void;
}

type AcpClientCapabilities = {
  readonly fs?: {
    readonly readTextFile?: boolean;
    readonly writeTextFile?: boolean;
  };
  readonly terminal?: boolean;
};

type AcpClientOptions = {
  url: string;
  cwd?: string;
  mcpServers?: readonly AcpMcpServer[];
  clientInfo?: AcpImplementation;
  webSocketFactory?: AcpWebSocketFactory;
};

type AcpConnectionState = "connected" | "connecting" | "disconnected";

declare class AcpContentAccumulator {
  #private;
  get content(): ThreadAssistantMessage["content"];
  consume(update: {
    sessionUpdate: string;
    content?: AcpContentBlock;
  } & Partial<AcpToolCallUpdate>): boolean;
  attachApproval(toolCall: AcpToolCallUpdate, approval: ToolCallMessagePart["approval"]): boolean;
  resolveApproval(approvalId: string, resolution: {
    approved: boolean;
    optionId?: string;
  }): boolean;
}

type AcpContentBlock = AcpTextContentBlock | AcpImageContentBlock | AcpAudioContentBlock | AcpResourceContentBlock;

declare class AcpError extends Error {
  readonly code: number;
  readonly data?: unknown | undefined;
  constructor(message: string, code: number, data?: unknown | undefined);
}

type AcpExtras = {
  readonly connectionState: AcpConnectionState;
  readonly sessionId: string | undefined;
  readonly agentInfo: AcpImplementation | undefined;
  readonly agentCapabilities: AcpAgentCapabilities | undefined;
  readonly plan: readonly AcpPlanEntry[] | undefined;
  readonly sessionTitle: string | undefined;
  readonly currentModeId: string | undefined;
  readonly availableCommands: readonly AcpAvailableCommand[] | undefined;
};

type AcpImageContentBlock = {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
  readonly uri?: string;
  readonly annotations?: AcpAnnotations;
};

type AcpImplementation = {
  readonly name: string;
  readonly title?: string;
  readonly version: string;
};

type AcpInitializeResponse = {
  readonly protocolVersion: number;
  readonly agentCapabilities?: AcpAgentCapabilities;
  readonly agentInfo?: AcpImplementation;
};

type AcpMcpServer = {
  readonly name: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
};

type AcpPermissionHandler = (request: AcpPermissionRequest) => AcpPermissionOutcome | Promise<AcpPermissionOutcome>;

type AcpPermissionOption = {
  readonly optionId: string;
  readonly name: string;
  readonly kind: AcpPermissionOptionKind;
  readonly description?: string;
};

type AcpPermissionOptionKind = "allow_always" | "allow_once" | "reject_always" | "reject_once";

type AcpPermissionOutcome = {
  readonly outcome: "selected";
  readonly optionId: string;
} | {
  readonly outcome: "cancelled";
};

type AcpPermissionRequest = {
  readonly sessionId: string;
  readonly toolCall: AcpToolCallUpdate;
  readonly options: readonly AcpPermissionOption[];
};

type AcpPermissionsMode = "ask" | "auto-allow";

type AcpPlanEntry = {
  readonly content: string;
  readonly priority: "high" | "low" | "medium";
  readonly status: "completed" | "in_progress" | "pending";
};

type AcpPromptCapabilities = {
  readonly image?: boolean;
  readonly audio?: boolean;
  readonly embeddedContext?: boolean;
};

type AcpResourceContentBlock = {
  readonly type: "resource";
  readonly resource: AcpResourceLink;
  readonly annotations?: AcpAnnotations;
};

type AcpResourceLink = {
  readonly uri: string;
  readonly name?: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly text?: string;
  readonly blob?: string;
};

type AcpSessionUpdate = {
  readonly sessionUpdate: "agent_message_chunk";
  readonly content: AcpContentBlock;
  readonly stopReason?: AcpStopReason;
} | {
  readonly sessionUpdate: "agent_thought_chunk";
  readonly content: AcpContentBlock;
} | ({
  readonly sessionUpdate: "tool_call";
} & AcpToolCall) | ({
  readonly sessionUpdate: "tool_call_update";
} & AcpToolCallUpdate) | {
  readonly sessionUpdate: "plan";
  readonly entries: readonly AcpPlanEntry[];
} | {
  readonly sessionUpdate: "available_commands_update";
  readonly availableCommands: readonly AcpAvailableCommand[];
} | {
  readonly sessionUpdate: "current_mode_update";
  readonly currentModeId: string;
} | {
  readonly sessionUpdate: "session_info_update";
  readonly title?: string;
  readonly updatedAt?: string;
} | {
  readonly sessionUpdate: "user_message_chunk";
  readonly content: AcpContentBlock;
};

type AcpStopReason = "cancelled" | "end_turn" | "max_tokens" | "max_turn_requests" | "refusal";

type AcpTextContentBlock = {
  readonly type: "text";
  readonly text: string;
  readonly annotations?: AcpAnnotations;
};

declare class AcpThreadRuntimeCore {
  #private;
  constructor(options: AcpThreadRuntimeCoreOptions);
  attachClient(): void;
  detachClient(): void;
  updateOptions(options: Omit<AcpThreadRuntimeCoreOptions, "notifyUpdate">): void;
  attachRuntime(runtime: AssistantRuntime): void;
  detachRuntime(): void;
  getRuntime(): AssistantRuntime | undefined;
  getMessages(): readonly ThreadMessage[];
  getMessageRepository(): ExportedMessageRepository;
  isRunning(): boolean;
  get isLoading(): boolean;
  getExtras(): AcpExtras;
  __internal_load(): Promise<void>;
  append(message: AppendMessage): Promise<void>;
  edit(message: AppendMessage): Promise<void>;
  reload(parentId: string | null): Promise<void>;
  cancel(): Promise<void>;
  respondToApproval(options: RespondToToolApprovalOptions): void;
  applyExternalMessages(messages: readonly ThreadMessage[]): void;
}

type AcpThreadRuntimeCoreOptions = {
  client: AcpClient;
  permissions?: AcpPermissionsMode;
  autoConnect?: boolean;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
  history?: ThreadHistoryAdapter | undefined;
  notifyUpdate: () => void;
};

type AcpToolCall = {
  readonly toolCallId: string;
  readonly title?: string;
  readonly kind?: AcpToolKind;
  readonly status?: AcpToolCallStatus;
  readonly content?: readonly AcpToolCallContent[];
  readonly locations?: readonly AcpToolCallLocation[];
  readonly rawInput?: ReadonlyJSONValue;
  readonly rawOutput?: ReadonlyJSONValue;
};

type AcpToolCallContent = {
  readonly type: "content";
  readonly content: readonly AcpContentBlock[];
} | {
  readonly type: "diff";
  readonly path: string;
  readonly oldText?: string;
  readonly newText: string;
};

type AcpToolCallLocation = {
  readonly path: string;
  readonly line?: number;
};

type AcpToolCallStatus = "completed" | "failed" | "in_progress" | "pending";

type AcpToolCallUpdate = {
  readonly toolCallId: string;
  readonly title?: string;
  readonly kind?: AcpToolKind;
  readonly status?: AcpToolCallStatus;
  readonly content?: readonly AcpToolCallContent[];
  readonly locations?: readonly AcpToolCallLocation[];
  readonly rawInput?: ReadonlyJSONValue;
  readonly rawOutput?: ReadonlyJSONValue;
};

type AcpToolKind = "delete" | "edit" | "execute" | "fetch" | "move" | "other" | "read" | "search" | "switch_mode" | "think";

type AcpWebSocketFactory = (url: string) => AcpWebSocketLike;

type AcpWebSocketLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((event?: unknown) => void) | null;
  onmessage: ((event: {
    data: unknown;
  }) => void) | null;
  onclose: ((event?: {
    code?: number;
    reason?: string;
  }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
};

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

type AssistantClient = ClientScopes & {
  readonly optional: {
    readonly [K in keyof ClientScopes]: ClientScopes[K] | undefined;
  };
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe;
};

type AssistantClientAccessor<K extends ClientNames> = ClientSchemas[K]["methods"] & {
  (): ClientSchemas[K]["methods"];
} & (ClientMeta<K> | {
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
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
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
  subscribe(callback: () => void): Unsubscribe$1;
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

type ClientEvents<K extends ClientNames> = "events" extends keyof ClientSchemas[K] ? ClientSchemas[K]["events"] extends ClientEventsType<K & string> ? ClientSchemas[K]["events"] : never : never;

type ClientEventsType<K extends string> = Record<`${K}.${string}`, unknown>;

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "query" | "source"> : never;

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientNames = keyof ClientSchemas extends (infer U) ? U : never;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K & string, ScopeRegistry[K]>;
};

type ClientScopes = {
  [K in ClientNames]: AssistantClientAccessor<K>;
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
  moveQueueItem(queueItemId: string, placement: QueuePlacement): void;
  removeQueueItem(queueItemId: string): void;
  subscribe(callback: () => void): Unsubscribe$1;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe$1;
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
    onSpeechStart: (callback: () => void) => Unsubscribe$1;
    onSpeechEnd: (callback: (result: Result) => void) => Unsubscribe$1;
    onSpeech: (callback: (result: Result) => void) => Unsubscribe$1;
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

type ExportedMessageRepositoryItem = {
  message: ThreadMessage;
  parentId: string | null;
  runConfig?: RunConfig;
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
  onRefetchThread?: (() => Promise<void>) | undefined;
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
  steerItems: readonly QueueItemState[];
  enqueue: (message: AppendMessage) => void;
  steer: (message: AppendMessage) => void;
  move: (queueItemId: string, placement: QueuePlacement) => void;
  edit: (queueItemId: string, message: AppendMessage) => void;
  remove: (queueItemId: string) => void;
  __internal_setDispatchTransform?: ((transform: (message: AppendMessage) => AppendMessage) => void) | undefined;
  __internal_notifyCancelled?: (() => void) | undefined;
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
  readonly sourceType?: "id" | "url";
  readonly providerMetadata?: PartProviderMetadata;
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

type GenericThreadHistoryAdapter<TMessage> = {
  load(): Promise<MessageFormatRepository<TMessage>>;
  append(item: MessageFormatItem<TMessage>): Promise<void>;
  update?(item: MessageFormatItem<TMessage>, localMessageId: string): Promise<void>;
  delete?(items: MessageFormatItem<TMessage>[]): Promise<void>;
  reportTelemetry?(items: MessageFormatItem<TMessage>[], options?: {
    durationMs?: number;
    stepTimestamps?: {
      start_ms: number;
      end_ms: number;
    }[];
  }): void;
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
  readonly providerMetadata?: PartProviderMetadata;
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

type JsonRpcId = number | string;

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
  readonly serverId?: string;
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

interface MessageFormatAdapter<TMessage, TStorageFormat extends Record<string, unknown>> {
  format: string;
  encode(item: MessageFormatItem<TMessage>): TStorageFormat;
  decode(stored: MessageStorageEntry<TStorageFormat>): MessageFormatItem<TMessage>;
  getId(message: TMessage): string;
}

interface MessageFormatItem<TMessage> {
  parentId: string | null;
  message: TMessage;
}

interface MessageFormatRepository<TMessage> {
  headId?: string | null;
  messages: MessageFormatItem<TMessage>[];
}

type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): void;
  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe$1;
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

type MessagePartStreamStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
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
  subscribe(callback: () => void): Unsubscribe$1;
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

interface MessageStorageEntry<TPayload> {
  id: string;
  parent_id: string | null;
  format: string;
  content: TPayload;
}

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
  subscribe?: (callback: () => void) => Unsubscribe$1;
};

type ObjectKey<T> = keyof T & (string | number);

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PartProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

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
  readonly parts: readonly (FileMessagePart | TextMessagePart)[];
};

type QueuePlacement = {
  readonly lane?: "queue" | "steer";
  readonly insertAfter?: string | null;
  readonly insertBefore?: string | null;
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
    onStatusChange: (callback: (status: Status) => void) => Unsubscribe$1;
    onTranscript: (callback: (transcript: TranscriptItem) => void) => Unsubscribe$1;
    onModeChange: (callback: (mode: Mode) => void) => Unsubscribe$1;
    onVolumeChange: (callback: (volume: number) => void) => Unsubscribe$1;
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
  readonly status?: MessagePartStreamStatus;
  readonly unstable_summary?: string;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type ReloadConfig = {
  runConfig?: RunConfig;
};

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

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
  readonly refetchThread: boolean;
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

type RuntimeExtras<T extends object> = {
  provide: (value: T) => T;
  is: (extras: unknown) => extras is T;
  tryGet: (extras: unknown) => T | undefined;
  get: (client: AssistantClient) => T;
  use: {
    (): T;
    <S>(select: (extras: T) => S): S;
    <S>(select: (extras: T) => S, fallback: S): S;
  };
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type SendOptions = {
  startRun?: boolean;
  steer?: boolean;
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

type SourceProviderMetadata = PartProviderMetadata;

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
    subscribe: (callback: () => void) => Unsubscribe$1;
  };
}

type SpeechSynthesisAdapter = {
  speak: (text: string) => SpeechSynthesisAdapter.Utterance;
};

type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly providerMetadata?: PartProviderMetadata;
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

type ThreadHistoryAdapter = {
  load(): Promise<ExportedMessageRepository & {
    state?: ReadonlyJSONValue;
    unstable_resume?: boolean;
  }>;
  resume?(options: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void, unknown>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
  update?(item: ExportedMessageRepositoryItem): Promise<void>;
  delete?(items: ExportedMessageRepositoryItem[]): Promise<void>;
  withFormat?<TMessage, TStorageFormat extends Record<string, unknown>>(formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>): GenericThreadHistoryAdapter<TMessage>;
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
  subscribe(callback: () => void): Unsubscribe$1;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe$1;
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
  readonly isRunning: boolean;
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
  subscribe(callback: () => void): Unsubscribe$1;
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
  reloadMainThread(): Promise<void>;
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
  readonly threadItems: Readonly<Record<string, Omit<ThreadListItemState, "isMain" | "isRunning" | "threadId">>>;
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
    readonly providerMetadata?: PartProviderMetadata;
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
  subscribe(callback: () => void): Unsubscribe$1;
  cancelRun(): void;
  unstable_notifySessionReset(): void;
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
  subscribeVoiceVolume(callback: () => void): Unsubscribe$1;
  muteVoice(): void;
  unmuteVoice(): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
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
  title?: string;
  label?: string;
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
    readonly isOptimistic?: boolean;
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
  overwrite?: boolean;
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
  readonly providerMetadata?: PartProviderMetadata;
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

type UseAcpRuntimeOptions = ExternalStoreSharedOptions & {
  client?: AcpClient;
  url?: string;
  cwd?: string;
  mcpServers?: readonly AcpMcpServer[];
  clientInfo?: AcpImplementation;
  webSocketFactory?: AcpWebSocketFactory;
  permissions?: AcpPermissionsMode;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  adapters?: {
    attachments?: AttachmentAdapter;
    speech?: SpeechSynthesisAdapter;
    dictation?: DictationAdapter;
    voice?: RealtimeVoiceAdapter;
    feedback?: FeedbackAdapter;
    history?: ThreadHistoryAdapter;
  };
};

type ValidateClient<K extends string, TClient> = K extends ReservedScopeNames ? ClientError<`ERROR: ${K} is a reserved scope name`> : unknown extends ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> ? TClient : ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> & ClientError<never>;

type ValidateEvents<K extends string, TClient> = "events" extends keyof TClient ? TClient["events"] extends ClientEventsType<K> ? unknown : ClientError<`ERROR: ${K} has invalid events type`> : unknown;

type ValidateMeta<K extends string, TClient> = "meta" extends keyof TClient ? TClient["meta"] extends ClientMetaType ? unknown : ClientError<`ERROR: ${K} has invalid meta type`> : unknown;

type ValidateMethods<K extends string, TClient> = TClient extends {
  methods: ClientMethods;
} ? keyof TClient["methods"] & ReservedAccessorProps extends never ? unknown : ClientError<`ERROR: ${K} methods declare a reserved accessor property (source/query/name)`> : ClientError<`ERROR: ${K} has invalid methods type`>;

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

declare const acpExtras: RuntimeExtras<AcpExtras>;

declare function acpToolStatusToPartStatus(status: AcpToolCallStatus): MessagePartStatus;

declare const autoAllowPermissionHandler: AcpPermissionHandler;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare namespace entry_root_exports {
  export { ACP_PROTOCOL_VERSION, AcpAgentCapabilities, AcpAnnotations, AcpAudioContentBlock, AcpAvailableCommand, AcpClient, AcpClientCapabilities, AcpClientOptions, AcpConnectionState, AcpContentAccumulator, AcpContentBlock, AcpError, AcpExtras, AcpImageContentBlock, AcpImplementation, AcpInitializeResponse, AcpMcpServer, AcpPermissionHandler, AcpPermissionOption, AcpPermissionOptionKind, AcpPermissionOutcome, AcpPermissionRequest, AcpPermissionsMode, AcpPlanEntry, AcpPromptCapabilities, AcpResourceContentBlock, AcpResourceLink, AcpSessionUpdate, AcpStopReason, AcpTextContentBlock, AcpThreadRuntimeCore, AcpThreadRuntimeCoreOptions, AcpToolCall, AcpToolCallContent, AcpToolCallLocation, AcpToolCallStatus, AcpToolCallUpdate, AcpToolKind, AcpWebSocketFactory, AcpWebSocketLike, UseAcpRuntimeOptions, acpExtras, acpToolStatusToPartStatus, autoAllowPermissionHandler, isAllowKind, permissionOptionToApprovalOption, stopReasonToMessageStatus, threadContentToAcpBlocks, toolCallContentToText, useAcpAgentInfo, useAcpAvailableCommands, useAcpConnectionState, useAcpCurrentModeId, useAcpPlan, useAcpRuntime, useAcpSessionId, useAcpSessionTitle };
}

declare function isAllowKind(kind: AcpPermissionOption["kind"]): boolean;

declare function permissionOptionToApprovalOption(option: AcpPermissionOption): {
  id: string;
  kind: string;
  label: string;
  description?: string;
};

declare function stopReasonToMessageStatus(stopReason: AcpStopReason): MessageStatus;

declare function threadContentToAcpBlocks(content: ThreadUserMessage["content"]): AcpContentBlock[];

declare function toolCallContentToText(content: readonly AcpToolCallContent[] | undefined): string | undefined;

declare const useAcpAgentInfo: () => AcpImplementation | undefined;

declare const useAcpAvailableCommands: () => readonly AcpAvailableCommand[] | undefined;

declare const useAcpConnectionState: () => AcpConnectionState;

declare const useAcpCurrentModeId: () => string | undefined;

declare const useAcpPlan: () => readonly AcpPlanEntry[] | undefined;

declare function useAcpRuntime(options: UseAcpRuntimeOptions): AssistantRuntime;

declare const useAcpSessionId: () => string | undefined;

declare const useAcpSessionTitle: () => string | undefined;

export { entry_root_exports as entry_root };
