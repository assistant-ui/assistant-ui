"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "../site/utils";

type CollectionKey = string | symbol;

export interface TabsProps extends ComponentProps<"div"> {
  /** Tab labels, in order. */
  items?: string[];
  /** Index of the tab selected first. */
  defaultIndex?: number;
  /** Text shown before the tab labels. */
  label?: ReactNode;
}

const TabsContext = createContext<{
  items: string[] | undefined;
  collection: CollectionKey[];
  value: string | undefined;
} | null>(null);

function useTabContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("You must wrap your component in <Tabs>");
  return context;
}

const escapeValue = (value: string) => value.toLowerCase().replace(/\s/g, "-");

export function Tabs({
  className,
  items,
  label,
  defaultIndex = 0,
  children,
  ...props
}: TabsProps) {
  const defaultItem = items?.[defaultIndex];
  const [value, setValue] = useState(
    defaultItem ? escapeValue(defaultItem) : undefined,
  );
  const collection = useMemo<CollectionKey[]>(() => [], []);
  const context = useMemo(
    () => ({ items, collection, value }),
    [items, collection, value],
  );

  return (
    <div {...props} className={cn("aui-docs-tabs", className)} data-tabs="">
      {items && (
        <div className="aui-docs-tabs-list" role="tablist">
          {label && <span className="aui-docs-tabs-label">{label}</span>}
          {items.map((item) => {
            const active = escapeValue(item) === value;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                data-state={active ? "active" : "inactive"}
                className="aui-docs-tabs-trigger"
                onClick={() => setValue(escapeValue(item))}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}
      <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
    </div>
  );
}

export interface TabProps extends ComponentProps<"div"> {
  /** Label of this tab; defaults to the item at the tab's position. */
  value?: string;
}

export function Tab({ value, className, children, ...props }: TabProps) {
  const { items, value: activeValue } = useTabContext();
  const index = useCollectionIndex();
  const resolved = value ?? items?.at(index);
  if (!resolved) {
    throw new Error(
      "Failed to resolve tab `value`, please pass a `value` prop to the Tab component.",
    );
  }
  const active = escapeValue(resolved) === activeValue;

  return (
    <div
      {...props}
      role="tabpanel"
      data-state={active ? "active" : "inactive"}
      hidden={!active}
      className={cn("aui-docs-tabs-panel", className)}
    >
      {children}
    </div>
  );
}

function useCollectionIndex() {
  const key = useId();
  const { collection } = useTabContext();

  useEffect(() => {
    return () => {
      const index = collection.indexOf(key);
      if (index !== -1) collection.splice(index, 1);
    };
  }, [key, collection]);

  if (!collection.includes(key)) collection.push(key);
  return collection.indexOf(key);
}
