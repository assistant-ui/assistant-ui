import React, { ComponentProps, ComponentType, FC, PropsWithChildren, ReactElement, ReactNode } from "react";

import { Box, Text } from "ink";

import Spinner from "ink-spinner";

import { StandardSchemaV1 } from "@standard-schema/spec";

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
};

type CompleteAttachmentStatus = {
  type: "complete";
};

type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
};

type PendingAttachment = BaseAttachment & {
  status: PendingAttachmentStatus;
  file: File;
};

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type Attachment = PendingAttachment | CompleteAttachment;

type CreateAttachment = {
  id?: string;
  type?: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string;
  content: ThreadUserMessagePart[];
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

type JSONSchema7TypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

type JSONSchema7Type = string | number | boolean | JSONSchema7Object | JSONSchema7Array | null;

interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

interface JSONSchema7Array extends Array<JSONSchema7Type> {
}

type JSONSchema7Version = string;

type JSONSchema7Definition = JSONSchema7 | boolean;

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

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type TupleIndex<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

type ObjectKey<T> = keyof T & (string | number);

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

type TypeAtPath<T, P extends readonly any[]> = P extends [
  infer Head,
  ...infer Rest
] ? Head extends keyof T ? TypeAtPath<T[Head], Rest> : never : T;

type DeepPartial<T> = T extends readonly any[] ? readonly DeepPartial<T[number]>[] : T extends {
  [key: string]: any;
} ? {
  readonly [K in keyof T]?: DeepPartial<T[K]>;
} : T;

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type ToolResponseLike<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
  messages?: ReadonlyJSONValue | undefined;
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

interface ToolCallArgsReader<TArgs extends Record<string, unknown>> {
  get<PathT extends TypePath<TArgs>>(...fieldPath: PathT): Promise<TypeAtPath<TArgs, PathT>>;
  streamValues<PathT extends TypePath<TArgs>>(...fieldPath: PathT): AsyncIterableStream<DeepPartial<TypeAtPath<TArgs, PathT>>>;
  streamText<PathT extends TypePath<TArgs>>(...fieldPath: PathT): TypeAtPath<TArgs, PathT> extends string & (infer U) ? AsyncIterableStream<U> : never;
  forEach<PathT extends TypePath<TArgs>>(...fieldPath: PathT): NonNullable<TypeAtPath<TArgs, PathT>> extends Array<infer U> ? AsyncIterableStream<U> : never;
}

interface ToolCallResponseReader<TResult> {
  get: () => Promise<ToolResponse<TResult>>;
}

interface ToolCallReader<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> {
  args: ToolCallArgsReader<TArgs>;
  response: ToolCallResponseReader<TResult>;
  result: {
    get: () => Promise<TResult>;
  };
}

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
};

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolStreamCallFunction<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecutionContext) => void;

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type ProviderOptions = Record<string, Record<string, unknown>>;

type ToolDisplay = "inline" | "standalone";

type ToolBase<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = {
  streamCall?: ToolStreamCallFunction<TArgs, TResult>;
  display?: ToolDisplay;
};

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

type McpServerConfig = {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
  redirect?: "error" | "follow";
} | {
  type: "stdio";
  command: string;
  args?: readonly string[];
  env?: Record<string, string>;
  cwd?: string;
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

type Tool<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendTool<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolDeclaration<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = FrontendTool<TArgs, TResult> | BackendToolDeclaration<TArgs, TResult> | HumanTool<TArgs, TResult> | ProviderTool<TArgs, TResult> | McpTool | ToolWithoutType<TArgs, TResult>;

type ToolWithoutType<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (Omit<FrontendTool<TArgs, TResult>, "type"> | Omit<BackendTool<TArgs, TResult>, "type"> | Omit<HumanTool<TArgs, TResult>, "type"> | Omit<ProviderTool<TArgs, TResult>, "type">) & {
  type?: undefined;
};

type ObjectStreamOperation = {
  readonly type: "set";
  readonly path: readonly string[];
  readonly value: ReadonlyJSONValue;
} | {
  readonly type: "append-text";
  readonly path: readonly string[];
  readonly value: string;
};

type PartInit = {
  readonly type: "reasoning" | "text";
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
} | {
  readonly type: "update-state";
  readonly operations: ObjectStreamOperation[];
});

type AssistantStream = ReadableStream<AssistantStreamChunk>;

type AssistantStreamEncoder = ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk> & {
  headers?: Headers;
};

declare const AssistantStream: {
  toResponse(stream: AssistantStream, transformer: AssistantStreamEncoder): Response;
  fromResponse(response: Response, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
  toByteStream(stream: AssistantStream, transformer: ReadableWritablePair<Uint8Array<ArrayBuffer>, AssistantStreamChunk>): ReadableStream<Uint8Array<ArrayBuffer>>;
  fromByteStream(readable: ReadableStream<Uint8Array<ArrayBuffer>>, transformer: ReadableWritablePair<AssistantStreamChunk, Uint8Array<ArrayBuffer>>): ReadableStream<AssistantStreamChunk>;
};

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly parentId?: string;
};

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly parentId?: string;
};

type SourceProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
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

type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
};

type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
};

type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
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

type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  readonly spec: GenerativeUISpec;
  readonly id?: string;
  readonly parentId?: string;
};

type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("app" | "model")[];
};

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolApprovalOptionKind = "allow-always" | "allow-once" | "reject-always" | "reject-once";

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

type ThreadUserMessagePart = TextMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | Unstable_AudioMessagePart;

type ThreadAssistantMessagePart = TextMessagePart | ReasoningMessagePart | ToolCallMessagePart | SourceMessagePart | FileMessagePart | ImageMessagePart | DataMessagePart | GenerativeUIMessagePart;

type MessagePartStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
  readonly error?: unknown;
};

type ToolCallMessagePartStatus = {
  readonly type: "requires-action";
  readonly reason: "interrupt";
} | MessagePartStatus;

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

type ThreadStep = {
  readonly messageId?: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  } | undefined;
};

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
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

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

type MessageRole = ThreadMessage["role"];

type RunConfig = {
  readonly custom?: Record<string, unknown>;
};

type AppendMessage = Omit<ThreadMessage, "id"> & {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig | undefined;
  startRun?: boolean | undefined;
  steer?: boolean | undefined;
};

type AttachmentAdapter = {
  accept: string;
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
};

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

declare class CompositeAttachmentAdapter implements AttachmentAdapter {
  private _adapters;
  accept: string;
  constructor(adapters: AttachmentAdapter[]);
  add(state: {
    file: File;
  }): Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void, any>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
  remove(attachment: Attachment): Promise<void>;
}

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "negative" | "positive";
};

type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};

type Unsubscribe$1 = () => void;

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

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
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

declare function createVoiceSession(options: {
  abortSignal?: AbortSignal;
}, setup: (helpers: VoiceSessionHelpers) => Promise<VoiceSessionControls>): RealtimeVoiceAdapter.Session;

type LanguageModelV1CallSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  headers?: Record<string, string | undefined>;
};

type LanguageModelConfig = {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  reasoningEffort?: string;
};

type ModelContext$1 = {
  priority?: number | undefined;
  system?: string | undefined;
  tools?: Record<string, Tool<any, any>> | undefined;
  callSettings?: LanguageModelV1CallSettings | undefined;
  config?: LanguageModelConfig | undefined;
  unstable_composerMetadata?: Record<string, unknown> | undefined;
};

type ModelContextProvider = {
  getModelContext: () => ModelContext$1;
  subscribe?: (callback: () => void) => Unsubscribe$1;
};

type AssistantToolProps$1<TArgs extends Record<string, unknown>, TResult> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: unknown;
};

type AssistantInstructionsConfig = {
  disabled?: boolean | undefined;
  instruction: string;
};

type AssistantContextConfig = {
  getContext: () => string;
  disabled?: boolean | undefined;
};

declare const mergeModelContexts: (configSet: Set<ModelContextProvider>) => ModelContext$1;

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

type ChatModelAdapter = {
  run(options: ChatModelRunOptions): Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void>;
};

type DataPrefixedPart = {
  readonly type: `data-${string}`;
  readonly data: any;
};

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

declare const fromThreadMessageLike: (like: ThreadMessageLike, fallbackId: string, fallbackStatus: MessageStatus) => ThreadMessage;

type ExportedMessageRepositoryItem = {
  message: ThreadMessage;
  parentId: string | null;
  runConfig?: RunConfig;
};

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

declare class MessageRepository {
  private messages;
  private head;
  private root;
  private updateLevels;
  private performOp;
  private _messages;
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
  private evictOffBranchOptimisticMessages;
  switchToBranch(messageId: string): void;
  resetHead(messageId: string | null): void;
  clear(): void;
  export(): ExportedMessageRepository;
  import(_param0: ExportedMessageRepository): void;
}

type QuoteInfo = {
  readonly text: string;
  readonly messageId: string;
};

type QueueItemState = {
  readonly id: string;
  readonly prompt: string;
};

type AttachmentAddErrorReason = "adapter-error" | "no-adapter" | "not-accepted";

type AttachmentAddErrorEvent = {
  readonly reason: AttachmentAddErrorReason;
  readonly message: string;
  readonly attachmentId?: string;
  readonly error?: Error;
};

type ComposerRuntimeEventPayload = {
  send: Record<string, never>;
  attachmentAdd: Record<string, never>;
  attachmentAddError: AttachmentAddErrorEvent;
};

type ComposerRuntimeEventType = keyof ComposerRuntimeEventPayload;

type ComposerRuntimeEventCallback<E extends ComposerRuntimeEventType> = (payload: ComposerRuntimeEventPayload[E]) => void;

type DictationState = {
  readonly status: DictationAdapter.Status;
  readonly transcript?: string;
  readonly inputDisabled?: boolean;
};

type SendOptions = {
  startRun?: boolean;
  steer?: boolean;
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
  steerQueueItem: (queueItemId: string) => void;
  removeQueueItem: (queueItemId: string) => void;
  dictation: DictationState | undefined;
  startDictation: () => void;
  stopDictation: () => void;
  subscribe: (callback: () => void) => Unsubscribe$1;
  unstable_on: <E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>) => Unsubscribe$1;
}>;

type ThreadComposerRuntimeCore = ComposerRuntimeCore;

type EditComposerRuntimeCore = ComposerRuntimeCore & Readonly<{
  parentId: string | null;
  sourceId: string | null;
}>;

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

type AddToolResultOptions = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  result: ReadonlyJSONValue;
  isError: boolean;
  artifact?: ReadonlyJSONValue | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
};

type ResumeToolCallOptions = {
  toolCallId: string;
  payload: unknown;
};

type RespondToToolApprovalOptions = {
  approvalId: string;
  approved: boolean;
  optionId?: string;
  reason?: string;
};

type SubmitFeedbackOptions = {
  messageId: string;
  type: "negative" | "positive";
};

type ThreadSuggestion$1 = {
  prompt: string;
};

type SpeechState = {
  readonly messageId: string;
  readonly status: SpeechSynthesisAdapter.Status;
};

type VoiceSessionState = {
  readonly status: RealtimeVoiceAdapter.Status;
  readonly isMuted: boolean;
  readonly mode: RealtimeVoiceAdapter.Mode;
};

type ThreadRuntimeEventPayload = {
  runStart: Record<string, never>;
  runEnd: Record<string, never>;
  initialize: Record<string, never>;
  modelContextUpdate: Record<string, never>;
};

type ThreadRuntimeEventType = keyof ThreadRuntimeEventPayload;

type ThreadRuntimeEventCallback<E extends ThreadRuntimeEventType> = (payload: ThreadRuntimeEventPayload[E]) => void;

type StartRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
};

type ResumeRunConfig = StartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
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
  addToolResult: (options: AddToolResultOptions) => void;
  resumeToolCall: (options: ResumeToolCallOptions) => void;
  respondToToolApproval: (options: RespondToToolApprovalOptions) => void;
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
  steerQueueItem?: (queueItemId: string) => void;
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
  suggestions: readonly ThreadSuggestion$1[];
  extras: unknown;
  subscribe: (callback: () => void) => Unsubscribe$1;
  getVoiceVolume: () => number;
  subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;
  exportExternalState(): any;
  importExternalState(state: any): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
}>;

