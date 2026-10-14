import {
  defineComponent,
  camelize,
  Fragment,
  h,
  inject,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  provide,
  shallowRef,
  toHandlerKey,
  watch,
  type Component,
  type PropType,
  type VNode,
} from "vue";
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

export type SpecComponents = Record<string, Component>;
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
  components: SpecComponents;
  catalog?: Catalog;
  state?: SpecStateStore;
  handlers?: Record<string, ActionHandler>;
  onAction?: (
    name: string,
    params: Record<string, unknown>,
    context: ActionSource & { state: SpecStateStore },
  ) => unknown;
  onError?: (error: Error, context: { elementId?: string }) => void;
  streaming?: boolean;
  placeholder?: Component;
};
export type SpecElementContext = {
  readonly id: string;
  readonly element: SpecElement;
  readonly bindings: Record<string, string>;
  readonly state: SpecStateStore;
  readonly streaming: boolean;
};

const elementContextKey = Symbol("SpecElement");
export function useSpecElement(): SpecElementContext {
  const context = inject<SpecElementContext>(elementContextKey);
  if (!context) throw new Error("useSpecElement requires a spec element");
  return context;
}

export const SpecPlaceholder = defineComponent({
  name: "SpecPlaceholder",
  props: {
    id: { type: String, required: true },
    reason: {
      type: String as PropType<SpecPlaceholderProps["reason"]>,
      required: true,
    },
    message: { type: String, required: true },
  },
  setup(props) {
    return () =>
      props.reason === "pending"
        ? h(PendingDots)
        : h(
            "div",
            {
              "data-gf-spec-placeholder": props.reason,
              role: "note",
              title: `${props.id}: ${props.message}`,
              style: {
                fontSize: "12px",
                padding: "4px 8px",
                margin: "2px 0",
                border: "1px dashed currentColor",
                borderRadius: "6px",
                opacity: 0.6,
              },
            },
            props.message,
          );
  },
});

type Scope = Pick<ExpressionContext, "item" | "index" | "itemPath">;
type RenderContext = {
  readonly spec: Spec;
  readonly components: SpecComponents;
  readonly catalog: Catalog | undefined;
  readonly store: SpecStateStore;
  readonly state: Record<string, unknown>;
  readonly dispatch: ActionDispatcher;
  readonly streaming: boolean;
  readonly placeholder: Component;
  readonly invalid: (element: SpecElement) => string | undefined;
  readonly onError: SpecRendererProps["onError"];
};
const renderContextKey = Symbol("SpecRenderer");

function children(
  ids: readonly unknown[],
  scope: Scope,
  ancestors: readonly string[],
): VNode[] {
  const occurrences = new Map<string, number>();
  return ids.flatMap((id) => {
    if (typeof id !== "string") return [];
    const occurrence = occurrences.get(id) ?? 0;
    occurrences.set(id, occurrence + 1);
    return [
      h(ElementView, { key: `${id}:${occurrence}`, id, scope, ancestors }),
    ];
  });
}

type DeclaredOptions = {
  props?: string[] | Record<string, unknown>;
  emits?: string[] | Record<string, unknown>;
  extends?: DeclaredOptions;
  mixins?: DeclaredOptions[];
};

function declaredNames(
  component: DeclaredOptions,
  option: "props" | "emits",
  names = new Set<string>(),
): Set<string> {
  if (component.extends) declaredNames(component.extends, option, names);
  for (const mixin of component.mixins ?? [])
    declaredNames(mixin, option, names);
  const declared = component[option];
  const own = Array.isArray(declared) ? declared : Object.keys(declared ?? {});
  for (const name of own) names.add(camelize(name));
  return names;
}

const handlerKey = (event: string) => toHandlerKey(camelize(event));

const PendingDots = defineComponent({
  name: "SpecPendingDots",
  setup() {
    const host = shallowRef<HTMLElement | null>(null);
    let stop = () => {};
    onMounted(() => {
      if (host.value) stop = animatePendingDots(host.value);
    });
    onBeforeUnmount(() => stop());
    return () =>
      h(
        "span",
        {
          ref: host,
          "data-gf-spec-placeholder": "pending",
          "aria-hidden": "true",
          style: PENDING_STYLE,
        },
        [0, 1, 2].map((index) =>
          h("span", { key: index, style: PENDING_DOT_STYLE }),
        ),
      );
  },
});

const ElementBoundary = defineComponent({
  name: "SpecElementBoundary",
  props: {
    id: { type: String, required: true },
    element: { type: Object as PropType<SpecElement>, required: true },
  },
  setup(props, { slots }) {
    const ctx = inject<RenderContext>(renderContextKey)!;
    const error = shallowRef<Error | null>(null);
    // A streaming element can pass through values its component rejects, such as a state path cut short, so a changed element renders again.
    watch(
      () => props.element,
      () => {
        error.value = null;
      },
    );
    onErrorCaptured((caught) => {
      const normalized =
        caught instanceof Error ? caught : new Error(String(caught));
      error.value = normalized;
      ctx.onError?.(normalized, { elementId: props.id });
      return false;
    });
    return () =>
      error.value
        ? ctx.streaming
          ? null
          : h(ctx.placeholder, {
              id: props.id,
              reason: "error",
              message: `${props.element.type} failed: ${error.value.message}`,
            })
        : slots.default?.();
  },
});

