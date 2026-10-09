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
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { canvasSlot, mountCanvas, readSlotAncestors } from "./canvas";
import { assertAllowed, isDev } from "./guard";
import { LOG_PREFIX } from "./name";
import { NodeRange, registerGroupNodes } from "./nodes";
import { trackRegion, type RegionInfo } from "./outline";
import {
  createStore,
  resolveActive,
  type GroupMeta,
  type Store,
} from "./store";
import { mountSwitcher } from "./switcher";

export type VariantProps = {
  /** Stable id used in `?variant=<group>:<id>` and `data-variant`. */
  id: string;
  /** Human-readable name shown in the switcher, outline and canvas. */
  label?: string | undefined;
  children?: ReactNode;
};

export type VariantsProps = {
  /** Group id used in `?variant=<group>:<id>` and `data-variant-group`; keep it unique across the app. */
  id: string;
  /** Human-readable group name shown in the switcher, outline and canvas. */
  label?: string | undefined;
  /** Variant id rendered on the server and when nothing else selects one; defaults to the first child. */
  default?: string | undefined;
  /** Remember the choice per tab in sessionStorage. Defaults to `true`. */
  persist?: boolean | undefined;
  /** Render instead of throwing in a production build, e.g. on preview deployments. */
  allowInProduction?: boolean | undefined;
  /** Always draw the dashed "undecided" outline; `false` shows it only on hover. Defaults to `true`. */
  outline?: boolean | undefined;
  children?: ReactNode;
};

type GroupScope = { keys: readonly string[]; group: string };
type VariantScope = GroupScope & { variant: string; depth: number };

/** The enclosing `<Variants>`; `keys` lists every enclosing instance, outermost first. */
const GroupContext = createContext<GroupScope | null>(null);
/** The enclosing `<Variant>`, which a nested `<Variants>` registers as its parent. */
const VariantContext = createContext<VariantScope | null>(null);
const InsideCanvas = createContext(false);

let defaultStore: Store | undefined;
const getStore = () =>
  (defaultStore ??= createStore(mountSwitcher, mountCanvas));

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
    if (/[:,\s]/.test(id)) {
      problems.push(
        `Variant id "${id}" in group "${group}" contains ":", "," or whitespace; pick another id so ?variant= URLs and /variants choose stay unambiguous.`,
      );
    }
    items.push({ id, label: label ?? id, element: child });
  });
  return { items, problems };
};

