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
import { floating, mono } from "./surfaces";
import { clamp } from "../utils/range";

export interface ConversationMapEntry {
  id: string;
  role: "user" | "assistant";
  title: string;
  preview?: string;
}

const TICK = '[data-slot="conversation-map-tick"]';

export function ConversationMap({
  entries,
  activeId,
  onSelect,
  side = "right",
  className,
  onKeyDown,
  ...props
}: Omit<ComponentProps<"nav">, "children" | "onSelect"> & {
  entries: readonly ConversationMapEntry[];
  activeId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  side?: "left" | "right";
}) {
  const railRef = useRef<HTMLElement>(null);
  const [handle] = useState(() =>
    PreviewCard.createHandle<ConversationMapEntry>(),
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const activeIndex = entries.findIndex((entry) => entry.id === activeId);
  const tabbableIndex = clamp(
    focusedIndex ?? (activeIndex === -1 ? 0 : activeIndex),
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
      className={cn("relative flex h-full w-6 flex-col", className)}
      {...props}
    >
      {activeIndex !== -1 && (
        <span
          data-slot="conversation-map-marker"
          aria-hidden
          style={{
            height: `${100 / entries.length}%`,
            transform: `translateY(${activeIndex * 100}%)`,
          }}
          className="pointer-events-none absolute inset-x-0 top-0 flex items-center transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        >
          <span className="bg-foreground/90 h-[3px] w-5 rounded-full" />
        </span>
      )}

      {entries.map((entry, index) => (
        <PreviewCard.Trigger
          key={entry.id}
          handle={handle}
          payload={entry}
          delay={120}
          closeDelay={80}
          render={<button type="button" />}
          data-slot="conversation-map-tick"
          aria-label={entry.title}
          aria-current={index === activeIndex ? "true" : undefined}
          tabIndex={index === tabbableIndex ? 0 : -1}
          onFocus={() => setFocusedIndex(index)}
          onClick={() => onSelect?.(entry.id)}
          className="group flex min-h-0 flex-1 items-center outline-none"
        >
          <span
            className={cn(
              "bg-foreground/20 group-hover:bg-foreground/50 group-focus-visible:bg-foreground/50 h-px rounded-full transition-colors duration-200 motion-reduce:transition-none",
              entry.role === "user" ? "w-2" : "w-3.5",
            )}
          />
        </PreviewCard.Trigger>
      ))}

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
                <span className={cn(mono, "text-foreground/40")}>
                  {payload?.role}
                </span>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug font-medium">
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
