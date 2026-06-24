import React, { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";

import { RemendOptions } from "remend";

import { BundledLanguage, BundledTheme, BundledTheme as BundledTheme$1, CjkPlugin, CodeHighlighterPlugin, DiagramPlugin, HighlightOptions, MathPlugin, MermaidErrorComponentProps, MermaidOptions, StreamdownContext, StreamdownProps, StreamdownProps as StreamdownProps$1, StreamdownProps as StreamdownProps$2, parseMarkdownIntoBlocks } from "streamdown";

import { Options as RemarkRehypeOptions } from "remark-rehype";

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

type PreOverrideProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

declare function useIsStreamdownCodeBlock(): boolean;

declare function useStreamdownPreProps(): PreOverrideProps | null;

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

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "source" | "query"> : never;

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

type SmoothOptions = {
  drainMs?: number | undefined;
  maxCharIntervalMs?: number | undefined;
  maxCharsPerFrame?: number | undefined;
  minCommitMs?: number | undefined;
};

type CaretStyle = "block" | "circle";

type ControlsConfig = boolean | {
  table?: boolean;
  code?: boolean;
  mermaid?: boolean | {
    download?: boolean;
    copy?: boolean;
    fullscreen?: boolean;
    panZoom?: boolean;
  };
};

type LinkSafetyModalProps = {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

type LinkSafetyConfig = {
  enabled: boolean;
  onLinkCheck?: (url: string) => Promise<boolean> | boolean;
  renderModal?: (props: LinkSafetyModalProps) => ReactNode;
};

type RemendHandler = {
  name: string;
  handle: (text: string) => string;
  priority?: number;
};

type RemendConfig = {
  links?: boolean;
  images?: boolean;
  linkMode?: "protocol" | "text-only";
  bold?: boolean;
  italic?: boolean;
  boldItalic?: boolean;
  inlineCode?: boolean;
  strikethrough?: boolean;
  katex?: boolean;
  setextHeadings?: boolean;
  handlers?: RemendHandler[];
};

type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: ComponentType<ComponentPropsWithoutRef<"pre"> & {
      node?: Element | undefined;
    }>;
    Code: ComponentType<ComponentPropsWithoutRef<"code"> & {
      node?: Element | undefined;
    }>;
  };
  language: string;
  code: string;
};

type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

type ComponentsByLanguage = Record<string, {
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
}>;

type StreamdownTextComponents = NonNullable<StreamdownProps$2["components"]> & {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
};

type PluginConfig = {
  code?: unknown | false | undefined;
  math?: unknown | false | undefined;
  cjk?: unknown | false | undefined;
  mermaid?: unknown | false | undefined;
};

type ResolvedPluginConfig = NonNullable<StreamdownProps$2["plugins"]>;

type AllowedTags = Record<string, string[]>;

type SecurityConfig = {
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
  allowedProtocols?: string[];
  allowDataImages?: boolean;
  defaultOrigin?: string;
  blockedLinkClass?: string;
  blockedImageClass?: string;
};

type BlockProps = {
  content: string;
  shouldParseIncompleteMarkdown: boolean;
  index: number;
  components?: StreamdownProps$2["components"];
  rehypePlugins?: StreamdownProps$2["rehypePlugins"];
  remarkPlugins?: StreamdownProps$2["remarkPlugins"];
  remarkRehypeOptions?: RemarkRehypeOptions;
};