const ElementView = defineComponent({
  name: "SpecElementView",
  props: {
    id: { type: String, required: true },
    scope: { type: Object as PropType<Scope>, required: true },
    ancestors: {
      type: Array as unknown as PropType<readonly string[]>,
      required: true,
    },
  },
  setup(props) {
    const ctx = inject<RenderContext>(renderContextKey)!;
    let settled: SpecElement | undefined;
    return () => {
      const { id, scope, ancestors } = props;
      const element = Object.hasOwn(ctx.spec.elements, id)
        ? ctx.spec.elements[id]
        : undefined;
      const placeholder = (
        reason: SpecPlaceholderProps["reason"],
        message: string,
      ) => h(ctx.placeholder, { id, reason, message });
      if (ancestors.includes(id))
        return placeholder("cycle", `"${id}" contains itself`);
      if (
        !element ||
        typeof element !== "object" ||
        typeof element.type !== "string"
      )
        return ctx.streaming
          ? null
          : placeholder("missing", `Missing element "${id}"`);
      if (!evaluateCondition(element.visible, { ...scope, state: ctx.state }))
        return null;
      const impl = Object.hasOwn(ctx.components, element.type)
        ? ctx.components[element.type]
        : undefined;
      if (!impl || (ctx.catalog && !ctx.catalog.component(element.type)))
        return ctx.streaming
          ? null
          : placeholder("unknown-type", `Unknown component "${element.type}"`);
      // A value cut short by the stream, such as half an enum, fails until the rest arrives, so the last valid element stands in.
      const invalid = ctx.invalid(element);
      if (!invalid) settled = element;
      else if (!ctx.streaming) return placeholder("invalid-props", invalid);
      const shown = invalid ? settled : element;
      if (shown?.type !== element.type) return null;
      return h(
        ElementBoundary,
        { id, element: shown },
        {
          default: () =>
            h(ResolvedElement, {
              key: shown.type,
              id,
              element: shown,
              impl,
              scope,
              ancestors: [...ancestors, id],
            }),
        },
      );
    };
  },
});

const ResolvedElement = defineComponent({
  name: "SpecResolvedElement",
  props: {
    id: { type: String, required: true },
    element: { type: Object as PropType<SpecElement>, required: true },
    impl: { type: [Object, Function] as PropType<Component>, required: true },
    scope: { type: Object as PropType<Scope>, required: true },
    ancestors: {
      type: Array as unknown as PropType<readonly string[]>,
      required: true,
    },
  },
  setup(props) {
    const ctx = inject<RenderContext>(renderContextKey)!;
    const resolved = () =>
      resolveProps(props.element.props, { ...props.scope, state: ctx.state });
    let settled: ReturnType<typeof resolved> | undefined;
    provide<SpecElementContext>(elementContextKey, {
      get id() {
        return props.id;
      },
      get element() {
        return props.element;
      },
      get bindings() {
        const current = resolved();
        return rejectedPropType(
          ctx.catalog?.propsSchema(props.element.type),
          current.props,
        )
          ? (settled?.bindings ?? {})
          : current.bindings;
      },
      get state() {
        return ctx.store;
      },
      get streaming() {
        return ctx.streaming;
      },
    });
    watch(
      () =>
        Object.entries(props.element.watch ?? {}).map(
          ([path]) =>
            [path, getAtPointer(ctx.state, safePointer(path))] as const,
        ),
      (next, previous) => {
        const prior = new Map(previous);
        for (const [path, value] of next) {
          if (prior.has(path) && !Object.is(prior.get(path), value))
            void ctx.dispatch(props.element.watch?.[path], {
              ...props.scope,
              elementId: props.id,
              trigger: path,
              kind: "watch",
            });
        }
      },
      { flush: "post" },
    );
    return () => {
      const current = resolved();
      const rejected = rejectedPropType(
        ctx.catalog?.propsSchema(props.element.type),
        current.props,
      );
      if (!rejected) settled = current;
      else if (!ctx.streaming)
        return h(ctx.placeholder, {
          id: props.id,
          reason: "invalid-props",
          message: `${props.element.type}: ${rejected}`,
        });
      const shown = rejected ? settled : current;
      if (!shown) return null;
      const { props: values, bindings } = shown;
      const impl = props.impl as DeclaredOptions;
      const propNames = declaredNames(impl, "props");
      const emitNames = declaredNames(impl, "emits");
      const listens = (event: string) =>
        emitNames.has(camelize(event)) ||
        (event.startsWith("update:") &&
          propNames.has(camelize(event.slice("update:".length))));
      const listeners: Record<string, (value: unknown) => void> = {};
      for (const event of Object.keys(props.element.on ?? {})) {
        if (!listens(event)) continue;
        const key = handlerKey(event);
        const previous = listeners[key];
        listeners[key] = (payload) => {
          previous?.(payload);
          void ctx.dispatch(props.element.on?.[event], {
            ...props.scope,
            elementId: props.id,
            trigger: event,
            kind: "event",
            payload,
          });
        };
      }
      for (const [name, path] of Object.entries(bindings)) {
        if (!propNames.has(camelize(name))) continue;
        const key = handlerKey(`update:${name}`);
        const action = listeners[key];
        listeners[key] = (value) => {
          ctx.store.set(path, value, "replace");
          action?.(value);
        };
      }
      const slots: Record<string, () => VNode[]> = {};
      slots.default = () => {
        const repeat = props.element.repeat;
        if (repeat && typeof repeat.path === "string") {
          return (repeatItems(repeat, ctx.state) ?? []).map((item) =>
            h(
              Fragment,
              { key: item.key },
              children(
                childIdsOf(props.element, "default"),
                item.scope,
                props.ancestors,
              ),
            ),
          );
        }
        return children(
          childIdsOf(props.element, "default"),
          props.scope,
          props.ancestors,
        );
      };
      for (const [slot, ids] of Object.entries(props.element.slots ?? {})) {
        if (slot !== "default" && Array.isArray(ids))
          slots[slot] = () => children(ids, props.scope, props.ancestors);
      }
      const accepted = Object.fromEntries(
        Object.entries(values).filter(([name]) =>
          propNames.has(camelize(name)),
        ),
      );
      return h(props.impl, { ...accepted, ...listeners }, slots);
    };
  },
});

