"use client";

import {
  useCallback,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { cn } from "@/lib/utils";
import { floating } from "./surfaces";
import { clamp } from "../utils/range";

export interface ConversationMapEntry {
  id: string;
  title: string;
  preview?: string;
}

const TICK = '[data-slot="conversation-map-tick"]';

export function ConversationMap({
  entries,
  activeId,
  visibleIds,
  onSelect,
  side = "right",
  className,
  onKeyDown,
  ...props
}: Omit<ComponentProps<"nav">, "children" | "onSelect"> & {
  entries: readonly ConversationMapEntry[];
  activeId?: string | undefined;
  visibleIds?: readonly string[] | undefined;
  onSelect?: ((id: string) => void) | undefined;
  side?: "left" | "right";
}) {
  const railRef = useRef<HTMLElement>(null);
  const [handle] = useState(() =>
    PreviewCard.createHandle<ConversationMapEntry>(),
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const inView = new Set(visibleIds);
  const activeIndex = entries.findIndex((entry) => entry.id === activeId);
  const tabbableIndex = clamp(
    focusedIndex ?? Math.max(0, activeIndex),
    0,
    Math.max(0, entries.length - 1),
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const ticks = railRef.current?.querySelectorAll<HTMLElement>(TICK);
      if (!ticks?.length) return;

      const current = Array.prototype.indexOf.call(ticks, event.target);
      if (current === -1) return;

      const next = {
        ArrowUp: current - 1,
        ArrowDown: current + 1,
        Home: 0,
        End: ticks.length - 1,
      }[event.key];
      if (next === undefined) return;

      event.preventDefault();
      ticks[clamp(next, 0, ticks.length - 1)]?.focus();
    },
    [onKeyDown],
  );

  return (
    <nav
      data-slot="conversation-map"
      ref={railRef}
      aria-label="Conversation map"
      onKeyDown={handleKeyDown}
      className={cn(
        "group/rail flex h-full w-6 flex-col justify-center",
        className,
      )}
      {...props}
    >
      {entries.map((entry, index) => {
        const current = index === activeIndex;
        const onScreen = current || inView.has(entry.id);
        return (
          <PreviewCard.Trigger
            key={entry.id}
            handle={handle}
            payload={entry}
            delay={120}
            closeDelay={80}
            render={<button type="button" />}
            data-slot="conversation-map-tick"
            data-active={current ? "" : undefined}
            data-in-view={onScreen ? "" : undefined}
            aria-label={entry.title}
            aria-current={current ? "true" : undefined}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onFocus={() => setFocusedIndex(index)}
            onClick={() => onSelect?.(entry.id)}
            // The cap keeps a short thread packed instead of spread over the
            // whole gutter; a long one outgrows it and the share decides.
            className="group flex max-h-3.5 min-h-0 flex-1 items-center outline-none"
          >
            {/* At rest every tick is the same short length and only weight and
                depth separate the tiers. Pointing at the rail grows them out by
                tier, and the one actually under the pointer reaches full length
                so the rail says which turn the card belongs to. */}
            <span
              className={cn(
                "w-3 rounded-full transition-[width,height,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                current
                  ? "bg-foreground/90 h-[3px] group-focus-within/rail:w-6 group-hover/rail:w-6"
                  : cn(
                      "group-hover:bg-foreground/70 group-focus-visible:bg-foreground/70 h-0.5",
                      "group-hover:w-6! group-focus-visible:w-6!",
                      onScreen
                        ? "bg-foreground/50 group-focus-within/rail:w-[18px] group-hover/rail:w-[18px]"
                        : "bg-foreground/15",
                    ),
              )}
            />
          </PreviewCard.Trigger>
        );
      })}

      <PreviewCard.Root handle={handle}>
        {({ payload }) => (
          <PreviewCard.Portal>
            <PreviewCard.Positioner side={side} sideOffset={10}>
              <PreviewCard.Popup
                className={cn(
                  floating,
                  "z-50 w-60 origin-(--transform-origin) rounded-2xl p-3.5 outline-none",
                  "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
                  "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
                )}
              >
                <p className="line-clamp-2 text-[13px] leading-snug font-medium">
                  {payload?.title}
                </p>
                {payload?.preview && (
                  <p className="text-foreground/50 mt-1 line-clamp-3 text-[13px] leading-relaxed">
                    {payload.preview}
                  </p>
                )}
              </PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        )}
      </PreviewCard.Root>
    </nav>
  );
}
