import React, { CSSProperties, ComponentPropsWithoutRef, ComponentRef, ComponentType, ElementRef, ElementType, FC, ForwardRefExoticComponent, KeyboardEventHandler, PropsWithChildren, ReactElement, ReactNode, RefAttributes, RefCallback, RefObject } from "react";

import { StoreApi } from "zustand";

import { Primitive } from "@radix-ui/react-primitive";

import { DropdownMenu, Popover } from "radix-ui";

import { TextareaAutosizeProps } from "react-textarea-autosize";

import { StandardSchemaV1 } from "@standard-schema/spec";

declare namespace Assistant {
  interface Commands {
  }
  interface ExternalState {
  }
}

type UserCommands = Assistant.Commands[keyof Assistant.Commands];

type UserExternalState = keyof Assistant.ExternalState extends never ? Record<string, unknown> : Assistant.ExternalState[keyof Assistant.ExternalState];

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

type Unsubscribe$1 = () => void;

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
  subscribe(listener: () => void): Unsubscribe$1;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe$1;
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

declare const AuiProvider: (_param0: {
  value: AssistantClient;
  children: React.ReactNode;
}) => React.ReactElement;

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

type AttachmentStatus = PendingAttachmentStatus | CompleteAttachmentStatus;

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

type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

type Unstable_TriggerCategory = {
  readonly id: string;
  readonly label: string;
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

type Unstable_DirectiveFormatter = {
  serialize(item: Unstable_TriggerItem): string;
  parse(text: string): readonly Unstable_DirectiveSegment[];
};

declare const unstable_defaultDirectiveFormatter: Unstable_DirectiveFormatter;

type FeedbackAdapterFeedback = {
  message: ThreadMessage;
  type: "negative" | "positive";
};

type FeedbackAdapter = {
  submit: (feedback: FeedbackAdapterFeedback) => void;
};

type Unsubscribe = () => void;

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

declare class WebSpeechSynthesisAdapter implements SpeechSynthesisAdapter {
  speak(text: string): SpeechSynthesisAdapter.Utterance;
}

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

declare class WebSpeechDictationAdapter implements DictationAdapter {
  private _language;
  private _continuous;
  private _interimResults;
  constructor(options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
  });
  static isSupported(): boolean;
  listen(): DictationAdapter.Session;
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
  subscribe?: (callback: () => void) => Unsubscribe;
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

type ChatModelRunUpdate = {
  readonly content: readonly ThreadAssistantMessagePart[];
  readonly metadata?: Record<string, unknown>;
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
  import(_param1: ExportedMessageRepository): void;
}

type QuoteInfo = {
  readonly text: string;
  readonly messageId: string;
};

type QueueItemState = {
  readonly id: string;
  readonly prompt: string;
};

type QueueItemMethods = {
  getState(): QueueItemState;
  steer(): void;
  remove(): void;
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
  subscribe: (callback: () => void) => Unsubscribe;
  unstable_on: <E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>) => Unsubscribe;
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

type ThreadSuggestion = {
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
  suggestions: readonly ThreadSuggestion[];
  extras: unknown;
  subscribe: (callback: () => void) => Unsubscribe;
  getVoiceVolume: () => number;
  subscribeVoiceVolume: (callback: () => void) => Unsubscribe;
  import(repository: ExportedMessageRepository): void;
  export(): ExportedMessageRepository;
  exportExternalState(repository?: ExportedMessageRepository): any;
  importExternalState(state: any): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe;
}>;

type SuggestionAdapterGenerateOptions = {
  messages: readonly ThreadMessage[];
};

type SuggestionAdapter = {
  generate: (options: SuggestionAdapterGenerateOptions) => Promise<readonly ThreadSuggestion[]> | AsyncGenerator<readonly ThreadSuggestion[], void>;
};

type Unstable_TriggerAdapter = {
  categories(): readonly Unstable_TriggerCategory[];
  categoryItems(categoryId: string): readonly Unstable_TriggerItem[];
  search?(query: string): readonly Unstable_TriggerItem[];
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

type ThreadForkedFrom = {
  readonly threadId: string;
  readonly messageId?: string | undefined;
};

type ThreadForkOptions = {
  fromMessageId?: string | undefined;
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

type ToolExecutionStatus = {
  type: "executing";
} | {
  type: "interrupt";
  payload: {
    type: "human";
    payload: unknown;
  };
};

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
  subscribe(callback: () => void): Unsubscribe;
  private notifySubscribers;
  addTool<TArgs extends Record<string, unknown>, TResult>(tool: AssistantToolProps$1<TArgs, TResult>): ModelContextRegistryToolHandle<TArgs, TResult>;
  addInstruction(config: string | AssistantInstructionsConfig): ModelContextRegistryInstructionHandle;
  addProvider(provider: ModelContextProvider): ModelContextRegistryProviderHandle;
}

declare class AssistantFrameHost implements ModelContextProvider {
  private _context;
  private _subscribers;
  private _pendingRequests;
  private _requestCounter;
  private _iframeWindow;
  private _targetOrigin;
  constructor(iframeWindow: Window, targetOrigin?: string);
  private handleMessage;
  private updateContext;
  private callTool;
  private sendRequest;
  private requestContext;
  private notifySubscribers;
  getModelContext(): ModelContext$1;
  subscribe(callback: () => void): Unsubscribe;
  dispose(): void;
}

declare class AssistantFrameProvider {
  private static _instance;
  private _providers;
  private _providerUnsubscribes;
  private _targetOrigin;
  private constructor();
  private static getInstance;
  private handleMessage;
  private handleToolCall;
  private sendMessage;
  private getModelContext;
  private broadcastUpdate;
  static addModelContextProvider(provider: ModelContextProvider, targetOrigin?: string): Unsubscribe;
  static dispose(): void;
}

type SerializedTool = {
  description?: string;
  parameters: any;
  disabled?: boolean;
  type?: string;
};

type SerializedModelContext = {
  system?: string;
  tools?: Record<string, SerializedTool>;
};

type FrameMessageType = "model-context-request" | "model-context-update" | "tool-call" | "tool-result";

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
  type: "tool-result";
  id: string;
  result?: unknown;
  error?: string;
};

declare const FRAME_MESSAGE_CHANNEL = "assistant-ui-frame";

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
  readonly forkedFrom?: ThreadForkedFrom | undefined;
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
  fork(threadId: string, options?: ThreadForkOptions): Promise<{
    threadId: string;
  }>;
  initialize(threadId: string): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(threadId: string): Promise<void>;
  subscribe(callback: () => void): Unsubscribe;
};

type AssistantRuntimeCore = {
  readonly threads: ThreadListRuntimeCore;
  registerModelContextProvider: (provider: ModelContextProvider) => Unsubscribe;
  getModelContextProvider: () => ModelContextProvider;
  readonly RenderComponent?: ((...args: any[]) => unknown) | undefined;
};

declare const generateId: (size?: number) => string;

type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe;
};

type SubscribableWithState<TState, TPath> = Subscribable & {
  path: TPath;
  getState: () => TState;
};

