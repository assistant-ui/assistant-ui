import "@standard-schema/spec";

import "json-schema";

import { ComputedRef, PropType, Ref, SlotsType, VNodeChild } from "vue";

declare const ActionBarPrimitiveCopy: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  copiedDuration: {
    type: NumberConstructor;
    default: number;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  copiedDuration: {
    type: NumberConstructor;
    default: number;
  };
}>> & Readonly<{}>, {
  copiedDuration: number;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ActionBarPrimitiveEdit: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ActionBarPrimitiveReload: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

type AssistantClient = ClientScopes & {
  readonly optional: {
    readonly [K in keyof ClientScopes]: ClientScopes[K] | undefined;
  };
  subscribe(listener: () => void): Unsubscribe$1;
  on<TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>): Unsubscribe$1;
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

type AssistantClientHandle = AssistantClientSource & {
  destroy(): void;
};

type AssistantClientSource = {
  getClient(): AssistantClient;
  subscribe(listener: () => void): Unsubscribe$1;
};

type AssistantConfigSource = {
  getConfig(): AuiConfig.Input;
  subscribe(listener: () => void): Unsubscribe$1;
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

type AssistantState = ScopeStates & {
  readonly optional: {
    readonly [K in keyof ScopeStates]: ScopeStates[K] | undefined;
  };
};

declare const AttachmentByIndexProvider: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  source: {
    type: PropType<"composer" | "message">;
    required: true;
  };
  index: {
    type: NumberConstructor;
    required: true;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  source: {
    type: PropType<"composer" | "message">;
    required: true;
  };
  index: {
    type: NumberConstructor;
    required: true;
  };
}>> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const AttachmentPrimitiveName: import("vue").DefineComponent<{}, () => string | VNodeChild[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const AttachmentPrimitiveRemove: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const AttachmentPrimitiveRoot: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const AttachmentPrimitiveThumb: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type AuiConfig = AuiConfig.Input & {
  readonly [auiConfigBrand]: true;
};

declare namespace AuiConfig {
  type Input = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

declare const AuiConfig: (config: AuiConfig.Input) => AuiConfig;

declare const AuiIf: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  condition: {
    type: PropType<(state: AssistantState) => boolean>;
    required: true;
  };
}>, () => VNodeChild[] | null | undefined, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  condition: {
    type: PropType<(state: AssistantState) => boolean>;
    required: true;
  };
}>> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const AuiProvider: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  config: {
    type: PropType<AuiConfig>;
    required: true;
  };
  extends: {
    type: PropType<AssistantClient | null>;
    default: undefined;
  };
}>, () => VNodeChild[] | undefined, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  config: {
    type: PropType<AuiConfig>;
    required: true;
  };
  extends: {
    type: PropType<AssistantClient | null>;
    default: undefined;
  };
}>> & Readonly<{}>, {
  extends: AssistantClient | null;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

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
    readonly unstable_state?: ReadonlyJSONValue | undefined;
    readonly unstable_annotations?: readonly ReadonlyJSONValue[] | undefined;
    readonly unstable_data?: readonly ReadonlyJSONValue[] | undefined;
    readonly steps?: readonly ThreadStep[] | undefined;
    readonly submittedFeedback?: {
      readonly type: "negative" | "positive";
      readonly comment?: string;
    } | undefined;
    readonly timing?: MessageTiming | undefined;
    readonly isOptimistic?: boolean;
    readonly modality?: MessageModality | undefined;
    readonly custom: Record<string, unknown>;
  };
  readonly attachments?: ThreadUserMessage["attachments"];
};

declare const BranchPickerPrimitiveCount: import("vue").DefineComponent<{}, () => string, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const BranchPickerPrimitiveNext: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const BranchPickerPrimitiveNumber: import("vue").DefineComponent<{}, () => string, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const BranchPickerPrimitivePrevious: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type ChainOfThoughtPartsSlots = {
  default?: (props: {
    part: PartState;
  }) => VNodeChild[];
};

declare const ChainOfThoughtPrimitiveAccordionTrigger: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ChainOfThoughtPrimitiveParts: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<ChainOfThoughtPartsSlots>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

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

