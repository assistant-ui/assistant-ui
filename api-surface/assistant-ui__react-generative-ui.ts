import "@radix-ui/react-primitive";

import { StandardSchemaV1 } from "@standard-schema/spec";

import "radix-ui";

import { ComponentType, ReactNode } from "react";

import "react-textarea-autosize";

import { ZodType } from "zod";

import "zustand";

declare const ALERT_TONES: readonly [
  "info",
  "success",
  "warning",
  "danger"
];

declare const ALIGNS: readonly [
  "start",
  "center",
  "end"
];

interface Action {
  readonly type: string;
  readonly [payload: string]: unknown;
}

type ActionDispatchContext = {
  readonly payload: Action;
};

type ActionHandler = (ctx: ActionDispatchContext) => unknown | Promise<unknown>;

type ActionRegistry = {
  dispatch(action: Action): unknown;
  has(type: string): boolean;
};

type AlertTone = (typeof ALERT_TONES)[number];

type Align = (typeof ALIGNS)[number];

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

type AsNumber<K> = K extends `${infer N extends number}` ? N | K : never;

type AssistantClient = {
  [K in ClientNames]: AssistantClientAccessor<K>;
} & {
  subscribe(listener: () => void): Unsubscribe;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe;
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

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

declare const BUTTON_STYLES: readonly [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger"
];

type BackendDefaultMetadata = {
  unstable_backendDefault?: {
    parameters?: boolean;
  };
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

type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
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

type ButtonStyle = (typeof BUTTON_STYLES)[number];

declare const COLORS: readonly [
  "emphasis",
  "secondary",
  "alpha-70",
  "white",
  "white-70",
  "white-50"
];

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

type ClientNames = keyof ClientSchemas extends (infer U) ? U : never;

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K>;
};

type Color = (typeof COLORS)[number];

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type CompleteAttachmentStatus = {
  type: "complete";
};

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly name: string;
  readonly data: T;
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

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly parentId?: string;
};

interface FromSlackBlocksResult {
  readonly nodes: UIElement[];
  readonly warnings: SlackConversionWarning[];
}

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

type GenerativeUIAction = Action;

type GenerativeUIComponent<P = any> = {
  description: string;
  properties: ZodType<P>;
  streamProperties: boolean | undefined;
  render: (props: StreamingRenderProps<P>) => ReactNode;
} | {
  description: string;
  properties: ZodType<P>;
  streamProperties?: false | undefined;
  render: (props: StaticRenderProps<P>) => ReactNode;
};

type GenerativeUIDispatch = (action: Action) => unknown;

type GenerativeUIElement = NormalizedUIElement;

type GenerativeUILibrary = Record<string, GenerativeUIComponent>;

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

type GenerativeUINode$1 = GenerativeUIElement | string | number | boolean | null | undefined | GenerativeUINode$1[];

type GenerativeUIProps = NormalizedUIElement["props"];

type GenerativeUIRenderContext = {
  status: GenerativeUIStatus;
  dispatch?: GenerativeUIDispatch;
};

type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

type GenerativeUIStatus = "done" | "streaming";

interface GenerativeUIToJSXOptions {
  escape?: boolean;
  pretty?: boolean;
}

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

declare const ICON_NAMES: readonly [
  "sun",
  "moon",
  "cloud",
  "rain",
  "snow",
  "wind",
  "play",
  "pause",
  "check",
  "x",
  "star",
  "heart",
  "arrow-right",
  "arrow-up-right",
  "chevron-right",
  "calendar",
  "clock",
  "map-pin",
  "plane",
  "truck",
  "credit-card",
  "user",
  "search",
  "bell"
];

declare const IMAGE_SIZE_TOKENS: readonly [
  "sm",
  "md",
  "lg"
];

type IconName = (typeof ICON_NAMES)[number];

type ImageMessagePart = {
  readonly type: "image";
  readonly image: string;
  readonly filename?: string;
};

type ImageSize = (typeof IMAGE_SIZE_TOKENS)[number] | number;

declare class JSONGenerativeUI {
  private readonly parameters;
  constructor(options: JSONGenerativeUIOptions);
  present(options?: PresentToolOptions): PresentTool;
  promptUser(): PromptUserTool;
}