declare class BaseSubscribable {
  private _subscribers;
  subscribe(callback: () => void): Unsubscribe;
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
  readonly forkedFrom?: ThreadForkedFrom | undefined;
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

type AttachmentState = ThreadComposerAttachmentState | EditComposerAttachmentState | MessageAttachmentState;

type AttachmentSnapshotBinding<Source extends AttachmentRuntimeSource> = SubscribableWithState<AttachmentState & {
  source: Source;
}, AttachmentRuntimePath & {
  attachmentSource: Source;
}>;

type AttachmentRuntimeSource = AttachmentState["source"];

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

declare abstract class AttachmentRuntimeImpl<Source extends AttachmentRuntimeSource = AttachmentRuntimeSource> implements AttachmentRuntime {
  private _core;
  get path(): AttachmentRuntimePath & {
    attachmentSource: Source;
  };
  abstract get source(): Source;
  constructor(_core: AttachmentSnapshotBinding<Source>);
  protected __internal_bindMethods(): void;
  getState(): AttachmentState & {
    source: Source;
  };
  abstract remove(): Promise<void>;
  subscribe(callback: () => void): Unsubscribe;
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
  subscribe(callback: () => void): Unsubscribe;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
  startDictation(): void;
  stopDictation(): void;
  setQuote(quote: QuoteInfo | undefined): void;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe;
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
  subscribe(callback: () => void): Unsubscribe;
  private _eventSubscriptionSubjects;
  unstable_on<E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>): Unsubscribe;
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
  subscribe(callback: () => void): Unsubscribe;
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
  subscribe(callback: () => void): Unsubscribe;
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
  submitFeedback(_param2: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param3: {
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
  submitFeedback(_param4: {
    type: "positive" | "negative";
  }): void;
  switchToBranch(_param5: {
    position?: "previous" | "next" | undefined;
    branchId?: string | undefined;
  }): void;
  unstable_getCopyText(): string;
  subscribe(callback: () => void): Unsubscribe;
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
  outerSubscribe(callback: () => void): Unsubscribe;
};

type ThreadListItemRuntimeBinding = SubscribableWithState<ThreadListItemState$1, ThreadListItemRuntimePath>;

type ThreadState = {
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

type ThreadRuntime = {
  readonly path: ThreadRuntimePath;
  readonly composer: ThreadComposerRuntime;
  getState(): ThreadState;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(repository?: ExportedMessageRepository): any;
  importExternalState(state: any): void;
  subscribe(callback: () => void): Unsubscribe;
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
  subscribeVoiceVolume(callback: () => void): Unsubscribe;
  muteVoice(): void;
  unmuteVoice(): void;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe;
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
        subscribe: (callback: () => void) => Unsubscribe;
        unstable_on: <E extends ComposerRuntimeEventType>(event: E, callback: ComposerRuntimeEventCallback<E>) => Unsubscribe;
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
      suggestions: readonly ThreadSuggestion[];
      extras: unknown;
      subscribe: (callback: () => void) => Unsubscribe;
      getVoiceVolume: () => number;
      subscribeVoiceVolume: (callback: () => void) => Unsubscribe;
      import(repository: ExportedMessageRepository): void;
      export(): ExportedMessageRepository;
      exportExternalState(repository?: ExportedMessageRepository): any;
      importExternalState(state: any): void;
      reset(initialMessages?: readonly ThreadMessageLike[]): void;
      unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe;
    }>;
  } & {
    outerSubscribe(callback: () => void): Unsubscribe;
  } & {
    getStateState(): ThreadState;
  };
  private readonly _threadBinding;
  constructor(threadBinding: ThreadRuntimeCoreBinding, threadListItemBinding: ThreadListItemRuntimeBinding);
  protected __internal_bindMethods(): void;
  readonly composer: ThreadComposerRuntimeImpl;
  getState(): ThreadState;
  append(message: CreateAppendMessage): void;
  deleteMessage(messageId: string): void | Promise<void>;
  subscribe(callback: () => void): Unsubscribe;
  getModelContext(): ModelContext$1;
  startRun(config: CreateStartRunConfig): void;
  resumeRun(config: CreateResumeRunConfig): void;
  exportExternalState(repository?: ExportedMessageRepository): any;
  importExternalState(state: any): void;
  cancelRun(): void;
  stopSpeaking(): void;
  connectVoice(): void;
  disconnectVoice(): void;
  getVoiceVolume(): number;
  subscribeVoiceVolume(callback: () => void): Unsubscribe;
  muteVoice(): void;
  unmuteVoice(): void;
  export(): ExportedMessageRepository;
  import(data: ExportedMessageRepository): void;
  reset(initialMessages?: readonly ThreadMessageLike[]): void;
  getMessageByIndex(idx: number): MessageRuntimeImpl;
  getMessageById(messageId: string): MessageRuntimeImpl;
  private _getMessageRuntime;
  private _eventSubscriptionSubjects;
  unstable_on<E extends ThreadRuntimeEventType>(event: E, callback: ThreadRuntimeEventCallback<E>): Unsubscribe;
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
  subscribe(callback: () => void): Unsubscribe;
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
  fork(options?: ThreadForkOptions): Promise<{
    threadId: string;
  }>;
  detach(): void;
  subscribe(callback: () => void): Unsubscribe;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe;
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
  fork(options?: ThreadForkOptions): Promise<{
    threadId: string;
  }>;
  initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  generateTitle(): Promise<void>;
  unstable_on<E extends ThreadListItemEventType>(event: E, callback: ThreadListItemEventCallback<E>): Unsubscribe;
  subscribe(callback: () => void): Unsubscribe;
  detach(): void;
  __internal_getRuntime(): ThreadListItemRuntime;
}

declare const bindExternalStoreMessage: <T>(target: object, message: T | T[]) => void;

declare const getExternalStoreMessages: <T>(input: {
  messages: readonly ThreadMessage[];
} | ThreadMessage | ThreadMessage["content"][number]) => T[];

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

type ExternalThreadQueueAdapter = {
  items: readonly QueueItemState[];
  enqueue: (message: AppendMessage, options: {
    steer: boolean;
  }) => void;
  steer: (queueItemId: string) => void;
  remove: (queueItemId: string) => void;
  clear: (reason: "cancel-run" | "edit" | "reload") => void;
};

type ExternalStoreThreadData<TState extends "archived" | "regular"> = {
  status: TState;
  id: string;
  remoteId?: string | undefined;
  externalId?: string | undefined;
  forkedFrom?: ThreadForkedFrom | undefined;
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
  onFork?: ((threadId: string, options?: ThreadForkOptions) => Promise<{
    threadId: string;
  }> | {
    threadId: string;
  }) | undefined;
};

type ExternalStoreMessageConverter<T> = (message: T, idx: number) => ThreadMessageLike;

type ExternalStoreBranchChange = {
  headId: string | null;
  visibleMessageIds: readonly string[];
};

type ExternalStoreMessageConverterAdapter<T> = {
  convertMessage: ExternalStoreMessageConverter<T>;
};

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
  onExportExternalState?: ((repository?: ExportedMessageRepository) => any) | undefined;
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

type ExternalStoreAdapter<T = ThreadMessage> = ExternalStoreAdapterBase<T> & (T extends ThreadMessage ? object : ExternalStoreMessageConverterAdapter<T>);

type AssistantRuntime = {
  readonly threads: ThreadListRuntime;
  readonly thread: ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
};

declare class AssistantRuntimeImpl implements AssistantRuntime {
  private readonly _core;
  readonly threads: ThreadListRuntimeImpl;
  readonly _thread: ThreadRuntime;
  constructor(_core: AssistantRuntimeCore);
  protected __internal_bindMethods(): void;
  get thread(): ThreadRuntime;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
}

type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

type RemoteThreadMetadata = {
  readonly status: "archived" | "regular";
  readonly remoteId: string;
  readonly externalId?: string | undefined;
  readonly forkedFrom?: ThreadForkedFrom | undefined;
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
  fork?(remoteId: string, options?: ThreadForkOptions): Promise<RemoteThreadInitializeResponse>;
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

type ExternalStoreSharedOptions = Pick<ExternalStoreAdapter, "isDisabled" | "isSendDisabled" | "suggestions" | "unstable_capabilities">;

declare const pickExternalStoreSharedOptions: (options: ExternalStoreSharedOptions) => ExternalStoreSharedOptions;

type ExternalThreadBranchAdapter = {
  getBranches: (messageId: string) => readonly string[];
  switchToBranch: (branchId: string) => void;
};

type MessageQueueDriver = {
  run: (message: AppendMessage, options: {
    steer: boolean;
  }) => void;
  cancel?: (() => void) | undefined;
};

type MessageQueueController = {
  readonly adapter: ExternalThreadQueueAdapter;
  notifyBusy: () => void;
  notifyIdle: () => void;
  subscribe: (callback: () => void) => () => void;
};

declare const createMessageQueue: (driver: MessageQueueDriver) => MessageQueueController;

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

type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  isSendDisabled?: boolean;
  onNew?: (message: AppendMessage) => void;
  onEdit?: (message: AppendMessage) => void;
  onReload?: (parentId: string | null) => void;
  onStartRun?: () => void;
  onCancel?: () => void;
  queue?: ExternalThreadQueueAdapter;
  branches?: ExternalThreadBranchAdapter;
  onRespondToToolApproval?: (options: RespondToToolApprovalOptions) => void;
};

declare const ExternalThread: Resource<ClientOutput<"thread">, [
  ExternalThreadProps
]>;

type InMemoryThreadListProps = {
  thread: (threadId: string) => ResourceElement<ClientOutput<"thread">>;
  onSwitchToThread?: (threadId: string) => void;
  onSwitchToNewThread?: () => void;
};

declare const InMemoryThreadList: Resource<ClientOutput<"threads">, [
  props: InMemoryThreadListProps
]>;

type SingleThreadListProps = {
  thread: ClientElement<"thread">;
};

declare const SingleThreadList: Resource<ClientOutput<"threads">, [
  SingleThreadListProps
]>;

declare class CompositeContextProvider implements ModelContextProvider {
  private _providers;
  getModelContext(): ModelContext$1;
  registerModelContextProvider(provider: ModelContextProvider): () => void;
  private _subscribers;
  notifySubscribers(): void;
  subscribe(callback: () => void): () => void;
}

declare abstract class BaseAssistantRuntimeCore implements AssistantRuntimeCore {
  protected readonly _contextProvider: CompositeContextProvider;
  abstract get threads(): ThreadListRuntimeCore;
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
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
  connect(): Unsubscribe;
  handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">, options?: SendOptions): Promise<void>;
  handleCancel(): Promise<void>;
}

declare const getAutoStatus: (isLast: boolean, isRunning: boolean, hasInterruptedToolCalls: boolean, hasPendingToolCalls: boolean, error?: ReadonlyJSONValue) => MessageStatus;

declare namespace AssistantRuntimeProvider {
  type Props = PropsWithChildren<{
    runtime: AssistantRuntime;
    aui?: AssistantClient;
  }>;
}

declare const AssistantRuntimeProvider: import("react").NamedExoticComponent<AssistantRuntimeProvider.Props>;

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

type GenerativeUIMessagePartProps = MessagePartState & GenerativeUIMessagePart;

type GenerativeUIMessagePartComponent = ComponentType<GenerativeUIMessagePartProps>;

type GenerativeUIRenderProps = {
  spec: GenerativeUISpec;
  components: GenerativeUIComponentRegistry;
  Fallback?: ComponentType<{
    component: string;
    props?: unknown;
  }> | undefined;
};

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
  register(def: Unstable_InteractableRegistration): Unsubscribe;
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

type ToolRegistration = {
  readonly render: ToolCallMessagePartComponent;
  readonly standalone: boolean;
};

type ToolsState = {
  toolUIs: Record<string, readonly ToolRegistration[]>;
  mcpApp?: McpAppResourceOutput | undefined;
  tools: Record<string, ToolCallMessagePartComponent[]>;
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

declare function stubTool(): never;

declare function externalTool(): never;

type AuiToolOverride<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = Partial<Tool<TArgs, TResult>>;

type AuiToolOverrides = Record<string, AuiToolOverride<any, any>>;

declare function useAuiToolOverrides(overrides: AuiToolOverrides): void;

declare function humanTool(): never;

declare const hitlTool: typeof humanTool;

declare const hitl: typeof humanTool;

type ProviderToolDefinition<TArgs extends Record<string, unknown>> = Extract<Tool<TArgs, unknown>, {
  type: "provider";
}>;

type ProviderToolConfig<TArgs extends Record<string, unknown> = Record<string, unknown>> = Pick<ProviderToolDefinition<TArgs>, "args" | "parameters" | "providerId" | "providerOptions" | "supportsDeferredResults">;

declare function providerTool(_config: ProviderToolConfig): never;

type McpToolkitDefinition = Record<string, McpServerConfig>;

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

type SuggestionByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

declare const SuggestionByIndexProvider: FC<SuggestionByIndexProviderProps>;

declare namespace ReadonlyThreadProvider {
  type Props = PropsWithChildren<{
    messages: readonly ThreadMessage[];
  }>;
}

declare const ReadonlyThreadProvider: FC<ReadonlyThreadProvider.Props>;

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

declare const useExternalStoreRuntime: <T>(store: ExternalStoreAdapter<T>) => AssistantRuntime;

declare const useExternalStoreSharedOptions: (options: ExternalStoreSharedOptions) => ExternalStoreSharedOptions;

type JoinStrategy = "concat-content" | "none";

declare namespace useExternalMessageConverter {
  type Message = (ThreadMessageLike & {
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
  type Metadata = {
    readonly toolStatuses?: Record<string, ToolExecutionStatus>;
    readonly error?: ReadonlyJSONValue;
    readonly messageTiming?: Record<string, MessageTiming>;
  };
  type Callback<T> = (message: T, metadata: Metadata) => Message | Message[];
}

declare const convertExternalMessages: <T extends WeakKey>(messages: T[], callback: useExternalMessageConverter.Callback<T>, isRunning: boolean, metadata: useExternalMessageConverter.Metadata) => ThreadMessage[];

declare const useExternalMessageConverter: <T extends WeakKey>(_param6: {
  callback: useExternalMessageConverter.Callback<T>;
  messages: T[];
  isRunning: boolean;
  joinStrategy?: JoinStrategy | undefined;
  metadata?: useExternalMessageConverter.Metadata | undefined;
}) => ThreadMessage[];

declare const createMessageConverter: <T extends object>(callback: useExternalMessageConverter.Callback<T>) => {
  useThreadMessages: (_param7: {
    messages: T[];
    isRunning: boolean;
    joinStrategy?: JoinStrategy | undefined;
    metadata?: useExternalMessageConverter.Metadata;
  }) => ThreadMessage[];
  toThreadMessages: (messages: T[], isRunning?: boolean, metadata?: useExternalMessageConverter.Metadata) => ThreadMessage[];
  toOriginalMessages: (input: ThreadState | ThreadMessage | ThreadMessage["content"][number]) => unknown[];
  toOriginalMessage: (input: ThreadState | ThreadMessage | ThreadMessage["content"][number]) => {};
  useOriginalMessage: () => {};
  useOriginalMessages: () => unknown[];
};

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

type ThreadData$1 = {
  externalId: string | undefined;
};

type CloudThreadListAdapterOptions = {
  cloud?: AssistantCloud | undefined;
  create?: (() => Promise<ThreadData$1>) | undefined;
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

declare const useCloudThreadListAdapter: (adapter: CloudThreadListAdapterOptions) => RemoteThreadListAdapter;

declare class CloudFileAttachmentAdapter implements AttachmentAdapter {
  private cloud;
  accept: string;
  constructor(cloud: AssistantCloud);
  private uploadedUrls;
  add(_param8: {
    file: File;
  }): AsyncGenerator<PendingAttachment, void>;
  remove(attachment: Attachment): Promise<void>;
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;
}

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

type GroupByContext = {
  readonly toolUIs?: ToolsState["toolUIs"];
};

type GroupPartType = PartState["type"] | "standalone-tool-call" | "mcp-app";

declare const groupPartByType: <TKey extends `group-${string}`>(map: Partial<Readonly<Record<GroupPartType, readonly TKey[]>>>) => ((part: PartState, context?: GroupByContext) => readonly TKey[]);

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
  <TKey extends `group-${string}`>(_param9: MessagePrimitiveGroupedParts.Props<TKey>): ReactNode;
  displayName: string;
};

declare class GenerativeUIRenderError extends Error {
  readonly componentName: string;
  constructor(componentName: string, message?: string);
}

declare const GenerativeUIRender: FC<GenerativeUIRenderProps>;

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

declare namespace MessagePrimitiveQuote {
  type Props = {
    children: (value: QuoteInfo) => ReactNode;
  };
}

declare const MessagePrimitiveQuote: import("react").NamedExoticComponent<MessagePrimitiveQuote.Props>;

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
  readonly forkedFrom?: ThreadForkedFrom | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly status: ThreadListItemStatus;
  readonly custom?: Record<string, unknown> | undefined;
};

type ThreadListItemsComponentConfig = {
  ThreadListItem: ComponentType;
};

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

declare namespace ThreadListPrimitiveItemByIndex {
  type Props = {
    index: number;
    archived?: boolean | undefined;
    components: ThreadListItemsComponentConfig;
  };
}

declare const ThreadListPrimitiveItemByIndex: FC<ThreadListPrimitiveItemByIndex.Props>;

declare const ThreadListPrimitiveItems: FC<ThreadListPrimitiveItems.Props>;

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

type RequireAtLeastOne$1<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

type UseComposerIfProps = RequireAtLeastOne$1<ComposerIfFilters>;

declare namespace ComposerPrimitiveIf {
  type Props = PropsWithChildren<UseComposerIfProps>;
}

declare const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props>;

declare const unstable_useThreadMessageIds: () => readonly string[];

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
  };
  otherOptions: Omit<T, "adapters" | "cloud" | "initialMessages" | "maxSteps" | "unstable_enableMessageQueue" | "unstable_humanToolNames">;
};

declare const useLocalRuntime: (chatModel: ChatModelAdapter, _param10?: LocalRuntimeOptions) => AssistantRuntime;

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

type ThreadMessageClientProps = {
  message: ThreadMessage;
  index: number;
  isLast?: boolean;
  branchNumber?: number;
  branchCount?: number;
};

declare const ModelContext: Resource<ClientOutput<"modelContext">, [
]>;

declare const MessageProvider: FC<PropsWithChildren<ThreadMessageClientProps>>;

type SizeHandle = {
  setHeight: (height: number) => void;
  unregister: Unsubscribe;
};

type ThreadViewportState = {
  readonly isAtBottom: boolean;
  readonly scrollToBottom: (config?: {
    behavior?: ScrollBehavior | undefined;
  }) => void;
  readonly onScrollToBottom: (callback: (_param11: {
    behavior: ScrollBehavior;
  }) => void) => Unsubscribe;
  readonly turnAnchor: "bottom" | "top";
  readonly topAnchorMessageClamp: {
    readonly tallerThan: string;
    readonly visibleHeight: string;
  };
  readonly height: {
    readonly viewport: number;
    readonly inset: number;
  };
  readonly element: {
    readonly viewport: HTMLElement | null;
    readonly anchor: HTMLElement | null;
    readonly target: HTMLElement | null;
  };
  readonly targetConfig: {
    readonly tallerThan: number;
    readonly visibleHeight: number;
  } | null;
  readonly topAnchorTurn: {
    readonly anchorId: string;
    readonly targetId: string;
  } | null;
  readonly registerViewport: () => SizeHandle;
  readonly registerContentInset: () => SizeHandle;
  readonly registerViewportElement: (element: HTMLElement | null) => Unsubscribe;
  readonly registerAnchorElement: (element: HTMLElement | null) => Unsubscribe;
  readonly registerAnchorTargetElement: (element: HTMLElement | null, config?: {
    readonly tallerThan: number;
    readonly visibleHeight: number;
  }) => Unsubscribe;
  readonly setTopAnchorTurn: (turn: {
    readonly anchorId: string;
    readonly targetId: string;
  } | null) => void;
};

type ThreadViewportStoreOptions = {
  turnAnchor?: "top" | "bottom" | undefined;
  topAnchorMessageClamp?: {
    tallerThan?: string | undefined;
    visibleHeight?: string | undefined;
  } | undefined;
};

type ReadonlyStore<T> = Omit<StoreApi<T>, "destroy" | "setState">;

declare const useThreadViewport: {
  (): ThreadViewportState;
  <TSelected>(selector: (state: ThreadViewportState) => TSelected): TSelected;
  (options: {
    optional: true;
  }): ThreadViewportState | null;
  <TSelected>(options: {
    optional: true;
    selector?: (state: ThreadViewportState) => TSelected;
  }): TSelected | null;
}, useThreadViewportStore: {
  (): ReadonlyStore<ThreadViewportState>;
  (options: {
    optional: true;
  }): ReadonlyStore<ThreadViewportState> | null;
};

declare function useAssistantRuntime(options?: {
  optional?: false | undefined;
}): AssistantRuntime;

declare function useAssistantRuntime(options?: {
  optional?: boolean | undefined;
}): AssistantRuntime | null;

declare const useThreadList: {
  (): ThreadListState;
  <TSelected>(selector: (state: ThreadListState) => TSelected): TSelected;
  <TSelected>(selector: ((state: ThreadListState) => TSelected) | undefined): ThreadListState | TSelected;
  (options: {
    optional?: false | undefined;
  }): ThreadListState;
  (options: {
    optional?: boolean | undefined;
  }): ThreadListState | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ThreadListState) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ThreadListState) => TSelected) | undefined;
  }): ThreadListState | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ThreadListState) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ThreadListState) => TSelected) | undefined;
  }): ThreadListState | TSelected | null;
};

