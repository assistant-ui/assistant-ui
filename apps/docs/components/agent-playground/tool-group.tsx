"use client";

import {
  memo,
  useCallback,
  useRef,
  type FC,
  type PropsWithChildren,
} from "react";
import { ChevronDownIcon, LoaderIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { useAuiState } from "@assistant-ui/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/agent-playground/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAutoOpenWhileBusy } from "@/components/agent-playground/lib/useAutoOpenWhileBusy";

const ANIMATION_DURATION = 200;

const toolGroupVariants = cva("aui-tool-group-root group/tool-group w-full", {
  variants: {
    variant: {
      outline: "rounded-md border border-border/60 py-2.5",
      ghost: "",
      muted: "rounded-md border border-muted-foreground/20 bg-muted/20 py-2.5",
    },
  },
  defaultVariants: { variant: "outline" },
});

export type ToolGroupRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof toolGroupVariants> & {
    open?: boolean | undefined;
    onOpenChange?: (open: boolean) => void | undefined;
    /** When true, auto-open while busy and auto-collapse when busy flips false. */
    busy?: boolean | undefined;
  };

function ToolGroupRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  busy = false,
  children,
  ...props
}: ToolGroupRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const auto = useAutoOpenWhileBusy(busy);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : auto.open;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        auto.onOpenChange(open);
      }
      controlledOnOpenChange?.(open);
    },
    [isControlled, controlledOnOpenChange, auto],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="tool-group-root"
      data-variant={variant ?? "outline"}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        toolGroupVariants({ variant }),
        "group/tool-group-root",
        className,
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Collapsible>
  );
}

function ToolGroupTrigger({
  count,
  active = false,
  open = false,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
  active?: boolean | undefined;
  open?: boolean | undefined;
}) {
  const label = `${count} tool ${count === 1 ? "call" : "calls"}`;

  return (
    <CollapsibleTrigger
      data-slot="tool-group-trigger"
      className={cn(
        "aui-tool-group-trigger group/trigger flex items-center gap-2 text-sm transition-colors",
        "group-data-[variant=outline]/tool-group-root:w-full group-data-[variant=outline]/tool-group-root:px-4",
        "group-data-[variant=muted]/tool-group-root:w-full group-data-[variant=muted]/tool-group-root:px-4",
        className,
      )}
      {...props}
    >
      {active && (
        <LoaderIcon
          data-slot="tool-group-trigger-loader"
          className="aui-tool-group-trigger-loader size-4 shrink-0 animate-spin"
        />
      )}
      <span
        data-slot="tool-group-trigger-label"
        className={cn(
          "aui-tool-group-trigger-label-wrapper relative inline-block text-left font-medium leading-none",
          "group-data-[variant=outline]/tool-group-root:grow",
          "group-data-[variant=muted]/tool-group-root:grow",
        )}
      >
        <span>{label}</span>
        {active && (
          <span
            aria-hidden
            data-slot="tool-group-trigger-shimmer"
            className="aui-tool-group-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
          >
            {label}
          </span>
        )}
      </span>
      <ChevronDownIcon
        data-slot="tool-group-trigger-chevron"
        className={cn(
          "aui-tool-group-trigger-chevron size-4 shrink-0",
          "transition-transform duration-(--animation-duration) ease-out",
          open ? "rotate-0" : "-rotate-90",
        )}
      />
    </CollapsibleTrigger>
  );
}

function ToolGroupContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-group-content"
      className={cn(
        "aui-tool-group-content relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-out",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "mt-2 flex flex-col gap-2",
          "group-data-[variant=outline]/tool-group-root:mt-3 group-data-[variant=outline]/tool-group-root:border-t group-data-[variant=outline]/tool-group-root:px-4 group-data-[variant=outline]/tool-group-root:pt-3",
          "group-data-[variant=muted]/tool-group-root:mt-3 group-data-[variant=muted]/tool-group-root:border-t group-data-[variant=muted]/tool-group-root:px-4 group-data-[variant=muted]/tool-group-root:pt-3",
        )}
      >
        {children}
      </div>
    </CollapsibleContent>
  );
}

type ToolGroupComponent = FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> & {
  Root: typeof ToolGroupRoot;
  Trigger: typeof ToolGroupTrigger;
  Content: typeof ToolGroupContent;
};

const ToolGroupImpl: FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> = ({ children, startIndex, endIndex }) => {
  const toolCount = endIndex - startIndex + 1;

  // Auto-open while any tool inside this group is still running, OR while the
  // message itself is streaming and the last appended part falls inside the
  // group's range (covers the moment a tool has just started but its status
  // hasn't propagated yet).
  const busy = useAuiState((s) => {
    const parts = s.message.parts ?? [];
    for (let i = startIndex; i <= endIndex && i < parts.length; i += 1) {
      const part = parts[i] as { type?: string; status?: { type?: string }; result?: unknown } | undefined;
      if (!part) continue;
      if (part.type !== "tool-call") continue;
      const statusType = part.status?.type;
      if (statusType === "running" || statusType === "requires-action") return true;
      if (statusType !== "incomplete" && statusType !== "complete" && part.result === undefined) return true;
    }
    if (s.message.status?.type === "running") {
      const lastIndex = parts.length - 1;
      if (lastIndex >= startIndex && lastIndex <= endIndex) return true;
    }
    return false;
  });

  const active = useAuiState((s) => {
    const parts = s.message.parts ?? [];
    for (let i = startIndex; i <= endIndex && i < parts.length; i += 1) {
      const part = parts[i] as { type?: string; status?: { type?: string } } | undefined;
      if (part?.type === "tool-call" && part.status?.type === "running") return true;
    }
    return false;
  });

  // Lift open state here so we can drive the trigger's chevron explicitly.
  const auto = useAutoOpenWhileBusy(busy);

  return (
    <ToolGroupRoot open={auto.open} onOpenChange={auto.onOpenChange}>
      <ToolGroupTrigger count={toolCount} active={active} open={auto.open} />
      <ToolGroupContent>{children}</ToolGroupContent>
    </ToolGroupRoot>
  );
};

const ToolGroup = memo(ToolGroupImpl) as unknown as ToolGroupComponent;

ToolGroup.displayName = "ToolGroup";
ToolGroup.Root = ToolGroupRoot;
ToolGroup.Trigger = ToolGroupTrigger;
ToolGroup.Content = ToolGroupContent;

export {
  ToolGroup,
  ToolGroupRoot,
  ToolGroupTrigger,
  ToolGroupContent,
  toolGroupVariants,
};