type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

type CompleteAttachmentStatus = {
  type: "complete";
};

declare const ComposerPrimitiveAddAttachment: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  multiple: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  multiple: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  multiple: boolean;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ComposerPrimitiveAttachmentDropzone: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  disabled: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  disabled: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  disabled: boolean;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ComposerPrimitiveAttachments: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ComposerPrimitiveCancel: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ComposerPrimitiveInput: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  submitOnEnter: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  submitOnEnter: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  submitOnEnter: boolean;
}, SlotsType<Record<string, never>>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ComposerPrimitiveSend: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type DataMessagePart<T = any> = {
  readonly type: "data";
  readonly id?: string;
  readonly name: string;
  readonly data: T;
};

type DataUIProps<T = unknown> = {
  part: Omit<Extract<AssistantState["part"], {
    type: "data";
  }>, "data"> & {
    data: T;
  };
};

declare const Derived: <K extends ClientNames>(config: Derived.Props<K>) => DerivedElement<K>;

declare namespace Derived {
  type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & ClientMeta<K>;
}

type DerivedElement<K extends ClientNames> = ResourceElement<DerivedInstance<K>>;

type DerivedInstance<K extends ClientNames> = ReturnType<AssistantClientAccessor<K>>;

declare const ErrorPrimitiveMessage: import("vue").DefineComponent<{}, () => string | VNodeChild[] | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ErrorPrimitiveRoot: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type FileMessagePart = {
  readonly type: "file";
  readonly id?: string;
  readonly filename?: string;
  readonly data: string;
  readonly mimeType: string;
  readonly sourceType?: "id" | "url";
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type GenerativeUIMessagePart = {
  readonly type: "generative-ui";
  readonly spec: GenerativeUISpec;
  readonly id?: string;
  readonly parentId?: string;
};

type GenerativeUINode = string | number | readonly GenerativeUINode[] | {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly GenerativeUINode[];
  readonly key?: string;
};

type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

type ImageMessagePart = {
  readonly type: "image";
  readonly id?: string;
  readonly image: string;
  readonly filename?: string;
  readonly providerMetadata?: PartProviderMetadata;
};

type McpAppMetadata = {
  readonly resourceUri: string;
  readonly mimeType?: string;
  readonly visibility?: readonly ("app" | "model")[];
  readonly serverId?: string;
};

declare const MessageByIdProvider: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  id: {
    type: StringConstructor;
    required: true;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  id: {
    type: StringConstructor;
    required: true;
  };
}>> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type MessageCommonProps = {
  readonly id: string;
  readonly createdAt: Date;
};

type MessageModality = "voice";

type MessagePartRuntime = {
  addToolResult(result: any | ToolResponse<any>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): Promise<void>;
  unstable_recordInteraction?: (input: Unstable_ToolInteractionInput) => Promise<void>;
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

type MessagePartStreamStatus = {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "content-filter" | "error" | "length" | "other";
};

type MessagePartTiming = {
  readonly startedAt: number;
  readonly completedAt?: number;
};

declare const MessagePrimitiveAttachments: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const MessagePrimitiveParts: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<Record<string, (() => VNodeChild[]) | undefined>>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const MessagePrimitiveRoot: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type MessageRuntimePath = ThreadRuntimePath & {
  readonly messageSelector: {
    readonly type: "messageId";
    readonly messageId: string;
  } | {
    readonly type: "index";
    readonly index: number;
  };
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

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

declare const PartByIndexProvider: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  index: {
    type: NumberConstructor;
    required: true;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  index: {
    type: NumberConstructor;
    required: true;
  };
}>> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type PartMethods = {
  getState(): PartState;
  addToolResult(result: unknown | ToolResponse<unknown>): void;
  resumeToolCall(payload: unknown): void;
  respondToToolApproval(response: ToolApprovalResponse): Promise<void>;
  unstable_recordInteraction?(input: Unstable_ToolInteractionInput): Promise<void>;
  __internal_getRuntime?(): MessagePartRuntime;
};

type PartProviderMetadata = {
  readonly [providerName: string]: ReadonlyJSONObject;
};

type PartState = (ThreadUserMessagePart | ThreadAssistantMessagePart) & {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReasoningMessagePart = {
  readonly type: "reasoning";
  readonly id?: string;
  readonly text: string;
  readonly status?: MessagePartStreamStatus;
  readonly unstable_summary?: string;
  readonly timing?: MessagePartTiming;
  readonly providerMetadata?: PartProviderMetadata;
  readonly parentId?: string;
};

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

type ResourceElement<V> = {
  readonly hook: (...args: any[]) => V;
  readonly args: readonly unknown[];
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type ScopeStates = {
  [K in ClientNames]: ClientSchemas[K]["methods"] extends {
    getState: () => infer S;
  } ? S : never;
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

declare const SuggestionByIndexProvider: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  index: {
    type: NumberConstructor;
    required: true;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  index: {
    type: NumberConstructor;
    required: true;
  };
}>> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const SuggestionPrimitiveDescription: import("vue").DefineComponent<{}, () => string, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const SuggestionPrimitiveTitle: import("vue").DefineComponent<{}, () => string, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const SuggestionPrimitiveTrigger: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  send: {
    type: BooleanConstructor;
    default: boolean;
  };
  clearComposer: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  send: {
    type: BooleanConstructor;
    default: boolean;
  };
  clearComposer: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  send: boolean;
  clearComposer: boolean;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const TOOL_RESPONSE_SYMBOL: unique symbol;

type TextMessagePart = {
  readonly type: "text";
  readonly id?: string;
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
      readonly comment?: string;
    };
    readonly timing?: MessageTiming;
    readonly isOptimistic?: boolean;
    readonly modality?: MessageModality;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadAssistantMessagePart = TextMessagePart | ReasoningMessagePart | ToolCallMessagePart | SourceMessagePart | FileMessagePart | ImageMessagePart | DataMessagePart | GenerativeUIMessagePart;

declare const ThreadListItemByIndexProvider: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  index: {
    type: NumberConstructor;
    required: true;
  };
  archived: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  index: {
    type: NumberConstructor;
    required: true;
  };
  archived: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  archived: boolean;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListItemPrimitiveArchive: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListItemPrimitiveDelete: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListItemPrimitiveRoot: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListItemPrimitiveTitle: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  fallback: {
    type: StringConstructor;
    default: string;
  };
}>, () => string | VNodeChild[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  fallback: {
    type: StringConstructor;
    default: string;
  };
}>> & Readonly<{}>, {
  fallback: string;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListItemPrimitiveTrigger: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListItemPrimitiveUnarchive: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListPrimitiveItems: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  archived: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  archived: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  archived: boolean;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListPrimitiveLoadMore: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListPrimitiveNew: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadListPrimitiveRoot: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type ThreadMessage = BaseThreadMessage & (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

declare const ThreadPrimitiveMessages: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadPrimitiveRoot: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadPrimitiveScrollToBottom: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  behavior: {
    type: PropType<ScrollBehavior>;
    default: string;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  behavior: {
    type: PropType<ScrollBehavior>;
    default: string;
  };
}>> & Readonly<{}>, {
  behavior: ScrollBehavior;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadPrimitiveSuggestions: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadPrimitiveViewport: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
  autoScroll: {
    type: BooleanConstructor;
    default: boolean;
  };
  scrollToBottomOnInitialize: {
    type: BooleanConstructor;
    default: boolean;
  };
  scrollToBottomOnRunStart: {
    type: BooleanConstructor;
    default: boolean;
  };
  scrollToBottomOnThreadSwitch: {
    type: BooleanConstructor;
    default: boolean;
  };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
  autoScroll: {
    type: BooleanConstructor;
    default: boolean;
  };
  scrollToBottomOnInitialize: {
    type: BooleanConstructor;
    default: boolean;
  };
  scrollToBottomOnRunStart: {
    type: BooleanConstructor;
    default: boolean;
  };
  scrollToBottomOnThreadSwitch: {
    type: BooleanConstructor;
    default: boolean;
  };
}>> & Readonly<{}>, {
  autoScroll: boolean;
  scrollToBottomOnInitialize: boolean;
  scrollToBottomOnRunStart: boolean;
  scrollToBottomOnThreadSwitch: boolean;
}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

declare const ThreadPrimitiveViewportFooter: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, SlotsType<{
  default?: () => VNodeChild[];
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

type ThreadRuntimePath = {
  readonly ref: string;
  readonly threadSelector: {
    readonly type: "main";
  } | {
    readonly type: "threadId";
    readonly threadId: string;
  };
};

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
    readonly modality?: undefined;
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
    readonly modality?: MessageModality;
    readonly custom: Record<string, unknown>;
  };
};

type ThreadUserMessagePart = TextMessagePart | ImageMessagePart | FileMessagePart | DataMessagePart | Unstable_AudioMessagePart;

type ToolApprovalAnswer = {
  readonly optionIds?: readonly string[];
  readonly text?: string;
};

type ToolApprovalDisplay = "decision" | "questions" | "select" | "text";

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

type ToolApprovalQuestion = {
  readonly id: string;
  readonly prompt: string;
  readonly header?: string;
  readonly options?: readonly ToolApprovalQuestionOption[];
  readonly multiple?: boolean;
  readonly allowFreeform?: boolean;
};

type ToolApprovalQuestionOption = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
};

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
} | {
  readonly answers: Readonly<Record<string, ToolApprovalAnswer>>;
  readonly reason?: string;
};

type ToolCallMessagePart<TArgs = ReadonlyJSONObject, TResult = unknown> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
  readonly isPreliminary?: boolean | undefined;
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
    readonly dismissible?: boolean;
    readonly approved?: boolean;
    readonly reason?: string;
    readonly isAutomatic?: boolean;
    readonly options?: readonly ToolApprovalOption[];
    readonly optionId?: string;
    readonly text?: string;
    readonly questions?: readonly ToolApprovalQuestion[];
    readonly answers?: Readonly<Record<string, ToolApprovalAnswer>>;
    readonly resolution?: "cancelled" | "expired";
  };
  readonly parentId?: string;
  readonly messages?: readonly ThreadMessage[];
  readonly unstable_interactions?: Unstable_ToolInteractionLog;
};

type ToolCallMessagePartMcpMetadata = {
  readonly app?: McpAppMetadata;
};

type ToolCallMessagePartStatus = {
  readonly type: "requires-action";
  readonly reason: "interrupt" | "tool-calls";
} | {
  readonly type: "incomplete";
  readonly reason: "tool-calls";
  readonly error?: ReadonlyJSONValue;
} | MessagePartStatus;

type ToolCallTiming = MessagePartTiming;

type ToolModelContentPart = {
  readonly type: "text";
  readonly text: string;
} | {
  readonly type: "file";
  readonly data: string;
  readonly mediaType: string;
  readonly filename?: string;
};

declare class ToolResponse<TResult> {
  get [TOOL_RESPONSE_SYMBOL](): boolean;
  readonly artifact?: ReadonlyJSONValue;
  readonly result: TResult;
  readonly isError: boolean;
  readonly isPreliminary?: boolean;
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
  isPreliminary?: boolean | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
  messages?: ReadonlyJSONValue | undefined;
};

type ToolUIProps = {
  part: Extract<AssistantState["part"], {
    type: "tool-call";
  }>;
  addResult: PartMethods["addToolResult"];
  resume: PartMethods["resumeToolCall"];
  respondToApproval: PartMethods["respondToToolApproval"];
  unstable_recordInteraction?: PartMethods["unstable_recordInteraction"];
};

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;
    readonly format: "mp3" | "wav";
  };
};