declare function useAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime;

declare function useAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null;

declare function useThreadComposerAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime<"thread-composer">;

declare function useThreadComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"thread-composer"> | null;

declare function useEditComposerAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime<"edit-composer">;

declare function useEditComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"edit-composer"> | null;

declare function useMessageAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime<"message">;

declare function useMessageAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"message"> | null;

declare const useAttachment: {
  (): AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  };
  <TSelected>(selector: (state: AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  }) => TSelected): TSelected;
  <TSelected>(selector: ((state: AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  }) => TSelected) | undefined): (AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  }) | TSelected;
  (options: {
    optional?: false | undefined;
  }): AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  };
  (options: {
    optional?: boolean | undefined;
  }): (AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  }) | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: AttachmentState & {
      source: "edit-composer" | "message" | "thread-composer";
    }) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: AttachmentState & {
      source: "edit-composer" | "message" | "thread-composer";
    }) => TSelected) | undefined;
  }): (AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  }) | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: AttachmentState & {
      source: "edit-composer" | "message" | "thread-composer";
    }) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: AttachmentState & {
      source: "edit-composer" | "message" | "thread-composer";
    }) => TSelected) | undefined;
  }): (AttachmentState & {
    source: "edit-composer" | "message" | "thread-composer";
  }) | TSelected | null;
};

declare const useThreadComposerAttachment: {
  (): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  });
  <TSelected>(selector: (state: ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  })) => TSelected): TSelected;
  <TSelected>(selector: ((state: ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  })) => TSelected) | undefined): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | TSelected;
  (options: {
    optional?: false | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  });
  (options: {
    optional?: boolean | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    })) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    })) => TSelected) | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    })) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "thread-composer";
    } & {
      source: "thread-composer";
    })) => TSelected) | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "thread-composer";
  } & {
    source: "thread-composer";
  }) | TSelected | null;
};

declare const useEditComposerAttachment: {
  (): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  });
  <TSelected>(selector: (state: ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  })) => TSelected): TSelected;
  <TSelected>(selector: ((state: ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  })) => TSelected) | undefined): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | TSelected;
  (options: {
    optional?: false | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  });
  (options: {
    optional?: boolean | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    })) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    })) => TSelected) | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    })) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    }) | ({
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: PendingAttachmentStatus;
      file: File;
    } & {
      readonly source: "edit-composer";
    } & {
      source: "edit-composer";
    })) => TSelected) | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: PendingAttachmentStatus;
    file: File;
  } & {
    readonly source: "edit-composer";
  } & {
    source: "edit-composer";
  }) | TSelected | null;
};

declare const useMessageAttachment: {
  (): {
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  };
  <TSelected>(selector: (state: {
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  }) => TSelected): TSelected;
  <TSelected>(selector: ((state: {
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  }) => TSelected) | undefined): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  }) | TSelected;
  (options: {
    optional?: false | undefined;
  }): {
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  };
  (options: {
    optional?: boolean | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  }) | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: {
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "message";
    } & {
      source: "message";
    }) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: {
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "message";
    } & {
      source: "message";
    }) => TSelected) | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  }) | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: {
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "message";
    } & {
      source: "message";
    }) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: {
      id: string;
      type: "image" | "document" | "file" | (string & {});
      name: string;
      contentType?: string | undefined;
      file?: File;
      content?: ThreadUserMessagePart[];
    } & {
      status: CompleteAttachmentStatus;
      content: ThreadUserMessagePart[];
    } & {
      readonly source: "message";
    } & {
      source: "message";
    }) => TSelected) | undefined;
  }): ({
    id: string;
    type: "image" | "document" | "file" | (string & {});
    name: string;
    contentType?: string | undefined;
    file?: File;
    content?: ThreadUserMessagePart[];
  } & {
    status: CompleteAttachmentStatus;
    content: ThreadUserMessagePart[];
  } & {
    readonly source: "message";
  } & {
    source: "message";
  }) | TSelected | null;
};

declare function useComposerRuntime(options?: {
  optional?: false | undefined;
}): ComposerRuntime;

declare function useComposerRuntime(options?: {
  optional?: boolean | undefined;
}): ComposerRuntime | null;

declare const useComposer: {
  (): ComposerState$1;
  <TSelected>(selector: (state: ComposerState$1) => TSelected): TSelected;
  <TSelected>(selector: ((state: ComposerState$1) => TSelected) | undefined): ComposerState$1 | TSelected;
  (options: {
    optional?: false | undefined;
  }): ComposerState$1;
  (options: {
    optional?: boolean | undefined;
  }): ComposerState$1 | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ComposerState$1) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ComposerState$1) => TSelected) | undefined;
  }): ComposerState$1 | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ComposerState$1) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ComposerState$1) => TSelected) | undefined;
  }): ComposerState$1 | TSelected | null;
};

declare function useMessageRuntime(options?: {
  optional?: false | undefined;
}): MessageRuntime;

declare function useMessageRuntime(options?: {
  optional?: boolean | undefined;
}): MessageRuntime | null;

declare const useMessage: {
  (): MessageState$1;
  <TSelected>(selector: (state: MessageState$1) => TSelected): TSelected;
  <TSelected>(selector: ((state: MessageState$1) => TSelected) | undefined): MessageState$1 | TSelected;
  (options: {
    optional?: false | undefined;
  }): MessageState$1;
  (options: {
    optional?: boolean | undefined;
  }): MessageState$1 | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: MessageState$1) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: MessageState$1) => TSelected) | undefined;
  }): MessageState$1 | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: MessageState$1) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: MessageState$1) => TSelected) | undefined;
  }): MessageState$1 | TSelected | null;
};

declare const useEditComposer: {
  (): EditComposerState;
  <TSelected>(selector: (state: EditComposerState) => TSelected): TSelected;
  <TSelected>(selector: ((state: EditComposerState) => TSelected) | undefined): EditComposerState | TSelected;
  (options: {
    optional?: false | undefined;
  }): EditComposerState;
  (options: {
    optional?: boolean | undefined;
  }): EditComposerState | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: EditComposerState) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: EditComposerState) => TSelected) | undefined;
  }): EditComposerState | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: EditComposerState) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: EditComposerState) => TSelected) | undefined;
  }): EditComposerState | TSelected | null;
};

declare function useMessagePartRuntime(options?: {
  optional?: false | undefined;
}): MessagePartRuntime;

declare function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}): MessagePartRuntime | null;

declare const useMessagePart: {
  (): MessagePartState;
  <TSelected>(selector: (state: MessagePartState) => TSelected): TSelected;
  <TSelected>(selector: ((state: MessagePartState) => TSelected) | undefined): MessagePartState | TSelected;
  (options: {
    optional?: false | undefined;
  }): MessagePartState;
  (options: {
    optional?: boolean | undefined;
  }): MessagePartState | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: MessagePartState) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: MessagePartState) => TSelected) | undefined;
  }): MessagePartState | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: MessagePartState) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: MessagePartState) => TSelected) | undefined;
  }): MessagePartState | TSelected | null;
};

declare function useThreadRuntime(options?: {
  optional?: false | undefined;
}): ThreadRuntime;

declare function useThreadRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadRuntime | null;

declare const useThread: {
  (): ThreadState;
  <TSelected>(selector: (state: ThreadState) => TSelected): TSelected;
  <TSelected>(selector: ((state: ThreadState) => TSelected) | undefined): ThreadState | TSelected;
  (options: {
    optional?: false | undefined;
  }): ThreadState;
  (options: {
    optional?: boolean | undefined;
  }): ThreadState | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ThreadState) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ThreadState) => TSelected) | undefined;
  }): ThreadState | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ThreadState) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ThreadState) => TSelected) | undefined;
  }): ThreadState | TSelected | null;
};

declare const useThreadComposer: {
  (): ThreadComposerState;
  <TSelected>(selector: (state: ThreadComposerState) => TSelected): TSelected;
  <TSelected>(selector: ((state: ThreadComposerState) => TSelected) | undefined): ThreadComposerState | TSelected;
  (options: {
    optional?: false | undefined;
  }): ThreadComposerState;
  (options: {
    optional?: boolean | undefined;
  }): ThreadComposerState | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ThreadComposerState) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ThreadComposerState) => TSelected) | undefined;
  }): ThreadComposerState | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ThreadComposerState) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ThreadComposerState) => TSelected) | undefined;
  }): ThreadComposerState | TSelected | null;
};

declare function useThreadModelContext(options?: {
  optional?: false | undefined;
}): ModelContext$1;

declare function useThreadModelContext(options?: {
  optional?: boolean | undefined;
}): ModelContext$1 | null;

declare function useThreadListItemRuntime(options?: {
  optional?: false | undefined;
}): ThreadListItemRuntime;

declare function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadListItemRuntime | null;

declare const useThreadListItem: {
  (): ThreadListItemState$1;
  <TSelected>(selector: (state: ThreadListItemState$1) => TSelected): TSelected;
  <TSelected>(selector: ((state: ThreadListItemState$1) => TSelected) | undefined): ThreadListItemState$1 | TSelected;
  (options: {
    optional?: false | undefined;
  }): ThreadListItemState$1;
  (options: {
    optional?: boolean | undefined;
  }): ThreadListItemState$1 | null;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: (state: ThreadListItemState$1) => TSelected;
  }): TSelected;
  <TSelected>(options: {
    optional?: false | undefined;
    selector: ((state: ThreadListItemState$1) => TSelected) | undefined;
  }): ThreadListItemState$1 | TSelected;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: (state: ThreadListItemState$1) => TSelected;
  }): TSelected | null;
  <TSelected>(options: {
    optional?: boolean | undefined;
    selector: ((state: ThreadListItemState$1) => TSelected) | undefined;
  }): ThreadListItemState$1 | TSelected | null;
};

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: EventLog[];
}

interface DevToolsHook {
  apis: Map<number, DevToolsApiEntry>;
  nextId: number;
  listeners: Set<(apiId: number) => void>;
}

declare global {
  interface Window {
    __ASSISTANT_UI_DEVTOOLS_HOOK__?: any;
  }
}

