import {
  Component,
  createContext,
  Fragment,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  createActionDispatcher,
  type ActionDispatcher,
  type ActionHandler,
  type ActionSource,
} from "../actions";
import type { Catalog } from "../catalog";
import {
  evaluateCondition,
  resolveProps,
  type ExpressionContext,
} from "../expressions";
import {
  animatePendingDots,
  PENDING_DOT_STYLE,
  PENDING_STYLE,
} from "../pending";
import { getAtPointer } from "../pointer";
import { rejectedPropType } from "../resolved";
import { createStateStore, type SpecStateStore } from "../state";
import { childIdsOf, repeatItems, safePointer } from "../tree";
import type { Spec, SpecElement } from "../types";

/** What a component implementation receives for one element. */
export type SpecComponentProps<
  P extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  element: SpecElement;
  /** Props with expressions resolved against current state. */
  props: P;
  /** The rendered default slot. */
  children: ReactNode;
  /** Rendered named slots. */
  slots: Record<string, ReactNode>;
  /** Runs the actions the element binds to `event` in `on`. */
  emit(event: string, payload?: unknown): void;
  /** Writes a value back to the state a prop is bound to with `$bindState`/`$bindItem`. */
  setProp(name: string, value: unknown): void;
  /** State paths of bound props. */
  bindings: Record<string, string>;
  state: SpecStateStore;
  /** True while the spec is still streaming. */
  streaming: boolean;
};

// Props are checked against the catalog before rendering, so implementations
// may declare their own prop types.
// oxlint-disable-next-line typescript/no-explicit-any
export type SpecComponents = Record<
  string,
  ComponentType<SpecComponentProps<any>>
>;

export type SpecPlaceholderProps = {
  id: string;
  reason:
    | "missing"
    | "pending"
    | "unknown-type"
    | "invalid-props"
    | "cycle"
    | "error";
  message: string;
};

export type SpecRendererProps = {
  spec: Spec;
  /** Implementations by component type. */
  components: SpecComponents;
  /** Validates props before rendering; invalid elements render a placeholder. */
  catalog?: Catalog;
  /** An external store; otherwise one is created and seeded from `spec.state`. */
  state?: SpecStateStore;
  /** Handlers by action name. */
  handlers?: Record<string, ActionHandler>;
  /** Called for catalog actions without a handler. */
  onAction?: (
    name: string,
    params: Record<string, unknown>,
    context: ActionSource & { state: SpecStateStore },
  ) => unknown;
  onError?: (error: Error, context: { elementId?: string }) => void;
  /** The spec is still streaming: missing elements take no space, an element with invalid props keeps its last valid render, and one pending placeholder follows the spec. */
  streaming?: boolean;
  placeholder?: ComponentType<SpecPlaceholderProps>;
};

type RenderContext = {
  spec: Spec;
  components: SpecComponents;
  catalog: Catalog | undefined;
  store: SpecStateStore;
  state: Record<string, unknown>;
  dispatch: ActionDispatcher;
  streaming: boolean;
  placeholder: ComponentType<SpecPlaceholderProps>;
  invalid: (element: SpecElement) => string | undefined;
  onError: SpecRendererProps["onError"];
};

const SpecContext = createContext<RenderContext | null>(null);

type Scope = Pick<ExpressionContext, "item" | "index" | "itemPath">;

function PendingDots() {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(
    () => (host.current ? animatePendingDots(host.current) : undefined),
    [],
  );
  return (
    <span
      ref={host}
      data-gf-spec-placeholder="pending"
      aria-hidden="true"
      style={PENDING_STYLE}
    >
      <span style={PENDING_DOT_STYLE} />
      <span style={PENDING_DOT_STYLE} />
      <span style={PENDING_DOT_STYLE} />
    </span>
  );
}

/** A small, unobtrusive stand-in for elements that cannot render. */
export function SpecPlaceholder({ id, reason, message }: SpecPlaceholderProps) {
  if (reason === "pending") return <PendingDots />;
  return (
    <div
      data-gf-spec-placeholder={reason}
      role="note"
      title={`${id}: ${message}`}
      style={{
        fontSize: 12,
        padding: "4px 8px",
        margin: "2px 0",
        border: "1px dashed currentColor",
        borderRadius: 6,
        opacity: 0.6,
      }}
    >
      {message}
    </div>
  );
}

type ElementBoundaryProps = {
  id: string;
  element: SpecElement;
  children: ReactNode;
  onError: (error: Error) => void;
  fallback: (error: Error) => ReactNode;
};

type ElementBoundaryState = { error: Error | null; element: SpecElement };

class ElementBoundary extends Component<
  ElementBoundaryProps,
  ElementBoundaryState
