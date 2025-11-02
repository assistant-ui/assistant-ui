"use client";

import {
  type ReasoningMessagePartComponent,
  useScrollLock,
} from "@assistant-ui/react";
import { BrainIcon, ChevronDownIcon, type LucideIcon } from "lucide-react";
import {
  memo,
  useState,
  useRef,
  useCallback,
  type FC,
  type PropsWithChildren,
} from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

/**
 * Compound component primitives for building composable reasoning collapsibles.
 * Provides Root, Trigger, Content, Fade, Icon, and Text components.
 */
export namespace ReasoningCollapsible {
  type RootProps = PropsWithChildren<{
    className?: string;
    onOpenChange?: (open: boolean) => void;
  }>;

  export const Root: FC<RootProps> = ({
    className,
    onOpenChange,
    children,
  }) => {
    const collapsibleRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!open) {
          lockScroll();
        }
        setIsOpen(open);
        onOpenChange?.(open);
      },
      [lockScroll, onOpenChange],
    );

    return (
      <Collapsible
        ref={collapsibleRef}
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn("aui-reasoning-root mb-4 w-full", className)}
        style={
          {
            "--animation-duration": `${ANIMATION_DURATION}ms`,
          } as React.CSSProperties
        }
      >
        {children}
      </Collapsible>
    );
  };

  export const Trigger: FC<PropsWithChildren<{ className?: string }>> = ({
    className,
    children,
  }) => (
    <CollapsibleTrigger
      className={cn(
        "aui-reasoning-trigger group/trigger -mb-2 flex max-w-[75%] items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {children}
    </CollapsibleTrigger>
  );

  export const Fade = ({ className }: { className?: string }) => (
    <div
      className={cn(
        "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16",
        "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
        "animate-in fade-in-0",
        "group-data-[state=open]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]",
        "group-data-[state=open]/collapsible-content:fill-mode-forwards",
        "duration-(--animation-duration)",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
    />
  );

  export const Content: FC<PropsWithChildren<{ className?: string }>> = ({
    className,
    children,
  }) => (
    <CollapsibleContent
      className={cn(
        "aui-reasoning-content relative overflow-hidden text-sm text-muted-foreground outline-none",
        "group/collapsible-content ease-out",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
    >
      {children}
      <Fade />
    </CollapsibleContent>
  );

  /**
   * Renders a Lucide icon. Defaults to ChevronDownIcon with rotation animation.
   * Custom icons render without rotation.
   */
  export const Icon = ({
    className,
    icon,
  }: {
    className?: string;
    icon?: LucideIcon;
  }) => {
    const Icon = icon ?? ChevronDownIcon;

    return (
      <Icon
        className={cn(
          "size-4 shrink-0",
          !icon && [
            "transition-transform duration-(--animation-duration) ease-out",
            "group-data-[state=closed]/trigger:-rotate-90 group-data-[state=open]/trigger:rotate-0",
          ],
          className,
        )}
      />
    );
  };

  export const Text: FC<PropsWithChildren<{ className?: string }>> = ({
    className,
    children,
  }) => (
    <div
      className={cn(
        "aui-reasoning-text relative z-0 space-y-4 pt-4 leading-relaxed [&_p]:-mb-2",
        "transform-gpu transition-[transform,opacity]",
        "group-data-[state=open]/collapsible-content:animate-in",
        "group-data-[state=closed]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-in-0",
        "group-data-[state=closed]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:slide-in-from-top-6",
        "group-data-[state=closed]/collapsible-content:slide-out-to-top-3",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Renders a single reasoning part's text.
 * Consecutive reasoning parts are automatically grouped by ReasoningGroup.
 */
export const Reasoning = memo<ReasoningMessagePartComponent>(() => (
  <MarkdownText />
));
Reasoning.displayName = "Reasoning";

/**
 * Collapsible wrapper that groups consecutive reasoning parts together.
 */
export const ReasoningGroup = memo<PropsWithChildren>(({ children }) => (
  <ReasoningCollapsible.Root>
    <ReasoningCollapsible.Trigger>
      <ReasoningCollapsible.Icon icon={BrainIcon} />
      <span className="leading-none">Reasoning</span>
      <ReasoningCollapsible.Icon />
    </ReasoningCollapsible.Trigger>
    <ReasoningCollapsible.Content>
      <ReasoningCollapsible.Text className="pl-6">
        {children}
      </ReasoningCollapsible.Text>
    </ReasoningCollapsible.Content>
  </ReasoningCollapsible.Root>
));
ReasoningGroup.displayName = "ReasoningGroup";
