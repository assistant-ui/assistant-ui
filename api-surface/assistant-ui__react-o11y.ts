import { Primitive } from "@radix-ui/react-primitive";

import { ComponentPropsWithoutRef, ComponentRef, ComponentType, FC, PropsWithChildren, ReactNode } from "react";

interface ScopeRegistry {
    span: {
      methods: SpanMethods;
      meta: SpanMeta;
    };
}

type ClientError<E extends string> = {
  methods: Record<E, () => E>;
  meta: {
    source: ClientNames;
    query: Record<E, E>;
  };
  events: Record<`${E}.`, E>;
};

type ClientEventsType<K extends ClientNames> = Record<`${K}.${string}`, unknown>;

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
  [K in keyof ScopeRegistry]: ValidateClient<K>;
};

type Resource<R, A extends readonly unknown[] = any[]> = (...args: A) => ResourceElement<R, A>;

type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

interface ScopeRegistry {
  [key: string]: { methods: any; meta?: any; events?: any };
}

declare const SpanByIndexProvider: FC<PropsWithChildren<{
  index: number;
}>>;

type SpanChildrenComponentConfig = {
  Span: ComponentType;
};

type SpanData = {
  id: string;
  parentSpanId: string | null;
  name: string;
  type: string;
  status: "completed" | "failed" | "running" | "skipped";
  startedAt: number;
  endedAt: number | null;
  latencyMs: number | null;
};

type SpanItemState = {
  id: string;
  parentSpanId: string | null;
  name: string;
  type: string;
  status: "completed" | "failed" | "running" | "skipped";
  startedAt: number;
  endedAt: number | null;
  latencyMs: number | null;
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
};

type SpanMeta = {
  source: "span";
  query: {
    index: number;
  } | {
    key: string;
  };
};

type SpanMethods = {
  getState: () => SpanState;
  child: (lookup: SpanMeta["query"]) => SpanMethods;
  toggleCollapse: () => void;
};

declare namespace SpanPrimitiveChildren {
  type Props = {
    components: SpanChildrenComponentConfig;
    children?: never;
  } | {
    children: (value: {
      span: SpanState;
    }) => ReactNode;
    components?: never;
  };
}

declare const SpanPrimitiveChildren: FC<SpanPrimitiveChildren.Props>;

declare namespace SpanPrimitiveCollapseToggle {
  type Element = ComponentRef<typeof Primitive.button>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

declare const SpanPrimitiveCollapseToggle: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLButtonElement> & import("react").ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;

declare namespace SpanPrimitiveIndent {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    baseIndent?: number;
    indentPerLevel?: number;
  };
}

declare const SpanPrimitiveIndent: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  baseIndent?: number;
  indentPerLevel?: number;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace SpanPrimitiveName {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

declare const SpanPrimitiveName: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace SpanPrimitiveRoot {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

declare const SpanPrimitiveRoot: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLDivElement>>;

declare namespace SpanPrimitiveStatusIndicator {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

declare const SpanPrimitiveStatusIndicator: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare namespace SpanPrimitiveTimeline {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    timeRange?: SpanTimelineRange | undefined;
    paddingEnd?: number | undefined;
  };
}

declare const SpanPrimitiveTimeline: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  timeRange?: SpanTimelineRange | undefined;
  paddingEnd?: number | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace SpanPrimitiveTimelineBar {
  type Element = ComponentRef<typeof Primitive.div>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    now?: number | undefined;
    timeRange?: SpanTimelineRange | undefined;
  };
}

declare const SpanPrimitiveTimelineBar: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLDivElement> & import("react").HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
}, "ref"> & {
  now?: number | undefined;
  timeRange?: SpanTimelineRange | undefined;
} & import("react").RefAttributes<HTMLDivElement>>;

declare namespace SpanPrimitiveTypeBadge {
  type Element = ComponentRef<typeof Primitive.span>;
  type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

declare const SpanPrimitiveTypeBadge: import("react").ForwardRefExoticComponent<Omit<import("react").ClassAttributes<HTMLSpanElement> & import("react").HTMLAttributes<HTMLSpanElement> & {
  asChild?: boolean;
}, "ref"> & import("react").RefAttributes<HTMLSpanElement>>;

declare const SpanResource: Resource<ClientOutput<"span">, [
  {
    spans: SpanData[];
  }
]>;

type SpanState = SpanItemState & {
  children: SpanItemState[];
  timeRange: {
    min: number;
    max: number;
  };
};

type SpanTimelineRange = {
  min: number;
  max: number;
};

type ValidateClient<K extends keyof ScopeRegistry> = ScopeRegistry[K] extends {
  methods: ClientMethods;
} ? "meta" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["meta"] extends ClientMetaType ? "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid meta type`> : "events" extends keyof ScopeRegistry[K] ? ScopeRegistry[K]["events"] extends ClientEventsType<K> ? ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid events type`> : ScopeRegistry[K] : ClientError<`ERROR: ${K & string} has invalid methods type`>;

declare namespace entry_root_exports {
  export { SpanByIndexProvider, SpanData, SpanItemState, span_d_exports as SpanPrimitive, SpanResource, SpanState };
}

declare namespace span_d_exports {
  export { SpanPrimitiveChildren as Children, SpanPrimitiveCollapseToggle as CollapseToggle, SpanPrimitiveIndent as Indent, SpanPrimitiveName as Name, SpanPrimitiveRoot as Root, SpanTimelineRange, SpanPrimitiveStatusIndicator as StatusIndicator, SpanPrimitiveTimeline as Timeline, SpanPrimitiveTimelineBar as TimelineBar, SpanPrimitiveTypeBadge as TypeBadge };
}

export { entry_root_exports as entry_root };
