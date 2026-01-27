"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type TabsVariant = "default" | "line" | "ghost" | "pills" | "outline";
type TabsSize = "sm" | "default" | "lg";

type IndicatorStyle = { left: string; width: string };

type TabsListContextValue = {
  variant: TabsVariant;
  size: TabsSize;
  registerTrigger: (value: string, element: HTMLElement | null) => void;
  setHoveredValue: (value: string | null) => void;
  activeValue: string | null;
};

const TabsListContext = React.createContext<TabsListContextValue | null>(null);

function useTabsListContext() {
  const context = React.useContext(TabsListContext);
  if (!context) {
    return null;
  }
  return context;
}

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("group/tabs flex flex-col gap-2", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center text-muted-foreground",
  {
    variants: {
      variant: {
        default: "gap-1 rounded-lg bg-muted p-1",
        line: "gap-1 border-border border-b bg-transparent pb-2",
        ghost: "gap-1.5 bg-transparent",
        pills: "gap-2 bg-transparent",
        outline: "gap-1 rounded-lg border border-border p-1",
      },
      size: {
        sm: "h-8",
        default: "h-9",
        lg: "h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const tabsActiveIndicatorVariants = cva(
  "pointer-events-none absolute transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default:
          "inset-y-1 rounded-md bg-background shadow-sm dark:border dark:border-input dark:bg-input/30",
        line: "bottom-0 h-0.5 bg-foreground",
        ghost: "inset-y-1 rounded-md bg-foreground/8",
        pills: "inset-y-0 rounded-full bg-primary",
        outline: "inset-y-1 rounded-md border border-border bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const resolvedVariant = variant ?? "default";
  const resolvedSize = size ?? "default";

  const triggerRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [hoveredValue, setHoveredValue] = React.useState<string | null>(null);
  const [activeValue, setActiveValue] = React.useState<string | null>(null);
  const [activeStyle, setActiveStyle] = React.useState<IndicatorStyle>({
    left: "0px",
    width: "0px",
  });
  const [hoverStyle, setHoverStyle] = React.useState<IndicatorStyle>({
    left: "0px",
    width: "0px",
  });

  const registerTrigger = React.useCallback(
    (value: string, element: HTMLElement | null) => {
      if (element) {
        triggerRefs.current.set(value, element);
      } else {
        triggerRefs.current.delete(value);
      }
    },
    [],
  );

  // Update active style when active value changes
  React.useEffect(() => {
    if (activeValue) {
      const element = triggerRefs.current.get(activeValue);
      if (element) {
        setActiveStyle({
          left: `${element.offsetLeft}px`,
          width: `${element.offsetWidth}px`,
        });
      }
    }
  }, [activeValue]);

  // Update hover style when hovered value changes
  React.useEffect(() => {
    if (hoveredValue) {
      const element = triggerRefs.current.get(hoveredValue);
      if (element) {
        setHoverStyle({
          left: `${element.offsetLeft}px`,
          width: `${element.offsetWidth}px`,
        });
      }
    }
  }, [hoveredValue]);

  // Observe active tab changes via MutationObserver
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const updateActiveFromDOM = () => {
      const activeElement = listElement.querySelector(
        '[data-state="active"]',
      ) as HTMLElement | null;
      if (activeElement) {
        const value = activeElement.getAttribute("data-value");
        if (value && value !== activeValue) {
          setActiveValue(value);
        }
        // Also update style directly for initial render
        setActiveStyle({
          left: `${activeElement.offsetLeft}px`,
          width: `${activeElement.offsetWidth}px`,
        });
      }
    };

    // Initial update
    requestAnimationFrame(updateActiveFromDOM);

    // Watch for attribute changes
    const observer = new MutationObserver(updateActiveFromDOM);
    observer.observe(listElement, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    });

    return () => observer.disconnect();
  }, [activeValue]);

  // Show hover background only for ghost variant
  const showHoverBackground = resolvedVariant === "ghost";

  const contextValue = React.useMemo(
    () => ({
      variant: resolvedVariant,
      size: resolvedSize,
      registerTrigger,
      setHoveredValue,
      activeValue,
    }),
    [resolvedVariant, resolvedSize, registerTrigger, activeValue],
  );

  return (
    <TabsListContext.Provider value={contextValue}>
      <TabsPrimitive.List
        ref={listRef}
        data-slot="tabs-list"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(
          tabsListVariants({ variant: resolvedVariant, size: resolvedSize }),
          className,
        )}
        {...props}
      >
        {/* Hover background indicator for ghost variant */}
        {showHoverBackground &&
          hoveredValue !== null &&
          hoverStyle.width !== "0px" && (
            <div
              data-slot="tabs-hover-indicator"
              className="pointer-events-none absolute inset-y-1 rounded-md bg-foreground/8 transition-all duration-300 ease-out"
              style={hoverStyle}
            />
          )}

        {/* Active indicator - rendered for all variants */}
        {activeStyle.width !== "0px" && (
          <div
            data-slot="tabs-active-indicator"
            data-variant={resolvedVariant}
            className={cn(
              tabsActiveIndicatorVariants({ variant: resolvedVariant }),
            )}
            style={activeStyle}
          />
        )}

        {children}
      </TabsPrimitive.List>
    </TabsListContext.Provider>
  );
}

const tabsTriggerVariants = cva(
  "relative z-10 inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-medium text-foreground/60 transition-[color] duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-medium data-[state=active]:text-foreground dark:text-muted-foreground dark:hover:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "rounded-md",
        line: "rounded-md bg-transparent",
        ghost: "rounded-md bg-transparent",
        pills:
          "rounded-full data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground",
        outline: "rounded-md",
      },
      size: {
        sm: "h-[calc(100%-8px)] px-2 py-0.5 text-xs",
        default: "h-[calc(100%-8px)] px-3 py-1 text-sm",
        lg: "h-[calc(100%-8px)] px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type TabsTriggerProps = Omit<
  React.ComponentProps<typeof TabsPrimitive.Trigger>,
  "asChild"
> &
  VariantProps<typeof tabsTriggerVariants> & {
    asChild?: boolean;
  };

function TabsTrigger({
  className,
  variant,
  size,
  asChild = false,
  value,
  ...props
}: TabsTriggerProps) {
  const context = useTabsListContext();
  const resolvedVariant = variant ?? context?.variant ?? "default";
  const resolvedSize = size ?? context?.size ?? "default";

  const ref = React.useRef<HTMLButtonElement>(null);

  // Register this trigger with the parent TabsList
  React.useEffect(() => {
    context?.registerTrigger(value, ref.current);
    return () => context?.registerTrigger(value, null);
  }, [context, value]);

  const handleMouseEnter = React.useCallback(() => {
    context?.setHoveredValue(value);
  }, [context, value]);

  const handleMouseLeave = React.useCallback(() => {
    context?.setHoveredValue(null);
  }, [context]);

  const Comp = asChild ? Slot : TabsPrimitive.Trigger;

  return (
    <Comp
      ref={ref}
      value={value}
      data-slot="tabs-trigger"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-value={value}
      className={cn(
        tabsTriggerVariants({ variant: resolvedVariant, size: resolvedSize }),
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
  tabsActiveIndicatorVariants,
};
