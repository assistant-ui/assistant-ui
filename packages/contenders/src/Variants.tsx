"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { assertAllowed, isDev } from "./guard";
import { LOG_PREFIX } from "./name";
import { trackRegion, type RegionInfo } from "./outline";
import { createStore, resolveGroup, type GroupMeta, type Store } from "./store";
import { mountSwitcher } from "./switcher";
import { ALL } from "./url";

export type VariantProps = {
  /** Stable id used in `?variant=<group>:<id>` and `data-variant`. */
  id: string;
  /** Human-readable name shown in the switcher and show-all captions. */
  label?: string | undefined;
  children?: ReactNode;
};

export type VariantsProps = {
  /** Page-unique group id used in `?variant=<group>:<id>` and `data-variant-group`. */
  id: string;
  /** Human-readable group name shown in the switcher. */
  label?: string | undefined;
  /** Variant id rendered on the server and when nothing else selects one; defaults to the first child. */
  default?: string | undefined;
  /** Remember the choice per tab in sessionStorage. Defaults to `true`. */
  persist?: boolean | undefined;
  /** Render instead of throwing in a production build, e.g. on preview deployments. */
  allowInProduction?: boolean | undefined;
  /** Draw the dashed "undecided" outline around the rendered variant. Defaults to `true`. */
  outline?: boolean | undefined;
  children?: ReactNode;
};

const contents: CSSProperties = { display: "contents" };

const captionStyle: CSSProperties = {
  display: "block",
  boxSizing: "border-box",
  width: "fit-content",
  margin: "24px 0 8px",
  padding: 0,
  color: "color-mix(in srgb, currentColor 60%, transparent)",
  font: '500 11px/16px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontVariantNumeric: "tabular-nums",
  letterSpacing: 0,
  textAlign: "left",
  textTransform: "none",
};

const InsideVariants = createContext(false);

let defaultStore: Store | undefined;
const getStore = () => (defaultStore ??= createStore(mountSwitcher));

/** @internal */
export const StoreContext = createContext<Store | undefined>(undefined);

type Item = { id: string; label: string; element: ReactElement<VariantProps> };

const LAZY = Symbol.for("react.lazy");

type LazyType = {
  $$typeof: symbol;
  _payload: unknown;
  _init: (payload: unknown) => unknown;
};

const isLazy = (type: unknown): type is LazyType =>
  typeof type === "object" &&
  type !== null &&
  (type as { $$typeof?: unknown }).$$typeof === LAZY;

// React Server Components pass a client component such as <Variant> as a lazy
// client reference; an unresolved one is trusted when it carries a string id.
const isVariantElement = (
  child: ReactElement<VariantProps>,
  type: unknown = child.type,
): boolean => {
  if (type === Variant) return true;
  if (!isLazy(type)) return false;
  let resolved: unknown;
  try {
    resolved = type._init(type._payload);
  } catch {
    return typeof child.props.id === "string";
  }
  return isVariantElement(child, resolved);
};

const collect = (group: string, children: ReactNode) => {
  const items: Item[] = [];
  const problems: string[] = [];
  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean")
      return;
    if (typeof child === "string" && child.trim() === "") return;
    if (!isValidElement<VariantProps>(child) || !isVariantElement(child)) {
      problems.push(
        `<Variants id="${group}"> only accepts <Variant> children; another child was ignored.`,
      );
      return;
    }
    const { id, label } = child.props;
    if (typeof id !== "string" || id === "") {
      problems.push(
        `A <Variant> in group "${group}" has no id; it was ignored.`,
      );
      return;
    }
    if (items.some((item) => item.id === id)) {
      problems.push(
        `Group "${group}" has two <Variant>s with id "${id}"; only the first is used.`,
      );
      return;
    }
    if (id === ALL || /[:,]/.test(id)) {
      problems.push(
        `Variant id "${id}" in group "${group}" is reserved or contains ":" or ","; pick another id so ?variant= URLs stay unambiguous.`,
      );
    }
    items.push({ id, label: label ?? id, element: child });
  });
  return { items, problems };
};

/**
 * Renders exactly one of its `<Variant>` children (or all of them, stacked, in
 * show-all mode). Throws in production builds: pick one and remove the wrapper.
 */
