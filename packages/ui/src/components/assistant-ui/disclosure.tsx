"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useScrollLock } from "@assistant-ui/react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export const DISCLOSURE_ANIMATION_DURATION = 200;

export type DisclosureRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  animationDuration?: number;
  lockOnClose?: boolean;
  lockOnProgrammaticClose?: boolean;
};

export function DisclosureRoot({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  animationDuration = DISCLOSURE_ANIMATION_DURATION,
  lockOnClose = true,
  lockOnProgrammaticClose = false,
  style,
  ...props
}: DisclosureRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, animationDuration);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const previousOpenRef = useRef(isOpen);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && lockOnClose) {
        lockScroll();
      }
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [controlledOnOpenChange, isControlled, lockOnClose, lockScroll],
  );

  useLayoutEffect(() => {
    if (lockOnProgrammaticClose && previousOpenRef.current && !isOpen) {
      lockScroll();
    }
    previousOpenRef.current = isOpen;
  }, [isOpen, lockOnProgrammaticClose, lockScroll]);

  const mergedStyle = useMemo(
    () =>
      ({
        "--animation-duration": `${animationDuration}ms`,
        ...(style ?? {}),
      }) as React.CSSProperties,
    [animationDuration, style],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      open={isOpen}
      onOpenChange={handleOpenChange}
      style={mergedStyle}
      {...props}
    />
  );
}

export const DISCLOSURE_CONTENT_CLASSNAME = cn(
  "relative overflow-hidden outline-none",
  "group/collapsible-content ease-out",
  "data-[state=closed]:animate-collapsible-up",
  "data-[state=open]:animate-collapsible-down",
  "data-[state=closed]:fill-mode-forwards",
  "data-[state=closed]:pointer-events-none",
  "data-[state=open]:duration-(--animation-duration)",
  "data-[state=closed]:duration-(--animation-duration)",
);

export function DisclosureContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn(DISCLOSURE_CONTENT_CLASSNAME, className)}
      {...props}
    />
  );
}