declare class JSONGenerativeUI$1 {
  private readonly library;
  private readonly parameters;
  private readonly actions;
  constructor(options: JSONGenerativeUIOptions);
  private readonly render;
  present(options?: PresentToolOptions): PresentTool;
  promptUser(): PromptUserTool;
}

type JSONGenerativeUIOptions = {
  library: GenerativeUILibrary;
  actions?: ActionRegistry;
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

interface JSONSchema7$1 {
  $id?: string | undefined;
  $ref?: string | undefined;
  $schema?: JSONSchema7Version$1 | undefined;
  $comment?: string | undefined;
  $defs?: {
    [key: string]: JSONSchema7Definition$1;
  } | undefined;
  type?: JSONSchema7TypeName$1 | JSONSchema7TypeName$1[] | undefined;
  enum?: JSONSchema7Type$1[] | undefined;
  const?: JSONSchema7Type$1 | undefined;
  multipleOf?: number | undefined;
  maximum?: number | undefined;
  exclusiveMaximum?: number | undefined;
  minimum?: number | undefined;
  exclusiveMinimum?: number | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;
  items?: JSONSchema7Definition$1 | JSONSchema7Definition$1[] | undefined;
  additionalItems?: JSONSchema7Definition$1 | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  uniqueItems?: boolean | undefined;
  contains?: JSONSchema7Definition$1 | undefined;
  maxProperties?: number | undefined;
  minProperties?: number | undefined;
  required?: string[] | undefined;
  properties?: {
    [key: string]: JSONSchema7Definition$1;
  } | undefined;
  patternProperties?: {
    [key: string]: JSONSchema7Definition$1;
  } | undefined;
  additionalProperties?: JSONSchema7Definition$1 | undefined;
  dependencies?: {
    [key: string]: JSONSchema7Definition$1 | string[];
  } | undefined;
  propertyNames?: JSONSchema7Definition$1 | undefined;
  if?: JSONSchema7Definition$1 | undefined;
  then?: JSONSchema7Definition$1 | undefined;
  else?: JSONSchema7Definition$1 | undefined;
  allOf?: JSONSchema7Definition$1[] | undefined;
  anyOf?: JSONSchema7Definition$1[] | undefined;
  oneOf?: JSONSchema7Definition$1[] | undefined;
  not?: JSONSchema7Definition$1 | undefined;
  format?: string | undefined;
  contentMediaType?: string | undefined;
  contentEncoding?: string | undefined;
  definitions?: {
    [key: string]: JSONSchema7Definition$1;
  } | undefined;
  title?: string | undefined;
  description?: string | undefined;
  default?: JSONSchema7Type$1 | undefined;
  readOnly?: boolean | undefined;
  writeOnly?: boolean | undefined;
  examples?: JSONSchema7Type$1 | undefined;
}

interface JSONSchema7Array extends Array<JSONSchema7Type> {
}

interface JSONSchema7Array$1 extends Array<JSONSchema7Type$1> {
}

type JSONSchema7Definition = JSONSchema7 | boolean;

type JSONSchema7Definition$1 = JSONSchema7$1 | boolean;

interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

interface JSONSchema7Object$1 {
  [key: string]: JSONSchema7Type$1;
}

type JSONSchema7Type = string | number | boolean | JSONSchema7Object | JSONSchema7Array | null;

type JSONSchema7Type$1 = string | number | boolean | JSONSchema7Object$1 | JSONSchema7Array$1 | null;

type JSONSchema7TypeName = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

type JSONSchema7TypeName$1 = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

type JSONSchema7Version = string;

type JSONSchema7Version$1 = string;

declare const JUSTIFIES: readonly [
  "start",
  "center",
  "end",
  "between"
];

type Justify = (typeof JUSTIFIES)[number];

interface LegacyComponentNode {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: UIChildren;
  readonly key?: string;
}

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

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
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

interface NormalizedUIElement {
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children?: NormalizedUINode | undefined;
  readonly key?: string | number | undefined;
  readonly action?: Action | undefined;
}

type NormalizedUINode = string | number | readonly NormalizedUINode[] | NormalizedUIElement | null;

type ObjectKey<T> = keyof T & (string | number);

type OnSchemaValidationErrorFunction<TResult> = ToolExecuteFunction<unknown, TResult>;

type ParentOf<K extends ClientNames> = AssistantClientAccessor<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PartProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

type PresentTool = ToolDefinition<Record<string, unknown>, Record<string, never>> & BackendDefaultMetadata;

type PresentToolOptions = {
  display?: "standalone";
};

type PromptUserTool = ToolDefinition<Record<string, unknown>, unknown> & BackendDefaultMetadata;

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

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly text: string;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type SlackActionElement = SlackButtonElement | SlackStaticSelectElement | SlackDatePickerElement | SlackCheckboxesElement | SlackRadioButtonsElement;

interface SlackActionsBlock {
  readonly type: "actions";
  readonly elements: readonly SlackActionElement[];
}

interface SlackAlertBlock {
  readonly type: "alert";
  readonly text: SlackTextObject;
  readonly level?: SlackAlertLevel;
}

type SlackAlertLevel = "default" | "error" | "info" | "success" | "warning";

type SlackBlock = SlackHeaderBlock | SlackSectionBlock | SlackContextBlock | SlackImageBlock | SlackDividerBlock | SlackActionsBlock | SlackInputBlock | SlackCardBlock | SlackCarouselBlock | SlackDataTableBlock | SlackMarkdownBlock | SlackAlertBlock;

interface SlackBlocksResult {
  readonly blocks: SlackBlock[];
  readonly warnings: SlackConversionWarning[];
}

interface SlackButtonElement {
  readonly type: "button";
  readonly text: SlackPlainText;
  readonly action_id: string;
  readonly value?: string;
  readonly style?: "danger" | "primary";
}

interface SlackCardBlock {
  readonly type: "card";
  readonly hero_image?: SlackImageBlock;
  readonly title?: SlackTextObject;
  readonly subtitle?: SlackTextObject;
  readonly body?: SlackTextObject;
  readonly subtext?: SlackTextObject;
  readonly actions?: readonly SlackButtonElement[];
}

interface SlackCarouselBlock {
  readonly type: "carousel";
  readonly elements: readonly SlackCardBlock[];
}

interface SlackCheckboxesElement {
  readonly type: "checkboxes";
  readonly action_id: string;
  readonly options: readonly SlackOption[];
  readonly initial_options?: readonly SlackOption[];
}

interface SlackContextBlock {
  readonly type: "context";
  readonly elements: readonly SlackMrkdwnText[];
}

interface SlackConversionWarning {
  readonly code: "clamped" | "dropped" | "fallback";
  readonly component: string;
  readonly detail: string;
}

interface SlackDataTableBlock {
  readonly type: "data_table";
  readonly caption: string;
  readonly rows: readonly (readonly SlackDataTableCell[])[];
  readonly page_size?: number;
}

type SlackDataTableCell = SlackDataTableRawTextCell | SlackDataTableRawNumberCell;

interface SlackDataTableRawNumberCell {
  readonly type: "raw_number";
  readonly text: string;
}

interface SlackDataTableRawTextCell {
  readonly type: "raw_text";
  readonly text: string;
}

interface SlackDatePickerElement {
  readonly type: "datepicker";
  readonly action_id: string;
  readonly initial_date?: string;
}

interface SlackDividerBlock {
  readonly type: "divider";
}

interface SlackHeaderBlock {
  readonly type: "header";
  readonly text: SlackPlainText;
}

interface SlackImageBlock {
  readonly type: "image";
  readonly image_url: string;
  readonly alt_text: string;
}

interface SlackInputBlock {
  readonly type: "input";
  readonly label: SlackPlainText;
  readonly element: SlackPlainTextInputElement;
}

interface SlackMarkdownBlock {
  readonly type: "markdown";
  readonly text: string;
}

interface SlackMrkdwnText {
  readonly type: "mrkdwn";
  readonly text: string;
}

interface SlackOption {
  readonly text: SlackPlainText;
  readonly value: string;
}

interface SlackPlainText {
  readonly type: "plain_text";
  readonly text: string;
}

interface SlackPlainTextInputElement {
  readonly type: "plain_text_input";
  readonly action_id: string;
  readonly multiline?: boolean;
  readonly placeholder?: SlackPlainText;
}

interface SlackRadioButtonsElement {
  readonly type: "radio_buttons";
  readonly action_id: string;
  readonly options: readonly SlackOption[];
  readonly initial_option?: SlackOption;
}

interface SlackSectionBlock {
  readonly type: "section";
  readonly text?: SlackMrkdwnText;
  readonly fields?: readonly SlackMrkdwnText[];
  readonly accessory?: SlackButtonElement;
}

interface SlackStaticSelectElement {
  readonly type: "static_select";
  readonly action_id: string;
  readonly options: readonly SlackOption[];
  readonly placeholder?: SlackPlainText;
}

type SlackTextObject = SlackPlainText | SlackMrkdwnText;

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

type StaticRenderProps<P> = P & {
  children?: ReactNode;
  $status: "done";
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

type StreamingRenderProps<P> = (Partial<P> & {
  children?: ReactNode;
  $status: "streaming";
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
}) | (P & {
  children?: ReactNode;
  $status: "done";
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
});

declare const TEXT_SIZES: readonly [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl"
];

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

declare const TYPE_KEY = "$type";

type TextMessagePart = {
  readonly type: "text";
  readonly text: string;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type TextSize = (typeof TEXT_SIZES)[number];

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

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

type ThreadStep = {
  readonly messageId?: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  } | undefined;
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

interface ToSlackBlocksOptions {
  readonly surface?: "message" | "modal";
}

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

type ToolCallCompleteText<TArgs extends Record<string, unknown>, TResult> = ReactNode | ((options: {
  args: TArgs;
  result: TResult | undefined;
}) => ReactNode);

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

type ToolCallMessagePartComponent<TArgs = any, TResult = any> = ComponentType<ToolCallMessagePartProps<TArgs, TResult>>;

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolCallMessagePartProps<TArgs = any, TResult = unknown> = MessagePartState & ToolCallMessagePart<TArgs, TResult> & {
  addResult: (result: TResult | ToolResponse<TResult>) => void;
  resume: (payload: unknown) => void;
  respondToApproval: (response: ToolApprovalResponse) => void;
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

type ToolCallRunningText<TArgs extends Record<string, unknown>> = ReactNode | ((options: {
  args: TArgs;
}) => ReactNode);

type ToolCallText<TArgs extends Record<string, unknown>, TResult> = {
  running: ToolCallRunningText<TArgs>;
  complete?: ToolCallCompleteText<TArgs, TResult> | undefined;
} | {
  running?: ToolCallRunningText<TArgs> | undefined;
  complete: ToolCallCompleteText<TArgs, TResult>;
};

type ToolCallTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

type ToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = WithRender<Tool<TArgs, TResult>, TArgs, TResult>;

type ToolDisplay = "inline" | "standalone";

type ToolExecuteFunction<TArgs, TResult> = (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;

type ToolExecutionContext = {
  toolCallId: string;
  abortSignal: AbortSignal;
  human: (payload: unknown) => Promise<unknown>;
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

type UIChildren = UINode | readonly UINode[];

interface UIElement {
  readonly $type: string;
  readonly $key?: string | number;
  readonly children?: UIChildren;
  readonly $action?: Action;
  readonly [prop: string]: unknown;
}

type UINode = string | number | UIElement | LegacyComponentNode;

type UISpec = UINode | readonly UINode[];

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

type Unsubscribe = () => void;

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

declare const WEIGHTS: readonly [
  "normal",
  "medium",
  "semibold",
  "bold"
];

type Weight = (typeof WEIGHTS)[number];

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

declare function buildPresentParameters(library: GenerativeUILibrary): JSONSchema7$1;

declare function createActionRegistry(handlers: Readonly<Record<string, ActionHandler>>): ActionRegistry;

declare function decodeBlockAction(action: unknown): Action | undefined;

declare const defaultGenerativeUILibrary: GenerativeUILibrary;

declare function defineGenerativeComponents(_library: GenerativeUILibrary): GenerativeUILibrary;

declare const emptyActionRegistry: ActionRegistry;

declare function fromSlackBlocks(blocks: unknown): FromSlackBlocksResult;

declare function generativeUIToJSX(node: unknown, options?: GenerativeUIToJSXOptions): string;

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

declare namespace entry_root_default_exports {
  export { ALERT_TONES, ALIGNS, Action, ActionDispatchContext, ActionHandler, ActionRegistry, AlertTone, Align, BUTTON_STYLES, ButtonStyle, COLORS, Color, GenerativeUIAction, GenerativeUIComponent, GenerativeUIDispatch, GenerativeUIElement, GenerativeUILibrary, GenerativeUINode$1 as GenerativeUINode, GenerativeUIProps, GenerativeUIRenderContext, GenerativeUIStatus, GenerativeUIToJSXOptions, ICON_NAMES, IMAGE_SIZE_TOKENS, IconName, ImageSize, JSONGenerativeUI$1 as JSONGenerativeUI, JSONGenerativeUIOptions, JUSTIFIES, Justify, LegacyComponentNode, NormalizedUIElement, NormalizedUINode, PresentTool, PresentToolOptions, PromptUserTool, TEXT_SIZES, TYPE_KEY, TextSize, UIChildren, UIElement, UINode, UISpec, WEIGHTS, Weight, buildPresentParameters, createActionRegistry, defaultGenerativeUILibrary, defineGenerativeComponents, emptyActionRegistry, generativeUIToJSX, normalizeSpec, normalizeUINode, renderGenerativeUI };
}

declare namespace entry_root_react_server_exports {
  export { ALERT_TONES, ALIGNS, Action, ActionDispatchContext, ActionHandler, ActionRegistry, AlertTone, Align, BUTTON_STYLES, ButtonStyle, COLORS, Color, GenerativeUIAction, GenerativeUIComponent, GenerativeUIDispatch, GenerativeUIElement, GenerativeUILibrary, GenerativeUINode$1 as GenerativeUINode, GenerativeUIProps, GenerativeUIRenderContext, GenerativeUIStatus, GenerativeUIToJSXOptions, ICON_NAMES, IMAGE_SIZE_TOKENS, IconName, ImageSize, JSONGenerativeUI, JSONGenerativeUIOptions, JUSTIFIES, Justify, LegacyComponentNode, NormalizedUIElement, NormalizedUINode, PresentTool, PresentToolOptions, PromptUserTool, TEXT_SIZES, TYPE_KEY, TextSize, UIChildren, UIElement, UINode, UISpec, WEIGHTS, Weight, buildPresentParameters, createActionRegistry, defaultGenerativeUILibrary, defineGenerativeComponents, emptyActionRegistry, generativeUIToJSX, normalizeSpec, normalizeUINode, renderGenerativeUI };
}

declare namespace entry_ir_exports {
  export { ALERT_TONES, ALIGNS, Action, AlertTone, Align, BUTTON_STYLES, ButtonStyle, COLORS, Color, ICON_NAMES, IMAGE_SIZE_TOKENS, IconName, ImageSize, JUSTIFIES, Justify, LegacyComponentNode, NormalizedUIElement, NormalizedUINode, TEXT_SIZES, TextSize, UIChildren, UIElement, UINode, UISpec, WEIGHTS, Weight, normalizeSpec, normalizeUINode };
}

declare function normalizeSpec(spec: UISpec): {
  readonly root: NormalizedUINode | readonly NormalizedUINode[];
};

declare function normalizeUINode(node: unknown, partialPath?: readonly string[] | undefined, depth?: number): NormalizedUINode;

declare function renderGenerativeUI(node: unknown, library: GenerativeUILibrary, context?: GenerativeUIRenderContext): ReactNode;

declare namespace entry_slack_exports {
  export { FromSlackBlocksResult, SlackActionElement, SlackActionsBlock, SlackAlertBlock, SlackAlertLevel, SlackBlock, SlackBlocksResult, SlackButtonElement, SlackCardBlock, SlackCarouselBlock, SlackCheckboxesElement, SlackContextBlock, SlackConversionWarning, SlackDataTableBlock, SlackDataTableCell, SlackDataTableRawNumberCell, SlackDataTableRawTextCell, SlackDatePickerElement, SlackDividerBlock, SlackHeaderBlock, SlackImageBlock, SlackInputBlock, SlackMarkdownBlock, SlackMrkdwnText, SlackOption, SlackPlainText, SlackPlainTextInputElement, SlackRadioButtonsElement, SlackSectionBlock, SlackStaticSelectElement, SlackTextObject, ToSlackBlocksOptions, decodeBlockAction, fromSlackBlocks, toSlackBlocks };
}

declare function toSlackBlocks(node: unknown, options?: ToSlackBlocksOptions): SlackBlocksResult;

export { entry_ir_exports as entry_ir, entry_root_default_exports as entry_root_default, entry_root_react_server_exports as entry_root_react_server, entry_slack_exports as entry_slack };