export function Variants({
  id,
  label,
  default: defaultId,
  persist = true,
  allowInProduction,
  outline = true,
  children,
}: VariantsProps) {
  assertAllowed(id, allowInProduction);
  const store = useContext(StoreContext) ?? getStore();
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const { items, problems } = collect(id, children);
  const selection = snapshot.selections[id];
  const { showAll, activeId } = resolveGroup(
    { variants: items, defaultId },
    selection,
    snapshot.globalAll,
  );

  if (/[:,]/.test(id) || id === "") {
    problems.push(
      `Group id "${id}" must be non-empty and contain no ":" or ","; ?variant=<group>:<id> URLs cannot address it.`,
    );
  }
  if (defaultId !== undefined && !items.some((item) => item.id === defaultId)) {
    problems.push(
      `<Variants id="${id}"> default="${defaultId}" matches no <Variant>; falling back to "${items[0]?.id ?? "(none)"}".`,
    );
  }
  if (
    selection !== undefined &&
    selection !== ALL &&
    !items.some((item) => item.id === selection)
  ) {
    problems.push(
      `Selected variant "${selection}" (from the URL or sessionStorage) matches no <Variant> in group "${id}"; showing "${activeId ?? "(none)"}".`,
    );
  }

  const metaKey = JSON.stringify({
    id,
    label: label ?? id,
    variants: items.map((item) => ({ id: item.id, label: item.label })),
    defaultId,
    persist,
  } satisfies GroupMeta);
  useEffect(
    () => store.register(JSON.parse(metaKey) as GroupMeta),
    [store, metaKey],
  );

  const problemsKey = problems.join("\n");
  useEffect(() => {
    if (!problemsKey || !isDev()) return;
    for (const problem of problemsKey.split("\n")) {
      console.error(`${LOG_PREFIX} ${problem}`);
    }
  }, [problemsKey]);

  const shown = showAll ? items : items.filter((item) => item.id === activeId);

  const instance = useId();
  const groupLabel = label ?? id;
  const outlineMode =
    outline && snapshot.outline ? ("always" as const) : ("hover" as const);

  return (
    <div
      data-variant-group={id}
      data-variant-mode={showAll ? "all" : "single"}
      style={contents}
    >
      <InsideVariants.Provider value>
        {shown.map((item) => {
          const index = items.indexOf(item) + 1;
          return (
            <Region
              key={item.id}
              item={item}
              caption={
                showAll
                  ? item.label === item.id
                    ? `${id} · ${item.id}`
                    : `${id} · ${item.id} · ${item.label}`
                  : undefined
              }
              outline={
                snapshot.clean
                  ? undefined
                  : {
                      instance,
                      group: groupLabel,
                      variant: item.label,
                      position: `${index}/${items.length}`,
                      count: items.length,
                      showAll,
                      mode: outlineMode,
                    }
              }
              onActivate={() => store.focusGroup(id)}
            />
          );
        })}
      </InsideVariants.Provider>
    </div>
  );
}

function Region({
  item,
  caption,
  outline,
  onActivate,
}: {
  item: Item;
  caption: string | undefined;
  outline: Omit<RegionInfo, "onActivate"> | undefined;
  onActivate: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const activate = useRef(onActivate);
  useEffect(() => {
    activate.current = onActivate;
  });
  const outlineKey = outline && JSON.stringify(outline);
  useEffect(() => {
    const wrapper = ref.current;
    if (outlineKey === undefined || !wrapper) return;
    return trackRegion(wrapper, {
      ...(JSON.parse(outlineKey) as Omit<RegionInfo, "onActivate">),
      onActivate: () => activate.current(),
    });
  }, [outlineKey]);

  return (
    <div
      ref={ref}
      data-variant={item.id}
      data-variant-label={item.label}
      style={contents}
    >
      {caption !== undefined && (
        <div data-variant-caption="" style={captionStyle}>
          {caption}
        </div>
      )}
      {item.element}
    </div>
  );
}

/** One candidate inside `<Variants>`. Only the active one is mounted. */
export function Variant({ id, children }: VariantProps) {
  const inside = useContext(InsideVariants);
  useEffect(() => {
    if (!inside && isDev()) {
      console.error(
        `${LOG_PREFIX} <Variant id="${id}"> rendered outside <Variants>; wrap it in a <Variants> group.`,
      );
    }
  }, [inside, id]);
  return <>{children}</>;
}
