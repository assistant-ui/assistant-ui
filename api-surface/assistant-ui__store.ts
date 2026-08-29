import React, { FC, PropsWithChildren, ReactNode } from "react";

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

type AssistantClientHandle = AssistantClientSource & {
  destroy(): void;
};

type AssistantClientSource = {
  getClient(): AssistantClient;
  subscribe(listener: () => void): Unsubscribe;
};

type AssistantConfigSource = {
  getConfig(): AuiConfig.Input;
  subscribe(listener: () => void): Unsubscribe;
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

type AuiConfig = AuiConfig.Input & {
  readonly [auiConfigBrand]: true;
};

declare namespace AuiConfig {
  type Input = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

declare const AuiConfig: (config: AuiConfig.Input) => AuiConfig;

declare namespace AuiIf {
  type Props = PropsWithChildren<{
    condition: AuiIf.Condition;
  }>;
  type Condition = (state: AssistantState) => boolean;
}

declare const AuiIf: FC<AuiIf.Props>;

declare const AuiProvider: {
  (props: {
    config: AuiConfig;
    ref?: React.Ref<AssistantClient>;
    extends?: never;
    value?: never;
    children: React.ReactNode;
  }): React.ReactElement;
  (props: {
    extends: AssistantClient | null;
    config: AuiConfig;
    ref?: React.Ref<AssistantClient>;
    value?: never;
    children: React.ReactNode;
  }): React.ReactElement;
  (props: {
    value: AssistantClient | null;
    extends?: never;
    config?: never;
    ref?: never;
    children: React.ReactNode;
  }): React.ReactElement;
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

type ClientSchema<TMethods extends ClientMethods = ClientMethods, TMeta extends ClientMetaType = never, TEvents extends Record<string, unknown> = never> = {
  methods: TMethods;
  meta?: TMeta;
  events?: TEvents;
};

type ClientSchemas = keyof ScopeRegistry extends never ? {
  "ERROR: No clients were defined": ClientError<"ERROR: No clients were defined">;
} : {
  [K in keyof ScopeRegistry]: ValidateClient<K & string, ScopeRegistry[K]>;
};

type ClientScopes = {
  [K in ClientNames]: AssistantClientAccessor<K>;
};

declare const DefaultAssistantClient: AssistantClient;

declare const Derived: <K extends ClientNames>(config: Derived.Props<K>) => DerivedElement<K>;

declare namespace Derived {
  type Props<K extends ClientNames> = {
    get: (client: AssistantClient) => ReturnType<AssistantClientAccessor<K>>;
  } & ClientMeta<K>;
}

type DerivedElement<K extends ClientNames> = ResourceElement<DerivedInstance<K>>;

type DerivedInstance<K extends ClientNames> = ReturnType<AssistantClientAccessor<K>>;

type EventSource<T extends AssistantEventName> = T extends `${infer Source}.${string}` ? Source : never;

type Hook = (...args: any[]) => any;

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
} ? S : undefined;

type ParentOf<K extends ClientNames> = ClientMeta<K> extends {
  source: infer S;
} ? S extends ClientNames ? S : never : never;

declare function RenderChildrenWithAccessor<T>(_param0: {
  getItemState: (aui: AssistantClient) => T;
  children: (getItem: () => T) => ReactNode;
}): ReactNode;

type ReservedAccessorProps = "name" | "query" | "source";

type ReservedScopeNames = "on" | "optional" | "subscribe";

type Resource<V, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<V>;

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

type ScopedAuiClient = {
  client: AssistantClient;
  effects?: () => void;
};

type ScopesConfig = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

type TransformScopesFn = (scopes: ScopesConfig, parent: AssistantClient) => void;

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

type Unsubscribe = () => void;

type ValidateClient<K extends string, TClient> = K extends ReservedScopeNames ? ClientError<`ERROR: ${K} is a reserved scope name`> : unknown extends ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> ? TClient : ValidateMethods<K, TClient> & ValidateMeta<K, TClient> & ValidateEvents<K, TClient> & ClientError<never>;

type ValidateEvents<K extends string, TClient> = "events" extends keyof TClient ? TClient["events"] extends ClientEventsType<K> ? unknown : ClientError<`ERROR: ${K} has invalid events type`> : unknown;

type ValidateMeta<K extends string, TClient> = "meta" extends keyof TClient ? TClient["meta"] extends ClientMetaType ? unknown : ClientError<`ERROR: ${K} has invalid meta type`> : unknown;

type ValidateMethods<K extends string, TClient> = TClient extends {
  methods: ClientMethods;
} ? keyof TClient["methods"] & ReservedAccessorProps extends never ? unknown : ClientError<`ERROR: ${K} methods declare a reserved accessor property (source/query/name)`> : ClientError<`ERROR: ${K} has invalid methods type`>;

type ViewportMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

type WildcardPayload = {
  [K in keyof ClientEventMap]: {
    event: K;
    payload: ClientEventMap[K];
  };
}[Extract<keyof ClientEventMap, string>];

declare function attachTransformScopes(hook: Hook, transform: TransformScopesFn): void;

declare const auiConfigBrand: unique symbol;

declare const clientIdBrand: unique symbol;

declare namespace entry_client_exports {
  export { AssistantClient, AssistantClientAccessor, AssistantClientHandle, AssistantClientSource, AssistantConfigSource, AssistantEventCallback, AssistantEventName, AssistantEventPayload, AssistantEventSelector, AssistantState, AuiConfig, ClientElement, ClientEvents, ClientMeta, ClientMethods, ClientNames, ClientOutput, ClientSchema, DefaultAssistantClient, Derived, DerivedElement, InferClientState, ScopeRegistry, ScopesConfig, Unsubscribe, ViewportMetrics, attachTransformScopes, createAssistantClient, createClientFacade, createLastValidCache, createStaleReporter, getProxiedAssistantState, isUserScrollUp, isViewportAtBottom, normalizeEventSelector, observeContentResize, useAssistantClientRef, useAssistantContextProvider, useAssistantContextValue, useAssistantEmit, useAssistantScopeEffect, useClientLookup, useClientResource, useConfiguredAui, viewportOverflows };
}

declare const createAssistantClient: (config: AuiConfig.Input | AssistantConfigSource, options?: {
  parent?: AssistantClient | AssistantClientSource | undefined;
}) => AssistantClientHandle;

declare const createClientFacade: (source: AssistantClientSource) => AssistantClient;

declare const createLastValidCache: <T>(reportStale: (() => void) | null, scheduleExpiry: (callback: () => void) => void) => {
  resolve: (valid: boolean, resolveItem: () => T) => T;
};

declare const createStaleReporter: (options: {
  name: string;
  index: number | string;
  isCurrent: () => boolean;
  isValid: () => boolean;
}) => () => void;

declare function forwardTransformScopes(target: Hook, source: Hook): void;

declare const getClientId: (client: object) => getClientId.ClientId;

declare namespace getClientId {
  type ClientId = {
    readonly [clientIdBrand]: never;
  };
}

declare const getProxiedAssistantState: (client: AssistantClient) => AssistantState;

declare namespace entry_root_exports {
  export { AssistantClient, AssistantClientAccessor, AssistantEventCallback, AssistantEventName, AssistantEventPayload, AssistantEventScope, AssistantEventSelector, AssistantState, AuiConfig, AuiIf, AuiProvider, ClientElement, ClientEvents, ClientMeta, ClientMethods, ClientNames, ClientOutput, ClientSchema, Derived, DerivedElement, RenderChildrenWithAccessor, ScopeRegistry, ScopesConfig, Unsubscribe, attachTransformScopes, forwardTransformScopes, getClientId, normalizeEventSelector, useAssistantClientRef, useAssistantEmit, useAui, useAuiEvent, useAuiState, useClientList, useClientLookup, useClientResource };
}

declare namespace entry_internal_exports {
  export { shallowEqual, useAssistantClientDestroySignal, useShallowSelector, useShallowStable };
}

declare const isUserScrollUp: (previous: {
  scrollTop: number;
  scrollHeight: number;
}, current: ViewportMetrics) => boolean;

declare const isViewportAtBottom: (metrics: ViewportMetrics, contentInset?: number) => boolean;

declare const normalizeEventSelector: <TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>) => {
  scope: AssistantEventScope<TEvent>;
  event: TEvent;
};

declare const observeContentResize: (el: HTMLElement, callback: () => void) => (() => void);

declare const shallowEqual: (a: object, b: object) => boolean;

declare const useAssistantClientDestroySignal: () => AbortSignal | undefined;

declare const useAssistantClientRef: () => {
  parent: AssistantClient;
  current: AssistantClient | null;
};

declare const useAssistantContextProvider: <T>(value: AssistantClient, fn: () => T) => T;

declare const useAssistantContextValue: () => AssistantClient;

declare const useAssistantEmit: () => <TEvent extends Exclude<AssistantEventName, "*">>(event: TEvent, payload: AssistantEventPayload[TEvent]) => void;

declare const useAssistantScopeEffect: (scope: ClientNames, effect: () => (() => void) | void, deps: readonly unknown[]) => void;

declare namespace useAui {
  type Props = AuiConfig.Input;
}

declare function useAui(): AssistantClient;

declare function useAui(clients: useAui.Props): AssistantClient;

declare const useAuiEvent: <TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>, callback: AssistantEventCallback<TEvent>) => void;