/**
 * Renders exactly one of its `<Variant>` children, with no wrapper element.
 * Throws in production builds: pick one and remove the wrapper.
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
  // A group nested inside a canvas card renders its active variant only; its
  // own row and registration come from its copy on the page.
  const embedded = useContext(InsideCanvas);
  const parent = useContext(VariantContext);
  const chain = parent?.keys ?? [];
  const key = useId();
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const { items, problems } = collect(id, children);
  const selection = snapshot.selections[id];
  const activeId = resolveActive({ variants: items, defaultId }, selection);

  if (/[:,\s]/.test(id) || id === "") {
    problems.push(
      `Group id "${id}" must be non-empty and contain no ":", "," or whitespace; ?variant=<group>:<id> URLs cannot address it.`,
    );
  }
  if (defaultId !== undefined && !items.some((item) => item.id === defaultId)) {
    problems.push(
      `<Variants id="${id}"> default="${defaultId}" matches no <Variant>; falling back to "${items[0]?.id ?? "(none)"}".`,
    );
  }
  if (selection !== undefined && !items.some((item) => item.id === selection)) {
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
    parent: parent
      ? { group: parent.group, variant: parent.variant }
      : undefined,
  } satisfies GroupMeta);
  useEffect(() => {
    if (embedded) return;
    return store.register(JSON.parse(metaKey) as GroupMeta);
  }, [store, metaKey, embedded]);

  const problemsKey = embedded ? "" : problems.join("\n");
  useEffect(() => {
    if (!problemsKey || !isDev()) return;
    for (const problem of problemsKey.split("\n")) {
      console.error(`${LOG_PREFIX} ${problem}`);
    }
  }, [problemsKey]);

  const scope: GroupScope = { keys: [...chain, key], group: id };
  const active = items.find((item) => item.id === activeId);
  if (embedded) {
    return (
      <GroupContext.Provider value={scope}>
        {active?.element}
      </GroupContext.Provider>
    );
  }

  const index = active ? items.indexOf(active) + 1 : 0;
  const slot =
    snapshot.canvas && snapshot.canvasRows.includes(id)
      ? canvasSlot(id)
      : undefined;
  return (
    <GroupContext.Provider value={scope}>
      {active && (
        <Region
          key={active.id}
          group={id}
          item={active}
          outline={
            snapshot.clean || snapshot.canvas
              ? undefined
              : {
                  key,
                  ancestors: [...chain],
                  groupId: id,
                  group: label ?? id,
                  variant: active.label,
                  position: `${index}/${items.length}`,
                  mode: outline && snapshot.outline ? "always" : "hover",
                }
          }
          onActivate={() => store.focusGroup(id)}
          onHover={(hovered) =>
            store.setHighlight(hovered ? id : undefined, "page")
          }
        />
      )}
      {slot &&
        createPortal(
          <InsideCanvas.Provider value>
            {items.map((item, position) => (
              <CanvasCard
                key={item.id}
                group={id}
                number={position + 1}
                item={item}
                current={item.id === activeId}
                ancestors={readSlotAncestors(slot)}
              />
            ))}
          </InsideCanvas.Provider>,
          slot,
        )}
    </GroupContext.Provider>
  );
}

const OWNER = "data-variant-group";

function Region({
  group,
  item,
  outline,
  onActivate,
  onHover,
}: {
  group: string;
  item: Item;
  outline: Omit<RegionInfo, "onActivate" | "onHover"> | undefined;
  onActivate: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const range = useRef<NodeRange>(null);
  const handlers = useRef({ onActivate, onHover });
  useEffect(() => {
    handlers.current = { onActivate, onHover };
  });

  // The hooks live on the variant's own top-level elements; an inner group
  // that shares an element keeps its attributes.
  useEffect(() => {
    for (const node of range.current?.nodes() ?? []) {
      if (!(node instanceof Element)) continue;
      const owner = node.getAttribute(OWNER);
      if (owner !== null && owner !== group) continue;
      node.setAttribute(OWNER, group);
      node.setAttribute("data-variant", item.id);
      node.setAttribute("data-variant-label", item.label);
    }
  });

  useEffect(() => {
    const getNodes = () => range.current?.nodes() ?? [];
    return registerGroupNodes(group, getNodes);
  }, [group]);

  const outlineKey = outline && JSON.stringify(outline);
  useEffect(() => {
    if (outlineKey === undefined) return;
    return trackRegion(() => range.current?.nodes() ?? [], {
      ...(JSON.parse(outlineKey) as Omit<RegionInfo, "onActivate" | "onHover">),
      onActivate: () => handlers.current.onActivate(),
      onHover: (hovered) => handlers.current.onHover(hovered),
    });
  }, [outlineKey]);

  return <NodeRange ref={range}>{item.element}</NodeRange>;
}

const setInert = (element: HTMLElement | null) => {
  element?.setAttribute("inert", "");
};

function CanvasCard({
  group,
  number,
  item,
  current,
  ancestors,
}: {
  group: string;
  number: number;
  item: Item;
  current: boolean;
  ancestors: readonly string[];
}) {
  const content = ancestors.reduceRight<ReactNode>(
    (inner, className) => (
      <div className={className} style={{ display: "contents" }}>
        {inner}
      </div>
    ),
    item.element,
  );
  return (
    <div
      className="cc-card"
      role="group"
      aria-roledescription="variant"
      aria-label={`${number}: ${item.label}${current ? " (current)" : ""}`}
      tabIndex={0}
      data-canvas-card=""
      data-canvas-group={group}
      data-canvas-variant={item.id}
      data-current={current ? "" : undefined}
    >
      <div className="cc-card-head">
        <span className="cc-card-label">
          {number} · {item.label}
        </span>
        {item.label !== item.id && <code>{item.id}</code>}
        {current && <span className="cc-current">Current</span>}
        <button type="button" className="cc-use" data-canvas-use="">
          Use this
        </button>
      </div>
      <div className="cc-card-frame">
        <div className="cc-card-body" ref={setInert}>
          {content}
        </div>
      </div>
    </div>
  );
}

/** One candidate inside `<Variants>`. Only the active one is mounted on the page. */
export function Variant({ id, children }: VariantProps) {
  const group = useContext(GroupContext);
  const parent = useContext(VariantContext);
  const inside = group !== null;
  useEffect(() => {
    if (!inside && isDev()) {
      console.error(
        `${LOG_PREFIX} <Variant id="${id}"> rendered outside <Variants>; wrap it in a <Variants> group.`,
      );
    }
  }, [inside, id]);
  if (!group) return <>{children}</>;
  return (
    <VariantContext.Provider
      value={{
        keys: group.keys,
        group: group.group,
        variant: id,
        depth: (parent?.depth ?? 0) + 1,
      }}
    >
      {children}
    </VariantContext.Provider>
  );
}