export const SpecRenderer = defineComponent({
  name: "SpecRenderer",
  props: {
    spec: { type: Object as PropType<Spec>, required: true },
    components: { type: Object as PropType<SpecComponents>, required: true },
    catalog: Object as PropType<Catalog>,
    state: Object as PropType<SpecStateStore>,
    handlers: Object as PropType<Record<string, ActionHandler>>,
    onAction: Function as PropType<SpecRendererProps["onAction"]>,
    onError: Function as PropType<SpecRendererProps["onError"]>,
    streaming: { type: Boolean, default: false },
    placeholder: {
      type: [Object, Function] as PropType<Component>,
      default: SpecPlaceholder,
    },
  },
  setup(props) {
    const ownStore = createStateStore(props.spec.state ?? {});
    const snapshot = shallowRef((props.state ?? ownStore).getState());
    watch(
      () => [props.state, props.spec.state] as const,
      ([state, specState]) => {
        if (!state && specState) ownStore.seed(specState);
      },
      { flush: "sync" },
    );
    watch(
      () => props.state ?? ownStore,
      (store, _, onCleanup) => {
        snapshot.value = store.getState();
        onCleanup(
          store.subscribe((state) => {
            snapshot.value = state;
          }),
        );
      },
      { immediate: true, flush: "sync" },
    );
    let cachedCatalog: Catalog | undefined;
    let cache = new WeakMap<SpecElement, string | null>();
    const invalid = (element: SpecElement) => {
      const catalog = props.catalog;
      if (!catalog) return undefined;
      if (catalog !== cachedCatalog) {
        cachedCatalog = catalog;
        cache = new WeakMap();
      }
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
    let dispatcherStore: SpecStateStore | undefined;
    let dispatcherCatalog: Catalog | undefined;
    let dispatcher: ActionDispatcher;
    const ctx: RenderContext = {
      get spec() {
        return props.spec;
      },
      get components() {
        return props.components;
      },
      get catalog() {
        return props.catalog;
      },
      get store() {
        return props.state ?? ownStore;
      },
      get state() {
        return snapshot.value;
      },
      get dispatch() {
        const store = props.state ?? ownStore;
        if (dispatcherStore !== store || dispatcherCatalog !== props.catalog) {
          dispatcherStore = store;
          dispatcherCatalog = props.catalog;
          dispatcher = createActionDispatcher({
            store,
            ...(props.catalog ? { catalog: props.catalog } : {}),
            onAction: (name, params, context) => {
              if (props.handlers && Object.hasOwn(props.handlers, name))
                return props.handlers[name]!(params, context);
              if (!props.onAction)
                throw new Error(`No handler for action "${name}"`);
              return props.onAction(name, params, context);
            },
            onError: (error) => {
              if (props.onError) props.onError(error, {});
              else console.warn("[generative-frame]", error.message);
            },
          });
        }
        return dispatcher;
      },
      get streaming() {
        return props.streaming;
      },
      get placeholder() {
        return props.placeholder;
      },
      invalid,
      get onError() {
        return props.onError;
      },
    };
    provide(renderContextKey, ctx);
    return () => [
      props.spec.root
        ? h(ElementView, { id: props.spec.root, scope: {}, ancestors: [] })
        : null,
      props.streaming
        ? h(props.placeholder, {
            id: "",
            reason: "pending",
            message: "The spec is streaming",
          })
        : null,
    ];
  },
});
