"use client";

import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../site/utils";

export interface TabsProps extends ComponentProps<"div"> {
  /** Tab labels, in order. */
  items?: string[];
  /** Index of the tab selected first; past the end selects the first tab. */
  defaultIndex?: number;
  /** Text shown before the tab labels. */
  label?: ReactNode;
  /** Keeps every `Tabs` with this id on the same tab. */
  groupId?: string;
  /** Escaped value of the active tab, for controlled use. */
  value?: string;
  /** Called with the escaped value when a tab is chosen. */
  onValueChange?: (value: string) => void;
}

const TabsContext = createContext<{
  id: string;
  items: string[] | undefined;
  value: string | undefined;
} | null>(null);

const TabPosition = createContext(0);

function useTabContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("You must wrap your component in <Tabs>");
  return context;
}

const escapeValue = (value: string) => value.toLowerCase().replace(/\s/g, "-");

const flatten = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flatten(
          (child as ReactElement<{ children?: ReactNode }>).props.children,
        )
      : [child],
  );

const groups = new Map<string, Set<(value: string) => void>>();

export function Tabs({
  className,
  items,
  label,
  defaultIndex = 0,
  groupId,
  value: controlled,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const firstItem = items?.[defaultIndex] ?? items?.[0];
  const [internal, setInternal] = useState(
    firstItem ? escapeValue(firstItem) : undefined,
  );
  const id = useId();
  const requested = controlled ?? internal;
  const value =
    !items || items.some((item) => escapeValue(item) === requested)
      ? requested
      : items[0] && escapeValue(items[0]);
  const context = useMemo(() => ({ id, items, value }), [id, items, value]);

  useEffect(() => {
    if (!groupId) return;
    const listeners = groups.get(groupId) ?? new Set();
    groups.set(groupId, listeners);
    const listener = (next: string) => {
      if (items?.some((item) => escapeValue(item) === next)) setInternal(next);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) groups.delete(groupId);
    };
  }, [groupId, items]);

  const select = (next: string) => {
    setInternal(next);
    onValueChange?.(next);
    if (groupId)
      for (const listener of groups.get(groupId) ?? []) listener(next);
  };

  let position = -1;
  const panels = flatten(children).map((child) => {
    if (!isValidElement(child)) return child;
    position += 1;
    return (
      <TabPosition.Provider key={child.key} value={position}>
        {child}
      </TabPosition.Provider>
    );
  });

  return (
    <div {...props} className={cn("aui-docs-tabs", className)} data-tabs="">
      {items && (
        <div className="aui-docs-tabs-list" role="tablist">
          {label && <span className="aui-docs-tabs-label">{label}</span>}
          {items.map((item, index) => {
            const active = escapeValue(item) === value;
            return (
              <button
                key={item}
                id={`${id}-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${id}-panel-${index}`}
                data-state={active ? "active" : "inactive"}
                className="aui-docs-tabs-trigger"
                onClick={() => select(escapeValue(item))}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}
      <TabsContext.Provider value={context}>{panels}</TabsContext.Provider>
    </div>
  );
}

export interface TabProps extends ComponentProps<"div"> {
  /** Label of this tab; defaults to the item at the tab's position. */
  value?: string;
}

export function Tab({ value, className, children, ...props }: TabProps) {
  const { id, items, value: activeValue } = useTabContext();
  const position = useContext(TabPosition);
  const resolved = value ?? items?.at(position);
  if (!resolved) {
    throw new Error(
      "Failed to resolve tab `value`, please pass a `value` prop to the Tab component.",
    );
  }
  const escaped = escapeValue(resolved);
  const item =
    items?.findIndex((label) => escapeValue(label) === escaped) ?? -1;
  const active =
    activeValue === undefined ? position === 0 : escaped === activeValue;

  return (
    <div
      {...props}
      id={`${id}-panel-${item === -1 ? position : item}`}
      role="tabpanel"
      aria-labelledby={item === -1 ? undefined : `${id}-tab-${item}`}
      data-state={active ? "active" : "inactive"}
      hidden={!active}
      className={cn("aui-docs-tabs-panel", className)}
    >
      {children}
    </div>
  );
}
