"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface TabItem {
  label: string;
  value?: React.ReactNode; // If present, it's a content tab
  href?: string; // If present, it's a navigation tab
  icon?: React.ReactNode;
  isActive?: (pathname: string) => boolean;
}

const tabSwitcherVariants = cva("flex flex-col", {
  variants: {
    orientation: {
      horizontal: "h-full overflow-hidden",
      navigation: "h-auto",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const tabListVariants = cva("flex-none", {
  variants: {
    orientation: {
      horizontal: "",
      navigation: "",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const tabIndicatorVariants = cva(
  "absolute transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        ghost: "bottom-0 h-[2px] bg-foreground",
        default: "bottom-0 h-[2px] bg-primary",
        outline: "bottom-0 h-[2px] bg-foreground",
        secondary: "bottom-0 h-[2px] bg-secondary-foreground",
        link: "bottom-0 h-[2px] bg-primary",
      },
      orientation: {
        horizontal: "bottom-0 h-[2px]",
        navigation: "bottom-0 h-0.5",
      },
    },
    defaultVariants: {
      variant: "ghost",
      orientation: "horizontal",
    },
  },
);

const tabItemVariants = cva(
  "relative flex h-[30px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm leading-5 transition-all duration-300 focus:outline-none data-[active=true]:font-medium",
  {
    variants: {
      variant: {
        ghost:
          "border-transparent bg-transparent data-[active=true]:bg-foreground/5 data-[active=true]:text-foreground",
        default:
          "border border-border/50 bg-background/50 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground data-[active=true]:border-border data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm",
        outline:
          "border border-border/30 bg-transparent text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground data-[active=true]:border-border data-[active=true]:bg-accent/30 data-[active=true]:text-foreground",
        secondary:
          "border-transparent bg-secondary/30 text-secondary-foreground/80 hover:bg-secondary/50 hover:text-secondary-foreground data-[active=true]:bg-secondary/70 data-[active=true]:text-secondary-foreground",
        link: "border-transparent bg-transparent text-muted-foreground hover:text-primary data-[active=true]:text-primary",
      },
    },
    defaultVariants: {
      variant: "ghost",
    },
  },
);

function Tab({
  tabs,
  className,
  defaultActiveIndex = 0,
  variant = "ghost",
  orientation,
  onTabChange,
  ...props
}: React.ComponentProps<"div"> & {
  tabs: TabItem[];
  defaultActiveIndex?: number;
  variant?: "ghost" | "default" | "outline" | "secondary" | "link";
  onTabChange?: (label: string, index: number) => void;
} & VariantProps<typeof tabSwitcherVariants>) {
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [contentActiveIndex, setContentActiveIndex] =
    React.useState(defaultActiveIndex);
  const [hoverStyle, setHoverStyle] = React.useState({});
  const [activeStyle, setActiveStyle] = React.useState({
    left: "0px",
    width: "0px",
  });
  const tabRefs = React.useRef<(HTMLElement | null)[]>([]);

  // Check if we have content tabs (tabs with value)
  const hasContentTabs = tabs.some((tab) => tab.value !== undefined);
  // Pure navigation mode: ALL tabs are navigation-only (href without value)
  const isPureNavigationMode =
    tabs.every((tab) => tab.href && !tab.value) && tabs.some((tab) => tab.href);

  const resolvedOrientation =
    orientation || (isPureNavigationMode ? "navigation" : "horizontal");

  // Find active tab index for pure navigation mode
  const navigationActiveIndex = isPureNavigationMode
    ? tabs.findIndex((tab) => {
        if (tab.href) {
          return tab.isActive ? tab.isActive(pathname) : pathname === tab.href;
        }
        return false;
      })
    : -1;

  const activeIndex = isPureNavigationMode
    ? navigationActiveIndex
    : contentActiveIndex;

  React.useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  React.useEffect(() => {
    if (activeIndex !== -1) {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [activeIndex]);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      const initialActiveIndex = isPureNavigationMode
        ? navigationActiveIndex
        : contentActiveIndex;
      if (initialActiveIndex !== -1) {
        const activeElement = tabRefs.current[initialActiveIndex];
        if (activeElement) {
          const { offsetLeft, offsetWidth } = activeElement;
          setActiveStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          });
        }
      }
    });
  }, [isPureNavigationMode, navigationActiveIndex, contentActiveIndex]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    const tab = tabs[index];
    // Only handle key events for content tabs (tabs with value)
    if (tab?.value !== undefined && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      if (index !== contentActiveIndex) {
        onTabChange?.(tab.label, index);
      }
      setContentActiveIndex(index);
    }
  };

  const handleContentTabClick = (index: number) => {
    const tab = tabs[index];
    // Only set active index for content tabs (tabs with value)
    if (tab?.value !== undefined) {
      if (index !== contentActiveIndex) {
        onTabChange?.(tab.label, index);
      }
      setContentActiveIndex(index);
    }
  };

  // Show indicator only for ghost, outline, and link variants
  const showIndicator =
    variant === "ghost" || variant === "outline" || variant === "link";

  return (
    <div
      className={cn(
        tabSwitcherVariants({ orientation: resolvedOrientation }),
        className,
      )}
      data-orientation={resolvedOrientation}
      data-slot="unified-tab-switcher"
      data-variant={variant}
      {...props}
    >
      <TabList orientation={resolvedOrientation}>
        <TabContainer>
          {showIndicator && (
            <TabIndicator
              activeStyle={activeStyle}
              hoveredIndex={hoveredIndex}
              hoverStyle={hoverStyle}
              orientation={resolvedOrientation}
              variant={variant}
            />
          )}
          {tabs.map((tab, index) => (
            <TabItem
              index={index}
              isActive={
                isPureNavigationMode
                  ? Boolean(
                      tab.href &&
                        (tab.isActive
                          ? tab.isActive(pathname)
                          : pathname === tab.href),
                    )
                  : tab.value !== undefined && index === contentActiveIndex
              }
              key={tab.label}
              onClick={() => handleContentTabClick(index)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              tab={tab}
              tabRefs={tabRefs}
              variant={variant}
            />
          ))}
        </TabContainer>
      </TabList>

      {/* Content panel - show when there are content tabs */}
      {hasContentTabs && (
        <TabContent
          activeIndex={contentActiveIndex}
          activeTab={tabs[contentActiveIndex]}
        />
      )}
    </div>
  );
}

function TabList({
  orientation,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  orientation: "horizontal" | "navigation";
}) {
  return (
    <div
      className={cn(tabListVariants({ orientation }), className)}
      data-orientation={orientation}
      data-slot="tab-list"
      {...props}
    >
      {children}
    </div>
  );
}

function TabIndicator({
  variant,
  orientation,
  hoverStyle,
  activeStyle,
  hoveredIndex,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  variant: "ghost" | "default" | "outline" | "secondary" | "link";
  orientation: "horizontal" | "navigation";
  hoverStyle: React.CSSProperties;
  activeStyle: React.CSSProperties;
  hoveredIndex: number | null;
}) {
  return (
    <>
      {variant === "ghost" &&
        hoveredIndex !== null &&
        hoverStyle.width &&
        Number.parseFloat(String(hoverStyle.width)) > 0 && (
          <div
            className="absolute flex h-[30px] items-center rounded-md bg-foreground/8 transition-all duration-300 ease-out"
            data-slot="tab-hover-indicator"
            style={hoverStyle}
            {...props}
          />
        )}
      <div
        className={cn(
          tabIndicatorVariants({ variant, orientation }),
          className,
        )}
        data-orientation={orientation}
        data-slot="tab-active-indicator"
        data-variant={variant}
        style={activeStyle}
      />
    </>
  );
}

function TabContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "scrollbar-none relative flex items-center space-x-[6px] overflow-x-auto pb-2",
        className,
      )}
      data-slot="tab-container"
      role="tablist"
      {...props}
    />
  );
}