type SuggestionAdapterGenerateOptions = {
  messages: readonly ThreadMessage[];
};

type SuggestionAdapter = {
  generate: (options: SuggestionAdapterGenerateOptions) => Promise<readonly ThreadSuggestion$1[]> | AsyncGenerator<readonly ThreadSuggestion$1[], void>;
};

interface MessageStorageEntry<TPayload> {
  id: string;
  parent_id: string | null;
  format: string;
  content: TPayload;
}

interface MessageFormatItem<TMessage> {
  parentId: string | null;
  message: TMessage;
}

interface MessageFormatRepository<TMessage> {
  headId?: string | null;
  messages: MessageFormatItem<TMessage>[];
}

interface MessageFormatAdapter<TMessage, TStorageFormat extends Record<string, unknown>> {
  format: string;
  encode(item: MessageFormatItem<TMessage>): TStorageFormat;
  decode(stored: MessageStorageEntry<TStorageFormat>): MessageFormatItem<TMessage>;
  getId(message: TMessage): string;
}

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

type ThreadHistoryAdapter = {
  load(): Promise<ExportedMessageRepository & {
    state?: ReadonlyJSONValue;
    unstable_resume?: boolean;
  }>;
  resume?(options: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void, unknown>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
  delete?(items: ExportedMessageRepositoryItem[]): Promise<void>;
  withFormat?<TMessage, TStorageFormat extends Record<string, unknown>>(formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>): GenericThreadHistoryAdapter<TMessage>;
};

declare function tool<TArgs extends Record<string, unknown>, TResult = any>(tool: Tool<TArgs, TResult>): Tool<TArgs, TResult>;

type Unstable_InteractableSnapshotEntry = {
  id: string;
  name: string;
  state: unknown;
  partial?: boolean | undefined;
};

type SnapshotCarrierMessage = {
  role: string;
  metadata?: unknown;
  content?: readonly unknown[] | undefined;
};

declare function unstable_getInteractableSnapshots(message: {
  metadata?: unknown;
}): Unstable_InteractableSnapshotEntry[] | undefined;

declare function unstable_formatInteractableSnapshot(entry: Unstable_InteractableSnapshotEntry): string;

type Unstable_InteractableVersion = {
  state: unknown;
  origin: "create" | "update" | "user-edit";
  toolCallId?: string | undefined;
};

declare function unstable_getInteractableVersions(messages: readonly SnapshotCarrierMessage[], id: string, name: string): Unstable_InteractableVersion[];

interface ModelContextRegistryToolHandle<TArgs extends Record<string, unknown> = any, TResult = any> {
  update(tool: AssistantToolProps$1<TArgs, TResult>): void;
  remove(): void;
}

interface ModelContextRegistryInstructionHandle {
  update(config: string | AssistantInstructionsConfig): void;
  remove(): void;
}

interface ModelContextRegistryProviderHandle {
  remove(): void;
}

declare class ModelContextRegistry implements ModelContextProvider {
  private _tools;
  private _instructions;
  private _providers;
  private _subscribers;
  private _providerUnsubscribes;
  getModelContext(): ModelContext$1;
  subscribe(callback: () => void): Unsubscribe$1;
  private notifySubscribers;
  addTool<TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps$1<TArgs, TResult>): ModelContextRegistryToolHandle<TArgs, TResult>;
  addInstruction(config: string | AssistantInstructionsConfig): ModelContextRegistryInstructionHandle;
  addProvider(provider: ModelContextProvider): ModelContextRegistryProviderHandle;
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

type ThreadRuntimePath = {
  readonly ref: string;
  readonly threadSelector: {
    readonly type: "main";
  } | {
    readonly type: "threadId";
    readonly threadId: string;
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

type MessagePartRuntimePath = MessageRuntimePath & {
  readonly messagePartSelector: {
    readonly type: "index";
    readonly index: number;
  } | {
    readonly type: "toolCallId";
    readonly toolCallId: string;
  };
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

type ComposerRuntimePath = (ThreadRuntimePath & {
  readonly composerSource: "thread";
}) | (MessageRuntimePath & {
  readonly composerSource: "edit";
});

type ThreadListItemStatus = "archived" | "deleted" | "new" | "regular";

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

type ThreadListRuntimeCore = {
  readonly isLoading: boolean;
  readonly isLoadingMore?: boolean;
  readonly hasMore?: boolean;
  mainThreadId: string;
  newThreadId: string | undefined;
  threadIds: readonly string[];
  archivedThreadIds: readonly string[];
  readonly threadItems: Readonly<Record<string, ThreadListItemCoreState>>;
  getMainThreadRuntimeCore(): ThreadRuntimeCore;
  getThreadRuntimeCore(threadId: string): ThreadRuntimeCore;
  getItemById(threadId: string): ThreadListItemCoreState | undefined;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  getLoadThreadsPromise(): Promise<void>;
  reload?(): Promise<void>;
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
  generateTitle(threadId: string): Promise<void>;
  subscribe(callback: () => void): Unsubscribe$1;
};

type AssistantRuntimeCore = {
  readonly threads: ThreadListRuntimeCore;
  registerModelContextProvider: (provider: ModelContextProvider) => Unsubscribe$1;
  getModelContextProvider: () => ModelContextProvider;
  readonly RenderComponent?: ((...args: any[]) => unknown) | undefined;
};

declare const generateId: (size?: number) => string;

type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe$1;
};

type SubscribableWithState<TState, TPath> = Subscribable & {
  path: TPath;
  getState: () => TState;
};

declare class BaseSubscribable {
  private _subscribers;
  subscribe(callback: () => void): Unsubscribe$1;
  waitForUpdate(): Promise<void>;
  protected _notifySubscribers(): void;
}

type ComposerRuntimeCoreBinding = SubscribableWithState<ComposerRuntimeCore | undefined, ComposerRuntimePath>;

type ThreadComposerRuntimeCoreBinding = SubscribableWithState<ThreadComposerRuntimeCore | undefined, ComposerRuntimePath & {
  composerSource: "thread";
}>;

type EditComposerRuntimeCoreBinding = SubscribableWithState<EditComposerRuntimeCore | undefined, ComposerRuntimePath & {
  composerSource: "edit";
}>;

type MessageStateBinding = SubscribableWithState<ThreadMessage & {
  readonly parentId: string | null;
  readonly index: number;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
}, MessageRuntimePath>;

type ThreadListItemState$1 = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

type MessageAttachmentState = CompleteAttachment & {
  readonly source: "message";
};

type ThreadComposerAttachmentState = Attachment & {
  readonly source: "thread-composer";
};

type EditComposerAttachmentState = Attachment & {
  readonly source: "edit-composer";
};

type AttachmentState$1 = ThreadComposerAttachmentState | EditComposerAttachmentState | MessageAttachmentState;

type AttachmentSnapshotBinding<Source extends AttachmentRuntimeSource> = SubscribableWithState<AttachmentState$1 & {
  source: Source;
}, AttachmentRuntimePath & {
  attachmentSource: Source;
}>;

type AttachmentRuntimeSource = AttachmentState$1["source"];

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

declare abstract class AttachmentRuntimeImpl<Source extends AttachmentRuntimeSource = AttachmentRuntimeSource> implements AttachmentRuntime {
  private _core;
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

declare abstract class ComposerAttachmentRuntime<Source extends "edit-composer" | "thread-composer"> extends AttachmentRuntimeImpl<Source> {
  private _composerApi;
  constructor(core: AttachmentSnapshotBinding<Source>, _composerApi: ComposerRuntimeCoreBinding);
  remove(): Promise<void>;
}

declare class ThreadComposerAttachmentRuntimeImpl extends ComposerAttachmentRuntime<"thread-composer"> {
  get source(): "thread-composer";
}

declare class EditComposerAttachmentRuntimeImpl extends ComposerAttachmentRuntime<"edit-composer"> {
  get source(): "edit-composer";
}

declare class MessageAttachmentRuntimeImpl extends AttachmentRuntimeImpl<"message"> {
  get source(): "message";
  remove(): never;
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

type ThreadComposerState = BaseComposerState & {
  readonly type: "thread";
};

type EditComposerState = BaseComposerState & {
  readonly type: "edit";
  readonly parentId: string | null;
  readonly sourceId: string | null;
};

type ComposerState$1 = ThreadComposerState | EditComposerState;

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
  removeQueueItem(queueItemId: string): void;
  subscribe(callback: () => void): Unsubscribe$1;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe$1;
};

declare abstract class ComposerRuntimeImpl implements ComposerRuntime {
  protected _core: ComposerRuntimeCoreBinding;
  get path(): ComposerRuntimePath;
  abstract get type(): "edit" | "thread";
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
  removeQueueItem(queueItemId: string): void;
  setRole(role: MessageRole): void;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  subscribe(callback: () => void): Unsubscribe$1;
  private _eventSubscriptionSubjects;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe$1;
  abstract getAttachmentByIndex(idx: number): AttachmentRuntime;
}

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

declare class ThreadComposerRuntimeImpl extends ComposerRuntimeImpl implements ThreadComposerRuntime {
  get path(): ComposerRuntimePath & {
    composerSource: "thread";
  };
  get type(): "thread";
  private _getState;
  constructor(core: ThreadComposerRuntimeCoreBinding);
  getState(): ThreadComposerState;
  getAttachmentByIndex(idx: number): ThreadComposerAttachmentRuntimeImpl;
}

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

declare class EditComposerRuntimeImpl extends ComposerRuntimeImpl implements EditComposerRuntime {
  private _beginEdit;
  get path(): ComposerRuntimePath & {
    composerSource: "edit";
  };
  get type(): "edit";
  private _getState;
  constructor(core: EditComposerRuntimeCoreBinding, _beginEdit: () => void);
  __internal_bindMethods(): void;
  getState(): EditComposerState;
  beginEdit(): void;
  getAttachmentByIndex(idx: number): EditComposerAttachmentRuntimeImpl;
}

type MessagePartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type MessagePartSnapshotBinding = SubscribableWithState<MessagePartState, MessagePartRuntimePath>;

type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): void;
  readonly path: MessagePartRuntimePath;
  getState(): MessagePartState;
  subscribe(callback: () => void): Unsubscribe$1;
};

declare class MessagePartRuntimeImpl implements MessagePartRuntime {
  private contentBinding;
  private messageApi?;
  private threadApi?;
  get path(): MessagePartRuntimePath;
  constructor(contentBinding: MessagePartSnapshotBinding, messageApi?: MessageStateBinding | undefined, threadApi?: ThreadRuntimeCoreBinding | undefined);
  protected __internal_bindMethods(): void;
  getState(): MessagePartState;
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): void;
  subscribe(callback: () => void): Unsubscribe$1;
}

type MessageState$1 = ThreadMessage & {
  readonly parentId: string | null;
  readonly index: number;
  readonly isLast: boolean;
  readonly branchNumber: number;
  readonly branchCount: number;
  readonly speech: SpeechState | undefined;
};

type ReloadConfig = {
  runConfig?: RunConfig;
};

type MessageRuntime = {
  readonly path: MessageRuntimePath;
  readonly composer: EditComposerRuntime;
  getState(): MessageState$1;
  delete(): void | Promise<void>;
  reload(config?: ReloadConfig): void;
  speak(): void;
  stopSpeaking(): void;
  submitFeedback(_param1: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param2: {
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
  private _core;
  private _threadBinding;
  get path(): MessageRuntimePath;
  constructor(_core: MessageStateBinding, _threadBinding: ThreadRuntimeCoreBinding);
  protected __internal_bindMethods(): void;
  readonly composer: EditComposerRuntimeImpl;
  private _getEditComposerRuntimeCore;
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
  submitFeedback(_param3: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param4: {
    position?: "previous" | "next" | undefined;
    branchId?: string | undefined;
  }): void;
  unstable_getCopyText(): string;
  subscribe(callback: () => void): Unsubscribe$1;
  getMessagePartByIndex(idx: number): MessagePartRuntimeImpl;
  getMessagePartByToolCallId(toolCallId: string): MessagePartRuntimeImpl;
  getAttachmentByIndex(idx: number): MessageAttachmentRuntimeImpl;
}

type CreateStartRunConfig = {
  parentId: string | null;
  sourceId?: string | null | undefined;
  runConfig?: RunConfig | undefined;
};

type CreateResumeRunConfig = CreateStartRunConfig & {
  stream?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>;
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

type ThreadRuntimeCoreBinding = SubscribableWithState<ThreadRuntimeCore, ThreadRuntimePath> & {
  outerSubscribe(callback: () => void): Unsubscribe$1;
};

type ThreadListItemRuntimeBinding = SubscribableWithState<ThreadListItemState$1, ThreadListItemRuntimePath>;

type ThreadState$1 = {
  readonly threadId: string;
  readonly metadata: ThreadListItemState$1;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly capabilities: RuntimeCapabilities;
  readonly messages: readonly ThreadMessage[];
  readonly state: ReadonlyJSONValue;
  readonly suggestions: readonly ThreadSuggestion$1[];
  readonly extras: unknown;
  readonly speech: SpeechState | undefined;
  readonly voice: VoiceSessionState | undefined;
};

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

declare class ThreadRuntimeImpl implements ThreadRuntime {
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
      addToolResult: (options: AddToolResultOptions) => void;
      resumeToolCall: (options: ResumeToolCallOptions) => void;
      respondToToolApproval: (options: RespondToToolApprovalOptions) => void;
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
        steerQueueItem: (queueItemId: string) => void;
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
      steerQueueItem?: (queueItemId: string) => void;
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
      suggestions: readonly ThreadSuggestion$1[];
      extras: unknown;
      subscribe: (callback: () => void) => Unsubscribe$1;
      getVoiceVolume: () => number;
      subscribeVoiceVolume: (callback: () => void) => Unsubscribe$1;
      import(repository: ExportedMessageRepository): void;
      export(): ExportedMessageRepository;
      exportExternalState(): any;
      importExternalState(state: any): void;
      reset(initialMessages?: readonly ThreadMessageLike[]): void;
      unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
    }>;
  } & {
    outerSubscribe(callback: () => void): Unsubscribe$1;
  } & {
    getStateState(): ThreadState$1;
  };
  private readonly _threadBinding;
  constructor(threadBinding: ThreadRuntimeCoreBinding, threadListItemBinding: ThreadListItemRuntimeBinding);
  protected __internal_bindMethods(): void;
  readonly composer: ThreadComposerRuntimeImpl;
  getState(): ThreadState$1;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  subscribe(callback: () => void): Unsubscribe$1;
  getModelContext(): ModelContext$1;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(): any;
  importExternalState(state: any): void;
  cancelRun(): void;
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
  private _getMessageRuntime;
  private _eventSubscriptionSubjects;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe$1;
}

type ThreadListState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadItems: Readonly<Record<string, Omit<ThreadListItemState$1, "isMain" | "threadId">>>;
};

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
  loadMore(): Promise<void>;
};