type Unstable_ToolInteraction = {
  readonly type: "action";
  readonly occurredAt: number;
  readonly payload: ReadonlyJSONObject;
} | {
  readonly type: "human-response";
  readonly occurredAt: number;
  readonly payload: ReadonlyJSONValue;
};

type Unstable_ToolInteractionInput = {
  readonly type: Unstable_ToolInteraction["type"];
  readonly payload: unknown;
};

type Unstable_ToolInteractionLog = {
  readonly entries: readonly Unstable_ToolInteraction[];
  readonly omitted?: number;
};

type Unsubscribe = () => void;

type Unsubscribe$1 = () => void;

type ValidateClient<K extends string, TClient> = K extends ReservedScopeNames ? ClientError<`ERROR: ${K} is a reserved scope name`> : unknown extends ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> ? TClient : ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> & ClientError<never>;

type ValidateEvents<K extends string, TClient> = "events" extends keyof TClient ? TClient["events"] extends ClientEventsType<K> ? unknown : ClientError<`ERROR: ${K} has invalid events type`> : unknown;

type ValidateMeta<K extends string, TClient> = "meta" extends keyof TClient ? TClient["meta"] extends ClientMetaType ? unknown : ClientError<`ERROR: ${K} has invalid meta type`> : unknown;

type ValidateMethods<K extends string, TClient> = TClient extends {
  methods: ClientMethods;
} ? keyof TClient["methods"] & ReservedAccessorProps extends never ? unknown : ClientError<`ERROR: ${K} methods declare a reserved accessor property (source/query/name)`> : ClientError<`ERROR: ${K} has invalid methods type`>;

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