> {
  override state: ElementBoundaryState = {
    error: null,
    element: this.props.element,
  };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  // A streaming element can pass through values its component rejects, such as a state path cut short, so a changed element renders again.
  static getDerivedStateFromProps(
    props: ElementBoundaryProps,
    state: ElementBoundaryState,
  ): Partial<ElementBoundaryState> | null {
    return props.element === state.element
      ? null
      : { error: null, element: props.element };
  }
  override componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error);
  }
  override render() {
    return this.state.error
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

function useLastCommitted<T>(value: T | undefined) {
  const last = useRef<T | undefined>(undefined);
  useInsertionEffect(() => {
    if (value !== undefined) last.current = value;
  });
  return last.current;
}

function renderChildren(
  ids: readonly unknown[],
  scope: Scope,
  ancestors: readonly string[],
) {
  return ids.map((childId, index) =>
    typeof childId === "string" ? (
      <ElementView
        key={`${childId}:${index}`}
        id={childId}
        scope={scope}
        ancestors={ancestors}
      />
    ) : null,
  );
}

function ElementView({
  id,
  scope,
  ancestors,
}: {
  id: string;
  scope: Scope;
  ancestors: readonly string[];
}) {
  const ctx = useContext(SpecContext)!;
  const Placeholder = ctx.placeholder;
  const element = Object.hasOwn(ctx.spec.elements, id)
    ? ctx.spec.elements[id]
    : undefined;
  const usable =
    element && typeof element === "object" && typeof element.type === "string"
      ? element
      : undefined;
  // A value cut short by the stream, such as half an enum, fails until the rest arrives, so the last valid element stands in.
  const invalid = usable && ctx.invalid(usable);
  const settled = useLastCommitted(invalid ? undefined : usable);

  if (ancestors.includes(id)) {
    return (
      <Placeholder id={id} reason="cycle" message={`"${id}" contains itself`} />
    );
  }
  if (
    !element ||
    typeof element !== "object" ||
    typeof element.type !== "string"
  ) {
    if (ctx.streaming) return null;
    return (
      <Placeholder
        id={id}
        reason="missing"
        message={`Missing element "${id}"`}
      />
    );
  }
  if (!evaluateCondition(element.visible, { ...scope, state: ctx.state }))
    return null;

  const Impl = Object.hasOwn(ctx.components, element.type)
    ? ctx.components[element.type]
    : undefined;
  if (!Impl || (ctx.catalog && !ctx.catalog.component(element.type))) {
    if (ctx.streaming) return null;
    return (
      <Placeholder
        id={id}
        reason="unknown-type"
        message={`Unknown component "${element.type}"`}
      />
    );
  }
  if (invalid && !ctx.streaming) {
    return <Placeholder id={id} reason="invalid-props" message={invalid} />;
  }
  const shown = invalid ? settled : element;
  if (shown?.type !== element.type) return null;

  return (
    <ElementBoundary
      id={id}
      element={shown}
      onError={(error) => ctx.onError?.(error, { elementId: id })}
      fallback={(error) =>
        ctx.streaming ? null : (
          <Placeholder
            id={id}
            reason="error"
            message={`${shown.type} failed: ${error.message}`}
          />
        )
      }
    >
      <ResolvedElement
        key={shown.type}
        id={id}
        element={shown}
        Impl={Impl}
        scope={scope}
        ancestors={[...ancestors, id]}
      />
    </ElementBoundary>
  );
}

function ResolvedElement({
  id,
  element,
  Impl,
  scope,
  ancestors,
}: {
  id: string;
  element: SpecElement;
  Impl: ComponentType<SpecComponentProps>;
  scope: Scope;
  ancestors: readonly string[];
}) {
  const ctx = useContext(SpecContext)!;
  const resolved = resolveProps(element.props, {
    ...scope,
    state: ctx.state,
  });
  const rejected = rejectedPropType(
    ctx.catalog?.propsSchema(element.type),
    resolved.props,
  );
  const settled = useLastCommitted(rejected ? undefined : resolved);

  const latest = useRef({ element, scope, ctx });
  latest.current = { element, scope, ctx };

  const watched = element.watch ? Object.keys(element.watch) : [];
  const watchedValues = watched.map((path) =>
    getAtPointer(ctx.state, safePointer(path)),
  );
  const previousWatch = useRef<Map<string, unknown> | null>(null);
  useEffect(() => {
    const {
      element: current,
      scope: currentScope,
      ctx: currentCtx,
    } = latest.current;
    const previous = previousWatch.current;
    const next = new Map<string, unknown>();
    for (const path of Object.keys(current.watch ?? {})) {
      const value = getAtPointer(currentCtx.state, safePointer(path));
      next.set(path, value);
      if (previous?.has(path) && !Object.is(previous.get(path), value)) {
        void currentCtx.dispatch(current.watch![path], {
          ...currentScope,
          elementId: id,
          trigger: path,
          kind: "watch",
        });
      }
    }
    previousWatch.current = next;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...watchedValues]);

  const api = useMemo(
    () => ({
      emit(event: string, payload?: unknown) {
        const {
          element: current,
          scope: currentScope,
          ctx: currentCtx,
        } = latest.current;
        const bound = current.on?.[event];
        if (!bound) return;
        void currentCtx.dispatch(bound, {
          ...currentScope,
          elementId: id,
          trigger: event,
          kind: "event",
          payload,
        });
      },
      setProp(name: string, value: unknown) {
        const {
          element: current,
          scope: currentScope,
          ctx: currentCtx,
        } = latest.current;
        const path = resolveProps(current.props, {
          ...currentScope,
          state: currentCtx.state,
        }).bindings[name];
        if (path) currentCtx.store.set(path, value);
      },
    }),
    [id],
  );

  let children: ReactNode;
  if (element.repeat && typeof element.repeat.path === "string") {
    const items = repeatItems(element.repeat, ctx.state);
    children = items
      ? items.map((item) => (
          <Fragment key={item.key}>
            {renderChildren(
              childIdsOf(element, "default"),
              item.scope,
              ancestors,
            )}
          </Fragment>
        ))
      : null;
  } else {
    children = renderChildren(childIdsOf(element, "default"), scope, ancestors);
  }

  const slots: Record<string, ReactNode> = {};
  for (const [slot, ids] of Object.entries(element.slots ?? {})) {
    if (Array.isArray(ids)) slots[slot] = renderChildren(ids, scope, ancestors);
  }

  if (rejected && !ctx.streaming) {
    const Placeholder = ctx.placeholder;
    return (
      <Placeholder
        id={id}
        reason="invalid-props"
        message={`${element.type}: ${rejected}`}
      />
    );
  }
  const shown = rejected ? settled : resolved;
  if (!shown) return null;
  const { props, bindings } = shown;

  return (
    <Impl
      id={id}
      element={element}
      props={props}
      bindings={bindings}
      slots={slots}
      emit={api.emit}
      setProp={api.setProp}
      state={ctx.store}
      streaming={ctx.streaming}
    >
      {children}
    </Impl>
  );
}

/**
 * Renders a spec with trusted host components. It renders whatever has
 * streamed so far, followed by one pending placeholder while it streams.
 * Unknown types, invalid props, cycles, and components that throw render a
 * small placeholder instead of breaking the tree; while the spec streams, all
 * but cycles wait instead, and an element with invalid props keeps its last
 * valid render.
 */
export function SpecRenderer({
  spec,
  components,
  catalog,
  state,
  handlers,
  onAction,
  onError,
  streaming = false,
  placeholder = SpecPlaceholder,
}: SpecRendererProps) {
  const [ownStore] = useState(() => createStateStore(spec.state ?? {}));
  const store = state ?? ownStore;

  const specState = spec.state;
  useEffect(() => {
    if (!state && specState) ownStore.seed(specState);
  }, [state, ownStore, specState]);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  const callbacks = useRef({ handlers, onAction, onError });
  callbacks.current = { handlers, onAction, onError };

  const dispatch = useMemo(
    () =>
      createActionDispatcher({
        store,
        ...(catalog ? { catalog } : {}),
        onAction: (name, params, context) => {
          const { handlers: byName, onAction: fallback } = callbacks.current;
          if (byName && Object.hasOwn(byName, name))
            return byName[name]!(params, context);
          if (!fallback) throw new Error(`No handler for action "${name}"`);
          return fallback(name, params, context);
        },
        onError: (error) => {
          if (callbacks.current.onError) callbacks.current.onError(error, {});
          else console.warn("[generative-frame]", error.message);
        },
      }),
    [store, catalog],
  );

  const invalid = useMemo(() => {
    const cache = new WeakMap<SpecElement, string | null>();
    return (element: SpecElement) => {
      if (!catalog) return undefined;
      let message = cache.get(element);
      if (message === undefined) {
        const issues = catalog.validateProps(element.type, element.props);
        message = issues.length
          ? `${element.type}: ${issues
              .slice(0, 2)
              .map(
                (issue) =>
                  `${issue.path === "/" ? "props" : issue.path.slice(1)} ${issue.message}`,
              )
              .join("; ")}`
          : null;
        cache.set(element, message);
      }
      return message ?? undefined;
    };
  }, [catalog]);

  const ctx: RenderContext = {
    spec,
    components,
    catalog,
    store,
    state: snapshot,
    dispatch,
    streaming,
    placeholder,
    invalid,
    onError,
  };

  const Placeholder = placeholder;
  return (
    <SpecContext.Provider value={ctx}>
      {spec.root ? (
        <ElementView id={spec.root} scope={{}} ancestors={[]} />
      ) : null}
      {streaming ? (
        <Placeholder id="" reason="pending" message="The spec is streaming" />
      ) : null}
    </SpecContext.Provider>
  );
}