function TabItem({
  tab,
  index,
  isActive,
  variant,
  tabRefs,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onKeyDown,
  className,
}: {
  tab: TabItem;
  index: number;
  isActive: boolean;
  variant: "ghost" | "default" | "outline" | "secondary" | "link";
  tabRefs: React.RefObject<(HTMLElement | null)[]>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string;
}) {
  const tabContent = (
    <>
      {tab.icon}
      {tab.label}
    </>
  );

  const baseClasses = cn(tabItemVariants({ variant }), className);

  // If tab has a path, render as navigation link
  if (tab.href) {
    return (
      <Link
        aria-controls={`panel-${tab.label}`}
        aria-selected={isActive}
        className={baseClasses}
        data-active={isActive}
        data-slot="tab-item"
        data-type="navigation"
        data-variant={variant}
        href={tab.href}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        ref={(el) => {
          tabRefs.current[index] = el;
        }}
        role="tab"
        tabIndex={0}
      >
        {tabContent}
      </Link>
    );
  }

  // Otherwise render as content tab
  return (
    <div
      aria-controls={`panel-${tab.label}`}
      className={baseClasses}
      data-active={isActive}
      data-slot="tab-item"
      data-type="content"
      data-variant={variant}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={(el) => {
        tabRefs.current[index] = el;
      }}
      role="tab"
      tabIndex={0}
    >
      {tabContent}
    </div>
  );
}

function TabContent({
  activeTab,
  activeIndex,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  activeTab: TabItem | undefined;
  activeIndex: number;
}) {
  return (
    <div
      aria-labelledby={activeTab?.label}
      className={cn("relative mt-4 flex-1 overflow-hidden", className)}
      data-slot="tab-content-panel"
      id={`panel-${activeTab?.label}`}
      role="tabpanel"
      {...props}
    >
      {activeTab?.value}
    </div>
  );
}

export { Tab, TabList, TabIndicator, TabContainer, TabItem, TabContent };