declare class DevToolsHooks {
  static subscribe(listener: () => void): Unsubscribe;
  static clearEventLogs(apiId: number): void;
  static getApis(): Map<number, DevToolsApiEntry>;
  private static notifyListeners;
}

declare class DevToolsProviderApi {
  private static readonly MAX_EVENT_LOGS_PER_API;
  static register(aui: Partial<AssistantClient>): Unsubscribe;
  private static notifyListeners;
}

declare const useMessageQuote: () => QuoteInfo | undefined;

declare const useMessageTiming: () => MessageTiming | undefined;

declare const useToolCallElapsed: () => number | undefined;

type ThreadData = {
  externalId: string;
};

type CloudThreadListAdapter = {
  cloud: AssistantCloud;
  runtimeHook: () => AssistantRuntime;
  create?(): Promise<ThreadData>;
  delete?(threadId: string): Promise<void>;
};

declare function useCloudThreadListRuntime(_param12: CloudThreadListAdapter): AssistantRuntime;

type TextPart = {
  readonly type: "text";
  readonly text: string;
};

type ImagePart = {
  readonly type: "image";
  readonly image: string;
};

type UserMessagePart = TextPart | ImagePart;

type UserMessage = {
  readonly role: "user";
  readonly parts: readonly UserMessagePart[];
};

type AssistantMessage = {
  readonly role: "assistant";
  readonly parts: readonly TextPart[];
};

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

type AssistantTransportCommand = AddMessageCommand | AddToolResultCommand | UserCommands;

type AssistantTransportState = {
  readonly messages: readonly ThreadMessage[];
  readonly state?: ReadonlyJSONValue;
  readonly isRunning: boolean;
};

type AssistantTransportConnectionMetadata = {
  pendingCommands: AssistantTransportCommand[];
  isSending: boolean;
  toolStatuses: Record<string, ToolExecutionStatus>;
};

type AssistantTransportStateConverter<T> = (state: T, connectionMetadata: AssistantTransportConnectionMetadata) => AssistantTransportState;

type QueuedCommand = AssistantTransportCommand;

type HeadersValue = Record<string, string> | Headers;

type AssistantTransportProtocol = "assistant-transport" | "data-stream";

type SendCommandsRequestBody = {
  commands: QueuedCommand[];
  state: unknown;
  system: string | undefined;
  tools: Record<string, unknown> | undefined;
  callSettings: LanguageModelV1CallSettings | undefined;
  config: LanguageModelConfig | undefined;
  threadId: string | null;
  parentId?: string | null;
  [key: string]: unknown;
};

type AssistantTransportOptions<T> = {
  initialState: T;
  api: string;
  resumeApi?: string;
  protocol?: AssistantTransportProtocol;
  converter: AssistantTransportStateConverter<T>;
  headers: HeadersValue | (() => Promise<HeadersValue>);
  body?: object | (() => Promise<object | undefined>);
  prepareSendCommandsRequest?: (body: SendCommandsRequestBody) => Record<string, unknown> | Promise<Record<string, unknown>>;
  onResponse?: (response: Response) => void;
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

declare const useAssistantTransportSendCommand: () => (command: AssistantTransportCommand) => void;

declare function useAssistantTransportState(): UserExternalState;

declare function useAssistantTransportState<T>(selector: (state: UserExternalState) => T): T;

declare const useAssistantTransportRuntime: <T>(options: AssistantTransportOptions<T>) => AssistantRuntime;

declare const makeAssistantVisible: <T extends ComponentType<any>>(Component: T, config?: {
  clickable?: boolean | undefined;
  editable?: boolean | undefined;
}) => T;

type UseAssistantFrameHostOptions = {
  iframeRef: Readonly<RefObject<HTMLIFrameElement | null | undefined>>;
  targetOrigin?: string;
  register: (frameHost: AssistantFrameHost) => Unsubscribe;
};

declare const useAssistantFrameHost: (_param13: UseAssistantFrameHostOptions) => void;

type WithRenderPropProps<T extends ElementType> = ComponentPropsWithoutRef<T> & {
  render?: ReactElement | undefined;
};

declare const Primitive$1: {
  a: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLAnchorElement> & import("react").AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLAnchorElement>>;
  button: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLButtonElement>>;
  div: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLDivElement>>;
  form: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLFormElement> & import("react").FormHTMLAttributes<HTMLFormElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLFormElement>>;
  h2: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLHeadingElement> & import("react").HTMLAttributes<HTMLHeadingElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLHeadingElement>>;
  h3: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLHeadingElement> & import("react").HTMLAttributes<HTMLHeadingElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLHeadingElement>>;
  img: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLImageElement> & import("react").ImgHTMLAttributes<HTMLImageElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLImageElement>>;
  input: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLInputElement> & import("react").InputHTMLAttributes<HTMLInputElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLInputElement>>;
  label: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLLabelElement> & import("react").LabelHTMLAttributes<HTMLLabelElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLLabelElement>>;
  li: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLLIElement> & import("react").LiHTMLAttributes<HTMLLIElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLLIElement>>;
  nav: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLElement> & import("react").HTMLAttributes<HTMLElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLElement>>;
  ol: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLOListElement> & import("react").OlHTMLAttributes<HTMLOListElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLOListElement>>;
  p: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLParagraphElement> & import("react").HTMLAttributes<HTMLParagraphElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLParagraphElement>>;
  select: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSelectElement> & import("react").SelectHTMLAttributes<HTMLSelectElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLSelectElement>>;
  span: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLSpanElement>>;
  svg: ForwardRefExoticComponent<Omit<import("react").SVGProps<SVGSVGElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<SVGSVGElement>>;
  ul: ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLUListElement> & import("react").HTMLAttributes<HTMLUListElement> & {
    asChild?: boolean;
  }, "ref"> & {
    render?: ReactElement | undefined;
  } & RefAttributes<HTMLUListElement>>;
};

type PrimitiveDivProps$5 = ComponentPropsWithoutRef<typeof Primitive$1.div>;

declare namespace ActionBarPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = PrimitiveDivProps$5 & {
    hideWhenRunning?: boolean | undefined;
    autohide?: "always" | "not-last" | "never" | undefined;
    autohideFloat?: "always" | "single-branch" | "never" | undefined;
  };
}

declare const ActionBarPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  hideWhenRunning?: boolean | undefined;
  autohide?: "always" | "not-last" | "never" | undefined;
  autohideFloat?: "always" | "single-branch" | "never" | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive$1.button>;

type ActionButtonProps<THook> = PrimitiveButtonProps & (THook extends ((props: infer TProps) => unknown) ? TProps : never);

type ActionButtonElement = ComponentRef<typeof Primitive$1.button>;

declare const useActionBarPrimitiveCopy: (_param14?: {
  copiedDuration?: number | undefined;
}) => (() => void) | null;

declare namespace ActionBarPrimitiveCopy {
  type Element = HTMLButtonElement;
  type Props = ActionButtonProps<typeof useActionBarPrimitiveCopy>;
}

declare const ActionBarPrimitiveCopy: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  copiedDuration?: number | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarReload: () => (() => void) | null;

declare namespace ActionBarPrimitiveReload {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useActionBarReload>;
}

declare const ActionBarPrimitiveReload: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarEdit: () => (() => void) | null;

declare namespace ActionBarPrimitiveEdit {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useActionBarEdit>;
}

declare const ActionBarPrimitiveEdit: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarSpeak: () => (() => Promise<void>) | null;

declare namespace ActionBarPrimitiveSpeak {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useActionBarSpeak>;
}

declare const ActionBarPrimitiveSpeak: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarStopSpeaking: () => (() => void) | null;

declare namespace ActionBarPrimitiveStopSpeaking {
  type Element = HTMLButtonElement;
  type Props = ActionButtonProps<typeof useActionBarStopSpeaking>;
}

declare const ActionBarPrimitiveStopSpeaking: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarFeedbackPositive: () => () => void;

declare namespace ActionBarPrimitiveFeedbackPositive {
  type Element = HTMLButtonElement;
  type Props = ActionButtonProps<typeof useActionBarFeedbackPositive>;
}

declare const ActionBarPrimitiveFeedbackPositive: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarFeedbackNegative: () => () => void;

declare namespace ActionBarPrimitiveFeedbackNegative {
  type Element = HTMLButtonElement;
  type Props = ActionButtonProps<typeof useActionBarFeedbackNegative>;
}

declare const ActionBarPrimitiveFeedbackNegative: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useActionBarExportMarkdown: (_param15?: {
  filename?: string | undefined;
  onExport?: ((content: string) => void | Promise<void>) | undefined;
}) => (() => Promise<void>) | null;

declare namespace ActionBarPrimitiveExportMarkdown {
  type Element = HTMLButtonElement;
  type Props = ActionButtonProps<typeof useActionBarExportMarkdown>;
}

declare const ActionBarPrimitiveExportMarkdown: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  filename?: string | undefined;
  onExport?: ((content: string) => void | Promise<void>) | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace actionBar_d_exports {
  export { ActionBarPrimitiveCopy as Copy, ActionBarPrimitiveEdit as Edit, ActionBarPrimitiveExportMarkdown as ExportMarkdown, ActionBarPrimitiveFeedbackNegative as FeedbackNegative, ActionBarPrimitiveFeedbackPositive as FeedbackPositive, ActionBarPrimitiveReload as Reload, ActionBarPrimitiveRoot as Root, ActionBarPrimitiveSpeak as Speak, ActionBarPrimitiveStopSpeaking as StopSpeaking };
}

declare namespace ActionBarMorePrimitiveRoot {
  type Props = DropdownMenu.DropdownMenuProps;
}

declare const ActionBarMorePrimitiveRoot: FC<ActionBarMorePrimitiveRoot.Props>;

declare namespace ActionBarMorePrimitiveTrigger {
  type Element = ComponentRef<typeof DropdownMenu.Trigger>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Trigger>;
}

declare const ActionBarMorePrimitiveTrigger: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ActionBarMorePrimitiveContent {
  type Element = ComponentRef<typeof DropdownMenu.Content>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Content> & {
    portalProps?: ComponentPropsWithoutRef<typeof DropdownMenu.Portal> | undefined;
  };
}

declare const ActionBarMorePrimitiveContent: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & {
  portalProps?: ComponentPropsWithoutRef<typeof DropdownMenu.Portal> | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ActionBarMorePrimitiveItem {
  type Element = ComponentRef<typeof DropdownMenu.Item>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Item>;
}

declare const ActionBarMorePrimitiveItem: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ActionBarMorePrimitiveSeparator {
  type Element = ComponentRef<typeof DropdownMenu.Separator>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Separator>;
}

declare const ActionBarMorePrimitiveSeparator: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuSeparatorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace actionBarMore_d_exports {
  export { ActionBarMorePrimitiveContent as Content, ActionBarMorePrimitiveItem as Item, ActionBarMorePrimitiveRoot as Root, ActionBarMorePrimitiveSeparator as Separator, ActionBarMorePrimitiveTrigger as Trigger };
}

declare namespace AssistantModalPrimitiveRoot {
  type Props = Popover.PopoverProps & {
    unstable_openOnRunStart?: boolean | undefined;
  };
}

declare const AssistantModalPrimitiveRoot: FC<AssistantModalPrimitiveRoot.Props>;

declare namespace AssistantModalPrimitiveTrigger {
  type Element = ComponentRef<typeof Popover.Trigger>;
  type Props = ComponentPropsWithoutRef<typeof Popover.Trigger>;
}

declare const AssistantModalPrimitiveTrigger: import("react").ForwardRefExoticComponent<Omit<Popover.PopoverTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace AssistantModalPrimitiveContent {
  type Element = ComponentRef<typeof Popover.Content>;
  type Props = ComponentPropsWithoutRef<typeof Popover.Content> & {
    portalProps?: ComponentPropsWithoutRef<typeof Popover.Portal> | undefined;
    dissmissOnInteractOutside?: boolean | undefined;
  };
}

declare const AssistantModalPrimitiveContent: import("react").ForwardRefExoticComponent<Omit<Popover.PopoverContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  portalProps?: ComponentPropsWithoutRef<typeof Popover.Portal> | undefined;
  dissmissOnInteractOutside?: boolean | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace AssistantModalPrimitiveAnchor {
  type Element = ComponentRef<typeof Popover.Anchor>;
  type Props = ComponentPropsWithoutRef<typeof Popover.Anchor>;
}

declare const AssistantModalPrimitiveAnchor: import("react").ForwardRefExoticComponent<Omit<Popover.PopoverAnchorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace assistantModal_d_exports {
  export { AssistantModalPrimitiveAnchor as Anchor, AssistantModalPrimitiveContent as Content, AssistantModalPrimitiveRoot as Root, AssistantModalPrimitiveTrigger as Trigger };
}

type PrimitiveDivProps$4 = ComponentPropsWithoutRef<typeof Primitive$1.div>;

declare namespace AttachmentPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = PrimitiveDivProps$4;
}

declare const AttachmentPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

type PrimitiveDivProps$3 = ComponentPropsWithoutRef<typeof Primitive$1.div>;