declare const auiConfigBrand: unique symbol;

declare const createAssistantClient: (config: AuiConfig.Input | AssistantConfigSource, options?: {
  parent?: AssistantClient | AssistantClientSource | undefined;
}) => AssistantClientHandle;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

declare namespace entry_root_exports {
  export { ActionBarPrimitiveCopy, ActionBarPrimitiveEdit, ActionBarPrimitiveReload, AssistantClient, AssistantClientHandle, AssistantClientSource, AssistantConfigSource, AssistantEventCallback, AssistantEventName, AssistantEventSelector, AssistantState, AttachmentByIndexProvider, AttachmentPrimitiveName, AttachmentPrimitiveRemove, AttachmentPrimitiveRoot, AttachmentPrimitiveThumb, AuiConfig, AuiIf, AuiProvider, BranchPickerPrimitiveCount, BranchPickerPrimitiveNext, BranchPickerPrimitiveNumber, BranchPickerPrimitivePrevious, ChainOfThoughtPrimitiveAccordionTrigger, ChainOfThoughtPrimitiveParts, ComposerPrimitiveAddAttachment, ComposerPrimitiveAttachmentDropzone, ComposerPrimitiveAttachments, ComposerPrimitiveCancel, ComposerPrimitiveInput, ComposerPrimitiveSend, DataUIProps, Derived, ErrorPrimitiveMessage, ErrorPrimitiveRoot, MessageByIdProvider, MessagePrimitiveAttachments, MessagePrimitiveParts, MessagePrimitiveRoot, PartByIndexProvider, SuggestionByIndexProvider, SuggestionPrimitiveDescription, SuggestionPrimitiveTitle, SuggestionPrimitiveTrigger, ThreadListItemByIndexProvider, ThreadListItemPrimitiveArchive, ThreadListItemPrimitiveDelete, ThreadListItemPrimitiveRoot, ThreadListItemPrimitiveTitle, ThreadListItemPrimitiveTrigger, ThreadListItemPrimitiveUnarchive, ThreadListPrimitiveItems, ThreadListPrimitiveLoadMore, ThreadListPrimitiveNew, ThreadListPrimitiveRoot, ThreadPrimitiveMessages, ThreadPrimitiveRoot, ThreadPrimitiveScrollToBottom, ThreadPrimitiveSuggestions, ThreadPrimitiveViewport, ThreadPrimitiveViewportFooter, ToolUIProps, Unsubscribe$1 as Unsubscribe, createAssistantClient, useAui, useAuiEvent, useAuiState, useScrollLock };
}

declare const useAui: () => AssistantClient;

declare const useAuiEvent: <TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>) => void;

declare const useAuiState: <T>(selector: (state: AssistantState) => T) => ComputedRef<T>;

declare const useScrollLock: (target: Ref<HTMLElement | null | undefined>, animationDuration: number) => () => void;

export { entry_root_exports as entry_root };