type ThreadListRuntimeCoreBinding = ThreadListRuntimeCore;

declare class ThreadListRuntimeImpl implements ThreadListRuntime {
  private _core;
  private _runtimeFactory;
  private _getState;
  constructor(_core: ThreadListRuntimeCoreBinding, _runtimeFactory?: new (binding: ThreadRuntimeCoreBinding, threadListItemBinding: ThreadListItemRuntimeBinding) => ThreadRuntime);
  protected __internal_bindMethods(): void;
  switchToThread(threadId: string, options?: {
    unarchive?: boolean;
  }): Promise<void>;
  switchToNewThread(): Promise<void>;
  getLoadThreadsPromise(): Promise<void>;
  reload(): Promise<void>;
  loadMore(): Promise<void>;
  getState(): ThreadListState;
  subscribe(callback: () => void): Unsubscribe$1;
  private _mainThreadListItemRuntime;
  readonly main: ThreadRuntime;
  get mainItem(): ThreadListItemRuntimeImpl;
  getById(threadId: string): ThreadRuntime;
  getItemByIndex(idx: number): ThreadListItemRuntimeImpl;
  getArchivedItemByIndex(idx: number): ThreadListItemRuntimeImpl;
  getItemById(threadId: string): ThreadListItemRuntimeImpl;
}

type ThreadListItemEventPayload = {
  switchedTo: Record<string, never>;
  switchedAway: Record<string, never>;
};

type ThreadListItemEventType = keyof ThreadListItemEventPayload;

type ThreadListItemEventCallback<E extends ThreadListItemEventType> = (payload: ThreadListItemEventPayload[E]) => void;

type ThreadListItemRuntime = {
  readonly path: ThreadListItemRuntimePath;
  getState(): ThreadListItemState$1;
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

type ThreadListItemStateBinding = SubscribableWithState<ThreadListItemState$1, ThreadListItemRuntimePath>;

declare class ThreadListItemRuntimeImpl implements ThreadListItemRuntime {
  private _core;
  private _threadListBinding;
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
  generateTitle(): Promise<void>;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe$1;
  subscribe(callback: () => void): Unsubscribe$1;
  detach(): void;
  __internal_getRuntime(): ThreadListItemRuntime;
}

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
};

type AssistantRuntime = {
  readonly threads: ThreadListRuntime;
  readonly thread: ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
};

declare class AssistantRuntimeImpl implements AssistantRuntime {
  private readonly _core;
  readonly threads: ThreadListRuntimeImpl;
  readonly _thread: ThreadRuntime;
  constructor(_core: AssistantRuntimeCore);
  protected __internal_bindMethods(): void;
  get thread(): ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
}

type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

type RemoteThreadMetadata = {
  readonly status: "archived" | "regular";
  readonly remoteId: string;
  readonly externalId?: string | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
  nextCursor?: string | undefined;
};

type RemoteThreadListPageOptions = {
  after?: string | undefined;
};

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
  unstable_Provider?: ComponentType<PropsWithChildren> | undefined;
};

type RemoteThreadListOptions = {
  runtimeHook: () => AssistantRuntime;
  adapter: RemoteThreadListAdapter;
  initialThreadId?: string | undefined;
  threadId?: string | undefined;
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  allowNesting?: boolean | undefined;
};

declare class InMemoryThreadListAdapter implements RemoteThreadListAdapter {
  list(): Promise<RemoteThreadListResponse>;
  rename(): Promise<void>;
  updateCustom(): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(): Promise<AssistantStream>;
  fetch(_threadId: string): Promise<RemoteThreadMetadata>;
}

declare class CompositeContextProvider implements ModelContextProvider {
  private _providers;
  getModelContext(): ModelContext$1;
  registerModelContextProvider(provider: ModelContextProvider): () => void;
  private _subscribers;
  notifySubscribers(): void;
  subscribe(callback: () => void): () => void;
}

type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

type Resource<R, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<R, A>;

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type ClientEventsType<K extends ClientNames> = Record<`${K}.${string}`, unknown>;

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: {
    source: ClientNames;
    query: Record<E, E>;
  };
  events: Record<`${E}.`, E>;
};

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K>;
};

type ClientOutput<K extends ClientNames> = ClientSchemas[K]["methods"] & ClientMethods;

type ClientNames = keyof ClientSchemas extends infer U ? U : never;

type ClientEvents<K extends ClientNames> = "events" extends keyof ClientSchemas[K] ? ClientSchemas[K]["events"] extends ClientEventsType<K> ? ClientSchemas[K]["events"] : never : never;

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "query" | "source"> : never;

type ClientElement<K extends ClientNames> = ResourceElement<ClientOutput<K>>;

type Unsubscribe = () => void;

