import { ComponentPropsWithoutRef, ComponentType } from "react";

interface Data$1 {
}

interface Point {
  line: number;
  column: number;
  offset?: number | undefined;
}

interface Position {
  start: Point;
  end: Point;
}

interface Node$1 {
  type: string;
  data?: Data$1 | undefined;
  position?: Position | undefined;
}

interface Data extends Data$1 {
}

interface Properties {
  [PropertyName: string]: boolean | number | string | null | undefined | Array<string | number>;
}

type ElementContent = ElementContentMap[keyof ElementContentMap];

interface ElementContentMap {
  comment: Comment;
  element: Element;
  text: Text;
}

type RootContent = RootContentMap[keyof RootContentMap];

interface RootContentMap {
  comment: Comment;
  doctype: Doctype;
  element: Element;
  text: Text;
}

interface Node extends Node$1 {
  data?: Data | undefined;
}

interface Literal extends Node {
  value: string;
}

interface Parent extends Node {
  children: RootContent[];
}

interface Comment extends Literal {
  type: "comment";
  data?: CommentData | undefined;
}

interface CommentData extends Data {
}

interface Doctype extends Node$1 {
  type: "doctype";
  data?: DoctypeData | undefined;
}

interface DoctypeData extends Data {
}

interface Element extends Parent {
  type: "element";
  tagName: string;
  properties: Properties;
  children: ElementContent[];
  content?: Root | undefined;
  data?: ElementData | undefined;
}

interface ElementData extends Data {
}

interface Root extends Parent {
  type: "root";
  children: RootContent[];
  data?: RootData | undefined;
}

interface RootData extends Data {
}

interface Text extends Literal {
  type: "text";
  data?: TextData | undefined;
}

interface TextData extends Data {
}

type PreComponent = ComponentType<ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
}>;

type CodeComponent = ComponentType<ComponentPropsWithoutRef<"code"> & {
  node?: Element | undefined;
}>;

type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
  };
  language: string;
  code: string;
};

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

type ClientNames = keyof ClientSchemas extends infer U ? U : never;

type ClientEvents<K extends ClientNames> = "events" extends keyof ClientSchemas[K] ? ClientSchemas[K]["events"] extends ClientEventsType<K> ? ClientSchemas[K]["events"] : never : never;

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "query" | "source"> : never;

type Unsubscribe = () => void;

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

declare const makeSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare const makePrismSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare const makePrismAsyncSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare namespace entry_full_exports {
  export { makePrismAsyncSyntaxHighlighter, makePrismSyntaxHighlighter, makeSyntaxHighlighter };
}

declare const makePrismAsyncLightSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare const makePrismLightSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare const makeLightSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare const makeLightAsyncSyntaxHighlighter: (config: Omit<import("react-syntax-highlighter").SyntaxHighlighterProps, "children" | "language">) => import("react").FC<SyntaxHighlighterProps>;

declare namespace entry_root_exports {
  export { makeLightAsyncSyntaxHighlighter, makeLightSyntaxHighlighter, makePrismAsyncLightSyntaxHighlighter, makePrismLightSyntaxHighlighter };
}

export { entry_full_exports as entry_full, entry_root_exports as entry_root };
