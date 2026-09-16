import { Primitive } from "@radix-ui/react-primitive";

import "@standard-schema/spec";

import { Element } from "hast";

import "radix-ui";

import "radix-ui/internal";

import { ComponentProps, ComponentPropsWithoutRef, ComponentType, ElementType, ForwardRefExoticComponent, RefAttributes } from "react";

import { Options } from "react-markdown";

import "react-textarea-autosize";

import "zustand";

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

type CodeComponent = ComponentType<ComponentPropsWithoutRef<"code"> & {
  node?: Element | undefined;
}>;

type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

type Components = {
  [Key in Extract<ElementType, string>]?: ComponentType<ComponentProps<Key>>;
} & {
  SyntaxHighlighter?: ComponentType<Omit<SyntaxHighlighterProps, "node">> | undefined;
  CodeHeader?: ComponentType<Omit<CodeHeaderProps, "node">> | undefined;
};

type ComponentsByLanguage = Record<string, {
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
}>;

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

declare const MarkdownTextPrimitive: ForwardRefExoticComponent<MarkdownTextPrimitiveProps> & RefAttributes<HTMLDivElement>;

type MarkdownTextPrimitiveProps = Omit<Options, "children" | "components"> & {
  className?: string | undefined;
  containerProps?: Omit<PrimitiveDivProps, "asChild" | "children"> | undefined;
  containerComponent?: ElementType | undefined;
  components?: (NonNullable<Options["components"]> & {
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
    CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  }) | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  smooth?: boolean | SmoothOptions | undefined;
  defer?: boolean | undefined;
  preprocess?: (text: string) => string;
};

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

type PreComponent = ComponentType<ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
}>;

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

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

type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
  };
  language: string;
  code: string;
};

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

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

declare namespace entry_code_fence_exports {
  export { CodeComponent, CodeHeaderProps, ComponentsByLanguage, PreComponent, SyntaxHighlighterProps, parseLanguageClass };
}

declare function escapeCurrencyDollars(text: string): string;

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
  export { CodeHeaderProps, MarkdownTextPrimitive, MarkdownTextPrimitiveProps, SyntaxHighlighterProps, escapeCurrencyDollars, normalizeMathDelimiters, rewriteCustomMathTags, rewriteLatexBracketDelimiters, memoizeMarkdownComponents as unstable_memoizeMarkdownComponents, useIsMarkdownCodeBlock };
}

declare const memoizeMarkdownComponents: (components?: Components) => {
  [k: string]: import("react").MemoExoticComponent<(_param0: {
    node?: Element;
  }) => import("react").JSX.Element> | undefined;
};

declare function normalizeMathDelimiters(text: string): string;

declare const parseLanguageClass: (className: string | undefined) => string;

declare function rewriteCustomMathTags(text: string): string;

declare function rewriteLatexBracketDelimiters(text: string): string;

declare const useIsMarkdownCodeBlock: () => boolean;

export { entry_code_fence_exports as entry_code_fence, entry_root_exports as entry_root };