declare namespace AttachmentPrimitiveThumb {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = PrimitiveDivProps$3;
}

declare const AttachmentPrimitiveThumb: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace AttachmentPrimitiveName {
  type Props = Record<string, never>;
}

declare const AttachmentPrimitiveName: FC<AttachmentPrimitiveName.Props>;

declare const useAttachmentRemove: () => () => void;

declare namespace AttachmentPrimitiveRemove {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useAttachmentRemove>;
}

declare const AttachmentPrimitiveRemove: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace attachment_d_exports {
  export { AttachmentPrimitiveName as Name, AttachmentPrimitiveRemove as Remove, AttachmentPrimitiveRoot as Root, AttachmentPrimitiveThumb as unstable_Thumb };
}

declare const useBranchPickerNext: () => (() => void) | null;

declare namespace BranchPickerPrimitiveNext {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useBranchPickerNext>;
}

declare const BranchPickerPrimitiveNext: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useBranchPickerPrevious: () => (() => void) | null;

declare namespace BranchPickerPrimitivePrevious {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useBranchPickerPrevious>;
}

declare const BranchPickerPrimitivePrevious: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace BranchPickerPrimitiveCount {
  type Props = Record<string, never>;
}

declare const BranchPickerPrimitiveCount: FC<BranchPickerPrimitiveCount.Props>;

declare namespace BranchPickerPrimitiveNumber {
  type Props = Record<string, never>;
}

declare const BranchPickerPrimitiveNumber: FC<BranchPickerPrimitiveNumber.Props>;

declare namespace BranchPickerPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div> & {
    hideWhenSingleBranch?: boolean | undefined;
  };
}

declare const BranchPickerPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  hideWhenSingleBranch?: boolean | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace branchPicker_d_exports {
  export { BranchPickerPrimitiveCount as Count, BranchPickerPrimitiveNext as Next, BranchPickerPrimitiveNumber as Number, BranchPickerPrimitivePrevious as Previous, BranchPickerPrimitiveRoot as Root };
}

type PrimitiveDivProps$2 = ComponentPropsWithoutRef<typeof Primitive$1.div>;

declare namespace ChainOfThoughtPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = PrimitiveDivProps$2;
}

declare const ChainOfThoughtPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare const useChainOfThoughtAccordionTrigger: () => () => void;

declare namespace ChainOfThoughtPrimitiveAccordionTrigger {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useChainOfThoughtAccordionTrigger>;
}

declare const ChainOfThoughtPrimitiveAccordionTrigger: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace chainOfThought_d_exports {
  export { ChainOfThoughtPrimitiveAccordionTrigger as AccordionTrigger, ChainOfThoughtPrimitiveAccordionTrigger as AccordionTriggerPrimitive, ChainOfThoughtPrimitiveParts as Parts, ChainOfThoughtPrimitiveParts as PartsPrimitive, ChainOfThoughtPrimitiveRoot as Root, ChainOfThoughtPrimitiveRoot as RootPrimitive };
}

type SelectItemOverride = (item: Unstable_TriggerItem) => boolean;

type TriggerBehavior = {
  readonly kind: "directive";
  readonly formatter: Unstable_DirectiveFormatter;
  readonly onInserted?: (item: Unstable_TriggerItem) => void;
} | {
  readonly kind: "action";
  readonly formatter: Unstable_DirectiveFormatter;
  readonly onExecute: (item: Unstable_TriggerItem) => void;
  readonly removeOnExecute?: boolean;
};

type TriggerPopoverResourceOutput = {
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_TriggerCategory[];
  readonly items: readonly Unstable_TriggerItem[];
  readonly highlightedIndex: number;
  readonly isSearchMode: boolean;
  readonly isLoading: boolean;
  readonly popoverId: string;
  readonly highlightedItemId: string | undefined;
  selectCategory(categoryId: string): void;
  goBack(): void;
  selectItem(item: Unstable_TriggerItem): void;
  close(): void;
  highlightIndex(index: number): void;
  handleKeyDown(e: {
    readonly key: string;
    readonly shiftKey: boolean;
    preventDefault(): void;
  }): boolean;
  setCursorPosition(pos: number): void;
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

type RegisteredTrigger = {
  readonly char: string;
  readonly behavior?: TriggerBehavior;
  readonly resource: TriggerPopoverResourceOutput;
};

type TriggerPopoverLifecycleListener = {
  added(trigger: RegisteredTrigger): void;
  removed(char: string): void;
};

type TriggerPopoverActiveAria = {
  popoverId: string;
  highlightedItemId: string | undefined;
};

type TriggerPopoverRootContextValue = {
  register(trigger: RegisteredTrigger): () => void;
  getTriggers(): ReadonlyMap<string, RegisteredTrigger>;
  subscribe(listener: () => void): () => void;
  subscribeLifecycle(listener: TriggerPopoverLifecycleListener): () => void;
  getActiveAria(): TriggerPopoverActiveAria | null;
  subscribeAria(listener: () => void): () => void;
};

declare const useTriggerPopoverRootContext: () => TriggerPopoverRootContextValue;

declare const useTriggerPopoverRootContextOptional: () => TriggerPopoverRootContextValue | null;

declare const useTriggerPopoverTriggers: () => ReadonlyMap<string, RegisteredTrigger>;

declare const useTriggerPopoverTriggersOptional: () => ReadonlyMap<string, RegisteredTrigger>;

declare namespace ComposerPrimitiveTriggerPopoverRoot {
  type Props = {
    children: ReactNode;
  };
}

declare const ComposerPrimitiveTriggerPopoverRoot: FC<ComposerPrimitiveTriggerPopoverRoot.Props>;

declare const useTriggerPopoverScopeContext: () => TriggerPopoverResourceOutput;

declare const useTriggerPopoverScopeContextOptional: () => TriggerPopoverResourceOutput | null;

declare namespace ComposerPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.form>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.form>;
}

declare const ComposerPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLFormElement> & import("react").FormHTMLAttributes<HTMLFormElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLFormElement>, "ref"> & import("react").RefAttributes<HTMLFormElement>>;

declare namespace ComposerPrimitiveInput {
  export type Element = HTMLTextAreaElement;
  type BaseProps = {
    asChild?: boolean | undefined;
    render?: ReactElement | undefined;
    cancelOnEscape?: boolean | undefined;
    unstable_focusOnRunStart?: boolean | undefined;
    unstable_focusOnScrollToBottom?: boolean | undefined;
    unstable_focusOnThreadSwitched?: boolean | undefined;
    unstable_insertNewlineOnTouchEnter?: boolean | undefined;
    addAttachmentOnPaste?: boolean | undefined;
  };
  type SubmitModeProps = {
    submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
    submitOnEnter?: never;
  } | {
    submitMode?: never;
    submitOnEnter?: boolean | undefined;
  };
  export type Props = TextareaAutosizeProps & BaseProps & SubmitModeProps;
  export {};
}

declare const ComposerPrimitiveInput: import("react").ForwardRefExoticComponent<ComposerPrimitiveInput.Props & import("react").RefAttributes<HTMLTextAreaElement>>;

declare const useComposerSend: () => (() => void) | null;

declare namespace ComposerPrimitiveSend {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useComposerSend>;
}

declare const ComposerPrimitiveSend: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useComposerCancel: () => (() => void) | null;

declare namespace ComposerPrimitiveCancel {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useComposerCancel>;
}

declare const ComposerPrimitiveCancel: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useComposerAddAttachment: (_param16?: {
  multiple?: boolean | undefined;
}) => (() => void) | null;

declare namespace ComposerPrimitiveAddAttachment {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useComposerAddAttachment>;
}

declare const ComposerPrimitiveAddAttachment: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  multiple?: boolean | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ComposerPrimitiveAttachmentDropzone {
  type Element = HTMLDivElement;
  type Props = React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean | undefined;
    render?: ReactElement | undefined;
    disabled?: boolean | undefined;
  };
}

declare const ComposerPrimitiveAttachmentDropzone: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean | undefined;
  render?: ReactElement | undefined;
  disabled?: boolean | undefined;
} & React.RefAttributes<HTMLDivElement>>;

declare const useComposerDictate: () => (() => void) | null;

declare namespace ComposerPrimitiveDictate {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useComposerDictate>;
}

declare const ComposerPrimitiveDictate: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useComposerStopDictation: () => (() => void) | null;

declare namespace ComposerPrimitiveStopDictation {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useComposerStopDictation>;
}

declare const ComposerPrimitiveStopDictation: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ComposerPrimitiveDictationTranscript {
  type Element = ComponentRef<typeof Primitive$1.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.span>;
}

declare const ComposerPrimitiveDictationTranscript: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace ComposerPrimitiveQuote {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div>;
}

declare const ComposerPrimitiveQuote: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ComposerPrimitiveQuoteText {
  type Element = ComponentRef<typeof Primitive$1.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.span>;
}

declare const ComposerPrimitiveQuoteText: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace ComposerPrimitiveQuoteDismiss {
  type Element = ComponentRef<typeof Primitive$1.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.button>;
}

declare const ComposerPrimitiveQuoteDismiss: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ComposerPrimitiveTriggerPopoverCategories {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive$1.div>, "children"> & {
    children: (categories: readonly Unstable_TriggerCategory[]) => ReactNode;
  };
}

declare const ComposerPrimitiveTriggerPopoverCategories: import("react").ForwardRefExoticComponent<Omit<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref">, "children"> & {
  children: (categories: readonly Unstable_TriggerCategory[]) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ComposerPrimitiveTriggerPopoverCategoryItem {
  type Element = ComponentRef<typeof Primitive$1.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.button> & {
    categoryId: string;
  };
}

declare const ComposerPrimitiveTriggerPopoverCategoryItem: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  categoryId: string;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ComposerPrimitiveTriggerPopoverItems {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive$1.div>, "children"> & {
    children: (items: readonly Unstable_TriggerItem[]) => ReactNode;
  };
}

declare const ComposerPrimitiveTriggerPopoverItems: import("react").ForwardRefExoticComponent<Omit<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref">, "children"> & {
  children: (items: readonly Unstable_TriggerItem[]) => ReactNode;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ComposerPrimitiveTriggerPopoverItem {
  type Element = ComponentRef<typeof Primitive$1.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.button> & {
    item: Unstable_TriggerItem;
    index?: number | undefined;
  };
}

declare const ComposerPrimitiveTriggerPopoverItem: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  item: Unstable_TriggerItem;
  index?: number | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ComposerPrimitiveTriggerPopoverBack {
  type Element = ComponentRef<typeof Primitive$1.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.button>;
}

declare const ComposerPrimitiveTriggerPopoverBack: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ComposerPrimitiveTriggerPopoverAction {
  type Props = {
    readonly formatter?: Unstable_DirectiveFormatter | undefined;
    readonly onExecute: (item: Unstable_TriggerItem) => void;
    readonly removeOnExecute?: boolean | undefined;
  };
}

declare const ComposerPrimitiveTriggerPopoverAction: FC<ComposerPrimitiveTriggerPopoverAction.Props>;

declare namespace ComposerPrimitiveTriggerPopoverDirective {
  type Props = {
    readonly formatter?: Unstable_DirectiveFormatter | undefined;
    readonly onInserted?: ((item: Unstable_TriggerItem) => void) | undefined;
  };
}

declare const ComposerPrimitiveTriggerPopoverDirective: FC<ComposerPrimitiveTriggerPopoverDirective.Props>;

declare const ComposerPrimitiveTriggerPopover: import("react").ForwardRefExoticComponent<Omit<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref">, "onSelect"> & {
  readonly char: string;
  readonly adapter?: Unstable_TriggerAdapter | undefined;
  readonly isLoading?: boolean | undefined;
} & import("react").RefAttributes<HTMLDivElement>> & {
  Directive: import("react").FC<ComposerPrimitiveTriggerPopoverDirective.Props>;
  Action: import("react").FC<ComposerPrimitiveTriggerPopoverAction.Props>;
};