declare const useAuiState: <T>(selector: (state: AssistantState) => T) => T;

declare const useClientList: <TData, TMethods extends ClientMethods>(props: useClientList.Props<TData, TMethods>) => {
  state: InferClientState<TMethods>[];
  get: (lookup: {
    index: number;
  } | {
    key: string;
  }) => TMethods;
  add: (initialData: TData) => void;
};

declare namespace useClientList {
  type ResourceProps<TData> = {
    key: string;
    getInitialData: () => TData;
    remove: () => void;
  };
  type Props<TData, TMethods extends ClientMethods> = {
    initialValues: TData[];
    getKey: (data: TData) => string;
    resource: Resource<TMethods, [
      ResourceProps<TData>
    ]>;
  };
}

declare function useClientLookup<TMethods extends ClientMethods>(elements: readonly ResourceElement<TMethods>[]): {
  state: InferClientState<TMethods>[];
  get: (lookup: {
    index: number;
  } | {
    key: string;
  }) => TMethods;
};

declare const useClientResource: <TMethods extends ClientMethods>(element: ResourceElement<TMethods>) => {
  state: InferClientState<TMethods>;
  methods: TMethods;
  key: string | number | undefined;
};

declare const useConfiguredAui: (parent: AssistantClient, clients: AuiConfig.Input) => ScopedAuiClient;

declare const useShallowSelector: <TState, TResult extends object>(select: (state: TState) => TResult) => ((state: TState) => TResult);

declare const useShallowStable: <T extends object>(value: T) => T;

declare const viewportOverflows: (metrics: ViewportMetrics, contentInset?: number) => boolean;

export { entry_client_exports as entry_client, entry_internal_exports as entry_internal, entry_root_exports as entry_root };
