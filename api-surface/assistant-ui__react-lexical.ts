import "@standard-schema/spec";

import { DOMConversionMap, DOMExportOutput, DecoratorNode, EditorConfig, LexicalEditor, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";

import "radix-ui";

import "radix-ui/internal";

import { ComponentPropsWithoutRef, FC, ReactNode } from "react";

import "react-textarea-autosize";

import "zustand";

declare function $createDirectiveNode(item: Unstable_TriggerItem, directiveText?: string | undefined): DirectiveNode;

declare function $createDirectiveNodeWithFormatter(item: Unstable_TriggerItem, formatter: Unstable_DirectiveFormatter): DirectiveNode;

declare function $isDirectiveNode(node: LexicalNode | null | undefined): node is DirectiveNode;

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

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

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: EventLog[];
}

interface DevToolsHook {
  apis: Map<number, DevToolsApiEntry>;
  nextId: number;
  listeners: Set<(apiId: number) => void>;
}

type DirectiveChipProps = {
  directiveId: string;
  directiveType: string;
  label: string;
};

declare const DirectiveChipProvider: import("react").Provider<FC<DirectiveChipProps> | null>;

declare class DirectiveNode extends DecoratorNode<ReactNode> {
  __directiveId: string;
  __directiveType: string;
  __label: string;
  __description: string | undefined;
  __metadata: Unstable_TriggerItem["metadata"];
  __directiveText: string;
  static getType(): string;
  static clone(node: DirectiveNode): DirectiveNode;
  constructor(item: Unstable_TriggerItem, directiveText: string, key?: NodeKey);
  static importJSON(serialized: SerializedDirectiveNode): DirectiveNode;
  exportJSON(): SerializedDirectiveNode;
  createDOM(_config: EditorConfig): HTMLElement;
  updateDOM(): false;
  exportDOM(_editor: LexicalEditor): DOMExportOutput;
  static importDOM(): DOMConversionMap | null;
  getTextContent(): string;
  getDirectiveText(): string;
  isInline(): boolean;
  isIsolated(): boolean;
  isKeyboardSelectable(): boolean;
  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactNode;
  getDirectiveItem(): Unstable_TriggerItem;
}

declare function DirectivePlugin(_param0?: DirectivePluginProps): null;

type DirectivePluginProps = {
  onDirectiveSelect?: ((item: Unstable_TriggerItem) => void) | undefined;
};

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

declare const LexicalComposerInput: import("react").ForwardRefExoticComponent<Omit<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref">, "autoFocus" | "children"> & {
  submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
  cancelOnEscape?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  directivePluginProps?: DirectivePluginProps | undefined;
  directiveChip?: FC<DirectiveChipProps> | undefined;
  formatter?: Unstable_DirectiveFormatter | undefined;
  children?: ReactNode | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

type LexicalComposerInputProps = Omit<ComponentPropsWithoutRef<"div">, "autoFocus" | "children"> & {
  submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
  cancelOnEscape?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  directivePluginProps?: DirectivePluginProps | undefined;
  directiveChip?: FC<DirectiveChipProps> | undefined;
  formatter?: Unstable_DirectiveFormatter | undefined;
  children?: ReactNode | undefined;
};

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

type ReadonlyJSONValue = null | string | number | boolean | ReadonlyJSONObject | ReadonlyJSONArray;

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type SerializedDirectiveNode = Spread<{
  directiveId: string;
  directiveType: string;
  label: string;
  description?: string | undefined;
  metadata?: Unstable_TriggerItem["metadata"];
  directiveText?: string;
}, SerializedLexicalNode>;

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

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

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

type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

type Unsubscribe = () => void;

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
  export { $createDirectiveNode, $createDirectiveNodeWithFormatter, $isDirectiveNode, DirectiveChipProps, DirectiveChipProvider, DirectiveNode, DirectivePlugin, DirectivePluginProps, LexicalComposerInput, LexicalComposerInputProps };
}

export { entry_root_exports as entry_root };