declare namespace composer_d_exports {
  export { ComposerPrimitiveAddAttachment as AddAttachment, ComposerPrimitiveAttachmentByIndex as AttachmentByIndex, ComposerPrimitiveAttachmentDropzone as AttachmentDropzone, ComposerPrimitiveAttachments as Attachments, ComposerPrimitiveCancel as Cancel, ComposerPrimitiveDictate as Dictate, ComposerPrimitiveDictationTranscript as DictationTranscript, ComposerPrimitiveIf as If, ComposerPrimitiveInput as Input, ComposerPrimitiveQueue as Queue, ComposerPrimitiveQuote as Quote, ComposerPrimitiveQuoteDismiss as QuoteDismiss, ComposerPrimitiveQuoteText as QuoteText, ComposerPrimitiveRoot as Root, ComposerPrimitiveSend as Send, ComposerPrimitiveStopDictation as StopDictation, RegisteredTrigger as Unstable_RegisteredTrigger, ComposerPrimitiveTriggerPopover as Unstable_TriggerPopover, ComposerPrimitiveTriggerPopoverBack as Unstable_TriggerPopoverBack, ComposerPrimitiveTriggerPopoverCategories as Unstable_TriggerPopoverCategories, ComposerPrimitiveTriggerPopoverCategoryItem as Unstable_TriggerPopoverCategoryItem, ComposerPrimitiveTriggerPopoverItem as Unstable_TriggerPopoverItem, ComposerPrimitiveTriggerPopoverItems as Unstable_TriggerPopoverItems, ComposerPrimitiveTriggerPopoverRoot as Unstable_TriggerPopoverRoot, useTriggerPopoverRootContext as unstable_useTriggerPopoverRootContext, useTriggerPopoverRootContextOptional as unstable_useTriggerPopoverRootContextOptional, useTriggerPopoverScopeContext as unstable_useTriggerPopoverScopeContext, useTriggerPopoverScopeContextOptional as unstable_useTriggerPopoverScopeContextOptional, useTriggerPopoverTriggers as unstable_useTriggerPopoverTriggers, useTriggerPopoverTriggersOptional as unstable_useTriggerPopoverTriggersOptional };
}

declare namespace QueueItemPrimitiveText {
  type Element = ComponentRef<typeof Primitive$1.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.span>;
}

declare const QueueItemPrimitiveText: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare const useQueueItemSteer: () => () => void;

declare namespace QueueItemPrimitiveSteer {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useQueueItemSteer>;
}

declare const QueueItemPrimitiveSteer: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useQueueItemRemove: () => () => void;

declare namespace QueueItemPrimitiveRemove {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useQueueItemRemove>;
}

declare const QueueItemPrimitiveRemove: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace queueItem_d_exports {
  export { QueueItemPrimitiveRemove as Remove, QueueItemPrimitiveSteer as Steer, QueueItemPrimitiveText as Text };
}

type SmoothOptions = {
  drainMs?: number | undefined;
  maxCharIntervalMs?: number | undefined;
  maxCharsPerFrame?: number | undefined;
  minCommitMs?: number | undefined;
};

declare const useSmooth: (state: MessagePartState & (TextMessagePart | ReasoningMessagePart), smooth?: boolean | SmoothOptions) => MessagePartState & (TextMessagePart | ReasoningMessagePart);

declare namespace MessagePartPrimitiveText {
  type Element = ComponentRef<typeof Primitive$1.span>;
  type Props = Omit<ComponentPropsWithoutRef<typeof Primitive$1.span>, "asChild" | "children"> & {
    smooth?: boolean | SmoothOptions;
    component?: ElementType;
  };
}

declare const MessagePartPrimitiveText: import("react").ForwardRefExoticComponent<Omit<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref">, "asChild" | "children"> & {
  smooth?: boolean | SmoothOptions;
  component?: ElementType;
} & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace MessagePartPrimitiveImage {
  type Element = ComponentRef<typeof Primitive$1.img>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.img>;
}

declare const MessagePartPrimitiveImage: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLImageElement> & import("react").ImgHTMLAttributes<HTMLImageElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLImageElement>, "ref"> & import("react").RefAttributes<HTMLImageElement>>;

declare namespace messagePart_d_exports {
  export { MessagePartPrimitiveImage as Image, MessagePartPrimitiveInProgress as InProgress, PartPrimitiveMessages as Messages, MessagePartPrimitiveText as Text };
}

declare namespace ErrorPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div>;
}

declare const ErrorPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ErrorPrimitiveMessage {
  type Element = ComponentRef<typeof Primitive$1.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.span>;
}

declare const ErrorPrimitiveMessage: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace error_d_exports {
  export { ErrorPrimitiveMessage as Message, ErrorPrimitiveRoot as Root };
}

declare namespace MessagePrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div>;
}

declare const MessagePrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace MessagePrimitiveParts {
  type Props = MessagePrimitiveParts$1.Props;
}

declare const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props>;

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  system: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;
  lastOrHover: boolean | undefined;
  last: boolean | undefined;
  speaking: boolean | undefined;
  hasAttachments: boolean | undefined;
  hasContent: boolean | undefined;
  submittedFeedback: "positive" | "negative" | null | undefined;
};

type UseMessageIfProps = RequireAtLeastOne<MessageIfFilters>;

declare namespace MessagePrimitiveIf {
  type Props = PropsWithChildren<UseMessageIfProps>;
}

declare const MessagePrimitiveIf: FC<MessagePrimitiveIf.Props>;

declare const MessagePrimitiveError: FC<PropsWithChildren>;

type MessagePartGroup = {
  groupKey: string | undefined;
  indices: number[];
};

type GroupingFunction = (parts: readonly any[]) => MessagePartGroup[];

declare namespace MessagePrimitiveUnstable_PartsGrouped {
  type Props = {
    groupingFunction: GroupingFunction;
    components: {
      Empty?: EmptyMessagePartComponent | undefined;
      Text?: TextMessagePartComponent | undefined;
      Reasoning?: ReasoningMessagePartComponent | undefined;
      Source?: SourceMessagePartComponent | undefined;
      Image?: ImageMessagePartComponent | undefined;
      File?: FileMessagePartComponent | undefined;
      Unstable_Audio?: Unstable_AudioMessagePartComponent | undefined;
      data?: {
        by_name?: Record<string, DataMessagePartComponent | undefined> | undefined;
        Fallback?: DataMessagePartComponent | undefined;
      } | undefined;
      tools?: {
        by_name?: Record<string, ToolCallMessagePartComponent | undefined> | undefined;
        Fallback?: ComponentType<ToolCallMessagePartProps> | undefined;
      } | {
        Override: ComponentType<ToolCallMessagePartProps>;
      } | undefined;
      Group?: ComponentType<PropsWithChildren<{
        groupKey: string | undefined;
        indices: number[];
      }>>;
    } | undefined;
  };
}

declare const MessagePrimitiveUnstable_PartsGrouped: FC<MessagePrimitiveUnstable_PartsGrouped.Props>;

declare const MessagePrimitiveUnstable_PartsGroupedByParentId: FC<Omit<MessagePrimitiveUnstable_PartsGrouped.Props, "groupingFunction">>;

declare namespace message_d_exports {
  export { MessagePrimitiveAttachmentByIndex as AttachmentByIndex, MessagePrimitiveAttachments as Attachments, MessagePrimitiveParts as Content, MessagePrimitiveError as Error, MessagePrimitiveGenerativeUI as GenerativeUI, MessagePrimitiveGroupedParts as GroupedParts, MessagePrimitiveIf as If, MessagePrimitivePartByIndex as PartByIndex, MessagePrimitiveParts as Parts, MessagePrimitiveQuote as Quote, MessagePrimitiveRoot as Root, MessagePrimitiveUnstable_PartsGrouped as Unstable_PartsGrouped, MessagePrimitiveUnstable_PartsGroupedByParentId as Unstable_PartsGroupedByParentId };
}

type ThreadViewportProviderProps = PropsWithChildren<{
  options?: ThreadViewportStoreOptions;
}>;

declare const ThreadPrimitiveViewportProvider: FC<ThreadViewportProviderProps>;

declare namespace ThreadPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div>;
}

declare const ThreadPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ThreadPrimitiveEmpty {
  type Props = PropsWithChildren;
}

declare const ThreadPrimitiveEmpty: FC<ThreadPrimitiveEmpty.Props>;

type ThreadIfFilters = {
  empty: boolean | undefined;
  running: boolean | undefined;
  disabled: boolean | undefined;
};

type UseThreadIfProps = RequireAtLeastOne<ThreadIfFilters>;

declare namespace ThreadPrimitiveIf {
  type Props = PropsWithChildren<UseThreadIfProps>;
}

declare const ThreadPrimitiveIf: FC<ThreadPrimitiveIf.Props>;

declare namespace ThreadPrimitiveViewport {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div> & {
    autoScroll?: boolean | undefined;
    turnAnchor?: "top" | "bottom" | undefined;
    topAnchorMessageClamp?: {
      tallerThan?: string;
      visibleHeight?: string;
    };
    scrollToBottomOnRunStart?: boolean | undefined;
    scrollToBottomOnInitialize?: boolean | undefined;
    scrollToBottomOnThreadSwitch?: boolean | undefined;
  };
}

declare const ThreadPrimitiveViewport: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  autoScroll?: boolean | undefined;
  turnAnchor?: "top" | "bottom" | undefined;
  topAnchorMessageClamp?: {
    tallerThan?: string;
    visibleHeight?: string;
  };
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ThreadPrimitiveViewportFooter {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div>;
}

declare const ThreadPrimitiveViewportFooter: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace useThreadScrollToBottom {
  type Options = {
    behavior?: ScrollBehavior | undefined;
  };
}

declare const useThreadScrollToBottom: (_param17?: useThreadScrollToBottom.Options) => (() => void) | null;

declare namespace ThreadPrimitiveScrollToBottom {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadScrollToBottom>;
}

declare const ThreadPrimitiveScrollToBottom: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & useThreadScrollToBottom.Options & import("react").RefAttributes<HTMLButtonElement>>;

declare const useThreadSuggestion: (_param18: {
  prompt: string;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
  autoSend?: boolean | undefined;
  method?: "replace";
}) => (() => void) | null;

declare namespace ThreadPrimitiveSuggestion {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadSuggestion>;
}

declare const ThreadPrimitiveSuggestion: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  prompt: string;
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
  autoSend?: boolean | undefined;
  method?: "replace";
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace thread_d_exports {
  export { ThreadPrimitiveEmpty as Empty, ThreadPrimitiveIf as If, ThreadPrimitiveMessageByIndex as MessageByIndex, ThreadPrimitiveMessages as Messages, ThreadPrimitiveRoot as Root, ThreadPrimitiveScrollToBottom as ScrollToBottom, ThreadPrimitiveSuggestion as Suggestion, ThreadPrimitiveSuggestionByIndex as SuggestionByIndex, ThreadPrimitiveSuggestions as Suggestions, ThreadPrimitiveUnstable_MessageById as Unstable_MessageById, ThreadPrimitiveViewport as Viewport, ThreadPrimitiveViewportFooter as ViewportFooter, ThreadPrimitiveViewportProvider as ViewportProvider };
}

declare namespace SuggestionPrimitiveTitle {
  type Element = ElementRef<typeof Primitive$1.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.span>;
}

declare const SuggestionPrimitiveTitle: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace SuggestionPrimitiveDescription {
  type Element = ElementRef<typeof Primitive$1.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.span>;
}

declare const SuggestionPrimitiveDescription: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLSpanElement>, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare const useSuggestionTrigger: (_param19: {
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
}) => (() => void) | null;

declare namespace SuggestionPrimitiveTrigger {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useSuggestionTrigger>;
}

declare const SuggestionPrimitiveTrigger: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  send?: boolean | undefined;
  clearComposer?: boolean | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace suggestion_d_exports {
  export { SuggestionPrimitiveDescription as Description, SuggestionPrimitiveTitle as Title, SuggestionPrimitiveTrigger as Trigger };
}

declare namespace ThreadListPrimitiveNew {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<() => void>;
}

declare const ThreadListPrimitiveNew: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useThreadListLoadMore: () => (() => void) | null;

declare namespace ThreadListPrimitiveLoadMore {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadListLoadMore>;
}

declare const ThreadListPrimitiveLoadMore: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

type PrimitiveDivProps$1 = ComponentPropsWithoutRef<typeof Primitive$1.div>;

declare namespace ThreadListPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = PrimitiveDivProps$1;
}

declare const ThreadListPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace threadList_d_exports {
  export { ThreadListPrimitiveItemByIndex as ItemByIndex, ThreadListPrimitiveItems as Items, ThreadListPrimitiveLoadMore as LoadMore, ThreadListPrimitiveNew as New, ThreadListPrimitiveRoot as Root };
}

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive$1.div>;

declare namespace ThreadListItemPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = PrimitiveDivProps;
}

declare const ThreadListItemPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare const useThreadListItemArchive: () => () => void;

declare namespace ThreadListItemPrimitiveArchive {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadListItemArchive>;
}

declare const ThreadListItemPrimitiveArchive: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useThreadListItemUnarchive: () => () => void;

declare namespace ThreadListItemPrimitiveUnarchive {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadListItemUnarchive>;
}

declare const ThreadListItemPrimitiveUnarchive: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useThreadListItemDelete: () => () => void;

declare namespace ThreadListItemPrimitiveDelete {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadListItemDelete>;
}

declare const ThreadListItemPrimitiveDelete: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare const useThreadListItemTrigger: () => () => void;

declare namespace ThreadListItemPrimitiveTrigger {
  type Element = ActionButtonElement;
  type Props = ActionButtonProps<typeof useThreadListItemTrigger>;
}

declare const ThreadListItemPrimitiveTrigger: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace threadListItem_d_exports {
  export { ThreadListItemPrimitiveArchive as Archive, ThreadListItemPrimitiveDelete as Delete, ThreadListItemPrimitiveRoot as Root, ThreadListItemPrimitiveTitle as Title, ThreadListItemPrimitiveTrigger as Trigger, ThreadListItemPrimitiveUnarchive as Unarchive };
}

