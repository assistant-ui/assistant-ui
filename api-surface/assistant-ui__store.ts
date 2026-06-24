import React, { FC, PropsWithChildren, ReactNode } from "react";

type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

type ContravariantResource<R, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<R>;

interface ClientMethods {
  [key: string | symbol]: (...args: any[]) => any;
}

type ClientMetaType = {
  source: ClientNames;
  query: Record<string, unknown>;
};

type ClientSchema<TMethods extends ClientMethods = ClientMethods, TMeta extends ClientMetaType = never, TEvents extends Record<string, unknown> = never> = {
  methods: TMethods;
  meta?: TMeta;
  events?: TEvents;
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

type ClientMeta<K extends ClientNames> = "meta" extends keyof ClientSchemas[K] ? Pick<ClientSchemas[K]["meta"] extends ClientMetaType ? ClientSchemas[K]["meta"] : never, "source" | "query"> : never;

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

declare const normalizeEventSelector: <TEvent extends AssistantEventName>(selector: AssistantEventSelector<TEvent>) => {
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

declare function RenderChildrenWithAccessor<T>(_param0: {
  getItemState: (aui: AssistantClient) => T;
  children: (getItem: () => T) => ReactNode;
}): ReactNode;

type ScopesConfig = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

type TransformScopesFn = (scopes: ScopesConfig, parent: AssistantClient) => void;

type Hook = (...args: any[]) => any;

declare function attachTransformScopes(hook: Hook, transform: TransformScopesFn): void;

declare function forwardTransformScopes(target: Hook, source: Hook): void;

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

declare const AuiProvider: (_param1: {
  value: AssistantClient;
  children: React.ReactNode;
}) => React.ReactElement;

declare const useAssistantClientRef: () => {
  parent: AssistantClient;
  current: AssistantClient | null;
};

declare const useAssistantEmit: () => <TEvent extends Exclude<AssistantEventName, "*">>(event: TEvent, payload: AssistantEventPayload[TEvent]) => void;

type InferClientState$2<TMethods> = TMethods extends {
  getState: () => infer S;
} ? S : undefined;

declare const useClientResource: <TMethods extends ClientMethods>(element: ResourceElement<TMethods>) => {
  state: InferClientState$2<TMethods>;
  methods: TMethods;
  key: string | number | undefined;
};

type InferClientState$1<TMethods> = TMethods extends {
  getState: () => infer S;
} ? S : unknown;

declare function useClientLookup<TMethods extends ClientMethods>(elements: readonly ResourceElement<TMethods>[]): {
  state: InferClientState$1<TMethods>[];
  get: (lookup: {
    index: number;
  } | {
    key: string;
  }) => TMethods;
};

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
} ? S : unknown;

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
    resource: ContravariantResource<TMethods, [
      ResourceProps<TData>
    ]>;
  };
}

declare namespace entry_root_exports {
  export { AssistantClient, AssistantClientAccessor, AssistantEventCallback, AssistantEventName, AssistantEventPayload, AssistantEventScope, AssistantEventSelector, AssistantState, AuiIf, AuiProvider, ClientElement, ClientEvents, ClientMeta, ClientMethods, ClientNames, ClientOutput, ClientSchema, Derived, RenderChildrenWithAccessor, ScopeRegistry, ScopesConfig, Unsubscribe, attachTransformScopes, forwardTransformScopes, normalizeEventSelector, useAssistantClientRef, useAssistantEmit, useAui, useAuiEvent, useAuiState, useClientList, useClientLookup, useClientResource };
}

export { entry_root_exports as entry_root };
