import { StandardSchemaV1 } from "@standard-schema/spec";

import { ComponentType, FC, PropsWithChildren, ReactNode, RefObject } from "react";

interface ScopeRegistry {
    threads: ThreadsClientSchema;
    threadListItem: ThreadListItemClientSchema;
    thread: ThreadClientSchema;
    message: MessageClientSchema;
    part: PartClientSchema;
    composer: ComposerClientSchema;
    attachment: AttachmentClientSchema;
    modelContext: ModelContextClientSchema;
    suggestions: SuggestionsClientSchema;
    suggestion: SuggestionClientSchema;
    chainOfThought: ChainOfThoughtClientSchema;
    queueItem: QueueItemClientSchema;
}

interface ScopeRegistry {
    tools: ToolsClientSchema;
    dataRenderers: DataRenderersClientSchema;
    interactables: InteractablesClientSchema;
    unstable_interactables: Unstable_InteractablesClientSchema;
}

type AbortableThreadLoadOptions = {
  purpose?: AbortableThreadLoadPurpose;
  load: (signal: AbortSignal) => Promise<void>;
  onSettled: () => void;
  onInitialError: (error: unknown) => void;
};

type AbortableThreadLoadPurpose = "initial" | "reload";

type AddMessageCommand = {
  readonly type: "add-message";
  readonly message: UserMessage | AssistantMessage;
  readonly parentId: string | null;
  readonly sourceId: string | null;
};

type AddToolResultCommand = {
  readonly type: "add-tool-result";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: ReadonlyJSONValue;
  readonly isError: boolean;
  readonly artifact?: ReadonlyJSONValue;
  readonly modelContent?: readonly ToolModelContentPart[];
};

type AddToolResultCommand$1 = {
  readonly type: "add-tool-result";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: ReadonlyJSONValue;
  readonly isError: boolean;
  readonly artifact?: ReadonlyJSONValue;
  readonly modelContent?: readonly ToolModelContentPart[];
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

declare namespace Assistant {
  interface Commands {
  }
  interface ExternalState {
  }
}

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

declare class AssistantCloud {
  readonly threads: AssistantCloudThreads;
  readonly projects: AssistantCloudProjects;
  readonly auth: {
    tokens: AssistantCloudAuthTokens;
  };
  readonly runs: AssistantCloudRuns;
  readonly files: AssistantCloudFiles;
  readonly telemetry: AssistantCloudTelemetryConfig;
  constructor(config: AssistantCloudConfig);
}

declare class AssistantCloudAPI {
  _auth: AssistantCloudAuthStrategy;
  _baseUrl: string;
  constructor(config: AssistantCloudConfig);
  initializeAuth(): Promise<boolean>;
  makeRawRequest(endpoint: string, options?: MakeRequestOptions): Promise<Response>;
  makeRequest(endpoint: string, options?: MakeRequestOptions): Promise<any>;
}

type AssistantCloudAuthStrategy = {
  readonly strategy: "anon" | "api-key" | "jwt";
  getAuthHeaders(): Promise<Record<string, string> | false>;
  readAuthHeaders(headers: Headers): void;
};

declare class AssistantCloudAuthTokens {
  #private;
  constructor(cloud: AssistantCloudAPI);
  create(): Promise<AssistantCloudAuthTokensCreateResponse>;
}

type AssistantCloudAuthTokensCreateResponse = {
  token: string;
};

type AssistantCloudConfig = ({
  baseUrl: string;
  authToken: () => Promise<string | null>;
} | {
  baseUrl?: string;
  apiKey: string;
  userId: string;
  workspaceId: string;
} | {
  baseUrl: string;
  anonymous: true;
}) & {
  telemetry?: boolean | AssistantCloudTelemetryConfig;
};

declare class AssistantCloudFiles {
  #private;
  constructor(cloud: AssistantCloudAPI);
  pdfToImages(body: PdfToImagesRequestBody): Promise<PdfToImagesResponse>;
  generatePresignedUploadUrl(body: GeneratePresignedUploadUrlRequestBody): Promise<GeneratePresignedUploadUrlResponse>;
}

type AssistantCloudMessageCreateResponse = {
  message_id: string;
};

type AssistantCloudProjectThreadMessageListQuery = {
  format?: string;
  limit?: number;
  after?: string;
};

type AssistantCloudProjectThreadMessageListResponse = {
  messages: CloudMessage[];
};

declare class AssistantCloudProjectThreadMessages {
  #private;
  constructor(cloud: AssistantCloudAPI);
  list(threadId: string, query?: AssistantCloudProjectThreadMessageListQuery): Promise<AssistantCloudProjectThreadMessageListResponse>;
}

declare class AssistantCloudProjectThreads {
  #private;
  readonly messages: AssistantCloudProjectThreadMessages;
  constructor(cloud: AssistantCloudAPI);
  list(query?: AssistantCloudProjectThreadsListQuery): Promise<AssistantCloudProjectThreadsListResponse>;
}

type AssistantCloudProjectThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

type AssistantCloudProjectThreadsListResponse = {
  threads: CloudThread[];
};

declare class AssistantCloudProjects {
  readonly threads: AssistantCloudProjectThreads;
  constructor(cloud: AssistantCloudAPI);
}

type AssistantCloudRunReport = {
  thread_id: string;
  status: "completed" | "error" | "incomplete";
  total_steps?: number;
  tool_calls?: AssistantCloudRunReportToolCall[];
  steps?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    cached_input_tokens?: number;
    tool_calls?: AssistantCloudRunReportToolCall[];
    start_ms?: number;
    end_ms?: number;
  }[];
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  model_id?: string;
  provider_type?: string;
  duration_ms?: number;
  output_text?: string;
  metadata?: Record<string, unknown>;
};

type AssistantCloudRunReportToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "backend" | "frontend" | "mcp";
  start_ms?: number;
  end_ms?: number;
  sampling_calls?: SamplingCallData[];
};

declare class AssistantCloudRuns {
  #private;
  constructor(cloud: AssistantCloudAPI);
  __internal_getAssistantOptions(assistantId: string): {
    api: string;
    headers: () => Promise<{
      Accept: string;
    }>;
    body: {
      assistant_id: string;
      response_format: string;
      thread_id: string;
    };
  };
  stream(body: AssistantCloudRunsStreamBody): Promise<AssistantStream>;
  report(body: AssistantCloudRunReport): Promise<{
    run_id: string;
  }>;
}

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: readonly unknown[];
};

type AssistantCloudTelemetryConfig = {
  enabled?: boolean;
  beforeReport?: (report: AssistantCloudRunReport) => AssistantCloudRunReport | null;
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudThreadMessageFeedbackBody = {
  type: "negative" | "positive";
};

type AssistantCloudThreadMessageFeedbackResponse = {
  feedback_id: string;
  type: "negative" | "positive";
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
};

declare class AssistantCloudThreadMessages {
  #private;
  constructor(cloud: AssistantCloudAPI);
  list(threadId: string, query?: AssistantCloudThreadMessageListQuery): Promise<AssistantCloudThreadMessageListResponse>;
  create(threadId: string, body: AssistantCloudThreadMessageCreateBody): Promise<AssistantCloudMessageCreateResponse>;
  update(threadId: string, messageId: string, body: AssistantCloudThreadMessageUpdateBody): Promise<void>;
  feedback(threadId: string, messageId: string, body: AssistantCloudThreadMessageFeedbackBody): Promise<AssistantCloudThreadMessageFeedbackResponse>;
}

declare class AssistantCloudThreads {
  #private;
  readonly messages: AssistantCloudThreadMessages;
  constructor(cloud: AssistantCloudAPI);
  list(query?: AssistantCloudThreadsListQuery): Promise<AssistantCloudThreadsListResponse>;
  get(threadId: string): Promise<CloudThread>;
  create(body: AssistantCloudThreadsCreateBody): Promise<AssistantCloudThreadsCreateResponse>;
  update(threadId: string, body: AssistantCloudThreadsUpdateBody): Promise<void>;
  claim(body: AssistantCloudThreadsClaimBody): Promise<AssistantCloudThreadsClaimResponse>;
  delete(threadId: string): Promise<void>;
}

type AssistantCloudThreadsClaimBody = {
  refresh_token: string;
};

type AssistantCloudThreadsClaimResponse = {
  moved: number;
};

type AssistantCloudThreadsCreateBody = {
  title?: string | undefined;
  last_message_at: Date;
  metadata?: unknown | undefined;
  external_id?: string | undefined;
};

type AssistantCloudThreadsCreateResponse = {
  thread_id: string;
};

type AssistantCloudThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

type AssistantCloudThreadsListResponse = {
  threads: CloudThread[];
};

type AssistantCloudThreadsUpdateBody = {
  title?: string | undefined;
  last_message_at?: Date | undefined;
  metadata?: unknown | undefined;
  is_archived?: boolean | undefined;
};

type AssistantContextConfig = {
  getContext: () => string;
  disabled?: boolean | undefined;
};

type AssistantDataUI = FC & {
  unstable_data: AssistantDataUIProps;
};

type AssistantDataUIProps<T = any> = {
  name: string;
  render: DataMessagePartComponent<T>;
};

type AssistantError = {
  readonly code: AssistantErrorCode;
  readonly message: string;
  readonly severity?: ErrorSeverity;
  readonly display?: ErrorDisplay;
};

type AssistantErrorCode = "unknown" | "network" | "provider" | (string & {});

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

declare class AssistantFrameHost implements ModelContextProvider {
  #private;
  constructor(iframeWindow: Window, targetOrigin?: string);
  getModelContext(): ModelContext$1;
  subscribe(callback: () => void): Unsubscribe$1;
  dispose(): void;
}

declare class AssistantFrameProvider {
  #private;
  private constructor();
  static addModelContextProvider(provider: ModelContextProvider, targetOrigin?: string): Unsubscribe$1;
  static dispose(): void;
}

type AssistantInstructionsConfig = {
  disabled?: boolean | undefined;
  instruction: string;
};

type AssistantInteractableProps = {
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: unknown;
  id?: string;
  selected?: boolean;
};

type AssistantMessage = {
  readonly role: "assistant";
  readonly parts: readonly TextPart[];
};

declare const AssistantProviderBase: FC<AssistantProviderBaseProps>;

type AssistantProviderBaseProps = PropsWithChildren<{
  runtime: AssistantRuntime;
  aui?: AssistantClient | null | undefined;
  config?: AuiConfig | undefined;
}>;

type AssistantRuntime = {
  readonly threads: ThreadListRuntime;
  readonly thread: ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
};

type AssistantRuntimeCore = {
  readonly threads: ThreadListRuntimeCore;
  registerModelContextProvider: (provider: ModelContextProvider) => Unsubscribe$1;
  getModelContextProvider: () => ModelContextProvider;
  readonly RenderComponent?: ((...args: any[]) => unknown) | undefined;
};

declare class AssistantRuntimeImpl implements AssistantRuntime {
  #private;
  readonly threads: ThreadListRuntimeImpl;
  readonly _thread: ThreadRuntime;
  constructor(_core: AssistantRuntimeCore);
  protected __internal_bindMethods(): void;
  get thread(): ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
}

declare const AssistantRuntimeProvider: import("react").MemoExoticComponent<(_param0: {
  runtime: AssistantRuntime;
  aui?: AssistantClient | null;
  config?: AuiConfig;
  children: ReactNode;
}) => import("react").JSX.Element>;

type AssistantState = ScopeStates & {
  readonly optional: {
    readonly [K in keyof ScopeStates]: ScopeStates[K] | undefined;
  };
};

type AssistantStream = ReadableStream<AssistantStreamChunk>;

declare const AssistantStream: {
  toResponse(stream: AssistantStream, transformer: AssistantStreamEncoder): Response;
  fromResponse(response: Response, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
  toByteStream(stream: AssistantStream, transformer: ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk>): ReadableStream<Uint8Array<ArrayBuffer>>;
  fromByteStream(readable: ReadableStream<Uint8Array<ArrayBuffer>>, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
};

type AssistantStreamChunk = {
  readonly path: readonly number[];
} & ({
  readonly type: "part-start";
  readonly part: PartInit;
} | {
  readonly type: "part-finish";
} | {
  readonly type: "tool-call-args-text-finish";
} | {
  readonly type: "text-delta";
  readonly textDelta: string;
} | {
  readonly type: "annotations";
  readonly annotations: ReadonlyJSONValue[];
} | {
  readonly type: "data";
  readonly data: ReadonlyJSONValue[];
} | {
  readonly type: "step-start";
  readonly messageId: string;
} | {
  readonly type: "step-finish";
  readonly finishReason: "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly isContinued: boolean;
} | {
  readonly type: "message-finish";
  readonly finishReason: "content-filter" | "error" | "length" | "other" | "stop" | "tool-calls" | "unknown";
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
} | {
  readonly type: "result";
  readonly artifact?: ReadonlyJSONValue;
  readonly result: ReadonlyJSONValue;
  readonly isError: boolean;
  readonly modelContent?: readonly ToolModelContentPart[];
  readonly messages?: ReadonlyJSONValue;
} | {
  readonly type: "error";
  readonly error: string;
  readonly code?: string;
  readonly severity?: "critical" | "info" | "warning";
} | {
  readonly type: "update-state";
  readonly operations: AssistantTransportStateOperation[];
});

type AssistantStreamEncoder = ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk> & {
  headers?: Headers;
};

type AssistantTool = FC & {
  unstable_tool: AssistantToolProps<any, any>;
};

type AssistantToolProps<TArgs extends Record<string, unknown>, TResult> = AssistantToolProps$1<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  renderText?: ToolCallText<TArgs, TResult> | undefined;
};

type AssistantToolProps$1<TArgs extends Record<string, unknown>, TResult> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: unknown;
};

type AssistantToolUI = FC & {
  unstable_tool: AssistantToolUIProps<any, any>;
};

type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallMessagePartComponent<TArgs, TResult>;
  display?: "inline" | "standalone";
};

type AssistantTransportCommand = AddMessageCommand | AddToolResultCommand | UserCommands;

type AssistantTransportConnectionMetadata = {
  pendingCommands: AssistantTransportCommand[];
  isSending: boolean;
  toolStatuses: Record<string, ToolExecutionStatus>;
};

type AssistantTransportOptions<T> = {
  initialState: T;
  api: string;
  resumeApi?: string;
  resumeStateApi?: string;
  protocol?: AssistantTransportProtocol;
  strict?: boolean;
  converter: AssistantTransportStateConverter<T>;
  headers: HeadersValue | (() => Promise<HeadersValue>);
  body?: object | (() => Promise<object | undefined>);
  prepareSendCommandsRequest?: (body: SendCommandsRequestBody) => Record<string, unknown> | Promise<Record<string, unknown>>;
  onResponse?: (response: Response) => void | Promise<void>;
  onFinish?: () => void;
  onError?: (error: Error, params: {
    commands: AssistantTransportCommand[];
    updateState: (updater: (state: T) => T) => void;
  }) => void | Promise<void>;
  onCancel?: (params: {
    commands: AssistantTransportCommand[];
    updateState: (updater: (state: T) => T) => void;
    error?: Error;
  }) => void;
  capabilities?: {
    edit?: boolean;
  };
  adapters?: {
    attachments?: AttachmentAdapter | undefined;
    history?: ThreadHistoryAdapter | undefined;
  };
};

type AssistantTransportProtocol = "assistant-transport" | "data-stream";

type AssistantTransportState = {
  readonly messages: readonly ThreadMessage[];
  readonly state?: ReadonlyJSONValue;
  readonly isRunning: boolean;
};

type AssistantTransportStateConverter<T> = (state: T, connectionMetadata: AssistantTransportConnectionMetadata) => AssistantTransportState;

type AssistantTransportStateOperation = {
  readonly type: "set";
  readonly path: readonly string[];
  readonly value: ReadonlyJSONValue;
} | {
  readonly type: "append-text";
  readonly path: readonly string[];
  readonly value: string;
};

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

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

type AttachmentClientSchema = {
  methods: AttachmentMethods;
  meta: AttachmentMeta;
};

type AttachmentMeta = {
  source: "composer" | "message";
  query: {
    type: "index";
    index: number;
  } | {
    type: "id";
    id: string;
  };
};

type AttachmentMethods = {
  getState(): AttachmentState;
  remove(): Promise<void>;
  __internal_getRuntime?(): AttachmentRuntime;
};

type AttachmentRuntime<TSource extends AttachmentRuntimeSource = AttachmentRuntimeSource> = {
  readonly path: AttachmentRuntimePath & {
    attachmentSource: TSource;
  };
  readonly source: TSource;
  getState(): AttachmentState$1 & {
    source: TSource;
  };
  remove(): Promise<void>;
  subscribe(callback: () => void): Unsubscribe$1;
};

declare const AttachmentRuntimeClient: Resource<ClientOutput<"attachment">, [
  {
    runtime: AttachmentRuntime;
  }
]>;

declare abstract class AttachmentRuntimeImpl<Source extends AttachmentRuntimeSource = AttachmentRuntimeSource> implements AttachmentRuntime {
  #private;
  get path(): AttachmentRuntimePath & {
    attachmentSource: Source;
  };
  abstract get source(): Source;
  constructor(_core: AttachmentSnapshotBinding<Source>);
  protected __internal_bindMethods(): void;
  getState(): AttachmentState$1 & {
    source: Source;
  };
  abstract remove(): Promise<void>;
  subscribe(callback: () => void): Unsubscribe$1;
}

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

type AttachmentRuntimeSource = AttachmentState$1["source"];

type AttachmentSnapshotBinding<Source extends AttachmentRuntimeSource> = SubscribableWithState<AttachmentState$1 & {
  source: Source;
}, AttachmentRuntimePath & {
  attachmentSource: Source;
}>;

type AttachmentState = Attachment;

type AttachmentState$1 = ThreadComposerAttachmentState | EditComposerAttachmentState | MessageAttachmentState;

type AttachmentStatus = PendingAttachmentStatus | CompleteAttachmentStatus;

type AuiConfig = AuiConfig.Input & {
  readonly [auiConfigBrand]: true;
};

declare namespace AuiConfig {
  type Input = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

declare const AuiConfig: (config: AuiConfig.Input) => AuiConfig;

type AuiToolOverride<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = Partial<Tool<TArgs, TResult>>;

type AuiToolOverrides = Record<string, AuiToolOverride<any, any>>;

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

type BackendToolDeclaration<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolBase<TArgs, TResult> & {
  type: "backend";
  description?: string | undefined;
  parameters?: StandardSchemaV1<TArgs> | JSONSchema7 | undefined;
  disabled?: boolean;
  execute?: ToolExecuteFunction<TArgs, TResult>;
  toModelOutput?: ToolModelOutputFunction<TArgs, TResult>;
  experimental_onSchemaValidationError?: OnSchemaValidationErrorFunction<TResult>;
  providerOptions?: ProviderOptions;
};

declare abstract class BaseAssistantRuntimeCore implements AssistantRuntimeCore {
  protected readonly _contextProvider: CompositeContextProvider;
  abstract get threads(): ThreadListRuntimeCore;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
  getModelContextProvider(): ModelContextProvider;
}

type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
};

declare abstract class BaseComposerRuntimeCore extends BaseSubscribable implements ComposerRuntimeCore {
  #private;
  readonly isEditing = true;
  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected abstract getDictationAdapter(): DictationAdapter | undefined;
  protected enrichWithComposerMetadata<T extends {
    metadata?: {
      custom?: Record<string, unknown>;
    };
  }>(message: T, composerMetadata: Record<string, unknown> | undefined): T;
  get attachmentAccept(): string;
  get attachments(): readonly Attachment[];
  protected setAttachments(value: readonly Attachment[]): void;
  abstract get canCancel(): boolean;
  abstract get canSend(): boolean;
  get isEmpty(): boolean;
  get text(): string;
  get role(): "assistant" | "system" | "user";
  get runConfig(): RunConfig;
  get quote(): QuoteInfo | undefined;
  setQuote(quote: QuoteInfo | undefined): void;
  setText(value: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  protected _isSending: boolean;
  reset(): Promise<void>;
  clearAttachments(): Promise<void>;
  send(options?: SendOptions): Promise<void>;
  restoreDraft(draft: {
    text: string;
    quote?: QuoteInfo | undefined;
    attachments?: readonly Attachment[] | undefined;
  }): boolean;
  retractDraft(draft: {
    text: string;
    quote?: QuoteInfo | undefined;
    attachments?: readonly Attachment[] | undefined;
  }): void;
  cancel(): void;
  get queue(): readonly QueueItemState[];
  moveQueueItem(_queueItemId: string, _placement: QueuePlacement): void;
  removeQueueItem(_queueItemId: string): void;
  protected abstract handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">, options?: SendOptions): void | Promise<void>;
  protected abstract handleCancel(): void;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  removeAttachment(attachmentId: string): Promise<void>;
  get dictation(): DictationState | undefined;
  startDictation(): void;
  stopDictation(): void;
  protected _notifyEventSubscribers<E extends ComposerRuntimeEventType>(event: E, payload: ComposerRuntimeEventPayload[E]): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): () => void;
}

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

declare abstract class BaseSubject {
  #private;
  protected get isConnected(): boolean;
  protected abstract _connect(): Unsubscribe$1;
  protected notifySubscribers(payload?: unknown, errorContext?: string): void;
  subscribe(callback: (payload?: unknown) => void): () => void;
}

declare class BaseSubscribable {
  #private;
  subscribe(callback: () => void): Unsubscribe$1;
  waitForUpdate(): Promise<void>;
  protected _notifySubscribers(): void;
}