declare namespace ThreadListItemMorePrimitiveRoot {
  type Props = DropdownMenu.DropdownMenuProps;
}

declare const ThreadListItemMorePrimitiveRoot: FC<ThreadListItemMorePrimitiveRoot.Props>;

declare namespace ThreadListItemMorePrimitiveTrigger {
  type Element = ComponentRef<typeof DropdownMenu.Trigger>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Trigger>;
}

declare const ThreadListItemMorePrimitiveTrigger: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuTriggerProps & import("react").RefAttributes<HTMLButtonElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace ThreadListItemMorePrimitiveContent {
  type Element = ComponentRef<typeof DropdownMenu.Content>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Content> & {
    portalProps?: ComponentPropsWithoutRef<typeof DropdownMenu.Portal> | undefined;
  };
}

declare const ThreadListItemMorePrimitiveContent: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuContentProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & {
  portalProps?: ComponentPropsWithoutRef<typeof DropdownMenu.Portal> | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ThreadListItemMorePrimitiveItem {
  type Element = ComponentRef<typeof DropdownMenu.Item>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Item>;
}

declare const ThreadListItemMorePrimitiveItem: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuItemProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace ThreadListItemMorePrimitiveSeparator {
  type Element = ComponentRef<typeof DropdownMenu.Separator>;
  type Props = WithRenderPropProps<typeof DropdownMenu.Separator>;
}

declare const ThreadListItemMorePrimitiveSeparator: import("react").ForwardRefExoticComponent<Omit<DropdownMenu.DropdownMenuSeparatorProps & import("react").RefAttributes<HTMLDivElement>, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace threadListItemMore_d_exports {
  export { ThreadListItemMorePrimitiveContent as Content, ThreadListItemMorePrimitiveItem as Item, ThreadListItemMorePrimitiveRoot as Root, ThreadListItemMorePrimitiveSeparator as Separator, ThreadListItemMorePrimitiveTrigger as Trigger };
}

declare namespace SelectionToolbarPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive$1.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.div>;
}

declare const SelectionToolbarPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLDivElement>, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace SelectionToolbarPrimitiveQuote {
  type Element = ComponentRef<typeof Primitive$1.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive$1.button>;
}

declare const SelectionToolbarPrimitiveQuote: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & {
  render?: import("react").ReactElement | undefined;
} & import("react").RefAttributes<HTMLButtonElement>, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace selectionToolbar_d_exports {
  export { SelectionToolbarPrimitiveQuote as Quote, SelectionToolbarPrimitiveRoot as Root, SelectionToolbarPrimitiveQuote, SelectionToolbarPrimitiveRoot };
}

declare const useMessagePartText: () => (TextMessagePart & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
}) | (ReasoningMessagePart & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
});

declare const useMessagePartReasoning: () => ReasoningMessagePart & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

declare const useMessagePartSource: () => ({
  readonly type: "source";
  readonly sourceType: "url";
  readonly id: string;
  readonly url: string;
  readonly title?: string;
  readonly providerMetadata?: SourceProviderMetadata;
  readonly parentId?: string;
} & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
}) | ({
  readonly type: "source";
  readonly sourceType: "document";
  readonly id: string;
  readonly url?: undefined;
  readonly title: string;
  readonly mediaType: string;
  readonly filename?: string;
  readonly providerMetadata?: SourceProviderMetadata;
  readonly parentId?: string;
} & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
});

declare const useMessagePartFile: () => FileMessagePart & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

declare const useMessagePartImage: () => ImageMessagePart & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

declare const useMessagePartData: <T = any>(name?: string) => DataMessagePart<T> | null;

declare namespace useThreadViewportAutoScroll {
  type Options = {
    autoScroll?: boolean | undefined;
    scrollToBottomOnRunStart?: boolean | undefined;
    scrollToBottomOnInitialize?: boolean | undefined;
    scrollToBottomOnThreadSwitch?: boolean | undefined;
  };
}

declare const useThreadViewportAutoScroll: <TElement extends HTMLElement>(_param20: useThreadViewportAutoScroll.Options) => RefCallback<TElement>;

declare const useScrollLock: <T extends HTMLElement = HTMLElement>(animatedElementRef: RefObject<T | null>, animationDuration: number) => () => void;

type Unstable_MessageStallDetectionOptions = {
  thresholdMs?: number | undefined;
};

type Unstable_MessageStallDetection = {
  stalled: boolean;
  stalledForMs: number;
};

declare function unstable_useMessageStallDetection(options?: Unstable_MessageStallDetectionOptions): Unstable_MessageStallDetection;

declare const withSmoothContextProvider: <C extends ComponentType<any>>(Component: C) => C;

declare const useSmoothStatus: {
  (): {
    readonly type: "running";
  } | {
    readonly type: "complete";
  } | {
    readonly type: "incomplete";
    readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
    readonly error?: unknown;
  } | {
    readonly type: "requires-action";
    readonly reason: "interrupt";
  };
  <TSelected>(selector: (state: {
    readonly type: "running";
  } | {
    readonly type: "complete";
  } | {
    readonly type: "incomplete";
    readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
    readonly error?: unknown;
  } | {
    readonly type: "requires-action";
    readonly reason: "interrupt";
  }) => TSelected): TSelected;
  (options: {
    optional: true;
  }): {
    readonly type: "running";
  } | {
    readonly type: "complete";
  } | {
    readonly type: "incomplete";
    readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
    readonly error?: unknown;
  } | {
    readonly type: "requires-action";
    readonly reason: "interrupt";
  } | null;
  <TSelected>(options: {
    optional: true;
    selector?: (state: {
      readonly type: "running";
    } | {
      readonly type: "complete";
    } | {
      readonly type: "incomplete";
      readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
      readonly error?: unknown;
    } | {
      readonly type: "requires-action";
      readonly reason: "interrupt";
    }) => TSelected;
  }): TSelected | null;
}, useSmoothStatusStore: {
  (): ReadonlyStore<{
    readonly type: "running";
  } | {
    readonly type: "complete";
  } | {
    readonly type: "incomplete";
    readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
    readonly error?: unknown;
  } | {
    readonly type: "requires-action";
    readonly reason: "interrupt";
  }>;
  (options: {
    optional: true;
  }): ReadonlyStore<{
    readonly type: "running";
  } | {
    readonly type: "complete";
  } | {
    readonly type: "incomplete";
    readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
    readonly error?: unknown;
  } | {
    readonly type: "requires-action";
    readonly reason: "interrupt";
  }> | null;
};

type ComposerInputPlugin = {
  handleKeyDown(e: {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly nativeEvent?: {
      isComposing?: boolean;
    };
    preventDefault(): void;
  }): boolean;
  setCursorPosition(pos: number): void;
};

type ComposerInputPluginRegisterOptions = {
  priority?: number;
};

type ComposerInputPluginRegistry = {
  register(plugin: ComposerInputPlugin, opts?: ComposerInputPluginRegisterOptions): () => void;
  getPlugins(): readonly ComposerInputPlugin[];
};

declare const useComposerInputPluginRegistryOptional: () => ComposerInputPluginRegistry | null;

declare namespace internal_d_exports {
  export { AssistantRuntimeImpl, BaseAssistantRuntimeCore, CompositeContextProvider, DefaultThreadComposerRuntimeCore, MessageRepository, ThreadListItemRuntimeBinding, ThreadListRuntimeCore, ThreadRuntimeCore, ThreadRuntimeCoreBinding, ThreadRuntimeImpl, ToolExecutionStatus, getAutoStatus, splitLocalRuntimeOptions, useComposerInputPluginRegistryOptional, useSmooth, useSmoothStatus, withSmoothContextProvider };
}

type Unstable_IconComponent = FC<{
  className?: string;
}>;

type Unstable_Mention = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly icon?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

type Unstable_MentionCategory = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly Unstable_Mention[];
};

type Unstable_ModelContextToolsOptions = {
  readonly category?: {
    readonly id: string;
    readonly label: string;
  };
  readonly formatLabel?: (toolName: string) => string;
  readonly icon?: string;
};

type Unstable_UseMentionAdapterOptions = {
  readonly items?: readonly Unstable_Mention[];
  readonly categories?: readonly Unstable_MentionCategory[];
  readonly includeModelContextTools?: boolean | Unstable_ModelContextToolsOptions;
  readonly formatter?: Unstable_DirectiveFormatter;
  readonly onInserted?: (item: Unstable_TriggerItem) => void;
  readonly iconMap?: Record<string, Unstable_IconComponent>;
  readonly fallbackIcon?: Unstable_IconComponent;
};

type Unstable_MentionDirective = {
  readonly formatter: Unstable_DirectiveFormatter;
  readonly onInserted?: ((item: Unstable_TriggerItem) => void) | undefined;
};

declare function unstable_useMentionAdapter(options?: Unstable_UseMentionAdapterOptions): {
  adapter: Unstable_TriggerAdapter;
  directive: Unstable_MentionDirective;
  iconMap?: Record<string, Unstable_IconComponent>;
  fallbackIcon?: Unstable_IconComponent;
};

type Unstable_SlashCommand = {
  readonly id: string;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly icon?: string | undefined;
  readonly execute: () => void;
};

type Unstable_UseSlashCommandAdapterOptions = {
  readonly commands: readonly Unstable_SlashCommand[];
  readonly removeOnExecute?: boolean | undefined;
  readonly iconMap?: Record<string, Unstable_IconComponent>;
  readonly fallbackIcon?: Unstable_IconComponent;
};

type Unstable_SlashCommandAction = {
  readonly onExecute: (item: Unstable_TriggerItem) => void;
  readonly removeOnExecute?: boolean | undefined;
};

declare function unstable_useSlashCommandAdapter(options: Unstable_UseSlashCommandAdapterOptions): {
  adapter: Unstable_TriggerAdapter;
  action: Unstable_SlashCommandAction;
  iconMap?: Record<string, Unstable_IconComponent>;
  fallbackIcon?: Unstable_IconComponent;
};

type Unstable_UseLiveCompletionAdapterOptions = {
  readonly fetcher: (query: string) => Promise<readonly Unstable_TriggerItem[]>;
  readonly debounceMs?: number | undefined;
  readonly enabled?: boolean | undefined;
};

declare function unstable_useLiveCompletionAdapter(options: Unstable_UseLiveCompletionAdapterOptions): {
  adapter: Unstable_TriggerAdapter;
  isLoading: boolean;
};

type Unstable_ComposerInputHistory = {
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
};

declare function unstable_useComposerInputHistory(): Unstable_ComposerInputHistory;

type TriggerPopoverAriaProps = {
  "aria-controls"?: string;
  "aria-expanded"?: true;
  "aria-haspopup"?: "listbox";
  "aria-activedescendant"?: string | undefined;
};

type Unstable_UseComposerInputOptions = {
  disabled?: boolean | undefined;
};

type Unstable_ComposerInput = {
  value: string;
  setText(text: string): void;
  send(options?: ComposerSendOptions): void;
  isDisabled: boolean;
  canSend: boolean;
};

declare function unstable_useComposerInput(options?: Unstable_UseComposerInputOptions): Unstable_ComposerInput;

type Unstable_TriggerPopoverAriaProps = TriggerPopoverAriaProps;

declare function unstable_useTriggerPopoverAriaProps(): Unstable_TriggerPopoverAriaProps;

type SandboxOption = "allow-downloads" | "allow-forms" | "allow-modals" | "allow-popups" | "allow-popups-to-escape-sandbox" | "allow-same-origin" | "allow-scripts";

type SandboxHostConfig = {
  sandbox?: SandboxOption[];
  useShadowDom?: boolean;
  enableBrowserCaching?: boolean;
  salt?: string;
  product?: string;
  className?: string;
  style?: CSSProperties;
  unsafeDocumentWrite?: boolean;
};

declare const MCP_APP_MIME_TYPE: "text/html;profile=mcp-app";

type McpAppResourceCSP = {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  [k: string]: unknown;
};

type McpAppResourceMeta = {
  prefersBorder?: boolean;
  csp?: McpAppResourceCSP;
  permissions?: Record<string, unknown>;
  [k: string]: unknown;
};

type McpAppResource = {
  uri: string;
  mimeType: typeof MCP_APP_MIME_TYPE;
  html: string;
  meta?: McpAppResourceMeta;
};

type McpAppDisplayMode = "fullscreen" | "inline" | "pip";

type McpAppHostContext = {
  theme?: "dark" | "light";
  displayMode?: McpAppDisplayMode;
  availableDisplayModes?: McpAppDisplayMode[];
  [k: string]: unknown;
};

type McpAppHostInfo = {
  name: string;
  version: string;
};