type AssistantState = {
  [K in ClientNames]: ClientSchemas[K]["methods"] extends {
    getState: () => infer S;
  } ? S : never;
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

type AssistantClient = {
  [K in ClientNames]: AssistantClientAccessor<K>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe;
};

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type ClientEventMap = UnionToIntersection<{
  [K in ClientNames]: ClientEvents<K>;
}[ClientNames]>;

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

type AssistantEventPayload = ClientEventMap & {
  "*": WildcardPayload;
};

type AssistantEventName = keyof AssistantEventPayload;

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type ParentOf<K extends ClientNames> = AssistantClientAccessor<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

type AssistantEventScope<TEvent extends AssistantEventName> = "*" | EventSource<TEvent> | (EventSource<TEvent> extends ClientNames ? AncestorsOf<EventSource<TEvent>> : never);

type AssistantEventSelector<TEvent extends AssistantEventName> = TEvent | {
  scope: AssistantEventScope<TEvent>;
  event: TEvent;
};

type AssistantEventCallback<TEvent extends AssistantEventName> = (payload: AssistantEventPayload[TEvent]) => void;

declare namespace AuiIf {
  type Props = PropsWithChildren<{
    condition: AuiIf.Condition;
  }>;
  type Condition = (state: AssistantState) => boolean;
}

declare const AuiIf: FC<AuiIf.Props>;

declare const Derived: <K extends ClientNames>(_config: Derived.Props<K>) => ResourceElement<null, [
  _config: Derived.Props<K>
]>;

type DerivedElement<K extends ClientNames> = ResourceElement<null, [
  Derived.Props<K>
]>;

declare namespace Derived {
  type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & ClientMeta<K>;
}

declare namespace useAui {
  type Props = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

declare function useAui(): AssistantClient;

declare function useAui(clients: useAui.Props): AssistantClient;

declare function useAui(clients: useAui.Props, config: {
  parent: null | AssistantClient;
}): AssistantClient;

declare const useAuiState: <T>(selector: (state: AssistantState) => T) => T;

declare const useAuiEvent: <TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>) => void;

declare const AuiProvider: (_param5: {
  value: AssistantClient;
  children: React.ReactNode;
}) => React.ReactElement;

declare abstract class BaseAssistantRuntimeCore implements AssistantRuntimeCore {
  protected readonly _contextProvider: CompositeContextProvider;
  abstract get threads(): ThreadListRuntimeCore;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe$1;
  getModelContextProvider(): ModelContextProvider;
}

declare abstract class BaseComposerRuntimeCore extends BaseSubscribable implements ComposerRuntimeCore {
  readonly isEditing = true;
  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected abstract getDictationAdapter(): DictationAdapter | undefined;
  protected enrichWithComposerMetadata<T extends {
    metadata?: {
      custom?: Record<string, unknown>;
    };
  }>(message: T, composerMetadata: Record<string, unknown> | undefined): T;
  get attachmentAccept(): string;
  private _attachments;
  get attachments(): readonly Attachment[];
  protected setAttachments(value: readonly Attachment[]): void;
  abstract get canCancel(): boolean;
  abstract get canSend(): boolean;
  get isEmpty(): boolean;
  private _text;
  get text(): string;
  private _role;
  get role(): "assistant" | "system" | "user";
  private _runConfig;
  get runConfig(): RunConfig;
  private _quote;
  get quote(): QuoteInfo | undefined;
  setQuote(quote: QuoteInfo | undefined): void;
  setText(value: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  private _emptyTextAndAttachments;
  private _onClearAttachments;
  reset(): Promise<void>;
  clearAttachments(): Promise<void>;
  send(options?: SendOptions): Promise<void>;
  cancel(): void;
  get queue(): readonly QueueItemState[];
  steerQueueItem(_queueItemId: string): void;
  removeQueueItem(_queueItemId: string): void;
  protected abstract handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">, options?: SendOptions): void;
  protected abstract handleCancel(): void;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  private _safeEmitAttachmentAddError;
  removeAttachment(attachmentId: string): Promise<void>;
  private _dictation;
  private _dictationSession;
  private _dictationUnsubscribes;
  private _dictationBaseText;
  private _currentInterimText;
  private _dictationSessionIdCounter;
  private _activeDictationSessionId;
  private _isCleaningDictation;
  get dictation(): DictationState | undefined;
  private _isActiveSession;
  startDictation(): void;
  stopDictation(): void;
  private _cleanupDictation;
  private _eventSubscribers;
  protected _notifyEventSubscribers<E extends ComposerRuntimeEventType>(event: E, payload: ComposerRuntimeEventPayload[E]): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): () => void;
}

declare class DefaultThreadComposerRuntimeCore extends BaseComposerRuntimeCore implements ThreadComposerRuntimeCore {
  private runtime;
  private _canCancel;
  get canCancel(): boolean;
  get canSend(): boolean;
  get queue(): readonly QueueItemState[];
  steerQueueItem(queueItemId: string): void;
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

declare const getAutoStatus: (isLast: boolean, isRunning: boolean, hasInterruptedToolCalls: boolean, hasPendingToolCalls: boolean, error?: ReadonlyJSONValue) => MessageStatus;

declare namespace entry_internal_exports {
  export { AssistantRuntimeImpl, BaseAssistantRuntimeCore, CompositeContextProvider, DefaultThreadComposerRuntimeCore, MessageRepository, ThreadListItemRuntimeBinding, ThreadListRuntimeCore, ThreadRuntimeCore, ThreadRuntimeCoreBinding, ThreadRuntimeImpl, getAutoStatus };
}

type PartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type PartMethods = {
  getState(): PartState;
  addToolResult(result: unknown | ToolResponse<unknown>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): void;
  __internal_getRuntime?(): MessagePartRuntime;
};

declare const AssistantRuntimeProvider: import("react").MemoExoticComponent<(_param6: {
  runtime: AssistantRuntime;
  aui?: AssistantClient | null;
  children: ReactNode;
}) => import("react").JSX.Element>;

type TitleGenerationAdapter = {
  generateTitle(messages: readonly ThreadMessage[]): Promise<string>;
};

declare const createSimpleTitleAdapter: () => TitleGenerationAdapter;

declare const DataRenderers: Resource<ClientOutput<"dataRenderers">, [
]>;

type EmptyMessagePartProps = {
  status: MessagePartStatus;
};

type EmptyMessagePartComponent = ComponentType<EmptyMessagePartProps>;

type TextMessagePartProps = MessagePartState & TextMessagePart;

type TextMessagePartComponent = ComponentType<TextMessagePartProps>;

type ReasoningMessagePartProps = MessagePartState & ReasoningMessagePart;

type ReasoningMessagePartComponent = ComponentType<ReasoningMessagePartProps>;

type ReasoningGroupProps = PropsWithChildren<{
  startIndex: number;
  endIndex: number;
}>;

type ReasoningGroupComponent = ComponentType<ReasoningGroupProps>;

type SourceMessagePartProps = MessagePartState & SourceMessagePart;

type SourceMessagePartComponent = ComponentType<SourceMessagePartProps>;

type ImageMessagePartProps = MessagePartState & ImageMessagePart;

type ImageMessagePartComponent = ComponentType<ImageMessagePartProps>;

type FileMessagePartProps = MessagePartState & FileMessagePart;

type FileMessagePartComponent = ComponentType<FileMessagePartProps>;

type Unstable_AudioMessagePartProps = MessagePartState & Unstable_AudioMessagePart;

type Unstable_AudioMessagePartComponent = ComponentType<Unstable_AudioMessagePartProps>;

type DataMessagePartProps<T = any> = MessagePartState & DataMessagePart<T>;

type DataMessagePartComponent<T = any> = ComponentType<DataMessagePartProps<T>>;

type ToolCallMessagePartProps<TArgs = any, TResult = unknown> = MessagePartState & ToolCallMessagePart<TArgs, TResult> & {
  addResult: (result: TResult | ToolResponse<TResult>) => void;
  resume: (payload: unknown) => void;
  respondToApproval: (response: ToolApprovalResponse) => void;
};

type ToolCallMessagePartComponent<TArgs = any, TResult = any> = ComponentType<ToolCallMessagePartProps<TArgs, TResult>>;

type QuoteMessagePartProps = QuoteInfo;

type QuoteMessagePartComponent = ComponentType<QuoteMessagePartProps>;

type GenerativeUIComponentRegistry = Record<string, ComponentType<any>>;

type Unstable_InteractableStateSchema = NonNullable<Extract<Tool, {
  parameters: unknown;
}>["parameters"]>;

type InteractableScope = "app" | "thread";

type Unstable_InteractableDefinition = {
  id: string;
  name: string;
  description: string;
  stateSchema: Unstable_InteractableStateSchema;
  state: unknown;
  initialState: unknown;
  scope?: InteractableScope | undefined;
};

type Unstable_InteractableRegistration = {
  id: string;
  name: string;
  description: string;
  stateSchema: Unstable_InteractableStateSchema;
  initialState: unknown;
  updateRender?: ToolCallMessagePartComponent | undefined;
};

type Unstable_InteractablePersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

type Unstable_InteractablesState = {
  definitions: Record<string, Unstable_InteractableDefinition>;
  persistence: Record<string, Unstable_InteractablePersistenceStatus>;
};

type Unstable_InteractablePersistedState = Record<string, {
  name: string;
  state: unknown;
}>;

type Unstable_InteractablePersistenceAdapter = {
  save(state: Unstable_InteractablePersistedState): void | Promise<void>;
  load?(): Unstable_InteractablePersistedState | null | undefined | Promise<Unstable_InteractablePersistedState | null | undefined>;
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

type Unstable_InteractablesClientSchema = {
  methods: Unstable_InteractablesMethods;
};

declare const unstable_Interactables: Resource<ClientOutput<"unstable_interactables">, [
  (Unstable_InteractablesConfig | undefined)?
]>;

type McpAppResourceOutput = {
  readonly render: ToolCallMessagePartComponent;
};

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

type ToolParameters<TArgs extends Record<string, unknown>> = ToolDeclaration<TArgs>["parameters"];

type ToolExecuteContext = Parameters<NonNullable<ToolDeclaration["execute"]>>[1];

type ToolExecute<TArgs extends Record<string, unknown>, TResult> = (args: TArgs, context: ToolExecuteContext) => TResult | Promise<TResult>;

type ToolStreamCall<TArgs extends Record<string, unknown>, TResult> = (reader: ToolCallReader<TArgs, TResult>, context: ToolExecuteContext) => void;

type ToolCallRunningText<TArgs extends Record<string, unknown>> = ReactNode | ((options: {
  args: TArgs;
}) => ReactNode);

type ToolCallCompleteText<TArgs extends Record<string, unknown>, TResult> = ReactNode | ((options: {
  args: TArgs;
  result: TResult | undefined;
}) => ReactNode);

type ToolCallText<TArgs extends Record<string, unknown>, TResult> = {
  running: ToolCallRunningText<TArgs>;
  complete?: ToolCallCompleteText<TArgs, TResult> | undefined;
} | {
  running?: ToolCallRunningText<TArgs> | undefined;
  complete: ToolCallCompleteText<TArgs, TResult>;
};

type ToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

type Toolkit = Record<string, ToolDefinition<any, any>>;

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

type ToolkitDefinitionInput<TArgs extends Record<string, unknown>, TResult> = WithRender<ToolDeclaration<TArgs, TResult> extends infer T ? T extends {
  streamCall?: unknown;
} ? OverrideToolDeclarationCallbacks<T, TArgs, TResult> : never : never, TArgs, TResult>;

type ToolkitDefinitionEntry<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolkitDefinitionInput<TArgs, TResult> | ToolDefinition<any, any>;

type ToolkitDefinitionEntryWithParameters<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = ToolkitDefinitionInput<TArgs, TResult> & {
  parameters: NonNullable<ToolParameters<TArgs>>;
};

type ToolkitDefinition<TArgsByName extends {
  [K in keyof TArgsByName]: Record<string, unknown>;
} = Record<string, any>, TResultByName extends {
  [K in keyof TArgsByName]: unknown;
} = {
  [K in keyof TArgsByName]: any;
}> = {
  [K in keyof TArgsByName]: ToolkitDefinitionEntry<TArgsByName[K], TResultByName[K]>;
};

declare const Tools: Resource<ClientOutput<"tools">, [
  {
    toolkit?: Toolkit;
    mcpApp?: ResourceElement<McpAppResourceOutput> | undefined;
  }
]>;

type AssistantToolProps<TArgs extends Record<string, unknown>, TResult> = AssistantToolProps$1<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
  renderText?: ToolCallText<TArgs, TResult> | undefined;
};

declare const useAssistantTool: <TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps<TArgs, TResult>) => void;

type AssistantTool = FC & {
  unstable_tool: AssistantToolProps<any, any>;
};

declare const makeAssistantTool: <TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps<TArgs, TResult>) => AssistantTool;

type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallMessagePartComponent<TArgs, TResult>;
  display?: "inline" | "standalone";
};

declare const useAssistantToolUI: (tool: AssistantToolUIProps<any, any> | null) => void;

type AssistantToolUI = FC & {
  unstable_tool: AssistantToolUIProps<any, any>;
};

declare const makeAssistantToolUI: <TArgs, TResult>(tool: AssistantToolUIProps<TArgs, TResult>) => AssistantToolUI;

type AssistantDataUIProps<T = any> = {
  name: string;
  render: DataMessagePartComponent<T>;
};

declare const useAssistantDataUI: (dataUI: AssistantDataUIProps | null) => void;

type AssistantDataUI = FC & {
  unstable_data: AssistantDataUIProps;
};

declare const makeAssistantDataUI: <T = any>(dataUI: AssistantDataUIProps<T>) => AssistantDataUI;

declare const useAssistantInstructions: (config: string | AssistantInstructionsConfig) => void;

declare const useAssistantContext: (config: AssistantContextConfig) => void;

declare const useInlineRender: <TArgs, TResult>(toolUI: FC<ToolCallMessagePartProps<TArgs, TResult>>) => FC<ToolCallMessagePartProps<TArgs, TResult>>;