type StreamdownTextPrimitiveProps = Omit<StreamdownProps$2, "children" | "components" | "plugins" | "caret" | "controls" | "linkSafety" | "remend" | "mermaid" | "BlockComponent" | "parseMarkdownIntoBlocksFn"> & {
  components?: StreamdownTextComponents | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  plugins?: PluginConfig | undefined;
  preprocess?: ((text: string) => string) | undefined;
  defer?: boolean | undefined;
  smooth?: boolean | SmoothOptions | undefined;
  containerProps?: Omit<ComponentPropsWithoutRef<"div">, "children"> | undefined;
  containerClassName?: string | undefined;
  caret?: CaretStyle | undefined;
  controls?: ControlsConfig | undefined;
  linkSafety?: LinkSafetyConfig | undefined;
  remend?: RemendConfig | undefined;
  mermaid?: MermaidOptions | undefined;
  parseIncompleteMarkdown?: boolean | undefined;
  allowedTags?: AllowedTags | undefined;
  remarkRehypeOptions?: RemarkRehypeOptions | undefined;
  security?: SecurityConfig | undefined;
  BlockComponent?: StreamdownProps$2["BlockComponent"] | undefined;
  parseMarkdownIntoBlocksFn?: ((markdown: string) => string[]) | undefined;
};

declare const DEFAULT_SHIKI_THEME: [
  BundledTheme,
  BundledTheme
];

declare const StreamdownTextPrimitive: import("react").ForwardRefExoticComponent<Omit<StreamdownProps, "children" | "components" | "plugins" | "caret" | "controls" | "linkSafety" | "remend" | "mermaid" | "BlockComponent" | "parseMarkdownIntoBlocksFn"> & {
  components?: StreamdownTextComponents | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  plugins?: PluginConfig | undefined;
  preprocess?: ((text: string) => string) | undefined;
  defer?: boolean | undefined;
  smooth?: boolean | SmoothOptions | undefined;
  containerProps?: Omit<import("react").ComponentPropsWithoutRef<"div">, "children"> | undefined;
  containerClassName?: string | undefined;
  caret?: CaretStyle | undefined;
  controls?: ControlsConfig | undefined;
  linkSafety?: LinkSafetyConfig | undefined;
  remend?: RemendConfig | undefined;
  mermaid?: import("streamdown").MermaidOptions | undefined;
  parseIncompleteMarkdown?: boolean | undefined;
  allowedTags?: AllowedTags | undefined;
  remarkRehypeOptions?: import("remark-rehype").Options | undefined;
  security?: SecurityConfig | undefined;
  BlockComponent?: StreamdownProps["BlockComponent"] | undefined;
  parseMarkdownIntoBlocksFn?: ((markdown: string) => string[]) | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare function memoCompareNodes<T extends {
  children?: ReactNode;
  [key: string]: unknown;
}>(prev: Readonly<T>, next: Readonly<T>): boolean;

declare function rewriteLatexBracketDelimiters(text: string): string;

declare function rewriteCustomMathTags(text: string): string;

declare function normalizeMathDelimiters(text: string): string;

declare function escapeCurrencyDollars(text: string): string;

declare function findRemendWindowStart(text: string): number;

declare function tailBoundedRemend(text: string, options?: RemendOptions): string;

declare namespace index_d_exports {
  export { AllowedTags, BlockProps, BundledLanguage, BundledTheme$1 as BundledTheme, CaretStyle, CjkPlugin, CodeHeaderProps, CodeHighlighterPlugin, ComponentsByLanguage, ControlsConfig, DEFAULT_SHIKI_THEME, DiagramPlugin, HighlightOptions, LinkSafetyConfig, LinkSafetyModalProps, MathPlugin, MermaidErrorComponentProps, MermaidOptions, PluginConfig, RemarkRehypeOptions, RemendConfig, RemendHandler, ResolvedPluginConfig, SecurityConfig, StreamdownContext, StreamdownProps$1 as StreamdownProps, StreamdownTextComponents, StreamdownTextPrimitive, StreamdownTextPrimitiveProps, SyntaxHighlighterProps, escapeCurrencyDollars, findRemendWindowStart, memoCompareNodes, normalizeMathDelimiters, parseMarkdownIntoBlocks, rewriteCustomMathTags, rewriteLatexBracketDelimiters, tailBoundedRemend, useIsStreamdownCodeBlock, useStreamdownPreProps };
}

export { index_d_exports as entry_0_root };