type McpAppsHost = {
  loadResource: (params: {
    uri: string;
  }) => Promise<McpAppResource>;
  callTool: (params: McpAppToolCallParams) => Promise<unknown>;
  readResource: (params: {
    uri: string;
  }) => Promise<unknown>;
  listResources: (params?: unknown) => Promise<unknown>;
};

type McpAppsRemoteHostOptions = {
  url: string;
  fetch?: typeof fetch;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
};

type McpAppToolCallParams = {
  name: string;
  arguments?: Record<string, unknown>;
};

type McpAppSandboxConfig = SandboxHostConfig;

type McpAppRendererOptions = {
  host: ResourceElement<McpAppsHost>;
  sandbox?: McpAppSandboxConfig;
  maxHeight?: number;
  hostInfo?: McpAppHostInfo;
  hostContext?: McpAppHostContext;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};

declare const McpAppRenderer: Resource<{
  readonly render: ToolCallMessagePartComponent;
}, [
  options: McpAppRendererOptions
]>;

declare const McpAppsRemoteHost: Resource<McpAppsHost, [
  options: McpAppsRemoteHostOptions
]>;

type ToolPartLike = Pick<ToolCallMessagePart, "mcp">;

declare function getMcpAppFromToolPart(part: ToolPartLike): McpAppMetadata | undefined;

declare namespace entry_root_exports {
  export { actionBarMore_d_exports as ActionBarMorePrimitive, actionBar_d_exports as ActionBarPrimitive, AddToolResultOptions, AppendMessage, Assistant, AssistantClient, AssistantCloud, AssistantContextConfig, AssistantDataUI, AssistantDataUIProps, AssistantEventCallback, AssistantEventName, AssistantEventPayload, AssistantEventScope, AssistantEventSelector, AssistantFrameHost, AssistantFrameProvider, AssistantInteractableProps, assistantModal_d_exports as AssistantModalPrimitive, AssistantRuntime, AssistantRuntimeProvider, AssistantState, AssistantTool, AssistantToolProps, AssistantToolUI, AssistantToolUIProps, AssistantTransportCommand, AssistantTransportConnectionMetadata, AssistantTransportProtocol, Attachment, AttachmentAdapter, attachment_d_exports as AttachmentPrimitive, AttachmentRuntime, AttachmentState, AttachmentStatus, AuiIf, AuiProvider, branchPicker_d_exports as BranchPickerPrimitive, ChainOfThoughtByIndicesProvider, ChainOfThoughtClient, chainOfThought_d_exports as ChainOfThoughtPrimitive, ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult, ChatModelRunUpdate, CloudFileAttachmentAdapter, CompleteAttachment, ComposerAttachmentByIndexProvider, composer_d_exports as ComposerPrimitive, ComposerRuntime, ComposerSendOptions, ComposerState$1 as ComposerState, CompositeAttachmentAdapter, CreateAppendMessage, CreateAttachment, CreateResumeRunConfig, CreateStartRunConfig, DataMessagePart, DataMessagePartComponent, DataMessagePartProps, DataRenderers, DevToolsHooks, DevToolsProviderApi, DictationAdapter, DictationState, EditComposerRuntime, EditComposerState, EmptyMessagePartComponent, EmptyMessagePartProps, EnrichedPartState, error_d_exports as ErrorPrimitive, ExportedMessageRepository, ExportedMessageRepositoryItem, ExternalStoreAdapter, ExternalStoreBranchChange, ExternalStoreMessageConverter, ExternalStoreSharedOptions, ExternalStoreThreadData, ExternalStoreThreadListAdapter, ExternalThread, ExternalThreadBranchAdapter, ExternalThreadMessage, ExternalThreadProps, ExternalThreadQueueAdapter, FRAME_MESSAGE_CHANNEL, FeedbackAdapter, FileMessagePart, FileMessagePartComponent, FileMessagePartProps, FrameMessage, FrameMessageType, GenerativeUIComponentRegistry, GenerativeUIMessagePart, GenerativeUIMessagePartComponent, GenerativeUIMessagePartProps, GenerativeUINode, GenerativeUIRender, GenerativeUIRenderError, GenerativeUIRenderProps, GenerativeUISpec, GenericThreadHistoryAdapter, GroupByContext, internal_d_exports as INTERNAL, ImageMessagePart, ImageMessagePartComponent, ImageMessagePartProps, InMemoryThreadList, InMemoryThreadListAdapter, InMemoryThreadListProps, Interactables, LanguageModelConfig, LanguageModelV1CallSettings, LocalRuntimeOptions, LocalRuntimeOptionsBase, McpAppDisplayMode, McpAppHostContext, McpAppHostInfo, McpAppMetadata, McpAppRenderer, McpAppRendererOptions, McpAppResource, McpAppResourceCSP, McpAppResourceMeta, McpAppResourceOutput, McpAppSandboxConfig, McpAppToolCallParams, McpAppsHost, McpAppsRemoteHost, McpAppsRemoteHostOptions, McpToolkitDefinition, MessageAttachmentByIndexProvider, MessageByIndexProvider, MessageFormatAdapter, MessageFormatItem, MessageFormatRepository, messagePart_d_exports as MessagePartPrimitive, MessagePartRuntime, MessagePartState, MessagePartStatus, message_d_exports as MessagePrimitive, MessageProvider, MessageQueueController, MessageQueueDriver, MessageRuntime, MessageState$1 as MessageState, MessageStatus, MessageStorageEntry, MessageTiming, ModelContext$1 as ModelContext, ModelContext as ModelContextClient, ModelContextProvider, ModelContextRegistry, ModelContextRegistryInstructionHandle, ModelContextRegistryProviderHandle, ModelContextRegistryToolHandle, PartByIndexProvider, PartState, PendingAttachment, ProviderToolConfig, QueueItemMethods, queueItem_d_exports as QueueItemPrimitive, QueueItemState, QuoteInfo, QuoteMessagePartComponent, QuoteMessagePartProps, ReadonlyThreadProvider, RealtimeVoiceAdapter, ReasoningGroupComponent, ReasoningGroupProps, ReasoningMessagePart, ReasoningMessagePartComponent, ReasoningMessagePartProps, RemoteThreadListAdapter, RespondToToolApprovalOptions, RuntimeAdapterProvider, RuntimeAdapters, selectionToolbar_d_exports as SelectionToolbarPrimitive, SendCommandsRequestBody, SerializedModelContext, SerializedTool, SimpleImageAttachmentAdapter, SimpleTextAttachmentAdapter, SingleThreadList, SmoothOptions, SourceMessagePart, SourceMessagePartComponent, SourceMessagePartProps, SourceProviderMetadata, SpeechSynthesisAdapter, SubmitFeedbackOptions, SuggestionAdapter, SuggestionByIndexProvider, SuggestionConfig, suggestion_d_exports as SuggestionPrimitive, Suggestions, TextMessagePart, TextMessagePartComponent, TextMessagePartProps, TextMessagePartProvider, ThreadAssistantMessage, ThreadAssistantMessagePart, ThreadComposerRuntime, ThreadComposerState, ThreadHistoryAdapter, ThreadListItemByIndexProvider, threadListItemMore_d_exports as ThreadListItemMorePrimitive, threadListItem_d_exports as ThreadListItemPrimitive, ThreadListItemRuntime, ThreadListItemRuntimeProvider, ThreadListItemState$1 as ThreadListItemState, ThreadListItemStatus, threadList_d_exports as ThreadListPrimitive, ThreadListRuntime, ThreadListState, ThreadMessage, ThreadMessageLike, thread_d_exports as ThreadPrimitive, ThreadRuntime, ThreadState, ThreadSuggestion, ThreadSystemMessage, ThreadUserMessage, ThreadUserMessagePart, ThreadViewportState, Tool, ToolApprovalOption, ToolApprovalOptionKind, ToolApprovalResponse, ToolArgsStatus, ToolCallMessagePart, ToolCallMessagePartComponent, ToolCallMessagePartMcpMetadata, ToolCallMessagePartProps, ToolCallMessagePartStatus, ToolCallText, ToolCallTiming, ToolDefinition, ToolExecutionStatus, ToolModelContentPart, Toolkit, ToolkitDefinition, ToolkitDefinitionEntry, Tools, Unstable_AudioMessagePart, Unstable_AudioMessagePartComponent, Unstable_AudioMessagePartProps, Unstable_ComposerInput, Unstable_ComposerInputHistory, Unstable_DirectiveFormatter, Unstable_DirectiveSegment, Unstable_IconComponent, Unstable_InferInteractableState, Unstable_InteractableConfig, Unstable_InteractableDefinition, Unstable_InteractablePersistedState, Unstable_InteractablePersistenceAdapter, Unstable_InteractablePersistenceStatus, Unstable_InteractableRegistration, Unstable_InteractableSnapshotEntry, Unstable_InteractableStateSchema, Unstable_InteractableToolConfig, Unstable_InteractableToolRenderProps, Unstable_InteractableVersion, Unstable_InteractableVersionInfo, Unstable_InteractablesClientSchema, Unstable_InteractablesConfig, Unstable_InteractablesMethods, Unstable_InteractablesState, Unstable_Mention, Unstable_MentionCategory, Unstable_MentionDirective, Unstable_MessageStallDetection, Unstable_MessageStallDetectionOptions, Unstable_ModelContextToolsOptions, RegisteredTrigger as Unstable_RegisteredTrigger, Unstable_SlashCommand, Unstable_SlashCommandAction, TriggerBehavior as Unstable_TriggerBehavior, Unstable_TriggerItem, Unstable_TriggerPopoverAriaProps, Unstable_UseComposerInputOptions, Unstable_UseLiveCompletionAdapterOptions, Unstable_UseMentionAdapterOptions, Unstable_UseSlashCommandAdapterOptions, Unsubscribe, VoiceSessionControls, VoiceSessionHelpers, VoiceSessionState, WebSpeechDictationAdapter, WebSpeechSynthesisAdapter, bindExternalStoreMessage, createMessageQueue, createVoiceSession, defineMcpToolkit, defineToolkit, externalTool, fromThreadMessageLike, generateId, getExternalStoreMessages, getMcpAppFromToolPart, groupPartByType, hitl, hitlTool, humanTool, makeAssistantDataUI, makeAssistantTool, makeAssistantToolUI, makeAssistantVisible, mergeModelContexts, pickExternalStoreSharedOptions, providerTool, stubTool, tool, unstable_Interactables, convertExternalMessages as unstable_convertExternalMessages, createMessageConverter as unstable_createMessageConverter, unstable_defaultDirectiveFormatter, unstable_formatInteractableSnapshot, unstable_getInteractableSnapshots, unstable_getInteractableVersions, unstable_interactableTool, unstable_useComposerInput, unstable_useComposerInputHistory, unstable_useInteractable, unstable_useInteractableState, unstable_useInteractableVersions, unstable_useLiveCompletionAdapter, unstable_useMentionAdapter, unstable_useMessageStallDetection, unstable_useSlashCommandAdapter, unstable_useThreadMessageIds, unstable_useTriggerPopoverAriaProps, useTriggerPopoverRootContext as unstable_useTriggerPopoverRootContext, useTriggerPopoverRootContextOptional as unstable_useTriggerPopoverRootContextOptional, useTriggerPopoverScopeContext as unstable_useTriggerPopoverScopeContext, useTriggerPopoverScopeContextOptional as unstable_useTriggerPopoverScopeContextOptional, useTriggerPopoverTriggers as unstable_useTriggerPopoverTriggers, useTriggerPopoverTriggersOptional as unstable_useTriggerPopoverTriggersOptional, useAssistantContext, useAssistantDataUI, useAssistantFrameHost, useAssistantInstructions, useAssistantInteractable, useAssistantRuntime, useAssistantTool, useAssistantToolUI, useAssistantTransportRuntime, useAssistantTransportSendCommand, useAssistantTransportState, useAttachment, useAttachmentRuntime, useAui, useAuiEvent, useAuiState, useAuiToolOverrides, useCloudThreadListAdapter, useCloudThreadListRuntime, useComposer, useComposerRuntime, useEditComposer, useEditComposerAttachment, useEditComposerAttachmentRuntime, useExternalMessageConverter, useExternalStoreRuntime, useExternalStoreSharedOptions, useInlineRender, useInteractableState, useLocalRuntime, useMessage, useMessageAttachment, useMessageAttachmentRuntime, useMessagePart, useMessagePartData, useMessagePartFile, useMessagePartImage, useMessagePartReasoning, useMessagePartRuntime, useMessagePartSource, useMessagePartText, useMessageQuote, useMessageRuntime, useMessageTiming, useRemoteThreadListRuntime, useRuntimeAdapters, useScrollLock, useSmooth, useThread, useThreadComposer, useThreadComposerAttachment, useThreadComposerAttachmentRuntime, useThreadList, useThreadListItem, useThreadListItemRuntime, useThreadModelContext, useThreadRuntime, useThreadViewport, useThreadViewportAutoScroll, useThreadViewportStore, useToolArgsStatus, useToolCallElapsed, useVoiceControls, useVoiceState, useVoiceVolume };
}

export { entry_root_exports as entry_root };
