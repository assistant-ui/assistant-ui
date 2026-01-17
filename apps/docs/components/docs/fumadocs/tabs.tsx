"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useAnimatedTabs } from "@/hooks/use-animated-tabs";

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

function escapeValue(v: string): string {
  return v.toLowerCase().replace(/\s/g, "-");
}

export function Tabs({
  className,
  items,
  label,
  defaultIndex = 0,
  groupId,
  children,
  ...props
}: TabsProps): React.ReactElement {
  const defaultItem = items?.[defaultIndex];
  const defaultValue = defaultItem ? escapeValue(defaultItem) : undefined;
  const [value, setValue] = useState(defaultValue);
  const collection = useMemo<CollectionKey[]>(() => [], []);

  const activeIndex = items
    ? items.findIndex((item) => escapeValue(item) === value)
    : -1;

  const {
    containerRef,
    tabRefs,
    hoveredIndex,
    setHoveredIndex,
    activeStyle,
    hoverStyle,
  } = useAnimatedTabs({ activeIndex });

  return (
    <div
      className={cn("my-4 flex min-w-0 flex-col", className)}
      data-tabs=""
      {...props}
    >
      {items && (
        <div
          ref={containerRef}
          className="scrollbar-none relative flex items-center gap-1 overflow-x-auto"
        >
          {label && (
            <span className="my-auto me-auto font-medium text-sm">{label}</span>
          )}

          {hoveredIndex !== null && hoverStyle.width > 0 && (
            <div
              className="pointer-events-none absolute top-0 h-7.5 rounded-md bg-fd-accent transition-all duration-200 ease-out"
              style={{
                left: `${hoverStyle.left}px`,
                width: `${hoverStyle.width}px`,
              }}
            />
          )}

          {activeStyle.width > 0 && (
            <div
              className="pointer-events-none absolute top-0 h-7.5 rounded-md bg-fd-accent transition-all duration-200 ease-out"
              style={{
                left: `${activeStyle.left}px`,
                width: `${activeStyle.width}px`,
              }}
            />
          )}

          {items.map((item, index) => (
            <button
              key={item}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={escapeValue(item) === value}
              data-state={escapeValue(item) === value ? "active" : "inactive"}
              className={cn(
                "relative z-10 flex h-7.5 cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 text-sm transition-colors",
                "text-fd-muted-foreground hover:text-fd-foreground",
                "data-[state=active]:font-medium data-[state=active]:text-fd-foreground",
              )}
              onClick={() => setValue(escapeValue(item))}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <TabsContext.Provider
        value={useMemo(
          () => ({ items, collection, value, setValue }),
          [items, collection, value],
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
  const resolved =
    value ??
    // eslint-disable-next-line react-hooks/rules-of-hooks -- `value` is not supposed to change
    items?.at(useCollectionIndex());

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