type BaseThreadAdapters = {
  speech?: SpeechSynthesisAdapter | undefined;
  feedback?: FeedbackAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
  voice?: RealtimeVoiceAdapter | undefined;
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

declare abstract class BaseThreadRuntimeCore extends BaseSubscribable implements ThreadRuntimeCore {
  #private;
  protected repository: MessageRepository;
  abstract get adapters(): BaseThreadAdapters | undefined;
  abstract get isDisabled(): boolean;
  abstract get isSendDisabled(): boolean;
  abstract get isLoading(): boolean;
  abstract get suggestions(): readonly ThreadSuggestion[];
  abstract get extras(): unknown;
  abstract get capabilities(): RuntimeCapabilities;
  abstract append(message: AppendMessage): void;
  abstract deleteMessage(messageId: string): void | Promise<void>;
  abstract startRun(config: StartRunConfig): void;
  abstract resumeRun(config: ResumeRunConfig): void;
  abstract addToolResult(options: AddToolResultOptions): void;
  abstract resumeToolCall(options: ResumeToolCallOptions): void;
  abstract respondToToolApproval(options: RespondToToolApprovalOptions): Promise<void>;
  abstract cancelRun(): void;
  abstract exportExternalState(): any;
  abstract importExternalState(state: any): void;
  abstract unstable_notifySessionReset(): void;
  protected _voiceMessages: ThreadMessage[];
  protected _voiceGeneration: number;
  protected _markVoiceMessagesDirty(): void;
  protected _getBaseMessages(): readonly ThreadMessage[];
  get messages(): readonly ThreadMessage[];
  get state(): string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray | null;
  readonly composer: DefaultThreadComposerRuntimeCore;
  constructor(_contextProvider: ModelContextProvider);
  getModelContext(): ModelContext$1;
  protected enrichAppendMetadata(message: AppendMessage, anchorId?: string | null): AppendMessage;
  getEditComposer(messageId: string): DefaultEditComposerRuntimeCore | undefined;
  beginEdit(messageId: string): void;
  getMessageById(messageId: string): {
    parentId: string | null;
    message: ThreadMessage;
    index: number;
  } | undefined;
  getBranches(messageId: string): string[];
  switchToBranch(branchId: string): void;
  _notifyEventSubscribers<E extends ThreadRuntimeEventType>(event: E, payload: ThreadRuntimeEventPayload[E]): void;
  submitFeedback(_param1: SubmitFeedbackOptions): void;
  speech: SpeechState | undefined;
  speak(messageId: string): void;
  stopSpeaking(): void;
  voice: VoiceSessionState | undefined;
  getVoiceVolume: () => number;
  subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
  connectVoice(): void;
  disconnectVoice(): void;
  muteVoice(): void;
  unmuteVoice(): void;
  protected ensureInitialized(): void;
  export(): ExportedMessageRepository;
  import(data: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
}

declare const ChainOfThoughtByIndicesProvider: FC<PropsWithChildren<{
  startIndex: number;
  endIndex: number;
}>>;

declare const ChainOfThoughtClient: Resource<ClientOutput<"chainOfThought">, [
  {
    parts: readonly ChainOfThoughtPart[];
    getMessagePart: (selector: {
      index: number;
    }) => PartMethods;
  }
]>;

type ChainOfThoughtClientSchema = {
  methods: ChainOfThoughtMethods;
  meta: ChainOfThoughtMeta;
};

type ChainOfThoughtMeta = {
  source: "message";
  query: {
    type: "chainOfThought";
  };
};

type ChainOfThoughtMethods = {
  getState(): ChainOfThoughtState;
  setCollapsed(collapsed: boolean): void;
  part(selector: {
    index: number;
  }): PartMethods;
};

type ChainOfThoughtPart = Extract<PartState, {
  type: "tool-call";
} | {
  type: "reasoning";
}>;

declare const ChainOfThoughtPartByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

type ChainOfThoughtPartsComponentConfig = {
  Reasoning?: ReasoningMessagePartComponent | undefined;
  tools?: {
    Fallback?: ToolCallMessagePartComponent | undefined;
  };
  Layout?: ComponentType<PropsWithChildren> | undefined;
};

declare namespace ChainOfThoughtPrimitiveParts {
  type Props = {
    components?: ChainOfThoughtPartsComponentConfig;
    children?: never;
  } | {
    children: (value: {
      part: PartState;
    }) => ReactNode;
    components?: never;
  };
}

declare const ChainOfThoughtPrimitiveParts: FC<ChainOfThoughtPrimitiveParts.Props>;

type ChainOfThoughtState = {
  readonly parts: readonly ChainOfThoughtPart[];
  readonly collapsed: boolean;
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type ChatModelAdapter = {
  run(options: ChatModelRunOptions): Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};

type ChatModelRunOptions = {
  readonly messages: readonly ThreadMessage[];
  readonly runConfig: RunConfig;
  readonly abortSignal: AbortSignal;
  readonly context: ModelContext$1;
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

type ChatModelRunUpdate = {
  readonly content: readonly ThreadAssistantMessagePart[];
  readonly metadata?: Record<string, unknown>;
};

type ClientElement<K extends ClientNames> = ResourceElement<ClientOutput<K>>;

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

type ClientOutput<K extends ClientNames> = ClientSchemas[K]["methods"] & ClientMethods;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K & string, ScopeRegistry[K]>;
};

type ClientScopes = {
  [K in ClientNames]: AssistantClientAccessor<K>;
};

declare class CloudFileAttachmentAdapter implements AttachmentAdapter {
  #private;
  accept: string;
  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  add(_param2: {
    file: File;
  }): AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
}

type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type CloudThread = {
  title: string;
  last_message_at: Date;
  metadata: unknown;
  external_id: string | null;
  id: string;
  project_id: string;
  created_at: Date;
  updated_at: Date;
  workspace_id: string;
  is_archived: boolean;
};

type CloudThreadListAdapter = {
  cloud: AssistantCloud;
  runtimeHook: () => AssistantRuntime;
  create?(): Promise<ThreadData>;
  delete?(threadId: string): Promise<void>;
};

type CloudThreadListAdapterOptions = {
  cloud?: AssistantCloud | undefined;
  create?: (() => Promise<ThreadData$1>) | undefined;
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type CompleteAttachmentStatus = {
  type: "complete";
};

declare const ComposerAttachmentByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare abstract class ComposerAttachmentRuntime<Source extends "edit-composer" | "thread-composer"> extends AttachmentRuntimeImpl<Source> {
  #private;
  constructor(core: AttachmentSnapshotBinding<Source>, _composerApi: ComposerRuntimeCoreBinding);
  remove(): Promise<void>;
}

type ComposerAttachmentsComponentConfig = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

declare const ComposerClient: Resource<ClientOutput<"composer">, [
  {
    threadIdRef: {
      current: string;
    };
    messageIdRef?: {
      current: string;
    };
    runtime: ComposerRuntime;
  }
]>;

type ComposerClientSchema = {
  methods: ComposerMethods;
  meta: ComposerMeta;
  events: ComposerEvents;
};

type ComposerEvents = {
  "composer.send": {
    threadId: string;
    messageId?: string;
  };
  "composer.attachmentAdd": {
    threadId: string;
    messageId?: string;
  };
  "composer.attachmentAddError": {
    threadId: string;
    messageId?: string;
    attachmentId?: string;
    reason: AttachmentAddErrorReason;
    message: string;
  };
};

type ComposerIfFilters = {
  editing: boolean | undefined;
  dictation: boolean | undefined;
};

type ComposerMeta = {
  source: "message" | "thread";
  query: Record<string, never>;
};

type ComposerMethods = {
  getState(): ComposerState;
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: {
    index: number;
  } | {
    id: string;
  }): AttachmentMethods;
  reset(): Promise<void>;
  send(opts?: ComposerSendOptions): void;
  cancel(): void;
  beginEdit(): void;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  queueItem(selector: {
    index: number;
  } | {
    id: string;
  }): QueueItemMethods;
  __internal_getRuntime?(): ComposerRuntime;
};

declare namespace ComposerPrimitiveAttachmentByIndex {
  type Props = {
    index: number;
    components?: ComposerAttachmentsComponentConfig;
  };
}

declare const ComposerPrimitiveAttachmentByIndex: FC<ComposerPrimitiveAttachmentByIndex.Props>;

declare namespace ComposerPrimitiveAttachments {
  type Props = {
    components: ComposerAttachmentsComponentConfig;
    children?: never;
  } | {
    children: (value: {
      attachment: Attachment;
    }) => ReactNode;
    components?: never;
  };
}

declare const ComposerPrimitiveAttachments: FC<ComposerPrimitiveAttachments.Props>;

declare namespace ComposerPrimitiveIf {
  type Props = PropsWithChildren<UseComposerIfProps>;
}

declare const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props>;

declare namespace ComposerPrimitiveQueue {
  type Props = {
    children: (value: {
      queueItem: QueueItemState;
    }) => ReactNode;
  };
}

declare const ComposerPrimitiveQueue: import("react").NamedExoticComponent<{
  children: (value: {
    queueItem: QueueItemState;
  }) => ReactNode;
}>;

type ComposerRuntime = {
  readonly path: ComposerRuntimePath;
  readonly type: "edit" | "thread";
  getState(): ComposerState$1;
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

type ComposerRuntimeCore = Readonly<{
  isEditing: boolean;
  canCancel: boolean;
  canSend: boolean;
  isEmpty: boolean;
  attachments: readonly Attachment[];
  attachmentAccept: string;
  addAttachment: (fileOrAttachment: File | CreateAttachment) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;
  text: string;
  setText: (value: string) => void;
  role: MessageRole;
  setRole: (role: MessageRole) => void;
  runConfig: RunConfig;
  setRunConfig: (runConfig: RunConfig) => void;
  quote: QuoteInfo | undefined;
  setQuote: (quote: QuoteInfo | undefined) => void;
  reset: () => Promise<void>;
  clearAttachments: () => Promise<void>;
  send: (options?: SendOptions) => void;
  cancel: () => void;
  queue: readonly QueueItemState[];
  moveQueueItem: (queueItemId: string, placement: QueuePlacement) => void;
  removeQueueItem: (queueItemId: string) => void;
  dictation: DictationState | undefined;
  startDictation: () => void;
  stopDictation: () => void;
  subscribe: (callback: () => void) => Unsubscribe$1;
  unstable_on: <E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>) => Unsubscribe$1;
}>;

type ComposerRuntimeCoreBinding = SubscribableWithState<ComposerRuntimeCore | undefined, ComposerRuntimePath>;

type ComposerRuntimeEventCallback<E extends ComposerRuntimeEventType> = (payload: ComposerRuntimeEventPayload[E]) => void;

type ComposerRuntimeEventPayload = {
  send: Record<string, never>;
  attachmentAdd: Record<string, never>;
  attachmentAddError: AttachmentAddErrorEvent;
};

type ComposerRuntimeEventType = keyof ComposerRuntimeEventPayload;

declare abstract class ComposerRuntimeImpl implements ComposerRuntime {
  #private;
  get path(): ComposerRuntimePath;
  abstract get type(): "edit" | "thread";
  protected _core: ComposerRuntimeCoreBinding;
  constructor(_core: ComposerRuntimeCoreBinding);
  protected __internal_bindMethods(): void;
  abstract getState(): ComposerState$1;
  setText(text: string): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  reset(): Promise<void>;
  clearAttachments(): Promise<void>;
  send(options?: SendOptions): void;
  cancel(): void;
  steerQueueItem(queueItemId: string): void;
  moveQueueItem(queueItemId: string, placement: QueuePlacement): void;
  removeQueueItem(queueItemId: string): void;
  setRole(role: MessageRole): void;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  subscribe(callback: () => void): Unsubscribe$1;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe$1;
  abstract getAttachmentByIndex(idx: number): AttachmentRuntime;
}

type ComposerRuntimePath = (ThreadRuntimePath & {
  readonly composerSource: "thread";
}) | (MessageRuntimePath & {
  readonly composerSource: "edit";
});

type ComposerSendOptions = SendOptions & {
  steer?: boolean;
};

type ComposerState = {
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly isEditing: boolean;
  readonly canCancel: boolean;
  readonly canSend: boolean;
  readonly attachmentAccept: string;
  readonly isEmpty: boolean;
  readonly type: "edit" | "thread";
  readonly dictation: DictationState | undefined;
  readonly quote: QuoteInfo | undefined;
  readonly queue: readonly QueueItemState[];
};

type ComposerState$1 = ThreadComposerState | EditComposerState;

declare class CompositeAttachmentAdapter implements AttachmentAdapter {
  #private;
  accept: string;
  constructor(adapters: AttachmentAdapter[]);
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void, any>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
  remove(attachment: Attachment): Promise<void>;
}

declare class CompositeContextProvider implements ModelContextProvider {
  #private;
  getModelContext(): ModelContext$1;
  registerModelContextProvider(provider: ModelContextProvider): () => void;
  notifySubscribers(): void;
  subscribe(callback: () => void): () => void;
}

type ConverterCallback<TIn> = (cache: ThreadMessage | undefined, message: TIn, idx: number) => ThreadMessage;

type CoreChatModelRunResult = Omit<ChatModelRunResult, "content"> & {
  readonly content: readonly (TextMessagePart | ReasoningMessagePart | ToolCallMessagePart | SourceMessagePart | FileMessagePart)[];
};

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

type CreateSuggestionAdapterOptions = {
  complete: (options: {
    prompt: string;
    signal?: AbortSignal;
  }) => Promise<readonly string[]>;
  count?: number | undefined;
  instructions?: string | undefined;
  maxMessages?: number | undefined;
};

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
};

type DataMessagePartComponent<T = any> = ComponentType<DataMessagePartProps<T>>;

type DataMessagePartProps<T = any> = MessagePartState & DataMessagePart<T>;

type DataPrefixedPart = {
  readonly type: `data-${string}`;
  readonly data: any;
};

declare const DataRenderers: Resource<ClientOutput<"dataRenderers">, [
]>;

type DataRenderersClientSchema = {
  methods: DataRenderersMethods;
};

type DataRenderersMethods = {
  getState(): DataRenderersState;
  setDataUI(name: string, render: DataMessagePartComponent): Unsubscribe$1;
  setFallbackDataUI(render: DataMessagePartComponent): Unsubscribe$1;
};

type DataRenderersState = {
  renderers: Record<string, DataMessagePartComponent[]>;
  fallbacks: DataMessagePartComponent[];
};

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

declare class DefaultEditComposerRuntimeCore extends BaseComposerRuntimeCore {
  #private;
  get canCancel(): boolean;
  get canSend(): boolean;
  protected getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected getDictationAdapter(): DictationAdapter | undefined;
  constructor(runtime: ThreadRuntimeCore & {
    adapters?: {
      attachments?: AttachmentAdapter | undefined;
      dictation?: DictationAdapter | undefined;
    } | undefined;
  }, endEditCallback: () => void, _param3: {
    parentId: string | null;
    message: ThreadMessage;
  });
  get parentId(): string | null;
  get sourceId(): string | null;
  handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">, options?: SendOptions): Promise<void>;
  handleCancel(): void;
}

declare class DefaultThreadComposerRuntimeCore extends BaseComposerRuntimeCore implements ThreadComposerRuntimeCore {
  #private;
  get canCancel(): boolean;
  get canSend(): boolean;
  get queue(): readonly QueueItemState[];
  moveQueueItem(queueItemId: string, placement: QueuePlacement): void;
  removeQueueItem(queueItemId: string): void;
  protected getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected getDictationAdapter(): DictationAdapter | undefined;
  constructor(runtime: Omit<ThreadRuntimeCore, "composer"> & {
    adapters?: {
      attachments?: AttachmentAdapter | undefined;
      dictation?: DictationAdapter | undefined;
    } | undefined;
  });
  connect(): Unsubscribe$1;
  handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">, options?: SendOptions): Promise<void>;
  handleCancel(): Promise<void>;
}

type DerivedElement<K extends ClientNames> = ResourceElement<DerivedInstance<K>>;

type DerivedInstance<K extends ClientNames> = ReturnType<AssistantClientAccessor<K>>;

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

declare const EMPTY_THREAD_CORE: ThreadRuntimeCore;

declare class EditComposerAttachmentRuntimeImpl extends ComposerAttachmentRuntime<"edit-composer"> {
  get source(): "edit-composer";
}

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

type EditComposerRuntimeCore = ComposerRuntimeCore & Readonly<{
  parentId: string | null;
  sourceId: string | null;
}>;

type EditComposerRuntimeCoreBinding = SubscribableWithState<EditComposerRuntimeCore | undefined, ComposerRuntimePath & {
  composerSource: "edit";
}>;

declare class EditComposerRuntimeImpl extends ComposerRuntimeImpl implements EditComposerRuntime {
  #private;
  get path(): ComposerRuntimePath & {
    composerSource: "edit";
  };
  get type(): "edit";
  constructor(core: EditComposerRuntimeCoreBinding, _beginEdit: () => void);
  __internal_bindMethods(): void;
  getState(): EditComposerState;
  beginEdit(): void;
  getAttachmentByIndex(idx: number): EditComposerAttachmentRuntimeImpl;
}

type EditComposerState = BaseComposerState & {
  readonly type: "edit";
  readonly parentId: string | null;
  readonly sourceId: string | null;
};

type EmptyMessagePartComponent = ComponentType<EmptyMessagePartProps>;

type EmptyMessagePartProps = {
  status: MessagePartStatus;
};

type EnrichedPartState = (Extract<PartState, {
  type: "tool-call";
}> & {
  readonly toolUI: ReactNode;
  addResult: ToolCallMessagePartProps["addResult"];
  resume: ToolCallMessagePartProps["resume"];
  respondToApproval: ToolCallMessagePartProps["respondToApproval"];
}) | (Extract<PartState, {
  type: "data";
}> & {
  readonly dataRendererUI: ReactNode;
}) | Exclude<PartState, {
  type: "tool-call";
} | {
  type: "data";
}>;

type ErrorDisplay = "dev-only" | "inline" | "silent" | "toast";

type ErrorSeverity = "critical" | "info" | "warning";

type EventListener<T> = (payload: T) => unknown;

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type EventSubscribable<TEvent extends string> = {
  event: TEvent;
  binding: SubscribableWithState<{
    unstable_on: (event: TEvent, callback: (payload?: unknown) => void) => Unsubscribe$1;
  } | undefined, unknown>;
};

declare class EventSubscriptionSubject<TEvent extends string> extends BaseSubject {
  #private;
  constructor(config: EventSubscribable<TEvent>);
  getState(): {
    unstable_on: (event: TEvent, callback: (payload?: unknown) => void) => Unsubscribe$1;
  } | undefined;
  outerSubscribe(callback: () => void): Unsubscribe$1;
  protected _connect(): Unsubscribe$1;
}

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

type ExternalMessageConverterCallback<T> = (message: T, metadata: ExternalMessageConverterMetadata) => ExternalMessageConverterMessage | ExternalMessageConverterMessage[];

type ExternalMessageConverterMessage = (ThreadMessageLike & {
  readonly convertConfig?: {
    readonly joinStrategy?: JoinStrategy;
  };
}) | {
  role: "tool";
  toolCallId: string;
  toolName?: string | undefined;
  result: any;
  artifact?: any;
  isError?: boolean;
  messages?: readonly ThreadMessage[];
};

type ExternalMessageConverterMetadata = {
  readonly toolStatuses?: Record<string, ToolExecutionStatus>;
  readonly error?: ReadonlyJSONValue;
  readonly cancelledMessageIds?: ReadonlySet<string>;
  readonly messageTiming?: Record<string, MessageTiming>;
};

type ExternalStoreAdapter<T = ThreadMessage> = ExternalStoreAdapterBase<T> & (T extends ThreadMessage ? object : ExternalStoreMessageConverterAdapter<T>);

type ExternalStoreAdapterBase<T> = {
  isDisabled?: boolean | undefined;
  isSendDisabled?: boolean | undefined;
  isRunning?: boolean | undefined;
  isLoading?: boolean | undefined;
  messages?: readonly T[];
  messageRepository?: ExportedMessageRepository;
  unstable_messageRepositoryInstance?: MessageRepository | undefined;
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
  unstable_isClientToolCall?: ((toolCall: ToolCallMessagePart) => boolean) | undefined;
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

declare class ExternalStoreRuntimeCore extends BaseAssistantRuntimeCore {
  readonly threads: ExternalStoreThreadListRuntimeCore;
  constructor(adapter: ExternalStoreAdapter<any>);
  setAdapter(adapter: ExternalStoreAdapter<any>): void;
}

type ExternalStoreSharedOptions = Pick<ExternalStoreAdapter, "isDisabled" | "isSendDisabled" | "suggestions" | "unstable_capabilities">;

type ExternalStoreThreadData<TState extends "archived" | "regular"> = {
  status: TState;
  id: string;
  remoteId?: string | undefined;
  externalId?: string | undefined;
  title?: string | undefined;
  custom?: Record<string, unknown> | undefined;
};

type ExternalStoreThreadFactory = () => ExternalStoreThreadRuntimeCore;

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

declare class ExternalStoreThreadListRuntimeCore extends BaseSubscribable implements ThreadListRuntimeCore {
  #private;
  get isLoading(): boolean;
  get newThreadId(): undefined;
  get threadIds(): readonly string[];
  get archivedThreadIds(): readonly string[];
  get threadItems(): Readonly<Record<string, ThreadListItemCoreState>>;
  getLoadThreadsPromise(): Promise<void>;
  get mainThreadId(): string;
  constructor(adapter: ExternalStoreThreadListAdapter | undefined, threadFactory: ExternalStoreThreadFactory);
  getMainThreadRuntimeCore(): ExternalStoreThreadRuntimeCore;
  getThreadRuntimeCore(): never;
  getItemById(threadId: string): ThreadListItemCoreState | undefined;
  __internal_setAdapter(adapter: ExternalStoreThreadListAdapter, initialLoad?: boolean): void;
  reloadMainThread(): Promise<void>;
  switchToThread(threadId: string, _options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  rename(threadId: string, newTitle: string): Promise<void>;
  updateCustom(threadId: string, custom: Record<string, unknown> | undefined): Promise<void>;
  detach(): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;
  initialize(threadId: string): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(): never;
}

declare class ExternalStoreThreadRuntimeCore extends BaseThreadRuntimeCore implements ThreadRuntimeCore {
  #private;
  get capabilities(): RuntimeCapabilities;
  isDisabled: boolean;
  isSendDisabled: boolean;
  get isLoading(): boolean;
  get isRunning(): boolean | undefined;
  protected _getBaseMessages(): readonly ThreadMessage[];
  get state(): string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray | null;
  get adapters(): {
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    voice?: RealtimeVoiceAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    threadList?: ExternalStoreThreadListAdapter | undefined;
  } | undefined;
  get unstable_refetchThread(): (() => Promise<void>) | undefined;
  suggestions: readonly ThreadSuggestion[];
  extras: unknown;
  __internal_setGetInitializePromise(getPromise: () => Promise<unknown> | undefined): void;
  beginEdit(messageId: string): void;
  constructor(contextProvider: ModelContextProvider, store: ExternalStoreAdapter<any>);
  __internal_setAdapter(store: ExternalStoreAdapter<any>): void;
  switchToBranch(branchId: string): void;
  append(rawMessage: AppendMessage): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  getQueueItems(): readonly QueueItemState[];
  getSteerQueueItems(): readonly QueueItemState[];
  moveQueueItem(queueItemId: string, placement: QueuePlacement): void;
  removeQueueItem(queueItemId: string): void;
  startRun(config: StartRunConfig): Promise<void>;
  resumeRun(config: ResumeRunConfig): Promise<void>;
  exportExternalState(): any;
  importExternalState(state: any): void;
  unstable_notifySessionReset(): void;
  cancelRun(): void;
  addToolResult(options: AddToolResultOptions): void;
  resumeToolCall(options: ResumeToolCallOptions): void;
  respondToToolApproval(options: RespondToToolApprovalOptions): Promise<void>;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  import(data: ExportedMessageRepository): void;
}

declare const ExternalThread: Resource<ClientOutput<"thread">, [
  ExternalThreadProps
]>;

type ExternalThreadBranchAdapter = {
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;
};

type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  isLoading?: boolean | undefined;
  state?: ReadonlyJSONValue | undefined;
  extras?: unknown;
  isSendDisabled?: boolean;
  onNew?: (message: AppendMessage) => void;
  onEdit?: (message: AppendMessage) => void;
  onReload?: (parentId: string | null) => void;
  onStartRun?: () => void;
  onCancel?: () => void;
  onResume?: (() => void) | undefined;
  onRefetchThread?: (() => Promise<void>) | undefined;
  onAddToolResult?: ((options: AddToolResultOptions) => void) | undefined;
  onResumeToolCall?: ((options: ResumeToolCallOptions) => void) | undefined;
  onLoadExternalState?: ((state: unknown) => void) | undefined;
  attachmentAdapter?: AttachmentAdapter | undefined;
  feedbackAdapter?: FeedbackAdapter | undefined;
  speechAdapter?: SpeechSynthesisAdapter | undefined;
  queue?: ExternalThreadQueueAdapter;
  branches?: ExternalThreadBranchAdapter;
  onRespondToToolApproval?: (options: RespondToToolApprovalOptions) => void | Promise<void>;
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

declare const FRAME_MESSAGE_CHANNEL = "assistant-ui-frame";

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

type FileMessagePartComponent = ComponentType<FileMessagePartProps>;

type FileMessagePartProps = MessagePartState & FileMessagePart;

type FilePartSource = {
  kind: "url";
  url: string;
} | {
  kind: "data";
  data: string;
  mimeType: string;
};

type FrameMessage = {
  type: "model-context-request";
} | {
  type: "model-context-update";
  context: SerializedModelContext;
} | {
  type: "tool-call";
  id: string;
  toolName: string;
  args: unknown;
} | {
  type: "tool-cancel";
  id: string;
} | {
  type: "tool-result";
  id: string;
  result?: unknown;
  error?: string;
};

type FrameMessageType = "model-context-request" | "model-context-update" | "tool-call" | "tool-cancel" | "tool-result";

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

type GeneratePresignedUploadUrlRequestBody = {
  filename: string;
};

type GeneratePresignedUploadUrlResponse = {
  success: boolean;
  signedUrl: string;
  expiresAt: string;
  publicUrl: string;
};

type GenerativeUIComponentRegistry = Record<string, ComponentType<any>>;

type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  readonly spec: GenerativeUISpec;
  readonly id?: string;
  readonly parentId?: string;
};

type GenerativeUIMessagePartComponent = ComponentType<GenerativeUIMessagePartProps>;

type GenerativeUIMessagePartProps = MessagePartState & GenerativeUIMessagePart;

type GenerativeUINode = string | {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly GenerativeUINode[];
  readonly key?: string;
};

declare const GenerativeUIRender: FC<GenerativeUIRenderProps>;

declare class GenerativeUIRenderError extends Error {
  readonly componentName: string;
  constructor(componentName: string, message?: string);
}

type GenerativeUIRenderProps = {
  spec: GenerativeUISpec;
  components: GenerativeUIComponentRegistry;
  Fallback?: ComponentType<{
    component: string;
    props?: unknown;
  }> | undefined;
};

type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

type GenericThreadHistoryAdapter<TMessage> = {
  load(): Promise<MessageFormatRepository<TMessage>>;
  pin?(): void;
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

type GroupByContext = {
  readonly toolUIs?: ToolsState["toolUIs"];
};

type GroupPartType = PartState["type"] | "standalone-tool-call";

type HeadersValue = Record<string, string> | Headers;

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

type ImageMessagePartComponent = ComponentType<ImageMessagePartProps>;

type ImageMessagePartProps = MessagePartState & ImageMessagePart;

type ImagePart = {
  readonly type: "image";
  readonly image: string;
};

declare const InMemoryThreadList: Resource<ClientOutput<"threads">, [
  props: InMemoryThreadListProps
]>;

declare class InMemoryThreadListAdapter implements RemoteThreadListAdapter {
  list(): Promise<RemoteThreadListResponse>;
  rename(): Promise<void>;
  updateCustom(): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(): Promise<AssistantStream>;
  fetch(threadId: string): Promise<RemoteThreadMetadata>;
}

type InMemoryThreadListProps = {
  thread: (threadId: string) => ResourceElement<ClientOutput<"thread">>;
  onSwitchToThread?: (threadId: string) => void;
  onSwitchToNewThread?: () => void;
  onDelete?: (threadId: string) => void;
};

declare abstract class InertThreadRuntimeCore extends BaseSubscribable implements ThreadRuntimeCore {
  protected abstract get error(): Error;
  abstract readonly messages: readonly ThreadMessage[];
  abstract readonly isLoading: boolean;
  abstract readonly composer: ThreadRuntimeCore["composer"];
  abstract getMessageById(messageId: string): {
    parentId: string | null;
    message: ThreadMessage;
    index: number;
  } | undefined;
  abstract getBranches(messageId: string): readonly string[];
  abstract export(): ExportedMessageRepository;
  switchToBranch(): void;
  append(): void;
  deleteMessage(): void;
  startRun(): void;
  resumeRun(): void;
  cancelRun(): void;
  unstable_notifySessionReset(): void;
  addToolResult(): void;
  resumeToolCall(): void;
  respondToToolApproval(): Promise<void>;
  speak(): void;
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  muteVoice(): void;
  unmuteVoice(): void;
  submitFeedback(): void;
  exportExternalState(): void;
  importExternalState(): void;
  beginEdit(): void;
  import(): void;
  reset(): void;
  getModelContext(): {};
  getEditComposer(): undefined;
  getVoiceVolume: () => number;
  subscribeVoiceVolume: () => Unsubscribe$1;
  speech: undefined;
  voice: undefined;
  capabilities: {
    readonly switchToBranch: false;
    readonly switchBranchDuringRun: false;
    readonly edit: false;
    readonly delete: false;
    readonly reload: false;
    readonly refetchThread: false;
    readonly cancel: false;
    readonly unstable_copy: false;
    readonly speech: false;
    readonly dictation: false;
    readonly voice: false;
    readonly attachments: false;
    readonly feedback: false;
    readonly queue: false;
  };
  isDisabled: boolean;
  isSendDisabled: boolean;
  state: null;
  suggestions: never[];
  extras: undefined;
  unstable_on(): Unsubscribe$1;
}

type InteractableDefinition = {
  id: string;
  name: string;
  description: string;
  stateSchema: InteractableStateSchema;
  state: unknown;
  selected?: boolean | undefined;
};

type InteractablePersistedState = Record<string, {
  name: string;
  state: unknown;
}>;

type InteractablePersistenceAdapter = {
  save(state: InteractablePersistedState): void | Promise<void>;
};

type InteractablePersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

type InteractableRegistration = {
  id: string;
  name: string;
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: unknown;
  selected?: boolean | undefined;
};

type InteractableScope = "app" | "thread";

type InteractableStateSchema = NonNullable<Extract<Tool, {
  parameters: unknown;
}>["parameters"]>;

declare const Interactables: Resource<ClientOutput<"interactables">, [
]>;

type InteractablesClientSchema = {
  methods: InteractablesMethods;
};

type InteractablesMethods = {
  getState(): InteractablesState;
  register(def: InteractableRegistration): Unsubscribe$1;
  setState(id: string, updater: (prev: unknown) => unknown): void;
  setSelected(id: string, selected: boolean): void;
  exportState(): InteractablePersistedState;
  importState(saved: InteractablePersistedState): void;
  setPersistenceAdapter(adapter: InteractablePersistenceAdapter | undefined): void;
  flush(): Promise<void>;
};

type InteractablesState = {
  definitions: Record<string, InteractableDefinition>;
  persistence: Record<string, InteractablePersistenceStatus>;
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

type JoinStrategy = "concat-content" | "none";

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

declare class LazyMemoizeSubject<TState extends object, TPath> extends BaseSubject implements SubscribableWithState<TState, TPath> {
  #private;
  get path(): TPath;
  constructor(binding: SubscribableWithState<TState | SKIP_UPDATE, TPath>);
  getState: () => TState;
  protected _connect(): Unsubscribe$1;
}

declare class LocalRuntimeCore extends BaseAssistantRuntimeCore {
  #private;
  readonly threads: LocalThreadListRuntimeCore;
  readonly Provider: undefined;
  constructor(options: LocalRuntimeOptionsBase, initialMessages: readonly ThreadMessageLike[] | undefined);
}

type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

type LocalRuntimeOptionsBase = {
  maxSteps?: number | undefined;
  adapters: {
    chatModel: ChatModelAdapter;
    history?: ThreadHistoryAdapter | undefined;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    voice?: RealtimeVoiceAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    suggestion?: SuggestionAdapter | undefined;
  };
  unstable_humanToolNames?: string[] | undefined;
  unstable_enableMessageQueue?: boolean | undefined;
  unstable_queueClearOnRewind?: boolean | undefined;
  unstable_queueClearOnCancel?: boolean | undefined;
};

type LocalStorageAdapterOptions = {
  storage: AsyncStorageLike;
  prefix?: string | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
};

type LocalThreadFactory = () => LocalThreadRuntimeCore;

declare class LocalThreadListRuntimeCore extends BaseSubscribable implements ThreadListRuntimeCore {
  #private;
  constructor(_threadFactory: LocalThreadFactory);
  get isLoading(): boolean;
  getMainThreadRuntimeCore(): LocalThreadRuntimeCore;
  get newThreadId(): string | undefined;
  get threadIds(): readonly string[];
  get archivedThreadIds(): readonly string[];
  get mainThreadId(): string;
  get threadItems(): Readonly<{
    __DEFAULT_ID__: {
      id: string;
      remoteId: undefined;
      externalId: undefined;
      status: "regular";
      title: undefined;
    };
  }>;
  getThreadRuntimeCore(): never;
  getLoadThreadsPromise(): Promise<void>;
  getItemById(threadId: string): {
    status: "regular";
    id: string;
    remoteId: string;
    externalId: undefined;
    title: undefined;
    isMain: boolean;
  };
  switchToThread(): Promise<void>;
  switchToNewThread(): Promise<void>;
  rename(): Promise<void>;
  archive(): Promise<void>;
  detach(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  initialize(threadId: string): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(): never;
}

declare class LocalThreadRuntimeCore extends BaseThreadRuntimeCore implements ThreadRuntimeCore {
  #private;
  readonly capabilities: {
    switchToBranch: boolean;
    switchBranchDuringRun: boolean;
    edit: boolean;
    delete: boolean;
    reload: boolean;
    refetchThread: boolean;
    cancel: boolean;
    unstable_copy: boolean;
    speech: boolean;
    dictation: boolean;
    voice: boolean;
    attachments: boolean;
    feedback: boolean;
    queue: boolean;
  };
  readonly isDisabled = false;
  readonly isSendDisabled = false;
  get isLoading(): boolean;
  get suggestions(): readonly ThreadSuggestion[];
  get adapters(): {
    chatModel: ChatModelAdapter;
    history?: ThreadHistoryAdapter | undefined;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    voice?: RealtimeVoiceAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    suggestion?: SuggestionAdapter | undefined;
  };
  constructor(contextProvider: ModelContextProvider, options: LocalRuntimeOptionsBase);
  __internal_setGetThreadId(getThreadId: () => string | undefined): void;
  __internal_setGetInitializePromise(getPromise: () => Promise<unknown> | undefined): void;
  get extras(): undefined;
  __internal_setOptions(options: LocalRuntimeOptionsBase): void;
  __internal_load(): Promise<void>;
  append(message: AppendMessage): Promise<void>;
  getQueueItems(): readonly QueueItemState[];
  getSteerQueueItems(): readonly QueueItemState[];
  moveQueueItem(queueItemId: string, placement: QueuePlacement): void;
  removeQueueItem(queueItemId: string): void;
  deleteMessage(messageId: string): Promise<void>;
  resumeRun(_param4: ResumeRunConfig): Promise<void>;
  exportExternalState(): any;
  import(data: ExportedMessageRepository): void;
  importExternalState(): void;
  unstable_notifySessionReset(): void;
  startRun(_param5: StartRunConfig, runCallback?: ChatModelAdapter["run"]): Promise<void>;
  detach(): void;
  cancelRun(): void;
  addToolResult(_param6: AddToolResultOptions): void;
  resumeToolCall(_options: ResumeToolCallOptions): void;
  respondToToolApproval(_param7: RespondToToolApprovalOptions): Promise<void>;
}

declare const MCP_APP_URI_SCHEME = "ui://";

declare const MESSAGE_NOT_SENT: unique symbol;

type MakeRequestOptions = {
  method?: "POST" | "PUT" | "DELETE" | undefined;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: object | undefined;
};

type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("app" | "model")[];
  readonly serverId?: string;
};

type McpAppResourceOutput = {
  readonly render: ToolCallMessagePartComponent;
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

type McpToolkitDefinition = Record<string, McpToolkitEntry>;

type McpToolkitEntry = McpServerConfig | {
  server: McpServerConfig;
  disabled?: boolean | undefined;
  prefix?: string | undefined;
  tools?: Record<string, McpToolkitToolConfig> | undefined;
};

type McpToolkitToolConfig = {
  disabled?: boolean | undefined;
};

declare const MessageAttachmentByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare class MessageAttachmentRuntimeImpl extends AttachmentRuntimeImpl<"message"> {
  get source(): "message";
  remove(): never;
}

type MessageAttachmentState = CompleteAttachment & {
  readonly source: "message";
};

type MessageAttachmentsComponentConfig = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

declare const MessageByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const MessageClient: Resource<ClientOutput<"message">, [
  {
    runtime: MessageRuntime;
    threadIdRef: {
      current: string;
    };
  }
]>;

type MessageClientSchema = {
  methods: MessageMethods;
  meta: MessageMeta;
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

type MessageMeta = {
  source: "thread";
  query: {
    type: "id";
    id: string;
  } | {
    type: "index";
    index: number;
  };
};

type MessageMethods = {
  getState(): MessageState;
  composer(): ComposerMethods;
  delete(): void | Promise<void>;
  reload(config?: {
    runConfig?: RunConfig;
  }): void;
  speak(): void;
  stopSpeaking(): void;
  submitFeedback(feedback: {
    type: "negative" | "positive";
  }): void;
  switchToBranch(options: {
    position?: "next" | "previous";
    branchId?: string;
  }): void;
  getCopyText(): string;
  part(selector: {
    index: number;
  } | {
    toolCallId: string;
  }): PartMethods;
  attachment(selector: {
    index: number;
  } | {
    id: string;
  }): AttachmentMethods;
  setIsCopied(value: boolean): void;
  setIsHovering(value: boolean): void;
  __internal_getRuntime?(): MessageRuntime;
};

declare class MessageNotSentError extends Error {
  readonly [MESSAGE_NOT_SENT] = true;
  constructor(message?: string);
}

declare const MessagePartClient: Resource<ClientOutput<"part">, [
  {
    runtime: MessagePartRuntime;
  }
]>;

declare const MessagePartComponent: FC<MessagePartComponentProps>;

type MessagePartComponentProps = {
  components: MessagePrimitiveParts.Props["components"];
};

declare namespace MessagePartPrimitiveInProgress {
  type Props = PropsWithChildren;
}

declare const MessagePartPrimitiveInProgress: FC<MessagePartPrimitiveInProgress.Props>;

type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): Promise<void>;
  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe$1;
};

declare class MessagePartRuntimeImpl implements MessagePartRuntime {
  #private;
  get path(): MessagePartRuntimePath;
  constructor(contentBinding: MessagePartSnapshotBinding, messageApi?: MessageStateBinding, threadApi?: ThreadRuntimeCoreBinding);
  protected __internal_bindMethods(): void;
  getState(): MessagePartState;
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): Promise<void>;
  subscribe(callback: () => void): Unsubscribe$1;
}

type MessagePartRuntimePath = MessageRuntimePath & {
  readonly messagePartSelector: {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "toolCallId";
    readonly toolCallId: string;
  };
};

type MessagePartSnapshotBinding = SubscribableWithState<MessagePartState, MessagePartRuntimePath>;

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

declare namespace MessagePrimitiveAttachmentByIndex {
  type Props = {
    index: number;
    components?: MessageAttachmentsComponentConfig;
  };
}

declare const MessagePrimitiveAttachmentByIndex: FC<MessagePrimitiveAttachmentByIndex.Props>;

declare namespace MessagePrimitiveAttachments {
  type Props = {
    components: MessageAttachmentsComponentConfig;
    children?: never;
  } | {
    children: (value: {
      attachment: CompleteAttachment;
    }) => ReactNode;
    components?: never;
  };
}

declare const MessagePrimitiveAttachments: FC<MessagePrimitiveAttachments.Props>;

declare namespace MessagePrimitiveGenerativeUI {
  type Props = {
    components: GenerativeUIComponentRegistry;
    spec?: GenerativeUISpec | undefined;
    Fallback?: ComponentType<{
      component: string;
      props?: unknown;
    }> | undefined;
  };
}

declare const MessagePrimitiveGenerativeUI: FC<MessagePrimitiveGenerativeUI.Props>;

declare namespace MessagePrimitiveGroupedParts {
  type GroupPart<TKey extends `group-${string}` = `group-${string}`> = {
    readonly type: TKey;
    readonly status: MessagePartStatus | ToolCallMessagePartStatus;
    readonly indices: readonly number[];
  };
  type IndicatorPart = {
    readonly type: "indicator";
  };
  type IndicatorMode = "always" | "empty" | "never" | "no-text";
  type RenderInfo<TKey extends `group-${string}` = `group-${string}`> = {
    readonly part: GroupPart<TKey> | EnrichedPartState | IndicatorPart;
    readonly children: ReactNode;
  };
  type Props<TKey extends `group-${string}` = `group-${string}`> = {
    readonly groupBy: (part: PartState, context: GroupByContext) => readonly TKey[] | null;
    readonly indicator?: IndicatorMode;
    readonly children: (info: RenderInfo<TKey>) => ReactNode;
  };
}

declare const MessagePrimitiveGroupedParts: {
  <TKey extends `group-${string}`>(_param8: MessagePrimitiveGroupedParts.Props<TKey>): ReactNode;
  displayName: string;
};

declare namespace MessagePrimitivePartByIndex {
  type Props = {
    index: number;
    components: MessagePrimitiveParts.Props["components"];
  };
}

declare const MessagePrimitivePartByIndex: FC<MessagePrimitivePartByIndex.Props>;

declare namespace MessagePrimitiveParts {
  type DataConfig = {
    by_name?: Record<string, DataMessagePartComponent | undefined> | undefined;
    Fallback?: DataMessagePartComponent | undefined;
  };
  type BaseComponents = {
    Empty?: EmptyMessagePartComponent | undefined;
    Text?: TextMessagePartComponent | undefined;
    Source?: SourceMessagePartComponent | undefined;
    Image?: ImageMessagePartComponent | undefined;
    File?: FileMessagePartComponent | undefined;
    Unstable_Audio?: Unstable_AudioMessagePartComponent | undefined;
    data?: DataConfig | undefined;
    Quote?: QuoteMessagePartComponent | undefined;
    generativeUI?: {
      components: GenerativeUIComponentRegistry;
      Fallback?: ComponentType<{
        component: string;
        props?: unknown;
      }> | undefined;
    } | undefined;
  };
  type ToolsConfig = {
    by_name?: Record<string, ToolCallMessagePartComponent | undefined> | undefined;
    Fallback?: ComponentType<ToolCallMessagePartProps> | undefined;
  } | {
    Override: ComponentType<ToolCallMessagePartProps>;
  };
  type StandardComponents = BaseComponents & {
    Reasoning?: ReasoningMessagePartComponent | undefined;
    tools?: ToolsConfig | undefined;
    ToolGroup?: ComponentType<PropsWithChildren<{
      startIndex: number;
      endIndex: number;
    }>>;
    ReasoningGroup?: ReasoningGroupComponent;
    ChainOfThought?: never;
  };
  type ChainOfThoughtComponents = BaseComponents & {
    ChainOfThought: ComponentType;
    Reasoning?: never;
    tools?: never;
    ToolGroup?: never;
    ReasoningGroup?: never;
  };
  export type Props = {
    components?: StandardComponents | ChainOfThoughtComponents | undefined;
    unstable_showEmptyOnNonTextEnd?: boolean | undefined;
    children?: never;
  } | {
    children: (value: {
      part: EnrichedPartState;
    }) => ReactNode;
    components?: never;
    unstable_showEmptyOnNonTextEnd?: never;
  };
  export {};
}

declare const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props>;

declare namespace MessagePrimitiveQuote {
  type Props = {
    children: (value: QuoteInfo) => ReactNode;
  };
}

declare const MessagePrimitiveQuote: import("react").NamedExoticComponent<MessagePrimitiveQuote.Props>;

type MessageQueueController = {
  readonly adapter: ExternalThreadQueueAdapter;
  notifyBusy: () => void;
  notifyIdle: () => void;
  notifyCancelled: () => void;
  clear: () => void;
  subscribe: (callback: () => void) => () => void;
};

type MessageQueueDriver = {
  run: (message: AppendMessage, options: {
    steer: boolean;
  }) => void;
  cancel?: (() => void) | undefined;
};

type MessageQuoteState = {
  message: {
    metadata?: unknown;
  };
};

declare class MessageRepository {
  #private;
  get headId(): string | null;
  get canonicalHeadId(): string | null;
  getMessages(headId?: string): readonly ThreadMessage[];
  addOrUpdateMessage(parentId: string | null, message: ThreadMessage): void;
  getMessage(messageId: string): {
    parentId: string | null;
    message: ThreadMessage;
    index: number;
  };
  deleteMessage(messageId: string, replacementId?: string | null | undefined): void;
  getBranches(messageId: string): string[];
  switchToBranch(messageId: string): void;
  resetHead(messageId: string | null): void;
  clear(): void;
  export(): ExportedMessageRepository;
  import(_param9: ExportedMessageRepository): void;
}

type MessageRepositorySession = ReturnType<typeof createMessageRepositorySession>;

type MessageRepositorySessionOptions = {
  decorateExport?: (exported: ExportedMessageRepository, repository: MessageRepository) => ExportedMessageRepository;
};

type MessageRole = ThreadMessage["role"];

type MessageRuntime = {
  readonly path: MessageRuntimePath;
  readonly composer: EditComposerRuntime;
  getState(): MessageState$1;
  delete(): void | Promise<void>;
  reload(config?: ReloadConfig): void;
  speak(): void;
  stopSpeaking(): void;
  submitFeedback(_param10: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param11: {
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

declare class MessageRuntimeImpl implements MessageRuntime {
  #private;
  get path(): MessageRuntimePath;
  constructor(_core: MessageStateBinding, _threadBinding: ThreadRuntimeCoreBinding);
  protected __internal_bindMethods(): void;
  readonly composer: EditComposerRuntimeImpl;
  getState(): ThreadMessage & {
    readonly parentId: string | null;
    readonly index: number;
    readonly isLast: boolean;
    readonly branchNumber: number;
    readonly branchCount: number;
    readonly speech: SpeechState | undefined;
  };
  delete(): void | Promise<void>;
  reload(reloadConfig?: ReloadConfig): void;
  speak(): void;
  stopSpeaking(): void;
  submitFeedback(_param12: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param13: {
    position?: "previous" | "next" | undefined;
    branchId?: string | undefined;
  }): void;
  unstable_getCopyText(): string;
  subscribe(callback: () => void): Unsubscribe$1;
  getMessagePartByIndex(idx: number): MessagePartRuntimeImpl;
  getMessagePartByToolCallId(toolCallId: string): MessagePartRuntimeImpl;
  getAttachmentByIndex(idx: number): MessageAttachmentRuntimeImpl;
}

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
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
  readonly composer: ComposerState;
  readonly parts: readonly PartState[];
  readonly isCopied: boolean;
  readonly isHovering: boolean;
  readonly index: number;
};

type MessageState$1 = ThreadMessage & {
  readonly parentId: string | null;
  readonly index: number;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
};

type MessageStateBinding = SubscribableWithState<ThreadMessage & {
  readonly parentId: string | null;
  readonly index: number;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
}, MessageRuntimePath>;

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

type MessagesComponentConfig = {
  Message: ComponentType;
  EditComposer?: ComponentType | undefined;
  UserEditComposer?: ComponentType | undefined;
  AssistantEditComposer?: ComponentType | undefined;
  SystemEditComposer?: ComponentType | undefined;
  UserMessage?: ComponentType | undefined;
  AssistantMessage?: ComponentType | undefined;
  SystemMessage?: ComponentType | undefined;
} | {
  Message?: ComponentType | undefined;
  EditComposer?: ComponentType | undefined;
  UserEditComposer?: ComponentType | undefined;
  AssistantEditComposer?: ComponentType | undefined;
  SystemEditComposer?: ComponentType | undefined;
  UserMessage: ComponentType;
  AssistantMessage: ComponentType;
  SystemMessage?: ComponentType | undefined;
};

declare const ModelContext: Resource<ClientOutput<"modelContext">, [
]>;

type ModelContext$1 = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
  unstable_composerMetadata?: Record<string, unknown> | undefined;
};

type ModelContextClientSchema = {
  methods: ModelContextMethods;
};

type ModelContextMethods = ModelContextProvider & {
  getState(): ModelContextState;
  register: (provider: ModelContextProvider) => Unsubscribe$1;
};

type ModelContextProvider = {
  getModelContext: () => ModelContext$1;
  subscribe?: (callback: () => void) => Unsubscribe$1;
};

declare class ModelContextRegistry implements ModelContextProvider {
  #private;
  constructor();
  getModelContext(): ModelContext$1;
  subscribe(callback: () => void): Unsubscribe$1;
  addTool<TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps$1<TArgs, TResult>): ModelContextRegistryToolHandle<TArgs, TResult>;
  addInstruction(config: string | AssistantInstructionsConfig): ModelContextRegistryInstructionHandle;
  addProvider(provider: ModelContextProvider): ModelContextRegistryProviderHandle;
}

interface ModelContextRegistryInstructionHandle {
  update(config: string | AssistantInstructionsConfig): void;
  remove(): void;
}

interface ModelContextRegistryProviderHandle {
  remove(): void;
}

interface ModelContextRegistryToolHandle<TArgs extends Record<string, unknown> = any, TResult = any> {
  update(tool: AssistantToolProps$1<TArgs, TResult>): void;
  remove(): void;
}

type ModelContextState = {
  readonly modelName?: string | undefined;
  readonly toolNames: readonly string[];
};

type NestedSubscribable<TState extends Subscribable | undefined, TPath> = SubscribableWithState<TState, TPath>;

declare class NestedSubscriptionSubject<TState extends Subscribable | undefined, TPath> extends BaseSubject implements SubscribableWithState<TState, TPath>, NestedSubscribable<TState, TPath> {
  #private;
  get path(): TPath;
  constructor(binding: NestedSubscribable<TState, TPath>);
  getState(): TState;
  outerSubscribe(callback: () => void): Unsubscribe$1;
  protected _connect(): Unsubscribe$1;
}

declare const NoOpComposerClient: Resource<ClientOutput<"composer">, [
  {
    type: "edit" | "thread";
  }
]>;

type ObjectKey<T> = keyof T & (string | number);

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

declare class OptimisticState<TState> extends BaseSubscribable {
  #private;
  constructor(initialState: TState);
  get baseValue(): TState;
  get value(): TState;
  update(state: TState): void;
  reset(state: TState): void;
  optimisticUpdate<TResult>(transform: Transform<TState, TResult>): Promise<TResult>;
}

type OverrideOptionalField<T, TKey extends keyof T, TValue> = undefined extends T[TKey] ? Exclude<T[TKey], undefined> extends never ? {
  [K in TKey]?: undefined;
} : {
  [K in TKey]?: TValue | undefined;
} : {
  [K in TKey]: TValue;
};

type OverrideToolDeclarationCallbacks<T extends {
  streamCall?: unknown;
}, TArgs extends Record<string, unknown>, TResult> = Omit<T, "execute" | "experimental_onSchemaValidationError" | "streamCall" | "toModelOutput" | "type"> & {
  type?: never;
} & ("execute" extends keyof T ? OverrideOptionalField<T, "execute", ToolExecute<NoInfer<TArgs>, TResult>> : {}) & ("toModelOutput" extends keyof T ? OverrideOptionalField<T, "toModelOutput", ToolModelOutputFunction<NoInfer<TArgs>, NoInfer<TResult>>> : {}) & ("experimental_onSchemaValidationError" extends keyof T ? OverrideOptionalField<T, "experimental_onSchemaValidationError", (args: unknown, context: ToolExecuteContext) => NoInfer<TResult> | Promise<NoInfer<TResult>>> : {}) & OverrideOptionalField<T, "streamCall", ToolStreamCall<TArgs, unknown>>;

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

declare const PartByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

type PartClientSchema = {
  methods: PartMethods;
  meta: PartMeta;
};

type PartInit = {
  readonly type: "text";
  readonly parentId?: string;
} | {
  readonly type: "reasoning";
  readonly unstable_summary?: string;
  readonly parentId?: string;
} | {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly parentId?: string;
} | {
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly parentId?: string;
} | {
  readonly type: "file";
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
} | {
  readonly type: "data";
  readonly name: string;
  readonly data: ReadonlyJSONValue;
  readonly parentId?: string;
};

type PartMeta = {
  source: "message";
  query: {
    type: "index";
    index: number;
  } | {
    type: "toolCallId";
    toolCallId: string;
  };
} | {
  source: "chainOfThought";
  query: {
    type: "index";
    index: number;
  };
};

type PartMethods = {
  getState(): PartState;
  addToolResult(result: unknown | ToolResponse<unknown>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): Promise<void>;
  __internal_getRuntime?(): MessagePartRuntime;
};

declare namespace PartPrimitiveMessages {
  type Props = {
    components: NonNullable<ThreadPrimitiveMessages.Props["components"]>;
    children?: never;
  } | {
    children: (value: {
      message: ThreadMessage;
    }) => ReactNode;
    components?: never;
  };
}

declare const PartPrimitiveMessages: import("react").NamedExoticComponent<PartPrimitiveMessages.Props>;

declare const PartPrimitiveMessagesImpl: FC<PartPrimitiveMessages.Props>;

type PartProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

type PartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type PdfToImagesRequestBody = {
  file_blob?: string | undefined;
  file_url?: string | undefined;
};

type PdfToImagesResponse = {
  success: boolean;
  urls: string[];
  message: string;
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

type PendingToolCallMessage<TToolCall> = {
  toolCalls: readonly TToolCall[];
} | {
  toolCallId: string;
} | undefined;

type PropFieldStatus = "complete" | "streaming";

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

type ProviderToolConfig<TArgs extends Record<string, unknown> = Record<string, unknown>> = Pick<ProviderToolDefinition<TArgs>, "args" | "parameters" | "providerId" | "providerOptions" | "supportsDeferredResults">;

type ProviderToolDefinition<TArgs extends Record<string, unknown>> = Extract<Tool<TArgs, unknown>, {
  type: "provider";
}>;

declare const QueueItemByIndexProvider: FC<QueueItemByIndexProviderProps>;

type QueueItemByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

type QueueItemClientSchema = {
  methods: QueueItemMethods;
  meta: QueueItemMeta;
};

type QueueItemMeta = {
  source: "composer";
  query: {
    type: "index";
    index: number;
  } | {
    type: "id";
    id: string;
  };
};

type QueueItemMethods = {
  getState(): QueueItemState;
  steer(): void;
  move(placement: QueuePlacement): void;
  remove(): void;
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

type QueuedCommand = AssistantTransportCommand;

type QuoteInfo = {
  readonly text: string;
  readonly messageId: string;
};

type QuoteMessagePartComponent = ComponentType<QuoteMessagePartProps>;

type QuoteMessagePartProps = QuoteInfo;

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

declare namespace ReadonlyThreadProvider {
  type Props = PropsWithChildren<{
    messages: readonly ThreadMessage[];
  }>;
}

declare const ReadonlyThreadProvider: FC<ReadonlyThreadProvider.Props>;

declare class ReadonlyThreadRuntimeCore extends InertThreadRuntimeCore {
  #private;
  protected get error(): Error;
  get messages(): readonly ThreadMessage[];
  setMessages(messages: readonly ThreadMessage[]): void;
  getMessageById(messageId: string): {
    parentId: string | null;
    message: ThreadMessage;
    index: number;
  } | undefined;
  getBranches(messageId: string): string[];
  export(): {
    messages: {
      message: ThreadMessage;
      parentId: string | null;
    }[];
  };
  composer: {
    attachments: never[];
    attachmentAccept: string;
    addAttachment(): Promise<never>;
    removeAttachment(): Promise<never>;
    isEditing: false;
    canCancel: boolean;
    canSend: boolean;
    isEmpty: boolean;
    text: string;
    setText(): never;
    role: "user";
    setRole(): never;
    runConfig: {};
    setRunConfig(): never;
    reset(): Promise<void>;
    clearAttachments(): Promise<void>;
    send(): never;
    cancel(): void;
    queue: never[];
    moveQueueItem(): void;
    removeQueueItem(): void;
    dictation: undefined;
    startDictation(): never;
    stopDictation(): void;
    quote: undefined;
    setQuote(): never;
    subscribe(): () => void;
    unstable_on(): () => void;
  };
  isLoading: boolean;
  cancelRun(): void;
  stopSpeaking(): void;
  disconnectVoice(): void;
}

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

type ReasoningGroupComponent = ComponentType<ReasoningGroupProps>;

type ReasoningGroupProps = PropsWithChildren<{
  startIndex: number;
  endIndex: number;
}>;

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly unstable_summary?: string;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type ReasoningMessagePartComponent = ComponentType<ReasoningMessagePartProps>;

type ReasoningMessagePartProps = MessagePartState & ReasoningMessagePart;

type ReloadConfig = {
  runConfig?: RunConfig;
};

type RemoteThreadData = {
  readonly id: string;
  readonly remoteId: undefined;
  readonly externalId: undefined;
  readonly status: "new";
  readonly title: undefined;
  readonly custom: undefined;
  readonly localOrigin?: true;
} | {
  readonly id: string;
  readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
  readonly remoteId: undefined;
  readonly externalId: undefined;
  readonly status: "archived" | "regular";
  readonly title?: string | undefined;
  readonly custom: undefined;
  readonly localOrigin?: true;
} | {
  readonly id: string;
  readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
  readonly remoteId: string;
  readonly externalId: string | undefined;
  readonly status: "archived" | "regular";
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
  readonly localOrigin?: true;
};

type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId?: string | undefined;
};

declare const RemoteThreadList: Resource<ClientOutput<"threads">, [
  props: RemoteThreadListProps
]>;

type RemoteThreadListAdapter = {
  list(params?: RemoteThreadListPageOptions): Promise<RemoteThreadListResponse>;
  rename(remoteId: string, newTitle: string): Promise<void>;
  updateCustom?(remoteId: string, custom: Record<string, unknown> | undefined): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(remoteId: string, unstable_messages: readonly ThreadMessage[]): Promise<AssistantStream>;
  fetch(threadId: string): Promise<RemoteThreadMetadata>;
  unstable_Provider?: RemoteThreadListProviderComponent | undefined;
  unstable_useAdapters?: (() => RuntimeAdapters | null | undefined) | undefined;
};

type RemoteThreadListHook = () => AssistantRuntime;

declare class RemoteThreadListHookInstanceManager extends BaseSubscribable {
  #private;
  constructor(runtimeHook: RemoteThreadListHook, parent: ThreadListRuntimeCore);
  startThreadRuntime(threadId: string): Promise<Readonly<{
    getMessageById: (messageId: string) => {
      parentId: string | null;
      message: ThreadMessage;
      index: number;
    } | undefined;
    getBranches: (messageId: string) => readonly string[];
    switchToBranch: (branchId: string) => void;
    append: (message: AppendMessage) => void;
    deleteMessage: (messageId: string) => void | Promise<void>;
    startRun: (config: StartRunConfig) => void;
    resumeRun: (config: ResumeRunConfig) => void;
    cancelRun: () => void;
    unstable_notifySessionReset: () => void;
    addToolResult: (options: AddToolResultOptions) => void;
    resumeToolCall: (options: ResumeToolCallOptions) => void;
    respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
    speak: (messageId: string) => void;
    stopSpeaking: () => void;
    connectVoice: () => void;
    disconnectVoice: () => void;
    muteVoice: () => void;
    unmuteVoice: () => void;
    submitFeedback: (feedback: SubmitFeedbackOptions) => void;
    getModelContext: () => ModelContext$1;
    composer: ThreadComposerRuntimeCore;
    getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
    beginEdit: (messageId: string) => void;
    getQueueItems?: () => readonly QueueItemState[];
    getSteerQueueItems?: () => readonly QueueItemState[];
    moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
    removeQueueItem?: (queueItemId: string) => void;
    speech: SpeechState | undefined;
    voice: VoiceSessionState | undefined;
    capabilities: Readonly<RuntimeCapabilities>;
    isDisabled: boolean;
    isSendDisabled: boolean;
    isLoading: boolean;
    isRunning?: boolean | undefined;
    messages: readonly ThreadMessage[];
    state: ReadonlyJSONValue;
    suggestions: readonly ThreadSuggestion[];
    extras: unknown;
    subscribe: (callback: () => void) => Unsubscribe$1;
    getVoiceVolume: () => number;
    subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
    import(repository: ExportedMessageRepository): void;
    export(): ExportedMessageRepository;
    exportExternalState(): any;
    importExternalState(state: any): void;
    reset(initialMessages?: readonly ThreadMessageLike[]): void;
    unstable_refetchThread?: (() => Promise<void>) | undefined;
    unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
  }>>;
  __internal_restartThreadRuntime(threadId: string): Promise<Readonly<{
    getMessageById: (messageId: string) => {
      parentId: string | null;
      message: ThreadMessage;
      index: number;
    } | undefined;
    getBranches: (messageId: string) => readonly string[];
    switchToBranch: (branchId: string) => void;
    append: (message: AppendMessage) => void;
    deleteMessage: (messageId: string) => void | Promise<void>;
    startRun: (config: StartRunConfig) => void;
    resumeRun: (config: ResumeRunConfig) => void;
    cancelRun: () => void;
    unstable_notifySessionReset: () => void;
    addToolResult: (options: AddToolResultOptions) => void;
    resumeToolCall: (options: ResumeToolCallOptions) => void;
    respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
    speak: (messageId: string) => void;
    stopSpeaking: () => void;
    connectVoice: () => void;
    disconnectVoice: () => void;
    muteVoice: () => void;
    unmuteVoice: () => void;
    submitFeedback: (feedback: SubmitFeedbackOptions) => void;
    getModelContext: () => ModelContext$1;
    composer: ThreadComposerRuntimeCore;
    getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
    beginEdit: (messageId: string) => void;
    getQueueItems?: () => readonly QueueItemState[];
    getSteerQueueItems?: () => readonly QueueItemState[];
    moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
    removeQueueItem?: (queueItemId: string) => void;
    speech: SpeechState | undefined;
    voice: VoiceSessionState | undefined;
    capabilities: Readonly<RuntimeCapabilities>;
    isDisabled: boolean;
    isSendDisabled: boolean;
    isLoading: boolean;
    isRunning?: boolean | undefined;
    messages: readonly ThreadMessage[];
    state: ReadonlyJSONValue;
    suggestions: readonly ThreadSuggestion[];
    extras: unknown;
    subscribe: (callback: () => void) => Unsubscribe$1;
    getVoiceVolume: () => number;
    subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
    import(repository: ExportedMessageRepository): void;
    export(): ExportedMessageRepository;
    exportExternalState(): any;
    importExternalState(state: any): void;
    reset(initialMessages?: readonly ThreadMessageLike[]): void;
    unstable_refetchThread?: (() => Promise<void>) | undefined;
    unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
  }>>;
  getThreadRuntimeCore(threadId: string): Readonly<{
    getMessageById: (messageId: string) => {
      parentId: string | null;
      message: ThreadMessage;
      index: number;
    } | undefined;
    getBranches: (messageId: string) => readonly string[];
    switchToBranch: (branchId: string) => void;
    append: (message: AppendMessage) => void;
    deleteMessage: (messageId: string) => void | Promise<void>;
    startRun: (config: StartRunConfig) => void;
    resumeRun: (config: ResumeRunConfig) => void;
    cancelRun: () => void;
    unstable_notifySessionReset: () => void;
    addToolResult: (options: AddToolResultOptions) => void;
    resumeToolCall: (options: ResumeToolCallOptions) => void;
    respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
    speak: (messageId: string) => void;
    stopSpeaking: () => void;
    connectVoice: () => void;
    disconnectVoice: () => void;
    muteVoice: () => void;
    unmuteVoice: () => void;
    submitFeedback: (feedback: SubmitFeedbackOptions) => void;
    getModelContext: () => ModelContext$1;
    composer: ThreadComposerRuntimeCore;
    getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
    beginEdit: (messageId: string) => void;
    getQueueItems?: () => readonly QueueItemState[];
    getSteerQueueItems?: () => readonly QueueItemState[];
    moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
    removeQueueItem?: (queueItemId: string) => void;
    speech: SpeechState | undefined;
    voice: VoiceSessionState | undefined;
    capabilities: Readonly<RuntimeCapabilities>;
    isDisabled: boolean;
    isSendDisabled: boolean;
    isLoading: boolean;
    isRunning?: boolean | undefined;
    messages: readonly ThreadMessage[];
    state: ReadonlyJSONValue;
    suggestions: readonly ThreadSuggestion[];
    extras: unknown;
    subscribe: (callback: () => void) => Unsubscribe$1;
    getVoiceVolume: () => number;
    subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
    import(repository: ExportedMessageRepository): void;
    export(): ExportedMessageRepository;
    exportExternalState(): any;
    importExternalState(state: any): void;
    reset(initialMessages?: readonly ThreadMessageLike[]): void;
    unstable_refetchThread?: (() => Promise<void>) | undefined;
    unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
  }> | undefined;
  __internal_isThreadRunning(threadId: string): boolean;
  __internal_subscribeRunningChanged(callback: () => void): Unsubscribe$1;
  __internal_subscribeThreadEvents(callback: (event: ThreadListRuntimeEvent) => void): Unsubscribe$1;
  __internal_subscribeRuntimeReplaced(callback: () => void): Unsubscribe$1;
  stopThreadRuntime(threadId: string): void;
  setRuntimeHook(newRuntimeHook: RemoteThreadListHook): void;
  __internal_setDefaultAdapters(adapters: RuntimeAdapters | null): void;
  __internal_setThreadAdapters(threadId: string, adapters: RuntimeAdapters | null): void;
  __internal_dispose(): void;
  __internal_useHost(parentClient: AssistantClient): AssistantRuntime[];
  __internal_RenderThreadRuntimes: FC<{
    provider: ComponentType<PropsWithChildren>;
  }>;
  __internal_Host: FC<{
    parentClient: AssistantClient;
  }>;
}

type RemoteThreadListOptions = {
  runtimeHook: () => AssistantRuntime;
  adapter: RemoteThreadListAdapter;
  initialThreadId?: string | undefined;
  threadId?: string | undefined;
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  allowNesting?: boolean | undefined;
};

type RemoteThreadListPageOptions = {
  after?: string | undefined;
};

type RemoteThreadListProps = {
  adapter: RemoteThreadListAdapter;
  thread: InMemoryThreadListProps["thread"];
  threadId?: string | undefined;
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  onSwitchToThread?: ((threadId: string) => void) | undefined;
  onSwitchToNewThread?: (() => void) | undefined;
  onDelete?: ((threadId: string) => void) | undefined;
  backgroundThreads?: boolean | undefined;
};

type RemoteThreadListProviderComponent = ((props: RemoteThreadListProviderProps) => any) | (new (props: RemoteThreadListProviderProps) => any);

type RemoteThreadListProviderProps = {
  children?: any;
};

type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
  nextCursor?: string | undefined;
};

declare class RemoteThreadListThreadListRuntimeCore extends BaseSubscribable implements ThreadListRuntimeCore {
  #private;
  get threadItems(): Readonly<Record<THREAD_MAPPING_ID, RemoteThreadData>>;
  getLoadThreadsPromise(): Promise<void>;
  loadMore(): Promise<void>;
  constructor(options: RemoteThreadListOptions, contextProvider: ModelContextProvider);
  __internal_setOptions(options: RemoteThreadListOptions): void;
  __internal_load(): void;
  reloadMainThread(): Promise<void>;
  reload(): Promise<void>;
  get isLoading(): boolean;
  get loadError(): unknown;
  get isLoadingMore(): boolean;
  get hasMore(): boolean;
  get threadIds(): readonly string[];
  get archivedThreadIds(): readonly string[];
  get newThreadId(): string | undefined;
  get mainThreadId(): string;
  getMainThreadRuntimeCore(): Readonly<{
    getMessageById: (messageId: string) => {
      parentId: string | null;
      message: ThreadMessage;
      index: number;
    } | undefined;
    getBranches: (messageId: string) => readonly string[];
    switchToBranch: (branchId: string) => void;
    append: (message: AppendMessage) => void;
    deleteMessage: (messageId: string) => void | Promise<void>;
    startRun: (config: StartRunConfig) => void;
    resumeRun: (config: ResumeRunConfig) => void;
    cancelRun: () => void;
    unstable_notifySessionReset: () => void;
    addToolResult: (options: AddToolResultOptions) => void;
    resumeToolCall: (options: ResumeToolCallOptions) => void;
    respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
    speak: (messageId: string) => void;
    stopSpeaking: () => void;
    connectVoice: () => void;
    disconnectVoice: () => void;
    muteVoice: () => void;
    unmuteVoice: () => void;
    submitFeedback: (feedback: SubmitFeedbackOptions) => void;
    getModelContext: () => ModelContext$1;
    composer: ThreadComposerRuntimeCore;
    getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
    beginEdit: (messageId: string) => void;
    getQueueItems?: () => readonly QueueItemState[];
    getSteerQueueItems?: () => readonly QueueItemState[];
    moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
    removeQueueItem?: (queueItemId: string) => void;
    speech: SpeechState | undefined;
    voice: VoiceSessionState | undefined;
    capabilities: Readonly<RuntimeCapabilities>;
    isDisabled: boolean;
    isSendDisabled: boolean;
    isLoading: boolean;
    isRunning?: boolean | undefined;
    messages: readonly ThreadMessage[];
    state: ReadonlyJSONValue;
    suggestions: readonly ThreadSuggestion[];
    extras: unknown;
    subscribe: (callback: () => void) => Unsubscribe$1;
    getVoiceVolume: () => number;
    subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
    import(repository: ExportedMessageRepository): void;
    export(): ExportedMessageRepository;
    exportExternalState(): any;
    importExternalState(state: any): void;
    reset(initialMessages?: readonly ThreadMessageLike[]): void;
    unstable_refetchThread?: (() => Promise<void>) | undefined;
    unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
  }>;
  getThreadRuntimeCore(threadIdOrRemoteId: string): Readonly<{
    getMessageById: (messageId: string) => {
      parentId: string | null;
      message: ThreadMessage;
      index: number;
    } | undefined;
    getBranches: (messageId: string) => readonly string[];
    switchToBranch: (branchId: string) => void;
    append: (message: AppendMessage) => void;
    deleteMessage: (messageId: string) => void | Promise<void>;
    startRun: (config: StartRunConfig) => void;
    resumeRun: (config: ResumeRunConfig) => void;
    cancelRun: () => void;
    unstable_notifySessionReset: () => void;
    addToolResult: (options: AddToolResultOptions) => void;
    resumeToolCall: (options: ResumeToolCallOptions) => void;
    respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
    speak: (messageId: string) => void;
    stopSpeaking: () => void;
    connectVoice: () => void;
    disconnectVoice: () => void;
    muteVoice: () => void;
    unmuteVoice: () => void;
    submitFeedback: (feedback: SubmitFeedbackOptions) => void;
    getModelContext: () => ModelContext$1;
    composer: ThreadComposerRuntimeCore;
    getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
    beginEdit: (messageId: string) => void;
    getQueueItems?: () => readonly QueueItemState[];
    getSteerQueueItems?: () => readonly QueueItemState[];
    moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
    removeQueueItem?: (queueItemId: string) => void;
    speech: SpeechState | undefined;
    voice: VoiceSessionState | undefined;
    capabilities: Readonly<RuntimeCapabilities>;
    isDisabled: boolean;
    isSendDisabled: boolean;
    isLoading: boolean;
    isRunning?: boolean | undefined;
    messages: readonly ThreadMessage[];
    state: ReadonlyJSONValue;
    suggestions: readonly ThreadSuggestion[];
    extras: unknown;
    subscribe: (callback: () => void) => Unsubscribe$1;
    getVoiceVolume: () => number;
    subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
    import(repository: ExportedMessageRepository): void;
    export(): ExportedMessageRepository;
    exportExternalState(): any;
    importExternalState(state: any): void;
    reset(initialMessages?: readonly ThreadMessageLike[]): void;
    unstable_refetchThread?: (() => Promise<void>) | undefined;
    unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
  }>;
  unstable_isThreadRunning(threadIdOrRemoteId: string): boolean;
  unstable_subscribeThreadEvents(callback: (event: ThreadListRuntimeEvent) => void): Unsubscribe$1;
  getItemById(threadIdOrRemoteId: string): RemoteThreadData | undefined;
  switchToThread(threadIdOrRemoteId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  initialize: (threadId: string) => Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle: (threadId: string, options?: {
    automatic?: boolean;
  }) => Promise<void>;
  rename(threadIdOrRemoteId: string, newTitle: string): Promise<void>;
  updateCustom(threadIdOrRemoteId: string, custom: Record<string, unknown> | undefined): Promise<void>;
  archive(threadIdOrRemoteId: string): Promise<void>;
  unarchive(threadIdOrRemoteId: string): Promise<void>;
  delete(threadIdOrRemoteId: string): Promise<void>;
  __internal_dispose(): void;
  detach(threadIdOrRemoteId: string): Promise<void>;
  __internal_RenderComponent: FC;
}

type RemoteThreadMetadata = {
  readonly status: "archived" | "regular";
  readonly remoteId: string;
  readonly externalId?: string | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

type RemoteThreadState = {
  readonly isLoading: boolean;
  readonly loadError: unknown;
  readonly isLoadingMore: boolean;
  readonly cursor: string | undefined;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadIdMap: Readonly<Record<string, THREAD_MAPPING_ID>>;
  readonly threadData: Readonly<Record<THREAD_MAPPING_ID, RemoteThreadData>>;
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

type Resource<V, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<V>;

type ResourceElement<V> = {
  readonly hook: (...args: any[]) => V;
  readonly args: readonly unknown[];
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

type RespondToToolApprovalOptions = {
  approvalId: string;
  approved: boolean;
  optionId?: string;
  text?: string;
  reason?: string;
};

type ResumeRunConfig = StartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
};

type ResumeToolCallOptions = {
  toolCallId: string;
  payload: unknown;
};

type RunConfig = {
  readonly custom?: Record<string, unknown>;
};

declare const RuntimeAdapter: Resource<ClientOutput<"threads">, [
  runtime: AssistantRuntime
]>;

declare namespace RuntimeAdapterProvider {
  type Props = {
    adapters: RuntimeAdapters;
    children: ReactNode;
  };
}

declare const RuntimeAdapterProvider: FC<RuntimeAdapterProvider.Props>;

type RuntimeAdapters = {
  modelContext?: ModelContextProvider | undefined;
  history?: ThreadHistoryAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
  feedback?: FeedbackAdapter | undefined;
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

type RuntimeExtrasBrand<T extends object> = {
  provide: (value: T) => T;
  is: (extras: unknown) => extras is T;
  tryGet: (extras: unknown) => T | undefined;
  assert: (extras: unknown) => T;
};

declare const SKIP_UPDATE: unique symbol;

type SKIP_UPDATE = typeof SKIP_UPDATE;

type SamplingCallData = {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  duration_ms?: number;
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type ScopeStates = {
  [K in ClientNames]: ClientSchemas[K]["methods"] extends {
    getState: () => infer S;
  } ? S : never;
};

type ScopesConfig = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

type SendCommandsRequestBody = {
  commands: QueuedCommand[];
  state?: unknown;
  runId?: string;
  system: string | undefined;
  tools: Record<string, unknown> | undefined;
  callSettings: LanguageModelV1CallSettings | undefined;
  config: LanguageModelConfig | undefined;
  threadId: string | null;
  parentId?: string | null;
  [key: string]: unknown;
};

type SendOptions = {
  startRun?: boolean;
  steer?: boolean;
};

type SerializedModelContext = {
  system?: string;
  tools?: Record<string, SerializedTool>;
};

type SerializedTool = {
  description?: string;
  parameters: any;
  disabled?: boolean;
  type?: string;
};

declare class ShallowMemoizeSubject<TState extends object, TPath> extends BaseSubject implements SubscribableWithState<TState, TPath> {
  #private;
  get path(): TPath;
  constructor(binding: SubscribableWithState<TState | SKIP_UPDATE, TPath>);
  getState: () => TState;
  protected _connect(): Unsubscribe$1;
}

declare class SimpleImageAttachmentAdapter implements AttachmentAdapter {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
  remove(): Promise<void>;
}

declare class SimpleTextAttachmentAdapter implements AttachmentAdapter {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
  remove(): Promise<void>;
}

declare const SingleThreadList: Resource<ClientOutput<"threads">, [
  SingleThreadListProps
]>;

type SingleThreadListProps = {
  thread: ClientElement<"thread">;
};

type SnapshotCarrierMessage = {
  role: string;
  metadata?: unknown;
  content?: readonly unknown[] | undefined;
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

type SourceMessagePartComponent = ComponentType<SourceMessagePartProps>;

type SourceMessagePartProps = MessagePartState & SourceMessagePart;

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

type StandardSchemaInput<TSchema> = TSchema extends {
  readonly "~standard": {
    readonly types?: {
      readonly input: infer TInput;
    } | undefined;
  };
} ? TInput extends Record<string, unknown> ? TInput : Record<string, unknown> : Record<string, unknown>;

type StandardSchemaParameters = Extract<NonNullable<Extract<Tool<any>, {
  parameters: unknown;
}>["parameters"]>, {
  readonly "~standard": unknown;
}>;

type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

type StateUpdater<TState> = TState | ((prev: TState) => TState);

type StateUpdater$1<TState> = TState | ((prev: TState) => TState);

type StreamingTimingAccessors<TMessage> = {
  readonly getAssistantMessageId: (messages: readonly TMessage[]) => string | undefined;
  readonly getTextLength: (messages: readonly TMessage[], messageId: string) => number;
  readonly getToolCallCount: (messages: readonly TMessage[], messageId: string) => number;
};

type StreamingTimingOptions = {
  readonly estimateTokens?: (textLength: number) => number;
};

type StreamingTimingState = {
  readonly messageId: string;
  readonly startTime: number;
  readonly firstTokenTime?: number;
  readonly lastContentLength: number;
  readonly totalChunks: number;
};

type SubmitFeedbackOptions = {
  messageId: string;
  type: "negative" | "positive";
};

type SubmittedFeedback = {
  readonly type: "negative" | "positive";
};

type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe$1;
};

type SubscribableWithState<TState, TPath> = Subscribable & {
  path: TPath;
  getState: () => TState;
};

type Suggestion = {
  title: string;
  label: string;
  prompt: string;
};

type SuggestionAdapter = {
  generate: (options: SuggestionAdapterGenerateOptions) => Promise<readonly ThreadSuggestion[]> | AsyncGenerator<readonly ThreadSuggestion[], void>;
};

type SuggestionAdapterGenerateOptions = {
  messages: readonly ThreadMessage[];
  signal?: AbortSignal;
};

declare const SuggestionByIndexProvider: FC<SuggestionByIndexProviderProps>;

type SuggestionByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

type SuggestionClientSchema = {
  methods: SuggestionMethods;
  meta: SuggestionMeta;
};

type SuggestionConfig = string | {
  title: string;
  label: string;
  prompt: string;
};

type SuggestionMeta = {
  source: "suggestions";
  query: {
    index: number;
  };
};

type SuggestionMethods = {
  getState(): SuggestionState;
};

type SuggestionState = {
  title: string;
  label: string;
  prompt: string;
};

declare const Suggestions: Resource<ClientOutput<"suggestions">, [
  suggestions?: SuggestionConfig[] | undefined
]>;

type SuggestionsClientSchema = {
  methods: SuggestionsMethods;
  meta: SuggestionsMeta;
};

type SuggestionsComponentConfig = {
  Suggestion: ComponentType;
};

type SuggestionsMeta = {
  source: "thread";
  query: Record<string, never>;
};

type SuggestionsMethods = {
  getState(): SuggestionsState;
  suggestion(query: {
    index: number;
  }): SuggestionMethods;
};

type SuggestionsState = {
  suggestions: Suggestion[];
};

type THREAD_MAPPING_ID = string & {
  __brand: "THREAD_MAPPING_ID";
};

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type TextMessagePartComponent = ComponentType<TextMessagePartProps>;

type TextMessagePartProps = MessagePartState & TextMessagePart;

declare const TextMessagePartProvider: FC<PropsWithChildren<{
  text: string;
  isRunning?: boolean;
}>>;

type TextPart = {
  readonly type: "text";
  readonly text: string;
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

declare const ThreadClient: Resource<ClientOutput<"thread">, [
  {
    runtime: ThreadRuntime;
  }
]>;

type ThreadClientSchema = {
  methods: ThreadMethods;
  meta: ThreadMeta;
  events: ThreadEvents;
};

declare class ThreadComposerAttachmentRuntimeImpl extends ComposerAttachmentRuntime<"thread-composer"> {
  get source(): "thread-composer";
}

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

type ThreadComposerRuntimeCore = ComposerRuntimeCore;

type ThreadComposerRuntimeCoreBinding = SubscribableWithState<ThreadComposerRuntimeCore | undefined, ComposerRuntimePath & {
  composerSource: "thread";
}>;

declare class ThreadComposerRuntimeImpl extends ComposerRuntimeImpl implements ThreadComposerRuntime {
  #private;
  get path(): ComposerRuntimePath & {
    composerSource: "thread";
  };
  get type(): "thread";
  constructor(core: ThreadComposerRuntimeCoreBinding);
  getState(): ThreadComposerState;
  getAttachmentByIndex(idx: number): ThreadComposerAttachmentRuntimeImpl;
}

type ThreadComposerState = BaseComposerState & {
  readonly type: "thread";
};

type ThreadData = {
  externalId: string;
};

type ThreadData$1 = {
  externalId: string | undefined;
};

type ThreadData$2 = {
  externalId: string | undefined;
};

type ThreadEvents = {
  "thread.runStart": {
    threadId: string;
  };
  "thread.runEnd": {
    threadId: string;
  };
  "thread.initialize": {
    threadId: string;
  };
  "thread.modelContextUpdate": {
    threadId: string;
  };
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

declare const ThreadListClient: Resource<ClientOutput<"threads">, [
  {
    runtime: ThreadListRuntime;
    __internal_assistantRuntime: AssistantRuntime;
  }
]>;

type ThreadListItem = {
  source: unknown;
  initialize: () => Promise<ThreadData$2>;
};

declare const ThreadListItemByIndexProvider: FC<PropsWithChildren<{
  index: number;
  archived: boolean;
}>>;

declare const ThreadListItemClient: Resource<ClientOutput<"threadListItem">, [
  {
    runtime: ThreadListItemRuntime;
    mainThreadIsRunning?: boolean | undefined;
  }
]>;

type ThreadListItemClientSchema = {
  methods: ThreadListItemMethods;
  meta: ThreadListItemMeta;
  events: ThreadListItemEvents;
};

type ThreadListItemCoreState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
  readonly runtime?: ThreadRuntimeCore | undefined;
};

type ThreadListItemEventCallback<E extends ThreadListItemEventType> = (payload: ThreadListItemEventPayload[E]) => void;

type ThreadListItemEventPayload = {
  switchedTo: Record<string, never>;
  switchedAway: Record<string, never>;
};

type ThreadListItemEventType = keyof ThreadListItemEventPayload;

type ThreadListItemEvents = {
  "threadListItem.switchedTo": {
    threadId: string;
  };
  "threadListItem.switchedAway": {
    threadId: string;
  };
};

type ThreadListItemGenerateTitleOptions = {
  automatic?: boolean;
};

type ThreadListItemMeta = {
  source: "threads";
  query: {
    type: "main";
  } | {
    type: "id";
    id: string;
  } | {
    type: "index";
    index: number;
    archived?: boolean;
  };
};

type ThreadListItemMethods = {
  getState(): ThreadListItemState;
  switchTo(options?: {
    unarchive?: boolean;
  }): void;
  rename(newTitle: string): void;
  updateCustom(custom: Record<string, unknown> | undefined): void;
  archive(): void;
  unarchive(): void;
  delete(): void;
  generateTitle(options?: ThreadListItemGenerateTitleOptions): void;
  initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  detach(): void;
  __internal_getRuntime?(): ThreadListItemRuntime;
};

declare namespace ThreadListItemPrimitiveTitle {
  type Props = {
    fallback?: ReactNode;
  };
}

declare const ThreadListItemPrimitiveTitle: FC<ThreadListItemPrimitiveTitle.Props>;

type ThreadListItemRuntime = {
  readonly path: ThreadListItemRuntimePath;
  getState(): ThreadListItemState$1;
  initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(options?: ThreadListItemGenerateTitleOptions): Promise<void>;
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

type ThreadListItemRuntimeBinding = SubscribableWithState<ThreadListItemState$1, ThreadListItemRuntimePath>;

declare class ThreadListItemRuntimeImpl implements ThreadListItemRuntime {
  #private;
  get path(): ThreadListItemRuntimePath;
  constructor(_core: ThreadListItemStateBinding, _threadListBinding: ThreadListRuntimeCoreBinding);
  protected __internal_bindMethods(): void;
  getState(): ThreadListItemState$1;
  switchTo(options?: {
    unarchive?: boolean;
  }): Promise<void>;
  rename(newTitle: string): Promise<void>;
  updateCustom(custom: Record<string, unknown> | undefined): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(options?: ThreadListItemGenerateTitleOptions): Promise<void>;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe$1;
  subscribe(callback: () => void): Unsubscribe$1;
  detach(): void;
  __internal_getRuntime(): ThreadListItemRuntime;
}

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

declare const ThreadListItemRuntimeProvider: FC<PropsWithChildren<{
  runtime: ThreadListItemRuntime;
}>>;

type ThreadListItemState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly status: ThreadListItemStatus;
  readonly custom?: Record<string, unknown> | undefined;
  readonly isRunning: boolean;
};

type ThreadListItemState$1 = {
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

type ThreadListItemStateBinding = SubscribableWithState<ThreadListItemState$1, ThreadListItemRuntimePath>;

type ThreadListItemStatus = "archived" | "deleted" | "new" | "regular";

type ThreadListItemsComponentConfig = {
  ThreadListItem: ComponentType;
};

declare namespace ThreadListPrimitiveItemByIndex {
  type Props = {
    index: number;
    archived?: boolean | undefined;
    components: ThreadListItemsComponentConfig;
  };
}

declare const ThreadListPrimitiveItemByIndex: FC<ThreadListPrimitiveItemByIndex.Props>;

declare namespace ThreadListPrimitiveItems {
  type Props = {
    archived?: boolean | undefined;
  } & ({
    components: ThreadListItemsComponentConfig;
    children?: never;
  } | {
    children: (value: {
      threadListItem: ThreadListItemState;
    }) => ReactNode;
    components?: never;
  });
}

declare const ThreadListPrimitiveItems: FC<ThreadListPrimitiveItems.Props>;

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
  unstable_subscribeThreadEvents(callback: (event: ThreadListRuntimeEvent) => void): Unsubscribe$1;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  reloadMainThread(): Promise<void>;
  loadMore(): Promise<void>;
};

type ThreadListRuntimeCore = {
  readonly isLoading: boolean;
  readonly loadError?: unknown;
  readonly isLoadingMore?: boolean;
  readonly hasMore?: boolean;
  mainThreadId: string;
  newThreadId: string | undefined;
  threadIds: readonly string[];
  archivedThreadIds: readonly string[];
  readonly threadItems: Readonly<Record<string, ThreadListItemCoreState>>;
  getMainThreadRuntimeCore(): ThreadRuntimeCore;
  getThreadRuntimeCore(threadId: string): ThreadRuntimeCore;
  unstable_isThreadRunning?(threadId: string): boolean;
  unstable_subscribeThreadEvents?(callback: (event: ThreadListRuntimeEvent) => void): Unsubscribe$1;
  getItemById(threadId: string): ThreadListItemCoreState | undefined;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  getLoadThreadsPromise(): Promise<void>;
  reload?(): Promise<void>;
  reloadMainThread?(): Promise<void>;
  loadMore?(): Promise<void>;
  detach(threadId: string): Promise<void>;
  rename(threadId: string, newTitle: string): Promise<void>;
  updateCustom?(threadId: string, custom: Record<string, unknown> | undefined): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;
  initialize(threadId: string): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(threadId: string, options?: {
    automatic?: boolean;
  }): Promise<void>;
  subscribe(callback: () => void): Unsubscribe$1;
};

type ThreadListRuntimeCoreBinding = ThreadListRuntimeCore;

type ThreadListRuntimeEvent = {
  readonly threadId: string;
  readonly type: ThreadRuntimeEventType;
};

declare class ThreadListRuntimeImpl implements ThreadListRuntime {
  #private;
  constructor(_core: ThreadListRuntimeCoreBinding, _runtimeFactory?: new (binding: ThreadRuntimeCoreBinding, threadListItemBinding: ThreadListItemRuntimeBinding) => ThreadRuntime);
  protected __internal_bindMethods(): void;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  unstable_subscribeThreadEvents(callback: (event: ThreadListRuntimeEvent) => void): Unsubscribe$1;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  reloadMainThread(): Promise<void>;
  loadMore(): Promise<void>;
  getState(): ThreadListState;
  subscribe(callback: () => void): Unsubscribe$1;
  readonly main: ThreadRuntime;
  get mainItem(): ThreadListItemRuntimeImpl;
  getById(threadId: string): ThreadRuntime;
  getItemByIndex(idx: number): ThreadListItemRuntimeImpl;
  getArchivedItemByIndex(idx: number): ThreadListItemRuntimeImpl;
  getItemById(threadId: string): ThreadListItemRuntimeImpl;
}

type ThreadListState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly isLoading: boolean;
  readonly loadError: unknown;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadItems: Readonly<Record<string, Omit<ThreadListItemState$1, "isMain" | "isRunning" | "threadId">>>;
};

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

declare const ThreadMessageClient: Resource<ClientOutput<"message">, [
  ThreadMessageClientProps
]>;

type ThreadMessageClientProps = {
  message: ThreadMessage;
  index: number;
  isLast?: boolean;
  branchNumber?: number;
  branchCount?: number;
};

declare class ThreadMessageConverter {
  #private;
  convertMessages<TIn extends WeakKey>(messages: readonly TIn[], converter: ConverterCallback<TIn>): ThreadMessage[];
}

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
    readonly mcp?: ToolCallMessagePartMcpMetadata;
    readonly providerMetadata?: PartProviderMetadata;
    readonly approval?: NonNullable<ToolCallMessagePart["approval"]>;
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

type ThreadMeta = {
  source: "threads";
  query: {
    type: "main";
  };
};

type ThreadMethods = {
  getState(): ThreadState;
  composer(): ComposerMethods;
  suggestions(): SuggestionsMethods;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  cancelRun(): void;
  unstable_refetchThread?(): Promise<void>;
  getModelContext(): ModelContext$1;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  importExternalState(state: unknown): void;
  message(selector: {
    id: string;
  } | {
    index: number;
  }): MessageMethods;
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  getVoiceVolume(): number;
  subscribeVoiceVolume(callback: () => void): Unsubscribe$1;
  muteVoice(): void;
  unmuteVoice(): void;
  __internal_getRuntime?(): ThreadRuntime;
};

declare namespace ThreadPrimitiveMessageByIndex {
  type Props = {
    index: number;
    components: MessagesComponentConfig;
  };
}

declare const ThreadPrimitiveMessageByIndex: FC<ThreadPrimitiveMessageByIndex.Props>;

declare namespace ThreadPrimitiveMessages {
  type Props = {
    components: MessagesComponentConfig;
    children?: never;
  } | {
    children: (value: {
      message: MessageState;
    }) => ReactNode;
    components?: never;
  };
}

declare const ThreadPrimitiveMessages: import("react").NamedExoticComponent<ThreadPrimitiveMessages.Props>;

declare const ThreadPrimitiveMessagesImpl: FC<ThreadPrimitiveMessages.Props>;

declare namespace ThreadPrimitiveSuggestionByIndex {
  type Props = {
    index: number;
    components: SuggestionsComponentConfig;
  };
}

declare const ThreadPrimitiveSuggestionByIndex: FC<ThreadPrimitiveSuggestionByIndex.Props>;

declare namespace ThreadPrimitiveSuggestions {
  type Props = {
    components: SuggestionsComponentConfig;
    children?: never;
  } | {
    children: (value: {
      suggestion: SuggestionState;
    }) => ReactNode;
    components?: never;
  };
}

declare const ThreadPrimitiveSuggestions: import("react").NamedExoticComponent<ThreadPrimitiveSuggestions.Props>;

declare const ThreadPrimitiveSuggestionsImpl: FC<ThreadPrimitiveSuggestions.Props>;

declare namespace ThreadPrimitiveUnstable_MessageById {
  type Props = {
    messageId: string;
    components: MessagesComponentConfig;
  };
}

declare const ThreadPrimitiveUnstable_MessageById: FC<ThreadPrimitiveUnstable_MessageById.Props>;

type ThreadRuntime = {
  readonly path: ThreadRuntimePath;
  readonly composer: ThreadComposerRuntime;
  getState(): ThreadState$1;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(): any;
  importExternalState(state: any): void;
  subscribe(callback: () => void): Unsubscribe$1;
  cancelRun(): void;
  unstable_notifySessionReset(): void;
  getModelContext(): ModelContext$1;
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

type ThreadRuntimeCore = Readonly<{
  getMessageById: (messageId: string) => {
    parentId: string | null;
    message: ThreadMessage;
    index: number;
  } | undefined;
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;
  append: (message: AppendMessage) => void;
  deleteMessage: (messageId: string) => void | Promise<void>;
  startRun: (config: StartRunConfig) => void;
  resumeRun: (config: ResumeRunConfig) => void;
  cancelRun: () => void;
  unstable_notifySessionReset: () => void;
  addToolResult: (options: AddToolResultOptions) => void;
  resumeToolCall: (options: ResumeToolCallOptions) => void;
  respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
  speak: (messageId: string) => void;
  stopSpeaking: () => void;
  connectVoice: () => void;
  disconnectVoice: () => void;
  muteVoice: () => void;
  unmuteVoice: () => void;
  submitFeedback: (feedback: SubmitFeedbackOptions) => void;
  getModelContext: () => ModelContext$1;
  composer: ThreadComposerRuntimeCore;
  getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
  beginEdit: (messageId: string) => void;
  getQueueItems?: () => readonly QueueItemState[];
  getSteerQueueItems?: () => readonly QueueItemState[];
  moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
  removeQueueItem?: (queueItemId: string) => void;
  speech: SpeechState | undefined;
  voice: VoiceSessionState | undefined;
  capabilities: Readonly<RuntimeCapabilities>;
  isDisabled: boolean;
  isSendDisabled: boolean;
  isLoading: boolean;
  isRunning?: boolean | undefined;
  messages: readonly ThreadMessage[];
  state: ReadonlyJSONValue;
  suggestions: readonly ThreadSuggestion[];
  extras: unknown;
  subscribe: (callback: () => void) => Unsubscribe$1;
  getVoiceVolume: () => number;
  subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;
  exportExternalState(): any;
  importExternalState(state: any): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  unstable_refetchThread?: (() => Promise<void>) | undefined;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
}>;

type ThreadRuntimeCoreBinding = SubscribableWithState<ThreadRuntimeCore, ThreadRuntimePath> & {
  outerSubscribe(callback: () => void): Unsubscribe$1;
};

type ThreadRuntimeEventCallback<E extends ThreadRuntimeEventType> = (payload: ThreadRuntimeEventPayload[E]) => void;

type ThreadRuntimeEventPayload = {
  runStart: Record<string, never>;
  runEnd: Record<string, never>;
  initialize: Record<string, never>;
  modelContextUpdate: Record<string, never>;
};

type ThreadRuntimeEventType = keyof ThreadRuntimeEventPayload;

declare class ThreadRuntimeImpl implements ThreadRuntime {
  #private;
  get path(): ThreadRuntimePath;
  get __internal_threadBinding(): Subscribable & {
    path: ThreadRuntimePath;
    getState: () => Readonly<{
      getMessageById: (messageId: string) => {
        parentId: string | null;
        message: ThreadMessage;
        index: number;
      } | undefined;
      getBranches: (messageId: string) => readonly string[];
      switchToBranch: (branchId: string) => void;
      append: (message: AppendMessage) => void;
      deleteMessage: (messageId: string) => void | Promise<void>;
      startRun: (config: StartRunConfig) => void;
      resumeRun: (config: ResumeRunConfig) => void;
      cancelRun: () => void;
      unstable_notifySessionReset: () => void;
      addToolResult: (options: AddToolResultOptions) => void;
      resumeToolCall: (options: ResumeToolCallOptions) => void;
      respondToToolApproval: (options: RespondToToolApprovalOptions) => Promise<void>;
      speak: (messageId: string) => void;
      stopSpeaking: () => void;
      connectVoice: () => void;
      disconnectVoice: () => void;
      muteVoice: () => void;
      unmuteVoice: () => void;
      submitFeedback: (feedback: SubmitFeedbackOptions) => void;
      getModelContext: () => ModelContext$1;
      composer: Readonly<{
        isEditing: boolean;
        canCancel: boolean;
        canSend: boolean;
        isEmpty: boolean;
        attachments: readonly Attachment[];
        attachmentAccept: string;
        addAttachment: (fileOrAttachment: File | CreateAttachment) => Promise<void>;
        removeAttachment: (attachmentId: string) => Promise<void>;
        text: string;
        setText: (value: string) => void;
        role: MessageRole;
        setRole: (role: MessageRole) => void;
        runConfig: RunConfig;
        setRunConfig: (runConfig: RunConfig) => void;
        quote: QuoteInfo | undefined;
        setQuote: (quote: QuoteInfo | undefined) => void;
        reset: () => Promise<void>;
        clearAttachments: () => Promise<void>;
        send: (options?: SendOptions) => void;
        cancel: () => void;
        queue: readonly QueueItemState[];
        moveQueueItem: (queueItemId: string, placement: QueuePlacement) => void;
        removeQueueItem: (queueItemId: string) => void;
        dictation: DictationState | undefined;
        startDictation: () => void;
        stopDictation: () => void;
        subscribe: (callback: () => void) => Unsubscribe$1;
        unstable_on: <E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>) => Unsubscribe$1;
      }>;
      getEditComposer: (messageId: string) => EditComposerRuntimeCore | undefined;
      beginEdit: (messageId: string) => void;
      getQueueItems?: () => readonly QueueItemState[];
      getSteerQueueItems?: () => readonly QueueItemState[];
      moveQueueItem?: (queueItemId: string, placement: QueuePlacement) => void;
      removeQueueItem?: (queueItemId: string) => void;
      speech: SpeechState | undefined;
      voice: VoiceSessionState | undefined;
      capabilities: Readonly<RuntimeCapabilities>;
      isDisabled: boolean;
      isSendDisabled: boolean;
      isLoading: boolean;
      isRunning?: boolean | undefined;
      messages: readonly ThreadMessage[];
      state: ReadonlyJSONValue;
      suggestions: readonly ThreadSuggestion[];
      extras: unknown;
      subscribe: (callback: () => void) => Unsubscribe$1;
      getVoiceVolume: () => number;
      subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
      import(repository: ExportedMessageRepository): void;
      export(): ExportedMessageRepository;
      exportExternalState(): any;
      importExternalState(state: any): void;
      reset(initialMessages?: readonly ThreadMessageLike[]): void;
      unstable_refetchThread?: (() => Promise<void>) | undefined;
      unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
    }>;
  } & {
    outerSubscribe(callback: () => void): Unsubscribe$1;
  } & {
    getStateState(): ThreadState$1;
  };
  constructor(threadBinding: ThreadRuntimeCoreBinding, threadListItemBinding: ThreadListItemRuntimeBinding);
  protected __internal_bindMethods(): void;
  readonly composer: ThreadComposerRuntimeImpl;
  getState(): ThreadState$1;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  subscribe(callback: () => void): () => void;
  getModelContext(): ModelContext$1;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(): any;
  importExternalState(state: any): void;
  cancelRun(): void;
  unstable_notifySessionReset(): void;
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  getVoiceVolume(): number;
  subscribeVoiceVolume(callback: () => void): Unsubscribe$1;
  muteVoice(): void;
  unmuteVoice(): void;
  export(): ExportedMessageRepository;
  import(data: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  getMessageByIndex(idx: number): MessageRuntimeImpl;
  getMessageById(messageId: string): MessageRuntimeImpl;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
}

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
  readonly isEmpty: boolean;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly capabilities: RuntimeCapabilities;
  readonly messages: readonly MessageState[];
  readonly state: ReadonlyJSONValue;
  readonly suggestions: readonly ThreadSuggestion[];
  readonly extras: unknown;
  readonly speech: SpeechState | undefined;
  readonly voice: VoiceSessionState | undefined;
  readonly composer: ComposerState;
};

type ThreadState$1 = {
  readonly threadId: string;
  readonly metadata: ThreadListItemState$1;
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

type ThreadsClientSchema = {
  methods: ThreadsMethods;
  events: ThreadsEvents;
};

type ThreadsEvents = {
  "threads.selectionChanged": {
    threadId: string;
    previousThreadId: string;
  };
};

type ThreadsMethods = {
  getState(): ThreadsState;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): void;
  switchToNewThread(): void;
  item(threadIdOrOptions: "main" | {
    id: string;
  } | {
    index: number;
    archived?: boolean;
  }): ThreadListItemMethods;
  thread(selector: "main"): ThreadMethods;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  reloadMainThread(): Promise<void>;
  loadMore(): Promise<void>;
  __internal_getAssistantRuntime?(): AssistantRuntime;
};

type ThreadsState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | null;
  readonly isLoading: boolean;
  readonly loadError: unknown;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadItems: readonly ThreadListItemState[];
  readonly main: ThreadState;
};

type TitleGenerationAdapter = {
  generateTitle(messages: readonly ThreadMessage[]): Promise<string>;
};

type Tool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendTool<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolApprovalDisplay = "decision" | "select" | "text";

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
  readonly text?: string;
  readonly reason?: string;
} | {
  readonly optionId: string;
  readonly text?: string;
  readonly reason?: string;
} | {
  readonly approved: boolean;
  readonly optionId: string;
  readonly text?: string;
  readonly reason?: string;
} | {
  readonly text: string;
  readonly reason?: string;
};

type ToolArgsStatus<TArgs extends Record<string, unknown> = Record<string, unknown>> = {
  status: "complete" | "incomplete" | "requires-action" | "running";
  propStatus: Partial<Record<keyof TArgs, PropFieldStatus>>;
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

type ToolCallCompleteText<TArgs extends Record<string, unknown>, TResult, TValue> = TValue | undefined | null | ((options: {
  args: TArgs;
  result: TResult | undefined;
}) => TValue | undefined | null);

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
    readonly prompt?: string;
    readonly display?: ToolApprovalDisplay;
    readonly allowFreeform?: boolean;
    readonly approved?: boolean;
    readonly reason?: string;
    readonly isAutomatic?: boolean;
    readonly options?: readonly ToolApprovalOption[];
    readonly optionId?: string;
    readonly text?: string;
    readonly resolution?: "cancelled" | "expired";
  };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
};

type ToolCallMessagePartComponent<TArgs = any, TResult = any> = ComponentType<ToolCallMessagePartProps<TArgs, TResult>>;

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolCallMessagePartProps<TArgs = any, TResult = unknown> = MessagePartState & ToolCallMessagePart<TArgs, TResult> & {
  addResult: (result: TResult | ToolResponse<TResult>) => void;
  resume: (payload: unknown) => void;
  respondToApproval: (response: ToolApprovalResponse) => Promise<void>;
};

type ToolCallMessagePartStatus = {
  readonly type: "requires-action";
  readonly reason: "interrupt" | "tool-calls";
} | {
  readonly type: "incomplete";
  readonly reason: "tool-calls";
  readonly error?: ReadonlyJSONValue;
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

type ToolCallRunningText<TArgs extends Record<string, unknown>, TValue> = TValue | undefined | null | ((options: {
  args: TArgs;
}) => TValue | undefined | null);

type ToolCallText<TArgs extends Record<string, unknown>, TResult> = ToolCallText$1<TArgs, TResult, ReactNode>;

type ToolCallText$1<TArgs extends Record<string, unknown>, TResult, TValue = string> = {
  running: ToolCallRunningText<TArgs, TValue>;
  complete?: ToolCallCompleteText<TArgs, TResult, TValue> | undefined;
} | {
  running?: ToolCallRunningText<TArgs, TValue> | undefined;
  complete: ToolCallCompleteText<TArgs, TResult, TValue>;
};

type ToolCallTextPart<TArgs extends Record<string, unknown>, TResult> = {
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly status?: {
    readonly type?: string | undefined;
  } | undefined;
};

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type ToolCallTreeEntry = {
  readonly part: ToolCallMessagePart;
  readonly messageId: string;
};

type ToolDeclaration<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendToolDeclaration<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

type ToolDisplay = "inline" | "standalone";

type ToolExecute<TArgs extends Record<string, unknown>, TResult> = (args: TArgs, context: ToolExecuteContext) => TResult | Promise<TResult>;

type ToolExecuteContext = Parameters<NonNullable<ToolDeclaration["execute"]>>[1];

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

declare class ToolInvocationTracker {
  #private;
  constructor(getTools: () => Record<string, Tool> | undefined, callbacks: ToolInvocationTracker.Callbacks, isClientToolCall?: (toolCall: ToolCallMessagePart) => boolean | undefined);
  setState(snapshot: ToolInvocationTracker.Snapshot): void;
  reset(): void;
  abort(options?: {
    discardPending?: boolean;
  }): Promise<void>;
  resume(toolCallId: string, payload: unknown): boolean;
  getStatuses(): ReadonlyMap<string, ToolExecutionStatus>;
}

declare namespace ToolInvocationTracker {
  type ExecutionStatus = ToolExecutionStatus;
  type Snapshot = {
    readonly messages: readonly ThreadMessage[];
    readonly isRunning: boolean;
    readonly isLoading?: boolean;
  };
  type Callbacks = {
    onResult: (command: AddToolResultCommand$1) => void;
    onStatusesChange: (statuses: ReadonlyMap<string, ToolExecutionStatus>) => void;
  };
}

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

type ToolParameters<TArgs extends Record<string, unknown>> = ToolDeclaration<TArgs>["parameters"];

type ToolRegistration = {
  readonly render: ToolCallMessagePartComponent;
  readonly renderText?: ToolCallText$1<any, any, unknown> | undefined;
  readonly standalone: boolean;
};

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

type ToolStreamCall<TArgs extends Record<string, unknown>, TResult> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecuteContext) => void;

type ToolStreamCallFunction<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecutionContext) => void;

type ToolWithoutType<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (Omit<FrontendTool<TArgs, TResult>, "type"> | Omit<BackendTool<TArgs, TResult>, "type"> | Omit<HumanTool<TArgs, TResult>, "type"> | Omit<ProviderTool<TArgs, TResult>, "type">) & {
  type?: undefined;
};

type Toolkit = Record<string, ToolDefinition<any, any>>;

type ToolkitDefinition<TArgsByName extends {
  [K in keyof TArgsByName]: Record<string, unknown>;
} = Record<string, any>, TResultByName extends {
  [K in keyof TArgsByName]: unknown;
} = {
  [K in keyof TArgsByName]: any;
}> = {
  [K in keyof TArgsByName]: ToolkitDefinitionEntry<TArgsByName[K], TResultByName[K]>;
};

type ToolkitDefinitionEntry<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolkitDefinitionInput<TArgs, TResult> | ToolDefinition<any, any>;

type ToolkitDefinitionEntryWithParameters<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolkitDefinitionInput<TArgs, TResult> & {
  parameters: NonNullable<ToolParameters<TArgs>>;
};

type ToolkitDefinitionInput<TArgs extends Record<string, unknown>, TResult> = WithRender<ToolDeclaration<TArgs, TResult> extends (infer T) ? T extends {
  streamCall?: unknown;
} ? OverrideToolDeclarationCallbacks<T, TArgs, TResult> : never : never, TArgs, TResult>;

declare const Tools: Resource<ClientOutput<"tools">, [
  {
    toolkit?: Toolkit;
    mcpApp?: ResourceElement<McpAppResourceOutput> | undefined;
  }
]>;

type ToolsClientSchema = {
  methods: ToolsMethods;
};

type ToolsMethods = {
  getState(): ToolsState;
  setToolUI(toolName: string, render: ToolCallMessagePartComponent, options?: {
    standalone?: boolean;
  }): Unsubscribe$1;
};

type ToolsState = {
  toolUIs: Record<string, readonly ToolRegistration[]>;
  mcpApp?: McpAppResourceOutput | undefined;
};

type Transform<TState, TResult> = {
  execute: () => Promise<TResult>;
  then?: (state: TState, result: TResult) => TState;
  optimistic?: (state: TState) => TState;
  loading?: (state: TState, task: Promise<TResult>) => TState;
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

type Unstable_AudioMessagePartComponent = ComponentType<Unstable_AudioMessagePartProps>;

type Unstable_AudioMessagePartProps = MessagePartState & Unstable_AudioMessagePart;

type Unstable_DirectiveFormatter = {
  serialize(item: Unstable_TriggerItem): string;
  parse(text: string): readonly Unstable_DirectiveSegment[];
};

type Unstable_DirectiveSegment = {
  readonly kind: "text";
  readonly text: string;
} | {
  readonly kind: "mention";
  readonly type: string;
  readonly label: string;
  readonly id: string;
};

type Unstable_InferInteractableState<TSchema> = TSchema extends {
  "~standard": {
    types?: {
      output: infer TOutput;
    } | undefined;
  };
} ? TOutput : unknown;

type Unstable_InteractableConfig<TSchema extends Unstable_InteractableStateSchema> = {
  description: string;
  stateSchema: TSchema;
  initialState: Unstable_InferInteractableState<TSchema>;
  id?: string | undefined;
  updateRender?: ToolCallMessagePartComponent | undefined;
};

type Unstable_InteractableDefinition = {
  id: string;
  name: string;
  description: string;
  stateSchema: Unstable_InteractableStateSchema;
  state: unknown;
  initialState: unknown;
  scope?: InteractableScope | undefined;
};

type Unstable_InteractablePersistedState = Record<string, {
  name: string;
  state: unknown;
}>;

type Unstable_InteractablePersistenceAdapter = {
  save(state: Unstable_InteractablePersistedState): void | Promise<void>;
  load?(): Unstable_InteractablePersistedState | null | undefined | Promise<Unstable_InteractablePersistedState | null | undefined>;
};

type Unstable_InteractablePersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

type Unstable_InteractableRegistration = {
  id: string;
  name: string;
  description: string;
  stateSchema: Unstable_InteractableStateSchema;
  initialState: unknown;
  updateRender?: ToolCallMessagePartComponent | undefined;
};

type Unstable_InteractableSnapshotEntry = {
  id: string;
  name: string;
  state: unknown;
  partial?: boolean | undefined;
};

type Unstable_InteractableStateSchema = NonNullable<Extract<Tool, {
  parameters: unknown;
}>["parameters"]>;

type Unstable_InteractableToolConfig<TSchema extends Unstable_InteractableStateSchema> = {
  description: string;
  stateSchema: TSchema;
  render: (props: Unstable_InteractableToolRenderProps<Unstable_InferInteractableState<TSchema>>) => ReactNode;
};

type Unstable_InteractableToolRenderProps<TState> = {
  state: TState;
  setState: (updater: TState | ((prev: TState) => TState)) => void;
  version: Unstable_InteractableVersionInfo<TState> | undefined;
  id: string;
  streaming: boolean;
};

type Unstable_InteractableVersion = {
  state: unknown;
  origin: "create" | "update" | "user-edit";
  toolCallId?: string | undefined;
};

type Unstable_InteractableVersionInfo<TState> = {
  state: TState;
  isLatest: boolean;
  restore: () => void;
};

type Unstable_InteractablesClientSchema = {
  methods: Unstable_InteractablesMethods;
};

type Unstable_InteractablesConfig = {
  persistence?: Unstable_InteractablePersistenceAdapter | undefined;
};

type Unstable_InteractablesMethods = {
  getState(): Unstable_InteractablesState;
  register(def: Unstable_InteractableRegistration): Unsubscribe$1;
  setState(id: string, updater: (prev: unknown) => unknown): void;
  exportState(): Unstable_InteractablePersistedState;
  importState(saved: Unstable_InteractablePersistedState): void;
  setPersistenceAdapter(adapter: Unstable_InteractablePersistenceAdapter | undefined): void;
  flush(): Promise<void>;
};

type Unstable_InteractablesState = {
  definitions: Record<string, Unstable_InteractableDefinition>;
  persistence: Record<string, Unstable_InteractablePersistenceStatus>;
};

type Unstable_TriggerAdapter = {
  categories(): readonly Unstable_TriggerCategory[];
  categoryItems(categoryId: string): readonly Unstable_TriggerItem[];
  search?(query: string): readonly Unstable_TriggerItem[];
};

type Unstable_TriggerCategory = {
  readonly id: string;
  readonly label: string;
};

type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

type Unsubscribe = () => void;

type Unsubscribe$1 = () => void;

type UseActionBarCopyOptions = {
  copiedDuration?: number | undefined;
  copyToClipboard?: ((text: string) => void | Promise<void>) | undefined;
};

type UseComposerIfProps = RequireAtLeastOne<ComposerIfFilters>;

type UseSuggestionTriggerOptions = {
  prompt: string;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

type UserCommands = Assistant.Commands[keyof Assistant.Commands];

type UserExternalState = keyof Assistant.ExternalState extends never ? Record<string, unknown> : Assistant.ExternalState[keyof Assistant.ExternalState];

type UserMessage = {
  readonly role: "user";
  readonly parts: readonly UserMessagePart[];
};

type UserMessagePart = TextPart | ImagePart;

type ValidateClient<K extends string, TClient> = K extends ReservedScopeNames ? ClientError<`ERROR: ${K} is a reserved scope name`> : unknown extends ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> ? TClient : ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> & ClientError<never>;

type ValidateEvents<K extends string, TClient> = "events" extends keyof TClient ? TClient["events"] extends ClientEventsType<K> ? unknown : ClientError<`ERROR: ${K} has invalid events type`> : unknown;

type ValidateMeta<K extends string, TClient> = "meta" extends keyof TClient ? TClient["meta"] extends ClientMetaType ? unknown : ClientError<`ERROR: ${K} has invalid meta type`> : unknown;

type ValidateMethods<K extends string, TClient> = TClient extends {
  methods: ClientMethods;
} ? keyof TClient["methods"] & ReservedAccessorProps extends never ? unknown : ClientError<`ERROR: ${K} methods declare a reserved accessor property (source/query/name)`> : ClientError<`ERROR: ${K} has invalid methods type`>;

type VoiceSessionControls = {
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
};

type VoiceSessionHelpers = {
  setStatus: (status: RealtimeVoiceAdapter.Status) => void;
  end: (reason: "cancelled" | "error" | "finished", error?: unknown) => void;
  emitTranscript: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
  emitMode: (mode: RealtimeVoiceAdapter.Mode) => void;
  emitVolume: (volume: number) => void;
  isDisposed: () => boolean;
};

type VoiceSessionState = {
  readonly status: RealtimeVoiceAdapter.Status;
  readonly isMuted: boolean;
  readonly mode: RealtimeVoiceAdapter.Mode;
};

declare class WebSpeechDictationAdapter implements DictationAdapter {
  #private;
  constructor(options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
  });
  static isSupported(): boolean;
  listen(): DictationAdapter.Session;
}

declare class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(text: string): SpeechSynthesisAdapter.Utterance;
}

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

type WithRender<T, TArgs extends Record<string, unknown>, TResult> = T extends {
  type: "frontend" | "human";
} ? T & (T extends {
  type: "frontend";
} ? {
  render: ToolCallMessagePartComponent<TArgs, TResult>;
} | {
  render?: ToolCallMessagePartComponent<TArgs, TResult>;
  renderText: ToolCallText<TArgs, TResult>;
} : {
  render: ToolCallMessagePartComponent<TArgs, TResult>;
}) : T & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  renderText?: ToolCallText<TArgs, TResult> | undefined;
};

declare const actionBarCopyDisabled: (s: AssistantState) => boolean;

declare const actionBarEditDisabled: (s: AssistantState) => boolean;

declare const actionBarReloadDisabled: (s: AssistantState) => boolean;

declare const auiConfigBrand: unique symbol;

declare const baseRuntimeAdapterTransformScopes: (scopes: ScopesConfig, parent: AssistantClient) => void;

declare const bindExternalStoreMessage: <T>(target: object, message: T | T[]) => void;

declare const branchPickerNextDisabled: (s: AssistantState) => boolean;

declare const branchPickerPreviousDisabled: (s: AssistantState) => boolean;

declare const composerCancelDisabled: (s: AssistantState) => boolean;

declare const composerInputDisabled: (s: AssistantState) => boolean;

declare const composerSendDisabled: (s: AssistantState) => boolean;

declare const consumeSuggestionResult: (result: ReturnType<SuggestionAdapter["generate"]>, options: {
  signal: AbortSignal;
  onUpdate: (suggestions: readonly ThreadSuggestion[]) => void;
}) => Promise<void>;

declare const convertExternalMessages: <T extends WeakKey>(messages: T[], callback: useExternalMessageConverter.Callback<T>, isRunning: boolean, metadata: useExternalMessageConverter.Metadata) => ThreadMessage[];

declare const createAbortableThreadLoad: () => {
  abort(purpose?: AbortableThreadLoadPurpose): void;
  run(_param14: AbortableThreadLoadOptions): Promise<void>;
};

declare const createCloudThreadListAdapter: (options: CloudThreadListAdapterOptions | (() => CloudThreadListAdapterOptions)) => RemoteThreadListAdapter;

declare const createCloudThreadListAdapterCreateFallback: (create: (() => Promise<ThreadData$2>) | undefined, threadListItem: ThreadListItem) => (() => Promise<ThreadData$2>);

declare const createLocalStorageAdapter: (options: LocalStorageAdapterOptions) => RemoteThreadListAdapter;

declare const createMessageConverter: <T extends object>(callback: useExternalMessageConverter.Callback<T>) => {
  useThreadMessages: (_param15: {
    messages: T[];
    isRunning: boolean;
    joinStrategy?: JoinStrategy | undefined;
    metadata?: useExternalMessageConverter.Metadata;
  }) => ThreadMessage[];
  toThreadMessages: (messages: T[], isRunning?: boolean, metadata?: useExternalMessageConverter.Metadata) => ThreadMessage[];
  toOriginalMessages: (input: ThreadState$1 | ThreadMessage | ThreadMessage["content"][number]) => unknown[];
  toOriginalMessage: (input: ThreadState$1 | ThreadMessage | ThreadMessage["content"][number]) => {};
  useOriginalMessage: () => {};
  useOriginalMessages: () => unknown[];
};

declare const createMessageQueue: (driver: MessageQueueDriver) => MessageQueueController;

declare const createMessageRepositorySession: (options?: MessageRepositorySessionOptions) => {
  getMessages: () => readonly ThreadMessage[];
  readonly headId: string | null;
  export: () => ExportedMessageRepository;
  tryGetMessage: (messageId: string) => {
    parentId: string | null;
    message: ThreadMessage;
    index: number;
  } | undefined;
  tryGetMessages: (messageId: string) => readonly ThreadMessage[] | undefined;
  hasMessage: (messageId: string) => boolean;
  addOrUpdateMessage: (parentId: string | null, message: ThreadMessage) => void;
  deleteMessage: (messageId: string, replacementId?: string | null) => void;
  tryDeleteMessage: (messageId: string) => boolean;
  switchToBranch: (messageId: string) => void;
  resetHead: (messageId: string | null) => void;
  clear: () => void;
  updateMessage: (messageId: string, updater: (message: ThreadMessage) => ThreadMessage) => boolean;
  applyExternalMessageRepository: (loaded: ExportedMessageRepository) => void;
};

declare function createRequestHeaders(headersValue: Record<string, string> | Headers | (() => Promise<Record<string, string> | Headers>)): Promise<Headers>;

declare const createRuntimeExtras: <T extends object>(runtimeName: string) => RuntimeExtras<T>;

declare const createRuntimeExtrasBrand: <T extends object>(runtimeName: string) => RuntimeExtrasBrand<T>;

declare const createSimpleTitleAdapter: () => TitleGenerationAdapter;

declare const createSuggestionAdapter: (options: CreateSuggestionAdapterOptions) => SuggestionAdapter;

declare function createThreadMappingId(id: string): THREAD_MAPPING_ID;

declare const createToolCallCancellationStub: (toolCall: {
  readonly id: string;
  readonly name: string;
}) => {
  type: "tool";
  name: string;
  tool_call_id: string;
  content: string;
  status: "error";
};

declare function createVoiceSession(options: {
  abortSignal?: AbortSignal;
}, setup: (helpers: VoiceSessionHelpers) => Promise<VoiceSessionControls>): RealtimeVoiceAdapter.Session;

declare function dataUrlMediaType(value: string): string | undefined;

declare const defaultComponents: {
  Text: () => null;
  Reasoning: () => null;
  Source: () => null;
  Image: () => null;
  File: () => null;
  Unstable_Audio: () => null;
  ToolGroup: (_param16: PropsWithChildren) => ReactNode;
  ReasoningGroup: (_param17: PropsWithChildren) => ReactNode;
};

declare function defineMcpToolkit(definition: McpToolkitDefinition): Toolkit;

declare function defineToolkit<TArgsByName extends {
  [K in keyof TArgsByName]: Record<string, unknown>;
}, TResultByName extends {
  [K in keyof TArgsByName]: unknown;
} = {
  [K in keyof TArgsByName]: any;
}>(_definition: {
  [K in keyof TArgsByName]: ToolkitDefinitionEntryWithParameters<TArgsByName[K], TResultByName[K]>;
}): Toolkit & {
  [K in keyof TArgsByName]: ToolkitDefinitionEntryWithParameters<TArgsByName[K], TResultByName[K]>;
};

declare function defineToolkit<const TDefinition extends ToolkitDefinition>(_definition: TDefinition): Toolkit & TDefinition;

declare function detectImageMediaType(base64: string): string | undefined;

declare function externalTool(): never;

declare function fileMatchesAccept(file: {
  name: string;
  type: string;
}, acceptString: string): boolean;

declare const fromThreadMessageLike: (like: ThreadMessageLike, fallbackId: string, fallbackStatus: MessageStatus) => ThreadMessage;

declare const generateErrorMessageId: () => string;

declare const generateId: (size?: number) => string;

declare const getAutoStatus: (isLast: boolean, isRunning: boolean, hasInterruptedToolCalls: boolean, hasPendingToolCalls: boolean, error?: ReadonlyJSONValue, isCancelled?: boolean) => MessageStatus;

declare const getExternalStoreMessages: <T>(input: {
  messages: readonly ThreadMessage[];
} | ThreadMessage | ThreadMessage["content"][number]) => T[];

declare const getFileDataURL: (file: File) => Promise<string>;

declare const getMessageQuote: (state: MessageQuoteState) => QuoteInfo | undefined;

declare const getRenderComponent: (runtime: AssistantRuntime) => ComponentType | undefined;

declare const getThreadData: (state: RemoteThreadState, threadIdOrRemoteId: string) => RemoteThreadData | undefined;

declare const getThreadMessageText: (message: ThreadMessage | AppendMessage) => string;

declare const getThreadState: (runtime: ThreadRuntimeCore, threadListItemState: ThreadListItemState$1) => ThreadState$1;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare const groupPartByType: <TKey extends `group-${string}`>(map: Partial<Readonly<Record<GroupPartType, readonly TKey[]>>>) => ((part: PartState, context?: GroupByContext) => readonly TKey[]);

declare const hasUpcomingMessage: (isRunning: boolean, messages: readonly ThreadMessage[]) => boolean;

declare const hitl: typeof humanTool;

declare const hitlTool: typeof humanTool;

declare const httpUrlPattern: RegExp;

declare function humanTool(): never;

declare const inMemoryThreadListTransformScopes: (scopes: ScopesConfig, parent: AssistantClient) => void;

declare namespace entry_react_exports {
  export { AssistantContextConfig, AssistantDataUI, AssistantDataUIProps, AssistantInteractableProps, AssistantProviderBase, AssistantProviderBaseProps, AssistantRuntimeProvider, AssistantTool, AssistantToolProps, AssistantToolUI, AssistantToolUIProps, AssistantTransportCommand, AssistantTransportConnectionMetadata, AssistantTransportOptions, AssistantTransportProtocol, AsyncStorageLike, ChainOfThoughtByIndicesProvider, ChainOfThoughtPartByIndexProvider, ChainOfThoughtPrimitiveParts, CloudFileAttachmentAdapter, CloudThreadListAdapterOptions, ComposerAttachmentByIndexProvider, ComposerPrimitiveAttachmentByIndex, ComposerPrimitiveAttachments, ComposerPrimitiveIf, ComposerPrimitiveQueue, DataMessagePartComponent, DataMessagePartProps, DataRenderers, DataRenderersClientSchema, DataRenderersMethods, DataRenderersState, EmptyMessagePartComponent, EmptyMessagePartProps, EnrichedPartState, FileMessagePartComponent, FileMessagePartProps, GenerativeUIComponentRegistry, GenerativeUIMessagePartComponent, GenerativeUIMessagePartProps, GenerativeUIRender, GenerativeUIRenderError, GenerativeUIRenderProps, GroupByContext, ImageMessagePartComponent, ImageMessagePartProps, InteractableDefinition, InteractablePersistedState, InteractablePersistenceAdapter, InteractablePersistenceStatus, InteractableRegistration, InteractableStateSchema, Interactables, InteractablesClientSchema, InteractablesMethods, InteractablesState, JoinStrategy, LocalRuntimeOptions, McpAppResourceOutput, McpToolkitDefinition, McpToolkitEntry, McpToolkitToolConfig, MessageAttachmentByIndexProvider, MessageByIndexProvider, MessagePartComponent, MessagePartPrimitiveInProgress, MessagePrimitiveAttachmentByIndex, MessagePrimitiveAttachments, MessagePrimitiveGenerativeUI, MessagePrimitiveGroupedParts, MessagePrimitivePartByIndex, MessagePrimitiveParts, MessagePrimitiveQuote, PartByIndexProvider, PartPrimitiveMessages, PartPrimitiveMessagesImpl, PartState, ProviderToolConfig, QueueItemByIndexProvider, QueueItemByIndexProviderProps, QuoteMessagePartComponent, QuoteMessagePartProps, ReadonlyThreadProvider, ReasoningGroupComponent, ReasoningGroupProps, ReasoningMessagePartComponent, ReasoningMessagePartProps, RemoteThreadListHookInstanceManager, RemoteThreadListThreadListRuntimeCore, RuntimeAdapter, RuntimeAdapterProvider, RuntimeAdapters, RuntimeExtras, SendCommandsRequestBody, SourceMessagePartComponent, SourceMessagePartProps, StreamingTimingAccessors, StreamingTimingOptions, StreamingTimingState, SuggestionByIndexProvider, SuggestionByIndexProviderProps, TextMessagePartComponent, TextMessagePartProps, TextMessagePartProvider, ThreadListItemByIndexProvider, ThreadListItemPrimitiveTitle, ThreadListItemRuntimeProvider, ThreadListPrimitiveItemByIndex, ThreadListPrimitiveItems, ThreadPrimitiveMessageByIndex, ThreadPrimitiveMessages, ThreadPrimitiveMessagesImpl, ThreadPrimitiveSuggestionByIndex, ThreadPrimitiveSuggestions, ThreadPrimitiveSuggestionsImpl, ThreadPrimitiveUnstable_MessageById, TitleGenerationAdapter, ToolArgsStatus, ToolCallMessagePartComponent, ToolCallMessagePartProps, ToolCallText, ToolDefinition, Toolkit, ToolkitDefinition, ToolkitDefinitionEntry, Tools, ToolsClientSchema, ToolsMethods, ToolsState, Unstable_AudioMessagePartComponent, Unstable_AudioMessagePartProps, Unstable_InferInteractableState, Unstable_InteractableConfig, Unstable_InteractableDefinition, Unstable_InteractablePersistedState, Unstable_InteractablePersistenceAdapter, Unstable_InteractablePersistenceStatus, Unstable_InteractableRegistration, Unstable_InteractableStateSchema, Unstable_InteractableToolConfig, Unstable_InteractableToolRenderProps, Unstable_InteractableVersionInfo, Unstable_InteractablesClientSchema, Unstable_InteractablesConfig, Unstable_InteractablesMethods, Unstable_InteractablesState, UseActionBarCopyOptions, UseComposerIfProps, UseSuggestionTriggerOptions, convertExternalMessages, createCloudThreadListAdapter, createLocalStorageAdapter, createMessageConverter, createRuntimeExtras, createSimpleTitleAdapter, defineMcpToolkit, defineToolkit, externalTool, getMessageQuote, getRenderComponent, groupPartByType, hitl, hitlTool, humanTool, makeAssistantDataUI, makeAssistantTool, makeAssistantToolUI, defaultComponents as messagePartsDefaultComponents, providerTool, splitLocalRuntimeOptions, stubTool, unstable_Interactables, unstable_createRuntimeExtrasFromBrand, unstable_interactableTool, unstable_useInteractable, unstable_useInteractableState, unstable_useInteractableVersions, unstable_useThreadMessageIds, useActionBarCopy, useActionBarEdit, useActionBarFeedbackNegative, useActionBarFeedbackPositive, useActionBarReload, useActionBarSpeak, useActionBarStopSpeaking, useAssistantCloudThreadHistoryAdapter, useAssistantContext, useAssistantDataUI, useAssistantInstructions, useAssistantInteractable, useAssistantTool, useAssistantToolUI, useAssistantTransportRuntime, useAssistantTransportSendCommand, useAssistantTransportState, useAuiToolOverrides, useBranchPickerNext, useBranchPickerPrevious, useCloudThreadListAdapter, useCloudThreadListRuntime, useComposerAddAttachment, useComposerCancel, useComposerDictate, useComposerSend, useEditComposerCancel, useEditComposerSend, useExternalMessageConverter, useExternalStoreRuntime, useExternalStoreSharedOptions, useInlineRender, useInteractableState, useLocalRuntime, useMessageBranching, useMessageError, useMessageReload, useRemoteThreadListRuntime, useRuntimeAdapters, useStreamingTiming, useSuggestionTrigger, useThreadIsEmpty, useThreadIsRunning, useThreadListItemArchive, useThreadListItemDelete, useThreadListItemTrigger, useThreadListItemUnarchive, useThreadListLoadMore, useThreadListNew, useThreadMessages, useToolArgsStatus, useVoiceControls, useVoiceState, useVoiceVolume };
}

declare namespace entry_root_exports {
  export { AddToolResultOptions, AppendMessage, Assistant, AssistantContextConfig, AssistantError, AssistantErrorCode, AssistantFrameHost, AssistantFrameProvider, AssistantInstructionsConfig, AssistantRuntime, AssistantRuntimeCore, AssistantToolProps$1 as AssistantToolProps, Attachment, AttachmentAdapter, AttachmentAddErrorEvent, AttachmentAddErrorReason, AttachmentRuntime, AttachmentRuntimePath, AttachmentState$1 as AttachmentState, AttachmentStatus, ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult, ChatModelRunUpdate, CompleteAttachment, CompleteAttachmentStatus, ComposerRuntime, ComposerRuntimeCore, ComposerRuntimeEventCallback, ComposerRuntimeEventPayload, ComposerRuntimeEventType, ComposerRuntimePath, ComposerState$1 as ComposerState, CompositeAttachmentAdapter, CoreChatModelRunResult, CreateAppendMessage, CreateAttachment, CreateResumeRunConfig, CreateStartRunConfig, CreateSuggestionAdapterOptions, DataMessagePart, DictationAdapter, DictationState, EditComposerRuntime, EditComposerRuntimeCore, EditComposerState, ErrorDisplay, ErrorSeverity, ExportedMessageRepository, ExportedMessageRepositoryItem, ExternalStoreAdapter, ExternalStoreBranchChange, ExternalStoreMessageConverter, ExternalStoreSharedOptions, ExternalStoreThreadData, ExternalStoreThreadListAdapter, ExternalThreadBranchAdapter, ExternalThreadQueueAdapter, FRAME_MESSAGE_CHANNEL, FeedbackAdapter, FileMessagePart, FrameMessage, FrameMessageType, GenerativeUIMessagePart, GenerativeUINode, GenerativeUISpec, GenericThreadHistoryAdapter, ImageMessagePart, InMemoryThreadListAdapter, LanguageModelConfig, LanguageModelV1CallSettings, LocalRuntimeOptionsBase, MCP_APP_URI_SCHEME, McpAppMetadata, MessageFormatAdapter, MessageFormatItem, MessageFormatRepository, MessageNotSentError, MessagePartRuntime, MessagePartRuntimePath, MessagePartState, MessagePartStatus, MessagePartStreamStatus, MessageQueueController, MessageQueueDriver, MessageRole, MessageRuntime, MessageRuntimePath, MessageState$1 as MessageState, MessageStatus, MessageStorageEntry, MessageTiming, ModelContext$1 as ModelContext, ModelContextProvider, ModelContextRegistry, ModelContextRegistryInstructionHandle, ModelContextRegistryProviderHandle, ModelContextRegistryToolHandle, PartProviderMetadata, PendingAttachment, PendingAttachmentStatus, QueuePlacement, QuoteInfo, RealtimeVoiceAdapter, ReasoningMessagePart, RemoteThreadInitializeResponse, RemoteThreadListAdapter, RemoteThreadListOptions, RemoteThreadListPageOptions, RemoteThreadListProviderComponent, RemoteThreadListResponse, RemoteThreadMetadata, RespondToToolApprovalOptions, ResumeRunConfig, ResumeToolCallOptions, RunConfig, RuntimeAdapters, RuntimeCapabilities, SendOptions, SerializedModelContext, SerializedTool, SimpleImageAttachmentAdapter, SimpleTextAttachmentAdapter, SourceMessagePart, SourceProviderMetadata, SpeechState, SpeechSynthesisAdapter, StartRunConfig, StreamingTimingAccessors, StreamingTimingOptions, StreamingTimingState, SubmitFeedbackOptions, SubmittedFeedback, SuggestionAdapter, SuggestionAdapterGenerateOptions, TextMessagePart, ThreadAssistantMessage, ThreadAssistantMessagePart, ThreadComposerRuntime, ThreadComposerRuntimeCore, ThreadComposerState, ThreadHistoryAdapter, ThreadListItemCoreState, ThreadListItemEventCallback, ThreadListItemEventPayload, ThreadListItemEventType, ThreadListItemGenerateTitleOptions, ThreadListItemRuntime, ThreadListItemRuntimePath, ThreadListItemState$1 as ThreadListItemState, ThreadListItemStatus, ThreadListRuntime, ThreadListRuntimeCore, ThreadListState, ThreadMessage, ThreadMessageLike, ThreadRuntime, ThreadRuntimeCore, ThreadRuntimeEventCallback, ThreadRuntimeEventPayload, ThreadRuntimeEventType, ThreadRuntimePath, ThreadState$1 as ThreadState, ThreadStep, ThreadSuggestion, ThreadSystemMessage, ThreadUserMessage, ThreadUserMessagePart, ToolApprovalDisplay, ToolApprovalOption, ToolApprovalOptionKind, ToolApprovalResponse, ToolCallMessagePart, ToolCallMessagePartMcpMetadata, ToolCallMessagePartStatus, ToolCallTiming, ToolExecutionStatus, ToolModelContentPart, Unstable_AudioMessagePart, Unstable_DirectiveFormatter, Unstable_DirectiveSegment, Unstable_InteractableSnapshotEntry, Unstable_InteractableVersion, Unstable_TriggerAdapter, Unstable_TriggerCategory, Unstable_TriggerItem, Unsubscribe$1 as Unsubscribe, UserCommands, UserExternalState, VoiceSessionControls, VoiceSessionHelpers, VoiceSessionState, WebSpeechDictationAdapter, WebSpeechSynthesisAdapter, bindExternalStoreMessage, createMessageQueue, createRequestHeaders, createSuggestionAdapter, createVoiceSession, fromThreadMessageLike, generateId, getExternalStoreMessages, isAssistantError, isMcpAppUri, isMessageNotSentError, mergeModelContexts, pickExternalStoreSharedOptions, stepStreamingTiming, toAssistantError, tool, toolApprovalAcceptsText, unstable_defaultDirectiveFormatter, unstable_formatInteractableSnapshot, unstable_getInteractableSnapshots, unstable_getInteractableVersions };
}

declare namespace entry_store_exports {
  export { AttachmentClientSchema, AttachmentMeta, AttachmentMethods, AttachmentState, ChainOfThoughtClient, ChainOfThoughtClientSchema, ChainOfThoughtMeta, ChainOfThoughtMethods, ChainOfThoughtPart, ChainOfThoughtState, ComposerClientSchema, ComposerEvents, ComposerMeta, ComposerMethods, ComposerSendOptions, ComposerState, ExternalThread, ExternalThreadMessage, ExternalThreadProps, InMemoryThreadList, InMemoryThreadListProps, JoinStrategy, McpToolkitDefinition, McpToolkitEntry, McpToolkitToolConfig, MessageClientSchema, MessageMeta, MessageMethods, MessageState, ModelContext, ModelContextClientSchema, ModelContextMethods, ModelContextState, NoOpComposerClient, PartClientSchema, PartMeta, PartMethods, PartState, QueueItemClientSchema, QueueItemMeta, QueueItemMethods, QueueItemState, RemoteThreadList, RemoteThreadListProps, RuntimeAdapter, RuntimeExtrasBrand, SingleThreadList, StreamingTimingAccessors, StreamingTimingOptions, StreamingTimingState, Suggestion, SuggestionClientSchema, SuggestionConfig, SuggestionMeta, SuggestionMethods, SuggestionState, Suggestions, SuggestionsClientSchema, SuggestionsMethods, SuggestionsState, ThreadClientSchema, ThreadEvents, ThreadListItemClientSchema, ThreadListItemEvents, ThreadListItemMeta, ThreadListItemMethods, ThreadListItemState, ThreadMessageClient, ThreadMessageClientProps, ThreadMeta, ThreadMethods, ThreadState, ThreadsClientSchema, ThreadsEvents, ThreadsMethods, ThreadsState, ToolCallText$1 as ToolCallText, Toolkit, ToolkitDefinition, ToolkitDefinitionEntry, convertExternalMessages, createRuntimeExtrasBrand, defineMcpToolkit, defineToolkit, inMemoryThreadListTransformScopes, resolveToolCallText, runtimeAdapterTransformScopes, useExternalMessageConverter, useStreamingTiming };
}

declare namespace entry_internal_exports {
  export { AbortableThreadLoadPurpose, AssistantRuntimeImpl, AttachmentRuntimeImpl, BaseAssistantRuntimeCore, BaseComposerRuntimeCore, BaseSubject, BaseSubscribable, BaseThreadRuntimeCore, ComposerRuntimeCoreBinding, ComposerRuntimeImpl, CompositeContextProvider, ConverterCallback, DefaultEditComposerRuntimeCore, DefaultThreadComposerRuntimeCore, EMPTY_THREAD_CORE, EditComposerAttachmentRuntimeImpl, EditComposerRuntimeCoreBinding, EditComposerRuntimeImpl, EventSubscribable, EventSubscriptionSubject, ExportedMessageRepository, ExportedMessageRepositoryItem, ExternalStoreRuntimeCore, ExternalStoreThreadFactory, ExternalStoreThreadListRuntimeCore, ExternalStoreThreadRuntimeCore, FilePartSource, LazyMemoizeSubject, LocalRuntimeCore, LocalRuntimeOptionsBase, LocalThreadFactory, LocalThreadListRuntimeCore, LocalThreadRuntimeCore, MessageAttachmentRuntimeImpl, MessagePartRuntimeImpl, MessageRepository, MessageRepositorySession, MessageRepositorySessionOptions, MessageRuntimeImpl, MessageStateBinding, NestedSubscribable, NestedSubscriptionSubject, OptimisticState, ReadonlyThreadRuntimeCore, RemoteThreadData, RemoteThreadInitializeResponse, RemoteThreadListOptions, RemoteThreadState, SKIP_UPDATE, SKIP_UPDATE as SKIP_UPDATE_TYPE, ShallowMemoizeSubject, Subscribable, SubscribableWithState, THREAD_MAPPING_ID, ThreadComposerAttachmentRuntimeImpl, ThreadComposerRuntimeCoreBinding, ThreadComposerRuntimeImpl, ThreadListItemRuntimeBinding, ThreadListItemRuntimeImpl, ThreadListItemStateBinding, ThreadListRuntimeCoreBinding, ThreadListRuntimeImpl, ThreadMessageConverter, ThreadRuntimeCoreBinding, ThreadRuntimeImpl, ToolCallTreeEntry, ToolInvocationTracker, consumeSuggestionResult, createAbortableThreadLoad, createCloudThreadListAdapterCreateFallback, createMessageRepositorySession, createThreadMappingId, createToolCallCancellationStub, dataUrlMediaType, detectImageMediaType, fileMatchesAccept, fromThreadMessageLike, generateErrorMessageId, generateId, getAutoStatus, getFileDataURL, getThreadData, getThreadMessageText, getThreadState, hasUpcomingMessage, httpUrlPattern, invokeUserCallback, isAutoStatus, isCreateAttachment, isErrorMessageId, isJSONValue, isParsableUrl, isRecord, iterateToolCallParts, mapToolCallPartsDeep, notifyEventListeners, parseDataUrl, resolveFileMediaType, resolveFilePartSource, resolveImageMediaType, resolveToolApprovalResponse, scanPendingToolCalls, shouldContinue, stableStringifyToolArgs, symbolInnerMessage, toMediaWireUrl, toMessagePartStatus, trackToolArgsKeyOrder, updateStatusReducer, walkToolCallTree };
}

declare namespace entry_store_internal_exports {
  export { AttachmentRuntimeClient, ComposerClient, MessageClient, MessagePartClient, ThreadClient, ThreadListClient, ThreadListItemClient, actionBarCopyDisabled, actionBarEditDisabled, actionBarReloadDisabled, baseRuntimeAdapterTransformScopes, branchPickerNextDisabled, branchPickerPreviousDisabled, composerCancelDisabled, composerInputDisabled, composerSendDisabled, isDevelopment, messageErrorText, suggestionTriggerDisabled, threadListLoadMoreDisabled, useThreadSelectionEvents };
}

declare function invokeUserCallback<TArgs extends readonly unknown[]>(tag: string, name: string, callback: ((...args: TArgs) => unknown) | undefined, ...args: TArgs): void | Promise<void>;

declare const isAssistantError: (value: unknown) => value is AssistantError;

declare const isAutoStatus: (status: MessageStatus) => boolean;

declare const isCreateAttachment: (attachment: File | CreateAttachment) => attachment is CreateAttachment;

declare const isDevelopment: boolean;

declare const isErrorMessageId: (id: string) => boolean;

declare function isJSONValue(value: unknown, currentDepth?: number): value is ReadonlyJSONValue;

declare const isMcpAppUri: (uri: string | undefined) => boolean;

declare const isMessageNotSentError: (error: unknown) => error is MessageNotSentError;

declare function isParsableUrl(value: string): boolean;

declare function isRecord(value: unknown): value is Record<string, unknown>;

declare function iterateToolCallParts(content: readonly ThreadAssistantMessagePart[]): Generator<ToolCallMessagePart>;

declare const makeAssistantDataUI: <T = any>(dataUI: AssistantDataUIProps<T>) => AssistantDataUI;

declare const makeAssistantTool: <TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps<TArgs, TResult>) => AssistantTool;

declare const makeAssistantToolUI: <TArgs, TResult>(tool: AssistantToolUIProps<TArgs, TResult>) => AssistantToolUI;

declare function mapToolCallPartsDeep(content: readonly ThreadAssistantMessagePart[], fn: (part: ToolCallMessagePart) => ToolCallMessagePart): {
  content: readonly ThreadAssistantMessagePart[];
  changed: boolean;
};

declare const mergeModelContexts: (configSet: Set<ModelContextProvider>) => ModelContext$1;

declare const messageErrorText: (s: AssistantState) => string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray | undefined;

declare const notifyEventListeners: <T>(listeners: Iterable<EventListener<T>>, payloadOrFactory: T | (() => T), errorContext: string) => void;

declare function parseDataUrl(value: string): {
  mimeType: string;
  data: string;
} | null;

declare const pickExternalStoreSharedOptions: (options: ExternalStoreSharedOptions) => ExternalStoreSharedOptions;

declare function providerTool(_config: ProviderToolConfig): never;

declare function resolveFileMediaType(data: string, mimeType?: string | undefined): string;

declare const resolveFilePartSource: (part: {
  data: string;
  mimeType: string;
  sourceType?: string | undefined;
}) => FilePartSource;

declare function resolveImageMediaType(image: string, contentType?: string | undefined): string;

declare const resolveToolApprovalResponse: (approval: {
  readonly id: string;
  readonly display?: ToolApprovalDisplay;
  readonly allowFreeform?: boolean;
  readonly options?: readonly ToolApprovalOption[];
}, response: ToolApprovalResponse) => RespondToToolApprovalOptions;

declare const resolveToolCallText: <TArgs extends Record<string, unknown>, TResult, TValue>(text: ToolCallText$1<TArgs, TResult, TValue>, part: ToolCallTextPart<TArgs, TResult>) => TValue | undefined | null;

declare const runtimeAdapterTransformScopes: (scopes: ScopesConfig, parent: AssistantClient) => void;

declare const scanPendingToolCalls: <TMessage, TToolCall>(messages: readonly TMessage[], getMessage: (message: TMessage) => PendingToolCallMessage<TToolCall>, getToolCallId: (toolCall: TToolCall) => string) => TToolCall[];

declare const shouldContinue: (result: ThreadAssistantMessage, humanToolNames: string[] | undefined) => boolean;

declare const splitLocalRuntimeOptions: <T extends LocalRuntimeOptions>(options: T) => {
  localRuntimeOptions: {
    cloud: AssistantCloud | undefined;
    initialMessages: readonly ThreadMessageLike[] | undefined;
    maxSteps: number | undefined;
    adapters: Omit<{
      chatModel: ChatModelAdapter;
      history?: ThreadHistoryAdapter | undefined;
      attachments?: AttachmentAdapter | undefined;
      speech?: SpeechSynthesisAdapter | undefined;
      dictation?: DictationAdapter | undefined;
      voice?: RealtimeVoiceAdapter | undefined;
      feedback?: FeedbackAdapter | undefined;
      suggestion?: SuggestionAdapter | undefined;
    }, "chatModel"> | undefined;
    unstable_humanToolNames: string[] | undefined;
    unstable_enableMessageQueue: boolean | undefined;
    unstable_queueClearOnRewind: boolean | undefined;
    unstable_queueClearOnCancel: boolean | undefined;
  };
  otherOptions: Omit<T, "adapters" | "cloud" | "initialMessages" | "maxSteps" | "unstable_enableMessageQueue" | "unstable_humanToolNames" | "unstable_queueClearOnCancel" | "unstable_queueClearOnRewind">;
};

declare const stableStringifyToolArgs: (keyOrderCache: Map<string, Map<string, string[]>> | undefined, cacheKey: string, args: ReadonlyJSONObject) => string;

declare const stepStreamingTiming: <TMessage>(state: StreamingTimingState | null, messages: readonly TMessage[], isRunning: boolean, accessors: StreamingTimingAccessors<TMessage>, options: StreamingTimingOptions | undefined, now?: () => number) => {
  readonly state: StreamingTimingState | null;
  readonly timings: Record<string, MessageTiming>;
};

declare function stubTool(): never;

declare const suggestionTriggerDisabled: (s: AssistantState, send: boolean) => boolean;

declare const symbolInnerMessage: unique symbol;

declare const threadListLoadMoreDisabled: (s: AssistantState) => boolean;

declare const toAssistantError: (error: unknown) => AssistantError;

declare function toMediaWireUrl(payload: string, mediaType: string): string;

declare const toMessagePartStatus: (message: ThreadMessage, partIndex: number, part: ThreadUserMessagePart | ThreadAssistantMessagePart) => ToolCallMessagePartStatus;

declare function tool<const TSchema extends StandardSchemaParameters, TResult = any>(tool: Tool<StandardSchemaInput<TSchema>, TResult> & {
  parameters: TSchema;
}): Tool<StandardSchemaInput<TSchema>, TResult>;

declare function tool<TArgs extends Record<string, unknown>, TResult = any>(tool: Tool<TArgs, TResult>): Tool<TArgs, TResult>;

declare const toolApprovalAcceptsText: (approval: {
  readonly display?: ToolApprovalDisplay;
  readonly allowFreeform?: boolean;
}) => boolean;

declare const trackToolArgsKeyOrder: (keyOrderCache: Map<string, Map<string, string[]>> | undefined, cacheKey: string, args: ReadonlyJSONObject) => void;

declare const unstable_Interactables: Resource<ClientOutput<"unstable_interactables">, [
  (Unstable_InteractablesConfig | undefined)?
]>;

declare const unstable_createRuntimeExtrasFromBrand: <T extends object>(brand: RuntimeExtrasBrand<T>) => RuntimeExtras<T>;

declare const unstable_defaultDirectiveFormatter: Unstable_DirectiveFormatter;

declare function unstable_formatInteractableSnapshot(entry: Unstable_InteractableSnapshotEntry): string;

declare function unstable_getInteractableSnapshots(message: {
  metadata?: unknown;
}): Unstable_InteractableSnapshotEntry[] | undefined;

declare function unstable_getInteractableVersions(messages: readonly SnapshotCarrierMessage[], id: string, name: string): Unstable_InteractableVersion[];

declare const unstable_interactableTool: <TSchema extends Unstable_InteractableStateSchema>(config: Unstable_InteractableToolConfig<TSchema>) => ToolDefinition<Record<string, unknown>, {
  success: true;
}>;

declare const unstable_useInteractable: <TSchema extends Unstable_InteractableStateSchema>(name: string, config: Unstable_InteractableConfig<TSchema>) => readonly [
  Unstable_InferInteractableState<TSchema>,
  {
    id: string;
    version: Unstable_InteractableVersionInfo<Unstable_InferInteractableState<TSchema>> | undefined;
    setState: (updater: Unstable_InferInteractableState<TSchema> | ((prev: Unstable_InferInteractableState<TSchema>) => Unstable_InferInteractableState<TSchema>)) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  }
];

declare const unstable_useInteractableState: <TState>(id: string) => [
  TState | undefined,
  {
    setState: (updater: StateUpdater<TState>) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  }
];

declare const unstable_useInteractableVersions: <TState = unknown>(id: string, name: string) => (Omit<Unstable_InteractableVersion, "state"> & {
  state: TState;
  restore: () => void;
})[];

declare const unstable_useThreadMessageIds: () => readonly string[];

declare const updateStatusReducer: (state: RemoteThreadState, threadIdOrRemoteId: string, newStatus: "archived" | "deleted" | "regular") => RemoteThreadState;

declare const useActionBarCopy: (_param18?: UseActionBarCopyOptions) => {
  copy: () => void;
  disabled: boolean;
  isCopied: boolean;
};

declare const useActionBarEdit: () => {
  edit: () => void;
  disabled: boolean;
};

declare const useActionBarFeedbackNegative: () => {
  submit: () => void;
  isSubmitted: boolean;
};

declare const useActionBarFeedbackPositive: () => {
  submit: () => void;
  isSubmitted: boolean;
};

declare const useActionBarReload: () => {
  reload: () => void;
  disabled: boolean;
};

declare const useActionBarSpeak: () => {
  speak: () => Promise<void>;
  disabled: boolean;
};

declare const useActionBarStopSpeaking: () => {
  stopSpeaking: () => void;
  disabled: boolean;
};

declare function useAssistantCloudThreadHistoryAdapter(cloudRef: RefObject<AssistantCloud>): ThreadHistoryAdapter & {
  readonly feedback: FeedbackAdapter;
};

declare const useAssistantContext: (config: AssistantContextConfig) => void;

declare const useAssistantDataUI: (dataUI: AssistantDataUIProps | null) => void;

declare const useAssistantInstructions: (config: string | AssistantInstructionsConfig) => void;

declare const useAssistantInteractable: (name: string, config: AssistantInteractableProps) => string;

declare const useAssistantTool: <TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps<TArgs, TResult>) => void;

declare const useAssistantToolUI: (tool: AssistantToolUIProps<any, any> | null) => void;

declare const useAssistantTransportRuntime: <T>(options: AssistantTransportOptions<T>) => AssistantRuntime;

declare const useAssistantTransportSendCommand: () => (command: AssistantTransportCommand) => void;

declare function useAssistantTransportState(): UserExternalState;

declare function useAssistantTransportState<T>(selector: (state: UserExternalState) => T): T;

declare function useAuiToolOverrides(overrides: AuiToolOverrides): void;

declare const useBranchPickerNext: () => {
  next: () => void;
  disabled: boolean;
};

declare const useBranchPickerPrevious: () => {
  previous: () => void;
  disabled: boolean;
};

declare const useCloudThreadListAdapter: (adapter: CloudThreadListAdapterOptions) => RemoteThreadListAdapter;

declare function useCloudThreadListRuntime(_param19: CloudThreadListAdapter): AssistantRuntime;

declare const useComposerAddAttachment: () => {
  addAttachment: (file: File | CreateAttachment) => Promise<void>;
  disabled: boolean;
};

declare const useComposerCancel: () => {
  cancel: () => void;
  disabled: boolean;
};

declare const useComposerDictate: () => {
  startDictation: () => void;
  disabled: boolean;
};

declare const useComposerSend: () => {
  send: (opts?: ComposerSendOptions) => void;
  disabled: boolean;
};

declare const useEditComposerCancel: () => {
  cancel: () => void;
};

declare const useEditComposerSend: () => {
  send: () => void;
  disabled: boolean;
};

declare namespace useExternalMessageConverter {
  type Message = ExternalMessageConverterMessage;
  type Metadata = ExternalMessageConverterMetadata;
  type Callback<T> = ExternalMessageConverterCallback<T>;
}

declare const useExternalMessageConverter: <T extends WeakKey>(_param20: {
  callback: useExternalMessageConverter.Callback<T>;
  messages: T[];
  isRunning: boolean;
  joinStrategy?: JoinStrategy | undefined;
  metadata?: useExternalMessageConverter.Metadata | undefined;
}) => ThreadMessage[];

declare const useExternalStoreRuntime: <T>(store: ExternalStoreAdapter<T>) => AssistantRuntime;

declare const useExternalStoreSharedOptions: (options: ExternalStoreSharedOptions) => ExternalStoreSharedOptions;

declare const useInlineRender: <TArgs, TResult>(toolUI: FC<ToolCallMessagePartProps<TArgs, TResult>>) => FC<ToolCallMessagePartProps<TArgs, TResult>>;

declare const useInteractableState: <TState>(id: string, fallback: TState) => [
  TState,
  {
    setState: (updater: StateUpdater$1<TState>) => void;
    setSelected: (selected: boolean) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  }
];

declare const useLocalRuntime: (chatModel: ChatModelAdapter, _param21?: LocalRuntimeOptions) => AssistantRuntime;

declare const useMessageBranching: () => {
  branchNumber: number;
  branchCount: number;
  goToPrev: () => void;
  goToNext: () => void;
};

declare const useMessageError: () => string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray | undefined;

declare const useMessageReload: () => {
  reload: () => void;
  canReload: boolean;
};

declare const useRemoteThreadListRuntime: (options: RemoteThreadListOptions) => AssistantRuntime;

declare const useRuntimeAdapters: () => RuntimeAdapters | null;

declare const useStreamingTiming: <TMessage>(messages: readonly TMessage[], isRunning: boolean, accessors: StreamingTimingAccessors<TMessage>, options?: StreamingTimingOptions) => Record<string, MessageTiming>;

declare const useSuggestionTrigger: (_param22: UseSuggestionTriggerOptions) => {
  trigger: () => void;
  disabled: boolean;
};

declare const useThreadIsEmpty: () => boolean;

declare const useThreadIsRunning: () => boolean;

declare const useThreadListItemArchive: () => {
  archive: () => void;
};

declare const useThreadListItemDelete: () => {
  delete: () => void;
};

declare const useThreadListItemTrigger: () => {
  switchTo: () => void;
};

declare const useThreadListItemUnarchive: () => {
  unarchive: () => void;
};

declare const useThreadListLoadMore: () => {
  loadMore: () => void;
  disabled: boolean;
};

declare const useThreadListNew: () => {
  switchToNewThread: () => void;
};

declare const useThreadMessages: () => readonly MessageState[];

declare const useThreadSelectionEvents: (mainThreadId: string) => void;

declare const useToolArgsStatus: <TArgs extends Record<string, unknown> = Record<string, unknown>>() => ToolArgsStatus<TArgs>;

declare const useVoiceControls: () => {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
};

declare const useVoiceState: () => VoiceSessionState | undefined;

declare const useVoiceVolume: () => number;

declare function walkToolCallTree(messages: readonly ThreadMessage[]): Generator<ToolCallTreeEntry>;

export { entry_internal_exports as entry_internal, entry_react_exports as entry_react, entry_root_exports as entry_root, entry_store_exports as entry_store, entry_store_internal_exports as entry_store_internal };
