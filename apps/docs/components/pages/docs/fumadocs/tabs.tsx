"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type CollectionKey = string | symbol;

export interface TabsProps extends React.ComponentProps<"div"> {
  /**
   * Simple mode: pass an array of tab labels
   */
  items?: string[];

  /**
   * Default selected tab index (for simple mode)
   * @defaultValue 0
   */
  defaultIndex?: number;

  /**
   * Group ID for syncing tabs across the page
   */
  groupId?: string;

  /**
   * Additional label in tabs list
   */
  label?: ReactNode;

  /**
   * Controlled escaped value of the active tab. Pair with `onValueChange`.
   */
  value?: string;

  /**
   * Called with the escaped value when the active tab changes (controlled mode).
   */
  onValueChange?: (value: string) => void;
}

const TabsContext = createContext<{
  items: string[] | undefined;
  collection: CollectionKey[];
  value: string | undefined;
  setValue: (value: string | undefined) => void;
} | null>(null);

function useTabContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("You must wrap your component in <Tabs>");
  return ctx;
}

export function escapeValue(v: string): string {
  return v.toLowerCase().replace(/\s/g, "-");
}

export function Tabs({
  className,
  items,
  label,
  defaultIndex = 0,
  groupId,
  value: controlledValue,
  onValueChange,
  children,
  ...props
}: TabsProps): React.ReactElement {
  const defaultItem = items?.[defaultIndex];
  const defaultValue = defaultItem ? escapeValue(defaultItem) : undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const setValue = useCallback(
    (v: string | undefined) => {
      if (onValueChange) {
        if (v !== undefined) onValueChange(v);
      } else {
        setInternalValue(v);
      }
    },
    [onValueChange],
  );
  const collection = useMemo<CollectionKey[]>(() => [], []);

  return (
    <div
      className={cn("my-4 flex min-w-0 flex-col", className)}
      data-tabs=""
      {...props}
    >
      {items && (
        <div className="border-foreground/10 flex scrollbar-none items-center gap-5 overflow-x-auto border-b">
          {label && (
            <span className="my-auto me-auto text-sm font-medium">{label}</span>
          )}

          {items.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={escapeValue(item) === value}
              data-state={escapeValue(item) === value ? "active" : "inactive"}
              className={cn(
                "after:bg-foreground relative -mb-px cursor-pointer pb-2 text-sm font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:opacity-0 after:transition-opacity",
                "text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-foreground data-[state=active]:after:opacity-100",
              )}
              onClick={() => setValue(escapeValue(item))}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <TabsContext.Provider
        value={useMemo(
          () => ({ items, collection, value, setValue }),
          [items, collection, value, setValue],
        )}
      >
        {children}
      </TabsContext.Provider>
    </div>
  );
}

export interface TabProps extends React.ComponentProps<"div"> {
  /**
   * Value of tab, auto-detected from index if not specified
   */
  value?: string;
}

export function Tab({
  value,
  className,
  children,
  ...props
}: TabProps): React.ReactElement {
  const { items, value: activeValue } = useTabContext();
  const collectionIndex = useCollectionIndex();
  const resolved = value ?? items?.at(collectionIndex);

  if (!resolved) {
    throw new Error(
      "Failed to resolve tab `value`, please pass a `value` prop to the Tab component.",
    );
  }

  const isActive = escapeValue(resolved) === activeValue;

  return (
    <div
      role="tabpanel"
      data-state={isActive ? "active" : "inactive"}
      hidden={!isActive}
      className={cn(
        "prose-no-margin mt-4 min-w-0 text-sm",
        "[&_a]:text-foreground hover:[&_a]:text-foreground/80 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
        "data-[state=inactive]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Return the index of children using React context collection pattern
 */
function useCollectionIndex(): number {
  const key = useId();
  const { collection } = useTabContext();

  useEffect(() => {
    return () => {
      const idx = collection.indexOf(key);
      if (idx !== -1) collection.splice(idx, 1);
    };
  }, [key, collection]);

  if (!collection.includes(key)) collection.push(key);
  return collection.indexOf(key);
}