declare function defineToolkit$1<TArgsByName extends {
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

declare function defineToolkit$1<const TDefinition extends ToolkitDefinition>(_definition: TDefinition): Toolkit & TDefinition;

type AuiToolOverride<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = Partial<Tool<TArgs, TResult>>;

type AuiToolOverrides = Record<string, AuiToolOverride<any, any>>;

declare function useAuiToolOverrides(overrides: AuiToolOverrides): void;

type ProviderToolDefinition<TArgs extends Record<string, unknown>> = Extract<Tool<TArgs, unknown>, {
  type: "provider";
}>;

type ProviderToolConfig<TArgs extends Record<string, unknown> = Record<string, unknown>> = Pick<ProviderToolDefinition<TArgs>, "args" | "parameters" | "providerId" | "providerOptions" | "supportsDeferredResults">;

type McpToolkitEntry = McpServerConfig | {
  server: McpServerConfig;
  prefix?: string | undefined;
};

type McpToolkitDefinition = Record<string, McpToolkitEntry>;

declare function defineMcpToolkit(definition: McpToolkitDefinition): Toolkit;

type InteractableStateSchema = NonNullable<Extract<Tool, {
  parameters: unknown;
}>["parameters"]>;

type AssistantInteractableProps = {
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: unknown;
  id?: string;
  selected?: boolean;
};

declare const useAssistantInteractable: (name: string, config: AssistantInteractableProps) => string;

type StateUpdater$1<TState> = TState | ((prev: TState) => TState);

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

type Unstable_InferInteractableState<TSchema> = TSchema extends {
  "~standard": {
    types?: {
      output: infer TOutput;
    } | undefined;
  };
} ? TOutput : unknown;

type Unstable_InteractableVersionInfo<TState> = {
  state: TState;
  isLatest: boolean;
  restore: () => void;
};

type Unstable_InteractableConfig<TSchema extends Unstable_InteractableStateSchema> = {
  description: string;
  stateSchema: TSchema;
  initialState: Unstable_InferInteractableState<TSchema>;
  id?: string | undefined;
  updateRender?: ToolCallMessagePartComponent | undefined;
};

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

type StateUpdater<TState> = TState | ((prev: TState) => TState);

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

type Unstable_InteractableToolRenderProps<TState> = {
  state: TState;
  setState: (updater: TState | ((prev: TState) => TState)) => void;
  version: Unstable_InteractableVersionInfo<TState> | undefined;
  id: string;
  streaming: boolean;
};

type Unstable_InteractableToolConfig<TSchema extends Unstable_InteractableStateSchema> = {
  description: string;
  stateSchema: TSchema;
  render: (props: Unstable_InteractableToolRenderProps<Unstable_InferInteractableState<TSchema>>) => ReactNode;
};

declare const unstable_interactableTool: <TSchema extends Unstable_InteractableStateSchema>(config: Unstable_InteractableToolConfig<TSchema>) => ToolDefinition<Record<string, unknown>, {
  success: true;
}>;

type PropFieldStatus = "complete" | "streaming";

type ToolArgsStatus<TArgs extends Record<string, unknown> = Record<string, unknown>> = {
  status: "complete" | "incomplete" | "requires-action" | "running";
  propStatus: Partial<Record<keyof TArgs, PropFieldStatus>>;
};

declare const useToolArgsStatus: <TArgs extends Record<string, unknown> = Record<string, unknown>>() => ToolArgsStatus<TArgs>;

declare const Interactables: Resource<ClientOutput<"interactables">, [
]>;

declare const MessageAttachmentByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const ComposerAttachmentByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const ThreadListItemRuntimeProvider: FC<PropsWithChildren<{
  runtime: ThreadListItemRuntime;
}>>;

declare const MessageByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const PartByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

declare const TextMessagePartProvider: FC<PropsWithChildren<{
  text: string;
  isRunning?: boolean;
}>>;

declare const ChainOfThoughtByIndicesProvider: FC<PropsWithChildren<{
  startIndex: number;
  endIndex: number;
}>>;

declare const ThreadListItemByIndexProvider: FC<PropsWithChildren<{
  index: number;
  archived: boolean;
}>>;

declare const ChainOfThoughtPartByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

type SuggestionByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

declare const SuggestionByIndexProvider: FC<SuggestionByIndexProviderProps>;

type RuntimeAdapters = {
  modelContext?: ModelContextProvider | undefined;
  history?: ThreadHistoryAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
};

declare namespace RuntimeAdapterProvider {
  type Props = {
    adapters: RuntimeAdapters;
    children: ReactNode;
  };
}

declare const RuntimeAdapterProvider: FC<RuntimeAdapterProvider.Props>;

declare const useRuntimeAdapters: () => RuntimeAdapters | null;

declare const useRemoteThreadListRuntime: (options: RemoteThreadListOptions) => AssistantRuntime;

type SamplingCallData = {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  duration_ms?: number;
};

type AssistantCloudAuthStrategy = {
  readonly strategy: "anon" | "api-key" | "jwt";
  getAuthHeaders(): Promise<Record<string, string> | false>;
  readAuthHeaders(headers: Headers): void;
};

type AssistantCloudTelemetryConfig = {
  enabled?: boolean;
  beforeReport?: (report: AssistantCloudRunReport) => AssistantCloudRunReport | null;
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

type MakeRequestOptions = {
  method?: "POST" | "PUT" | "DELETE" | undefined;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: object | undefined;
};

declare class AssistantCloudAPI {
  _auth: AssistantCloudAuthStrategy;
  _baseUrl: string;
  constructor(config: AssistantCloudConfig);
  initializeAuth(): Promise<boolean>;
  makeRawRequest(endpoint: string, options?: MakeRequestOptions): Promise<Response>;
  makeRequest(endpoint: string, options?: MakeRequestOptions): Promise<any>;
}

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: readonly unknown[];
};

type ReportToolCall = {
  tool_name: string;
  tool_call_id: string;
  tool_args?: string;
  tool_result?: string;
  tool_source?: "backend" | "frontend" | "mcp";
  start_ms?: number;
  end_ms?: number;
  sampling_calls?: SamplingCallData[];
};

type AssistantCloudRunReport = {
  thread_id: string;
  status: "completed" | "error" | "incomplete";
  total_steps?: number;
  tool_calls?: ReportToolCall[];
  steps?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    cached_input_tokens?: number;
    tool_calls?: ReportToolCall[];
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

declare class AssistantCloudRuns {
  private cloud;
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

type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudMessageCreateResponse = {
  message_id: string;
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
};

declare class AssistantCloudThreadMessages {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  list(threadId: string, query?: AssistantCloudThreadMessageListQuery): Promise<AssistantCloudThreadMessageListResponse>;
  create(threadId: string, body: AssistantCloudThreadMessageCreateBody): Promise<AssistantCloudMessageCreateResponse>;
  update(threadId: string, messageId: string, body: AssistantCloudThreadMessageUpdateBody): Promise<void>;
}

type AssistantCloudAuthTokensCreateResponse = {
  token: string;
};

declare class AssistantCloudAuthTokens {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  create(): Promise<AssistantCloudAuthTokensCreateResponse>;
}

type AssistantCloudThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
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

type AssistantCloudThreadsListResponse = {
  threads: CloudThread[];
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

type AssistantCloudThreadsUpdateBody = {
  title?: string | undefined;
  last_message_at?: Date | undefined;
  metadata?: unknown | undefined;
  is_archived?: boolean | undefined;
};

declare class AssistantCloudThreads {
  private cloud;
  readonly messages: AssistantCloudThreadMessages;
  constructor(cloud: AssistantCloudAPI);
  list(query?: AssistantCloudThreadsListQuery): Promise<AssistantCloudThreadsListResponse>;
  get(threadId: string): Promise<CloudThread>;
  create(body: AssistantCloudThreadsCreateBody): Promise<AssistantCloudThreadsCreateResponse>;
  update(threadId: string, body: AssistantCloudThreadsUpdateBody): Promise<void>;
  delete(threadId: string): Promise<void>;
}

type PdfToImagesRequestBody = {
  file_blob?: string | undefined;
  file_url?: string | undefined;
};

type PdfToImagesResponse = {
  success: boolean;
  urls: string[];
  message: string;
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

declare class AssistantCloudFiles {
  private cloud;
  constructor(cloud: AssistantCloudAPI);
  pdfToImages(body: PdfToImagesRequestBody): Promise<PdfToImagesResponse>;
  generatePresignedUploadUrl(body: GeneratePresignedUploadUrlRequestBody): Promise<GeneratePresignedUploadUrlResponse>;
}

declare class AssistantCloud {
  readonly threads: AssistantCloudThreads;
  readonly auth: {
    tokens: AssistantCloudAuthTokens;
  };
  readonly runs: AssistantCloudRuns;
  readonly files: AssistantCloudFiles;
  readonly telemetry: AssistantCloudTelemetryConfig;
  constructor(config: AssistantCloudConfig);
}

type AttachmentState = Attachment;

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

declare namespace ThreadPrimitiveMessageByIndex {
  type Props = {
    index: number;
    components: MessagesComponentConfig;
  };
}

declare const ThreadPrimitiveMessageByIndex: FC<ThreadPrimitiveMessageByIndex.Props>;

declare namespace ThreadPrimitiveUnstable_MessageById {
  type Props = {
    messageId: string;
    components: MessagesComponentConfig;
  };
}

declare const ThreadPrimitiveUnstable_MessageById: FC<ThreadPrimitiveUnstable_MessageById.Props>;

declare const ThreadPrimitiveMessages: import("react").NamedExoticComponent<ThreadPrimitiveMessages.Props>;

declare namespace MessagePrimitiveParts$1 {
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

declare namespace MessagePrimitivePartByIndex {
  type Props = {
    index: number;
    components: MessagePrimitiveParts$1.Props["components"];
  };
}

declare const MessagePrimitivePartByIndex: FC<MessagePrimitivePartByIndex.Props>;

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

declare const MessagePrimitiveParts$1: FC<MessagePrimitiveParts$1.Props>;

type MessageAttachmentsComponentConfig = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

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

declare namespace MessagePrimitiveAttachmentByIndex {
  type Props = {
    index: number;
    components?: MessageAttachmentsComponentConfig;
  };
}

declare const MessagePrimitiveAttachmentByIndex: FC<MessagePrimitiveAttachmentByIndex.Props>;

declare const MessagePrimitiveAttachments: FC<MessagePrimitiveAttachments.Props>;

type ComposerAttachmentsComponentConfig = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

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

declare namespace ComposerPrimitiveAttachmentByIndex {
  type Props = {
    index: number;
    components?: ComposerAttachmentsComponentConfig;
  };
}

declare const ComposerPrimitiveAttachmentByIndex: FC<ComposerPrimitiveAttachmentByIndex.Props>;

declare const ComposerPrimitiveAttachments: FC<ComposerPrimitiveAttachments.Props>;

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

type ThreadListItemState = {
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly status: ThreadListItemStatus;
  readonly custom?: Record<string, unknown> | undefined;
};

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

declare namespace MessagePartPrimitiveInProgress {
  type Props = PropsWithChildren;
}

declare const MessagePartPrimitiveInProgress: FC<MessagePartPrimitiveInProgress.Props>;

declare namespace ThreadListItemPrimitiveTitle {
  type Props = {
    fallback?: ReactNode;
  };
}

declare const ThreadListItemPrimitiveTitle: FC<ThreadListItemPrimitiveTitle.Props>;

type SuggestionState = {
  title: string;
  label: string;
  prompt: string;
};

type SuggestionsComponentConfig = {
  Suggestion: ComponentType;
};

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

declare namespace ThreadPrimitiveSuggestionByIndex {
  type Props = {
    index: number;
    components: SuggestionsComponentConfig;
  };
}

declare const ThreadPrimitiveSuggestionByIndex: FC<ThreadPrimitiveSuggestionByIndex.Props>;

declare const ThreadPrimitiveSuggestions: import("react").NamedExoticComponent<ThreadPrimitiveSuggestions.Props>;

type ComposerIfFilters = {
  editing: boolean | undefined;
  dictation: boolean | undefined;
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

type UseComposerIfProps = RequireAtLeastOne<ComposerIfFilters>;

declare namespace ComposerPrimitiveIf {
  type Props = PropsWithChildren<UseComposerIfProps>;
}

declare const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props>;

declare const unstable_useThreadMessageIds: () => readonly string[];

type UseActionBarCopyOptions = {
  copiedDuration?: number | undefined;
  copyToClipboard?: ((text: string) => void | Promise<void>) | undefined;
};

declare const useVoiceState: () => VoiceSessionState | undefined;

declare const useVoiceVolume: () => number;

declare const useVoiceControls: () => {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
};

type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

declare const useLocalRuntime: (chatModel: ChatModelAdapter, _param7?: LocalRuntimeOptions) => AssistantRuntime;

type CreateFileStorageAdapterOptions = {
  dir: string;
  prefix?: string | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
};

declare const createFileStorageAdapter: (options: CreateFileStorageAdapterOptions) => RemoteThreadListAdapter;

type OSCVariant = "osc777" | "osc9" | "osc99";

declare const ringBell: () => void;

declare const sendOSCNotification: (title: string, body?: string, variant?: OSCVariant) => void;

type IncompleteReason = Extract<MessageStatus, {
  type: "incomplete";
}>["reason"];

type NotificationEvent = {
  type: "task-complete";
  threadId: string;
  messageId: string;
  title: string;
} | {
  type: "task-incomplete";
  threadId: string;
  messageId: string;
  title: string;
  reason: IncompleteReason;
} | {
  type: "needs-input";
  threadId: string;
  messageId: string;
  title: string;
  reason: "interrupt";
};

type NotificationHandler<T extends NotificationEvent["type"] = NotificationEvent["type"]> = {
  bell?: boolean;
  osc?: boolean | OSCVariant;
  custom?: (event: Extract<NotificationEvent, {
    type: T;
  }>) => void;
};

type NotificationConfig = {
  enabled?: boolean;
  onTaskComplete?: NotificationHandler<"task-complete"> | false;
  onTaskIncomplete?: NotificationHandler<"task-incomplete"> | false;
  onNeedsInput?: NotificationHandler<"needs-input"> | false;
};

declare const useNotification: (config?: NotificationConfig) => void;

type ThreadRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ThreadRoot: (_param8: ThreadRootProps) => import("react").JSX.Element;

type MessageComponents = {
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

type WindowingProps = {
  windowSize?: number | undefined;
  windowOverscan?: number | undefined;
};

type ThreadMessagesProps = ({
  components: MessageComponents;
  children?: never;
} & WindowingProps) | ({
  children: (value: {
    message: ThreadMessage;
  }) => ReactNode;
  components?: never;
} & WindowingProps);

declare const ThreadMessages: FC<ThreadMessagesProps>;

type ThreadEmptyProps = {
  children: ReactNode;
};

declare const ThreadEmpty: (_param9: ThreadEmptyProps) => import("react").JSX.Element | null;

type ThreadIfProps = {
  children: ReactNode;
  empty?: boolean | undefined;
  running?: boolean | undefined;
};

declare const ThreadIf: (_param10: ThreadIfProps) => import("react").JSX.Element | null;

type PressableState = {
  isFocused: boolean;
  disabled: boolean;
};

type PressableProps = Omit<ComponentProps<typeof Box>, "children"> & {
  children: ReactNode | ((state: PressableState) => ReactNode);
  onPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
};

type ThreadSuggestionProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
  prompt: string;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

declare const ThreadSuggestion: (_param11: ThreadSuggestionProps) => import("react").JSX.Element;

declare namespace thread_d_exports {
  export { ThreadEmpty as Empty, ThreadEmptyProps as EmptyProps, ThreadIf as If, ThreadIfProps as IfProps, ThreadPrimitiveMessageByIndex as MessageByIndex, ThreadMessages as Messages, ThreadMessagesProps as MessagesProps, ThreadRoot as Root, ThreadRootProps as RootProps, ThreadSuggestion as Suggestion, ThreadPrimitiveSuggestionByIndex as SuggestionByIndex, ThreadSuggestionProps as SuggestionProps, ThreadPrimitiveSuggestions as Suggestions, ThreadPrimitiveUnstable_MessageById as Unstable_MessageById };
}

type ComposerRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ComposerRoot: (_param12: ComposerRootProps) => import("react").JSX.Element;

declare const ComposerAttachmentByIndex: import("react").FC<ComposerPrimitiveAttachmentByIndex.Props>;

declare const ComposerAttachments: import("react").FC<ComposerPrimitiveAttachments.Props>;

type ComposerInputProps = ComponentProps<typeof Box> & {
  submitOnEnter?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  multiLine?: boolean | undefined;
  onSubmit?: ((text: string) => void) | undefined;
};

declare const ComposerInput: (_param13: ComposerInputProps) => import("react").JSX.Element;

type ComposerSendProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ComposerSend: (_param14: ComposerSendProps) => import("react").JSX.Element;

type ComposerCancelProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ComposerCancel: (_param15: ComposerCancelProps) => import("react").JSX.Element;

type ComposerAddAttachmentProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ComposerAddAttachment: (_param16: ComposerAddAttachmentProps) => import("react").JSX.Element;

type ComposerQuoteProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ComposerQuote: (_param17: ComposerQuoteProps) => import("react").JSX.Element | null;

type ComposerQuoteTextProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

declare const ComposerQuoteText: (_param18: ComposerQuoteTextProps) => import("react").JSX.Element | null;

type ComposerQuoteDismissProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ComposerQuoteDismiss: (_param19: ComposerQuoteDismissProps) => import("react").JSX.Element;

declare namespace composer_d_exports {
  export { ComposerAddAttachment as AddAttachment, ComposerAddAttachmentProps as AddAttachmentProps, ComposerAttachmentByIndex as AttachmentByIndex, ComposerAttachments as Attachments, ComposerCancel as Cancel, ComposerCancelProps as CancelProps, ComposerPrimitiveIf as If, ComposerInput as Input, ComposerInputProps as InputProps, ComposerPrimitiveQueue as Queue, ComposerQuote as Quote, ComposerQuoteDismiss as QuoteDismiss, ComposerQuoteDismissProps as QuoteDismissProps, ComposerQuoteProps as QuoteProps, ComposerQuoteText as QuoteText, ComposerQuoteTextProps as QuoteTextProps, ComposerRoot as Root, ComposerRootProps as RootProps, ComposerSend as Send, ComposerSendProps as SendProps };
}

type QueueItemTextProps = ComponentProps<typeof Text>;

declare const QueueItemText: (_param20: QueueItemTextProps) => import("react").JSX.Element;

type QueueItemRemoveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const QueueItemRemove: (_param21: QueueItemRemoveProps) => import("react").JSX.Element;

type QueueItemSteerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const QueueItemSteer: (_param22: QueueItemSteerProps) => import("react").JSX.Element;

declare namespace queueItem_d_exports {
  export { QueueItemRemove as Remove, QueueItemRemoveProps as RemoveProps, QueueItemSteer as Steer, QueueItemSteerProps as SteerProps, QueueItemText as Text, QueueItemTextProps as TextProps };
}

type MessageRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const MessageRoot: (_param23: MessageRootProps) => import("react").JSX.Element;

type MessageContentPart = ThreadUserMessagePart | ThreadAssistantMessagePart;

type MessageContentProps = {
  renderText?: (props: {
    part: Extract<MessageContentPart, {
      type: "text";
    }>;
    index: number;
  }) => ReactElement;
  renderToolCall?: (props: {
    part: Extract<MessageContentPart, {
      type: "tool-call";
    }>;
    index: number;
  }) => ReactElement;
  renderImage?: (props: {
    part: Extract<MessageContentPart, {
      type: "image";
    }>;
    index: number;
  }) => ReactElement;
  renderReasoning?: (props: {
    part: Extract<MessageContentPart, {
      type: "reasoning";
    }>;
    index: number;
  }) => ReactElement;
  renderSource?: (props: {
    part: Extract<MessageContentPart, {
      type: "source";
    }>;
    index: number;
  }) => ReactElement;
  renderFile?: (props: {
    part: Extract<MessageContentPart, {
      type: "file";
    }>;
    index: number;
  }) => ReactElement;
  renderData?: (props: {
    part: Extract<MessageContentPart, {
      type: "data";
    }>;
    index: number;
  }) => ReactElement;
};

declare const MessageContent: (_param24: MessageContentProps) => import("react").JSX.Element;

declare namespace MessagePrimitiveParts {
  type Props = MessagePrimitiveParts$1.Props;
}

declare const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props>;

type MessageIfProps = {
  children: ReactNode;
  user?: boolean | undefined;
  assistant?: boolean | undefined;
  running?: boolean | undefined;
  last?: boolean | undefined;
};

declare const MessageIf: (_param25: MessageIfProps) => import("react").JSX.Element | null;

declare const MessageAttachmentByIndex: import("react").FC<MessagePrimitiveAttachmentByIndex.Props>;

declare const MessageAttachments: import("react").FC<MessagePrimitiveAttachments.Props>;

declare const MessageError: FC<PropsWithChildren>;

declare namespace message_d_exports {
  export { MessageAttachmentByIndex as AttachmentByIndex, MessageAttachments as Attachments, MessageContent as Content, MessageContentProps as ContentProps, MessageError as Error, MessageIf as If, MessageIfProps as IfProps, MessagePrimitivePartByIndex as PartByIndex, MessagePrimitiveParts as Parts, MessageRoot as Root, MessageRootProps as RootProps };
}

type ThreadListRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ThreadListRoot: (_param26: ThreadListRootProps) => import("react").JSX.Element;

type ThreadListItemsProps = {
  renderItem: (props: {
    threadId: string;
    index: number;
  }) => ReactElement;
};

declare const ThreadListItems: (_param27: ThreadListItemsProps) => import("react").JSX.Element;

type ThreadListNewProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ThreadListNew: (_param28: ThreadListNewProps) => import("react").JSX.Element;

declare namespace threadList_d_exports {
  export { ThreadListItems as Items, ThreadListItemsProps as ItemsProps, ThreadListNew as New, ThreadListNewProps as NewProps, ThreadListRoot as Root, ThreadListRootProps as RootProps };
}

type ActionBarCopyProps = Omit<PressableProps, "children" | "onPress"> & UseActionBarCopyOptions & {
  children: ReactNode | ((props: {
    isCopied: boolean;
  }) => ReactNode);
};

declare const ActionBarCopy: (_param29: ActionBarCopyProps) => import("react").JSX.Element;

type ActionBarEditProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ActionBarEdit: (_param30: ActionBarEditProps) => import("react").JSX.Element;

type ActionBarReloadProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ActionBarReload: (_param31: ActionBarReloadProps) => import("react").JSX.Element;

type ActionBarFeedbackPositiveProps = Omit<PressableProps, "children" | "onPress"> & {
  children: ReactNode | ((props: {
    isSubmitted: boolean;
  }) => ReactNode);
};

declare const ActionBarFeedbackPositive: (_param32: ActionBarFeedbackPositiveProps) => import("react").JSX.Element;

type ActionBarFeedbackNegativeProps = Omit<PressableProps, "children" | "onPress"> & {
  children: ReactNode | ((props: {
    isSubmitted: boolean;
  }) => ReactNode);
};

declare const ActionBarFeedbackNegative: (_param33: ActionBarFeedbackNegativeProps) => import("react").JSX.Element;

declare namespace actionBar_d_exports {
  export { ActionBarCopy as Copy, ActionBarCopyProps as CopyProps, ActionBarEdit as Edit, ActionBarEditProps as EditProps, ActionBarFeedbackNegative as FeedbackNegative, ActionBarFeedbackNegativeProps as FeedbackNegativeProps, ActionBarFeedbackPositive as FeedbackPositive, ActionBarFeedbackPositiveProps as FeedbackPositiveProps, ActionBarReload as Reload, ActionBarReloadProps as ReloadProps };
}

type BranchPickerPreviousProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const BranchPickerPrevious: (_param34: BranchPickerPreviousProps) => import("react").JSX.Element;

type BranchPickerNextProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const BranchPickerNext: (_param35: BranchPickerNextProps) => import("react").JSX.Element;

type BranchPickerNumberProps = ComponentProps<typeof Text>;

declare const BranchPickerNumber: (props: BranchPickerNumberProps) => import("react").JSX.Element;

type BranchPickerCountProps = ComponentProps<typeof Text>;

declare const BranchPickerCount: (props: BranchPickerCountProps) => import("react").JSX.Element;

declare namespace branchPicker_d_exports {
  export { BranchPickerCount as Count, BranchPickerCountProps as CountProps, BranchPickerNext as Next, BranchPickerNextProps as NextProps, BranchPickerNumber as Number, BranchPickerNumberProps as NumberProps, BranchPickerPrevious as Previous, BranchPickerPreviousProps as PreviousProps };
}

type AttachmentRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const AttachmentRoot: (_param36: AttachmentRootProps) => import("react").JSX.Element;

type AttachmentNameProps = ComponentProps<typeof Text>;

declare const AttachmentName: FC<AttachmentNameProps>;

type AttachmentThumbProps = ComponentProps<typeof Text>;

declare const AttachmentThumb: FC<AttachmentThumbProps>;

type AttachmentRemoveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const AttachmentRemove: (_param37: AttachmentRemoveProps) => import("react").JSX.Element;

type AttachmentStatusProps = Omit<ComponentProps<typeof Text>, "children"> & {
  showComplete?: boolean | undefined;
};

declare const AttachmentStatus: FC<AttachmentStatusProps>;

declare namespace attachment_d_exports {
  export { AttachmentName as Name, AttachmentNameProps as NameProps, AttachmentRemove as Remove, AttachmentRemoveProps as RemoveProps, AttachmentRoot as Root, AttachmentRootProps as RootProps, AttachmentStatus as Status, AttachmentStatusProps as StatusProps, AttachmentThumb as Thumb, AttachmentThumbProps as ThumbProps };
}

type ThreadListItemRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ThreadListItemRoot: (_param38: ThreadListItemRootProps) => import("react").JSX.Element;

type ThreadListItemTriggerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ThreadListItemTrigger: (_param39: ThreadListItemTriggerProps) => import("react").JSX.Element;

type ThreadListItemDeleteProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ThreadListItemDelete: (_param40: ThreadListItemDeleteProps) => import("react").JSX.Element;

type ThreadListItemArchiveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ThreadListItemArchive: (_param41: ThreadListItemArchiveProps) => import("react").JSX.Element;

type ThreadListItemUnarchiveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ThreadListItemUnarchive: (_param42: ThreadListItemUnarchiveProps) => import("react").JSX.Element;

declare namespace threadListItem_d_exports {
  export { ThreadListItemArchive as Archive, ThreadListItemArchiveProps as ArchiveProps, ThreadListItemDelete as Delete, ThreadListItemDeleteProps as DeleteProps, ThreadListItemRoot as Root, ThreadListItemRootProps as RootProps, ThreadListItemPrimitiveTitle as Title, ThreadListItemTrigger as Trigger, ThreadListItemTriggerProps as TriggerProps, ThreadListItemUnarchive as Unarchive, ThreadListItemUnarchiveProps as UnarchiveProps };
}

type ChainOfThoughtRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ChainOfThoughtRoot: (_param43: ChainOfThoughtRootProps) => import("react").JSX.Element;

type ChainOfThoughtAccordionTriggerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

declare const ChainOfThoughtAccordionTrigger: (_param44: ChainOfThoughtAccordionTriggerProps) => import("react").JSX.Element;

declare namespace chainOfThought_d_exports {
  export { ChainOfThoughtAccordionTrigger as AccordionTrigger, ChainOfThoughtAccordionTriggerProps as AccordionTriggerProps, ChainOfThoughtPrimitiveParts as Parts, ChainOfThoughtRoot as Root, ChainOfThoughtRootProps as RootProps };
}

type SuggestionTitleProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

declare const SuggestionTitle: (_param45: SuggestionTitleProps) => import("react").JSX.Element;

type SuggestionDescriptionProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

declare const SuggestionDescription: (_param46: SuggestionDescriptionProps) => import("react").JSX.Element;

type SuggestionTriggerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
};

declare const SuggestionTrigger: (_param47: SuggestionTriggerProps) => import("react").JSX.Element;

declare namespace suggestion_d_exports {
  export { SuggestionDescription as Description, SuggestionDescriptionProps as DescriptionProps, SuggestionTitle as Title, SuggestionTitleProps as TitleProps, SuggestionTrigger as Trigger, SuggestionTriggerProps as TriggerProps };
}

type ToolCallStatus = "complete" | "error" | "requires-action" | "running";

type ToolFallbackBaseProps = Omit<ToolCallMessagePartProps, "addResult" | "respondToApproval" | "resume"> & Partial<Pick<ToolCallMessagePartProps, "addResult" | "respondToApproval" | "resume">>;

type ToolFallbackProps = ToolFallbackBaseProps & {
  expanded?: boolean;
  maxArgLines?: number;
  maxResultLines?: number;
  maxResultPreviewLines?: number;
  renderHeader?: (props: {
    toolName: string;
    status: ToolCallStatus;
    expanded: boolean;
  }) => ReactNode;
  renderArgs?: (props: {
    args: unknown;
    argsText: string;
  }) => ReactNode;
  renderResult?: (props: {
    result: unknown;
    isError: boolean;
  }) => ReactNode;
};

declare const ToolFallback: (_param48: ToolFallbackProps) => import("react").JSX.Element;

declare namespace toolCall_d_exports {
  export { ToolFallback as Fallback, ToolFallbackProps as FallbackProps, ToolCallStatus };
}

type ErrorRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ErrorRoot: {
  (_param49: ErrorRootProps): import("react").JSX.Element | null;
  displayName: string;
};

type ErrorMessageProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

declare const ErrorMessage: {
  (_param50: ErrorMessageProps): import("react").JSX.Element | null;
  displayName: string;
};

declare namespace index_d_exports$2 {
  export { ErrorMessage as Message, ErrorMessageProps as MessageProps, ErrorRoot as Root, ErrorRootProps as RootProps };
}

type DiffLineType = "add" | "del" | "normal";

interface ParsedLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface ParsedFile {
  oldName?: string | undefined;
  newName?: string | undefined;
  lines: ParsedLine[];
  additions: number;
  deletions: number;
}

interface FoldedRegion {
  type: "fold";
  hiddenCount: number;
}

type DisplayLine = ParsedLine | FoldedRegion;

interface DiffFileInput {
  content: string;
  name?: string | undefined;
}

type DiffRootProps = ComponentProps<typeof Box> & {
  files?: ParsedFile[] | undefined;
  children: ReactNode;
};

declare const DiffRoot: {
  (_param51: DiffRootProps): import("react").JSX.Element;
  displayName: string;
};

type DiffHeaderProps = ComponentProps<typeof Box> & {
  fileIndex?: number;
};

declare const DiffHeader: {
  (_param52: DiffHeaderProps): import("react").JSX.Element | null;
  displayName: string;
};

type DiffContentProps = ComponentProps<typeof Box> & {
  fileIndex?: number | undefined;
  showLineNumbers?: boolean | undefined;
  contextLines?: number | undefined;
  maxLines?: number | undefined;
  renderLine?: ((props: {
    line: ParsedLine;
    index: number;
  }) => ReactNode) | undefined;
  renderFold?: ((props: {
    region: FoldedRegion;
    index: number;
  }) => ReactNode) | undefined;
};

declare const DiffContent: {
  (_param53: DiffContentProps): import("react").JSX.Element | null;
  displayName: string;
};

type DiffLineProps = ComponentProps<typeof Box> & {
  line: ParsedLine;
  showLineNumbers?: boolean;
  lineNumberWidth?: number;
};

declare const DiffLine: {
  (_param54: DiffLineProps): import("react").JSX.Element;
  displayName: string;
};

type DiffStatsProps = ComponentProps<typeof Box> & {
  fileIndex?: number;
};

declare const DiffStats: {
  (_param55: DiffStatsProps): import("react").JSX.Element | null;
  displayName: string;
};

declare namespace diff_d_exports {
  export { DiffContent as Content, DiffContentProps as ContentProps, DiffFileInput, DiffLineType, DisplayLine, FoldedRegion, DiffHeader as Header, DiffHeaderProps as HeaderProps, DiffLine as Line, DiffLineProps as LineProps, ParsedFile, ParsedLine, DiffRoot as Root, DiffRootProps as RootProps, DiffStats as Stats, DiffStatsProps as StatsProps };
}

type MessagePartPrimitiveTextProps = Omit<ComponentProps<typeof Text>, "children">;

declare namespace MessagePartPrimitiveText {
  type Props = MessagePartPrimitiveTextProps;
}

declare const MessagePartPrimitiveText: {
  (props: MessagePartPrimitiveText.Props): import("react").JSX.Element;
  displayName: string;
};

type MessagePartPrimitiveImageProps = Omit<ComponentProps<typeof Text>, "children">;

declare namespace MessagePartPrimitiveImage {
  type Props = MessagePartPrimitiveImageProps;
}

declare const MessagePartPrimitiveImage: {
  (props: MessagePartPrimitiveImage.Props): import("react").JSX.Element;
  displayName: string;
};

type MessagePartPrimitiveFileProps = Omit<ComponentProps<typeof Text>, "children">;

declare namespace MessagePartPrimitiveFile {
  type Props = MessagePartPrimitiveFileProps;
}

declare const MessagePartPrimitiveFile: {
  (props: MessagePartPrimitiveFile.Props): import("react").JSX.Element;
  displayName: string;
};

type MessagePartPrimitiveSourceProps = Omit<ComponentProps<typeof Text>, "children">;

declare namespace MessagePartPrimitiveSource {
  type Props = MessagePartPrimitiveSourceProps;
}

declare const MessagePartPrimitiveSource: {
  (props: MessagePartPrimitiveSource.Props): import("react").JSX.Element;
  displayName: string;
};

type MessagePartPrimitiveReasoningProps = Omit<ComponentProps<typeof Text>, "children">;

declare namespace MessagePartPrimitiveReasoning {
  type Props = MessagePartPrimitiveReasoningProps;
}

declare const MessagePartPrimitiveReasoning: {
  (props: MessagePartPrimitiveReasoning.Props): import("react").JSX.Element;
  displayName: string;
};

type MessagePartPrimitiveDataProps = Omit<ComponentProps<typeof Text>, "children">;

declare namespace MessagePartPrimitiveData {
  type Props = MessagePartPrimitiveDataProps;
}

declare const MessagePartPrimitiveData: {
  (props: MessagePartPrimitiveData.Props): import("react").JSX.Element;
  displayName: string;
};

declare namespace messagePart_d_exports {
  export { MessagePartPrimitiveData as Data, MessagePartPrimitiveFile as File, MessagePartPrimitiveImage as Image, MessagePartPrimitiveInProgress as InProgress, PartPrimitiveMessages as Messages, MessagePartPrimitiveReasoning as Reasoning, MessagePartPrimitiveSource as Source, MessagePartPrimitiveText as Text };
}

type LoadingRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const LoadingRoot: {
  (_param56: LoadingRootProps): import("react").JSX.Element | null;
  displayName: string;
};

declare const LOADING_FRAMES: {
  readonly dots: readonly [
    ".  ",
    ".. ",
    "..."
  ];
  readonly pulse: readonly [
    "*--",
    "-*-",
    "--*"
  ];
  readonly bar: readonly [
    "[=   ]",
    "[==  ]",
    "[=== ]",
    "[ ===]",
    "[  ==]",
    "[   =]"
  ];
  readonly bounce: readonly [
    "[*   ]",
    "[ *  ]",
    "[  * ]",
    "[   *]",
    "[  * ]",
    "[ *  ]"
  ];
};

type LoadingSpinnerVariant = "spinner" | keyof typeof LOADING_FRAMES;

type LoadingSpinnerProps = Omit<ComponentProps<typeof Text>, "children"> & {
  variant?: LoadingSpinnerVariant;
  type?: ComponentProps<typeof Spinner>["type"];
  intervalMs?: number;
};

declare const LoadingSpinner: {
  (_param57: LoadingSpinnerProps): import("react").JSX.Element;
  displayName: string;
};

type LoadingTextProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

declare const LoadingText: {
  (_param58: LoadingTextProps): import("react").JSX.Element;
  displayName: string;
};

type LoadingElapsedTimeProps = Omit<ComponentProps<typeof Text>, "children"> & {
  format?: (seconds: number) => string;
};

declare const LoadingElapsedTime: {
  (_param59: LoadingElapsedTimeProps): import("react").JSX.Element;
  displayName: string;
};

declare namespace index_d_exports$1 {
  export { LoadingElapsedTime as ElapsedTime, LoadingElapsedTimeProps as ElapsedTimeProps, LoadingRoot as Root, LoadingRootProps as RootProps, LoadingSpinner as Spinner, LoadingSpinnerProps as SpinnerProps, LoadingText as Text, LoadingTextProps as TextProps };
}

type StatusBarPrimitiveRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare namespace StatusBarPrimitiveRoot {
  type Props = StatusBarPrimitiveRootProps;
}

declare const StatusBarPrimitiveRoot: {
  (_param60: StatusBarPrimitiveRoot.Props): import("react").JSX.Element;
  displayName: string;
};

type StatusBarPrimitiveModelNameProps = Omit<ComponentProps<typeof Text>, "children"> & {
  name?: ReactNode;
};

declare namespace StatusBarPrimitiveModelName {
  type Props = StatusBarPrimitiveModelNameProps;
}

declare const StatusBarPrimitiveModelName: {
  (_param61: StatusBarPrimitiveModelName.Props): import("react").JSX.Element;
  displayName: string;
};

type StatusBarPrimitiveMessageCountProps = Omit<ComponentProps<typeof Text>, "children"> & {
  format?: (count: number) => string;
};

declare namespace StatusBarPrimitiveMessageCount {
  type Props = StatusBarPrimitiveMessageCountProps;
}

declare const StatusBarPrimitiveMessageCount: {
  (_param62: StatusBarPrimitiveMessageCount.Props): import("react").JSX.Element | null;
  displayName: string;
};

type StatusBarPrimitiveTokenCountProps = Omit<ComponentProps<typeof Text>, "children"> & {
  format?: (tokens: number) => string;
};

declare namespace StatusBarPrimitiveTokenCount {
  type Props = StatusBarPrimitiveTokenCountProps;
}

declare const StatusBarPrimitiveTokenCount: {
  (_param63: StatusBarPrimitiveTokenCount.Props): import("react").JSX.Element | null;
  displayName: string;
};

type StatusBarPrimitiveLatencyProps = Omit<ComponentProps<typeof Text>, "children"> & {
  format?: (tokensPerSecond: number) => string;
};

declare namespace StatusBarPrimitiveLatency {
  type Props = StatusBarPrimitiveLatencyProps;
}

declare const StatusBarPrimitiveLatency: {
  (_param64: StatusBarPrimitiveLatency.Props): import("react").JSX.Element | null;
  displayName: string;
};

type StatusType = "cancelled" | "error" | "idle" | "running";

type StatusBarPrimitiveStatusProps = Omit<ComponentProps<typeof Text>, "children"> & {
  format?: (status: StatusType) => string;
};

declare namespace StatusBarPrimitiveStatus {
  type Props = StatusBarPrimitiveStatusProps;
}

declare const StatusBarPrimitiveStatus: {
  (_param65: StatusBarPrimitiveStatus.Props): import("react").JSX.Element;
  displayName: string;
};

declare namespace statusBar_d_exports {
  export { StatusBarPrimitiveLatency as Latency, StatusBarPrimitiveMessageCount as MessageCount, StatusBarPrimitiveModelName as ModelName, StatusBarPrimitiveRoot as Root, StatusBarPrimitiveStatus as Status, StatusType, StatusBarPrimitiveTokenCount as TokenCount };
}

type DiffViewProps = Omit<ComponentProps<typeof Box>, "children"> & {
  patch?: string | undefined;
  oldFile?: DiffFileInput | undefined;
  newFile?: DiffFileInput | undefined;
  showLineNumbers?: boolean | undefined;
  contextLines?: number | undefined;
  maxLines?: number | undefined;
};

declare const DiffView: (_param66: DiffViewProps) => import("react").JSX.Element;

type ChecklistItemStatus = "complete" | "error" | "pending" | "running";

type ChecklistItemData = {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  detail?: string;
  children?: ChecklistItemData[];
};

type ChecklistRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

declare const ChecklistRoot: {
  (_param67: ChecklistRootProps): import("react").JSX.Element;
  displayName: string;
};

type ChecklistItemProps = ComponentProps<typeof Box> & {
  item: ChecklistItemData;
  depth?: number | undefined;
  maxDepth?: number | undefined;
};

declare const ChecklistItem: {
  (_param68: ChecklistItemProps): import("react").JSX.Element;
  displayName: string;
};

type ChecklistProgressProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
};

declare const ChecklistProgress: {
  (_param69: ChecklistProgressProps): import("react").JSX.Element;
  displayName: string;
};

declare namespace checklist_d_exports {
  export { ChecklistItem as Item, ChecklistItemProps as ItemProps, ChecklistProgress as Progress, ChecklistProgressProps as ProgressProps, ChecklistRoot as Root, ChecklistRootProps as RootProps };
}

type LiveChecklistProps = ComponentProps<typeof Box> & {
  items?: ChecklistItemData[] | undefined;
  formatToolName?: ((toolName: string) => string) | undefined;
  title?: string | undefined;
  showProgress?: boolean | undefined;
  maxDepth?: number | undefined;
};

declare const LiveChecklist: {
  (_param70: LiveChecklistProps): import("react").JSX.Element;
  displayName: string;
};

type UseToolCallChecklistOptions = {
  formatToolName?: ((toolName: string) => string) | undefined;
};

declare const useToolCallChecklist: (options?: UseToolCallChecklistOptions) => ChecklistItemData[];

declare function humanTool(): never;

declare const hitlTool: typeof humanTool;

declare const hitl: typeof humanTool;

declare function stubTool(): never;

declare function providerTool(config: ProviderToolConfig): never;

declare const defineToolkit: typeof defineToolkit$1;

type ThreadState = {
  readonly isEmpty: boolean;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly capabilities: RuntimeCapabilities;
  readonly messages: readonly MessageState[];
  readonly state: ReadonlyJSONValue;
  readonly suggestions: readonly ThreadSuggestion$1[];
  readonly extras: unknown;
  readonly speech: SpeechState | undefined;
  readonly voice: VoiceSessionState | undefined;
  readonly composer: ComposerState;
};

type ThreadsState = {
  readonly mainThreadId: string;
  readonly newThreadId: string | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadItems: readonly ThreadListItemState[];
  readonly main: ThreadState;
};

type ChainOfThoughtPart = Extract<PartState, {
  type: "tool-call";
} | {
  type: "reasoning";
}>;

type SuggestionConfig = string | {
  title: string;
  label: string;
  prompt: string;
};

declare const Suggestions: Resource<ClientOutput<"suggestions">, [
  suggestions?: SuggestionConfig[] | undefined
]>;

declare const ChainOfThoughtClient: Resource<ClientOutput<"chainOfThought">, [
  {
    parts: readonly ChainOfThoughtPart[];
    getMessagePart: (selector: {
      index: number;
    }) => PartMethods;
  }
]>;

declare const ModelContext: Resource<ClientOutput<"modelContext">, [
]>;

declare namespace entry_root_exports {
  export { actionBar_d_exports as ActionBarPrimitive, AppendMessage, AssistantClient, AssistantContextConfig, AssistantDataUI, AssistantDataUIProps, AssistantEventCallback, AssistantEventName, AssistantEventPayload, AssistantEventScope, AssistantEventSelector, AssistantInteractableProps, AssistantRuntime, AssistantRuntimeProvider, AssistantState, AssistantTool, AssistantToolProps, AssistantToolUI, AssistantToolUIProps, Attachment, AttachmentAdapter, attachment_d_exports as AttachmentPrimitive, AttachmentRuntime, AttachmentState, AuiIf, AuiProvider, branchPicker_d_exports as BranchPickerPrimitive, ChainOfThoughtByIndicesProvider, ChainOfThoughtClient, ChainOfThoughtPartByIndexProvider, chainOfThought_d_exports as ChainOfThoughtPrimitive, ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult, ChecklistItemData, ChecklistItemStatus, checklist_d_exports as ChecklistPrimitive, CompleteAttachment, ComposerAttachmentByIndexProvider, composer_d_exports as ComposerPrimitive, ComposerRuntime, ComposerState, CompositeAttachmentAdapter, CreateAttachment, CreateFileStorageAdapterOptions, DataMessagePart, DataMessagePartComponent, DataMessagePartProps, DataRenderers, diff_d_exports as DiffPrimitive, DiffView, DiffViewProps, EditComposerRuntime, EmptyMessagePartComponent, EmptyMessagePartProps, index_d_exports$2 as ErrorPrimitive, FeedbackAdapter, FileMessagePart, FileMessagePartComponent, FileMessagePartProps, ImageMessagePart, ImageMessagePartComponent, ImageMessagePartProps, InMemoryThreadListAdapter, Interactables, LanguageModelConfig, LanguageModelV1CallSettings, LiveChecklist, LiveChecklistProps, index_d_exports$1 as LoadingPrimitive, LocalRuntimeOptions, McpToolkitDefinition, MessageAttachmentByIndexProvider, MessageByIndexProvider, messagePart_d_exports as MessagePartPrimitive, message_d_exports as MessagePrimitive, MessageRole, MessageRuntime, MessageState, MessageStatus, ModelContext$1 as ModelContext, ModelContext as ModelContextClient, ModelContextProvider, ModelContextRegistry, ModelContextRegistryInstructionHandle, ModelContextRegistryProviderHandle, ModelContextRegistryToolHandle, NotificationConfig, NotificationEvent, NotificationHandler, OSCVariant, PartByIndexProvider, PendingAttachment, ProviderToolConfig, queueItem_d_exports as QueueItemPrimitive, QueueItemState, RealtimeVoiceAdapter, ReasoningGroupComponent, ReasoningGroupProps, ReasoningMessagePart, ReasoningMessagePartComponent, ReasoningMessagePartProps, RemoteThreadListAdapter, RemoteThreadListOptions, RunConfig, RuntimeAdapterProvider, RuntimeAdapters, RuntimeCapabilities, SimpleImageAttachmentAdapter, SimpleTextAttachmentAdapter, SourceMessagePart, SourceMessagePartComponent, SourceMessagePartProps, statusBar_d_exports as StatusBarPrimitive, SuggestionAdapter, SuggestionByIndexProvider, SuggestionConfig, suggestion_d_exports as SuggestionPrimitive, Suggestions, TextMessagePart, TextMessagePartComponent, TextMessagePartProps, TextMessagePartProvider, ThreadAssistantMessage, ThreadAssistantMessagePart, ThreadComposerRuntime, ThreadHistoryAdapter, ThreadListItemByIndexProvider, threadListItem_d_exports as ThreadListItemPrimitive, ThreadListItemRuntime, ThreadListItemRuntimeProvider, ThreadListItemState, threadList_d_exports as ThreadListPrimitive, ThreadListRuntime, ThreadMessage, ThreadMessageLike, thread_d_exports as ThreadPrimitive, ThreadRuntime, ThreadState, ThreadSystemMessage, ThreadUserMessage, ThreadUserMessagePart, ThreadsState, TitleGenerationAdapter, Tool, ToolArgsStatus, ToolCallMessagePart, ToolCallMessagePartComponent, ToolCallMessagePartProps, toolCall_d_exports as ToolCallPrimitive, ToolCallText, ToolDefinition, ToolModelContentPart, Toolkit, ToolkitDefinition, ToolkitDefinitionEntry, Tools, Unstable_AudioMessagePart, Unstable_AudioMessagePartComponent, Unstable_AudioMessagePartProps, Unstable_InferInteractableState, Unstable_InteractableConfig, Unstable_InteractableDefinition, Unstable_InteractablePersistedState, Unstable_InteractablePersistenceAdapter, Unstable_InteractablePersistenceStatus, Unstable_InteractableRegistration, Unstable_InteractableSnapshotEntry, Unstable_InteractableStateSchema, Unstable_InteractableToolConfig, Unstable_InteractableToolRenderProps, Unstable_InteractableVersion, Unstable_InteractableVersionInfo, Unstable_InteractablesClientSchema, Unstable_InteractablesConfig, Unstable_InteractablesMethods, Unstable_InteractablesState, Unsubscribe$1 as Unsubscribe, UseToolCallChecklistOptions, VoiceSessionControls, VoiceSessionHelpers, createFileStorageAdapter, createSimpleTitleAdapter, createVoiceSession, defineMcpToolkit, defineToolkit, fromThreadMessageLike, generateId, hitl, hitlTool, humanTool, makeAssistantDataUI, makeAssistantTool, makeAssistantToolUI, mergeModelContexts, providerTool, ringBell, sendOSCNotification, stubTool, tool, unstable_Interactables, unstable_formatInteractableSnapshot, unstable_getInteractableSnapshots, unstable_getInteractableVersions, unstable_interactableTool, unstable_useInteractable, unstable_useInteractableState, unstable_useInteractableVersions, unstable_useThreadMessageIds, useAssistantContext, useAssistantDataUI, useAssistantInstructions, useAssistantInteractable, useAssistantTool, useAssistantToolUI, useAui, useAuiEvent, useAuiState, useAuiToolOverrides, useInlineRender, useInteractableState, useLocalRuntime, useNotification, useRemoteThreadListRuntime, useRuntimeAdapters, useToolArgsStatus, useToolCallChecklist, useVoiceControls, useVoiceState, useVoiceVolume };
}

export { entry_internal_exports as entry_internal, entry_root_exports as entry_root };
