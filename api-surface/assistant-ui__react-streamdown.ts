import "@radix-ui/react-primitive";

import "@standard-schema/spec";

import "radix-ui";

import { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";

import "react-textarea-autosize";

import { Options as RemarkRehypeOptions } from "remark-rehype";

import { RemendOptions } from "remend";

import { BundledLanguage, BundledTheme, BundledTheme as BundledTheme$1, CjkPlugin, CodeHighlighterPlugin, DiagramPlugin, HighlightOptions, MathPlugin, MermaidErrorComponentProps, MermaidOptions, StreamdownContext, StreamdownProps, StreamdownProps as StreamdownProps$1, StreamdownProps as StreamdownProps$2, parseMarkdownIntoBlocks } from "streamdown";

import "zustand";

type AllowedTags = Record<string, string[]>;

type AncestorsOf<K extends ClientNames, Seen extends ClientNames = never> = K extends Seen ? never : ParentOf<K> extends never ? never : ParentOf<K> | AncestorsOf<ParentOf<K>, Seen | K>;

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

type BlockProps = {
  content: string;
  shouldParseIncompleteMarkdown: boolean;
  index: number;
  components?: StreamdownProps$2["components"];
  rehypePlugins?: StreamdownProps$2["rehypePlugins"];
  remarkPlugins?: StreamdownProps$2["remarkPlugins"];
  remarkRehypeOptions?: RemarkRehypeOptions;
};

type CaretStyle = "block" | "circle";

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

type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

interface Comment extends Literal {
  type: "comment";
  data?: CommentData | undefined;
}

interface CommentData extends Data {
}

type ComponentsByLanguage = Record<string, {
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
}>;

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

declare const DEFAULT_SHIKI_THEME: [
  BundledTheme,
  BundledTheme
];

interface Data extends Data$1 {
}

interface Data$1 {
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

type ElementContent = ElementContentMap[keyof ElementContentMap];

interface ElementContentMap {
  comment: Comment;
  element: Element;
  text: Text;
}

interface ElementData extends Data {
}

interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type LinkSafetyConfig = {
  enabled: boolean;
  onLinkCheck?: (url: string) => Promise<boolean> | boolean;
  renderModal?: (props: LinkSafetyModalProps) => ReactNode;
};

type LinkSafetyModalProps = {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

interface Literal extends Node {
  value: string;
}

interface Node extends Node$1 {
  data?: Data | undefined;
}

interface Node$1 {
  type: string;
  data?: Data$1 | undefined;
  position?: Position | undefined;
}

interface Parent extends Node {
  children: RootContent[];
}

type ParentOf<K extends ClientNames> = AssistantClientAccessor<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PluginConfig = {
  code?: unknown | false | undefined;
  math?: unknown | false | undefined;
  cjk?: unknown | false | undefined;
  mermaid?: unknown | false | undefined;
};

interface Point {
  line: number;
  column: number;
  offset?: number | undefined;
}

interface Position {
  start: Point;
  end: Point;
}

type PreOverrideProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

interface Properties {
  [PropertyName: string]: boolean | number | string | null | undefined | Array<string | number>;
}

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

type RemendHandler = {
  name: string;
  handle: (text: string) => string;
  priority?: number;
};

type ResolvedPluginConfig = NonNullable<StreamdownProps$2["plugins"]>;

interface Root extends Parent {
  type: "root";
  children: RootContent[];
  data?: RootData | undefined;
}

type RootContent = RootContentMap[keyof RootContentMap];

interface RootContentMap {
  comment: Comment;
  doctype: Doctype;
  element: Element;
  text: Text;
}

interface RootData extends Data {
}

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

type SecurityConfig = {
  allowedLinkPrefixes?: string[];
  allowedImagePrefixes?: string[];
  allowedProtocols?: string[];
  allowDataImages?: boolean;
  defaultOrigin?: string;
  blockedLinkClass?: string;
  blockedImageClass?: string;
};

type SmoothOptions = {
  drainMs?: number | undefined;
  maxCharIntervalMs?: number | undefined;
  maxCharsPerFrame?: number | undefined;
  minCommitMs?: number | undefined;
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

type StreamdownTextComponents = NonNullable<StreamdownProps$2["components"]> & {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
};

declare const StreamdownTextPrimitive: import("react").ForwardRefExoticComponent<Omit<StreamdownProps, "BlockComponent" | "caret" | "children" | "components" | "controls" | "linkSafety" | "mermaid" | "parseMarkdownIntoBlocksFn" | "plugins" | "remend"> & {
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

type StreamdownTextPrimitiveProps = Omit<StreamdownProps$2, "BlockComponent" | "caret" | "children" | "components" | "controls" | "linkSafety" | "mermaid" | "parseMarkdownIntoBlocksFn" | "plugins" | "remend"> & {
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

interface Text extends Literal {
  type: "text";
  data?: TextData | undefined;
}

interface TextData extends Data {
}

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type Unsubscribe = () => void;

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

declare function escapeCurrencyDollars(text: string): string;

declare function findRemendWindowStart(text: string): number;

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
  export { AllowedTags, BlockProps, BundledLanguage, BundledTheme$1 as BundledTheme, CaretStyle, CjkPlugin, CodeHeaderProps, CodeHighlighterPlugin, ComponentsByLanguage, ControlsConfig, DEFAULT_SHIKI_THEME, DiagramPlugin, HighlightOptions, LinkSafetyConfig, LinkSafetyModalProps, MathPlugin, MermaidErrorComponentProps, MermaidOptions, PluginConfig, RemarkRehypeOptions, RemendConfig, RemendHandler, ResolvedPluginConfig, SecurityConfig, StreamdownContext, StreamdownProps$1 as StreamdownProps, StreamdownTextComponents, StreamdownTextPrimitive, StreamdownTextPrimitiveProps, SyntaxHighlighterProps, escapeCurrencyDollars, findRemendWindowStart, memoCompareNodes, normalizeMathDelimiters, parseMarkdownIntoBlocks, rewriteCustomMathTags, rewriteLatexBracketDelimiters, tailBoundedRemend, useIsStreamdownCodeBlock, useStreamdownPreProps };
}

declare function memoCompareNodes<T extends {
  children?: ReactNode;
  [key: string]: unknown;
}>(prev: Readonly<T>, next: Readonly<T>): boolean;

declare function normalizeMathDelimiters(text: string): string;

declare function rewriteCustomMathTags(text: string): string;

declare function rewriteLatexBracketDelimiters(text: string): string;

declare function tailBoundedRemend(text: string, options?: RemendOptions): string;

declare function useIsStreamdownCodeBlock(): boolean;

declare function useStreamdownPreProps(): PreOverrideProps | null;

export { entry_root_exports as entry_root };
