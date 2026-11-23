"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  type Heading,
  getBlockElement,
  scrollToBlock,
  useEditorAnchor,
  useEditorScroller,
  useHeadings,
} from "./editor";
import {
  focusBorder,
  menuRowClass,
  popoverSurfaceClass,
  popupMotion,
  text,
} from "./ui";

/** The strip at the top of the page that the floating pills cover. */
const PILLS_ROOM = 64;

/** The rail's 28px, its 8px inset, and 8px clear of the page's own gutter. */
const RAIL_ROOM = 44;

const HOVER_DELAY = 150;

const NONE: ReadonlySet<string> = new Set();

/**
 * The headings on screen. Between two headings none is, so the one above
 * stands in: it is the section being read.
 */
function useInView(headings: readonly Heading[]) {
  const scroller = useEditorScroller();
  const [inView, setInView] = useState(NONE);

  useEffect(() => {
    if (!scroller || typeof IntersectionObserver === "undefined") return;
    const elements = new Map<string, HTMLElement>();
    const ids = new Map<Element, string>();
    const visible = new Set<string>();

    const publish = () => {
      let next = headings
        .filter((heading) => visible.has(heading.id))
        .map((heading) => heading.id);
      if (next.length === 0) {
        const line = scroller.getBoundingClientRect().top + PILLS_ROOM;
        const above = headings.findLast((heading) => {
          const element = elements.get(heading.id);
          return element ? element.getBoundingClientRect().top < line : false;
        });
        if (above) next = [above.id];
      }
      setInView((previous) =>
        previous.size === next.length && next.every((id) => previous.has(id))
          ? previous
          : new Set(next),
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = ids.get(entry.target);
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        publish();
      },
      { root: scroller, rootMargin: `-${PILLS_ROOM}px 0px 0px 0px` },
    );
    for (const heading of headings) {
      const element = getBlockElement(heading.id);
      if (!element) continue;
      elements.set(heading.id, element);
      ids.set(element, heading.id);
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [headings, scroller]);

  return inView;
}

/** Whether the space left of the page column can hold the rail. */
function useHasRoom() {
  const anchor = useEditorAnchor();
  const scroller = useEditorScroller();
  const [room, setRoom] = useState(false);

  useEffect(() => {
    if (!anchor || !scroller || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setRoom(
        anchor.getBoundingClientRect().left -
          scroller.getBoundingClientRect().left >=
          RAIL_ROOM,
      );
    });
    observer.observe(anchor);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [anchor, scroller]);

  return room;
}

const KEY_STEPS: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (index, count) => Math.min(index + 1, count - 1),
  ArrowUp: (index) => Math.max(index - 1, 0),
  Home: () => 0,
  End: (_index, count) => count - 1,
};

/**
 * The outline of the open page, on the left edge: one tick per heading, the
 * ones on screen darker. Hovering or focusing the rail opens the list of
 * headings; a tick or a row scrolls to its heading. The rail is one tab stop,
 * and the arrow keys move along it.
 */
export function Outline() {
  const headings = useHeadings();
  const inView = useInView(headings);
  const room = useHasRoom();
  const [focused, setFocused] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (!room || headings.length < 2) return null;

  const top = Math.min(...headings.map((heading) => heading.level));
  const tabStop =
    headings.find((heading) => heading.id === focused)?.id ??
    headings.find((heading) => inView.has(heading.id))?.id ??
    headings[0]?.id;

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    const ticks = [...event.currentTarget.querySelectorAll("button")];
    const index = ticks.findIndex((tick) => tick === document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    ticks[step(index, ticks.length)]?.focus();
  };

  const centerCurrent = () => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !current) return;
    list.scrollTop =
      current.offsetTop - list.clientHeight / 2 + current.offsetHeight / 2;
  };

  return (
    <PreviewCard.Root
      onOpenChange={(open) => {
        if (open) requestAnimationFrame(centerCurrent);
      }}
    >
      <PreviewCard.Trigger
        delay={HOVER_DELAY}
        closeDelay={HOVER_DELAY}
        render={
          <nav
            aria-label="On this page"
            className="absolute top-1/2 left-2 z-20 flex max-h-[calc(100%-13rem)] -translate-y-1/2 [scrollbar-width:none] flex-col gap-0.5 overflow-y-auto"
            onKeyDown={onKeyDown}
          />
        }
      >
        {headings.map((heading) => (
          <button
            key={heading.id}
            type="button"
            tabIndex={heading.id === tabStop ? 0 : -1}
            aria-label={heading.text}
            aria-current={inView.has(heading.id) ? "location" : undefined}
            className={cn(
              focusBorder,
              "group/tick flex h-2.5 w-7 shrink-0 items-center rounded-[3px] px-1 pointer-coarse:h-4",
            )}
            onFocus={() => setFocused(heading.id)}
            onBlur={() => setFocused(null)}
            onClick={() => scrollToBlock(heading.id)}
          >
            <span className="group-hover/tick:bg-foreground/70 h-0.5 w-3 rounded-full bg-(--tick) transition-colors duration-100 group-aria-[current=location]/tick:bg-(--tick-active) motion-reduce:transition-none" />
          </button>
        ))}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner
          side="right"
          align="center"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 outline-none"
        >
          <PreviewCard.Popup
            className={cn(popoverSurfaceClass, popupMotion, "w-64 p-1")}
          >
            <div
              ref={listRef}
              className="relative flex max-h-[min(28rem,70svh)] [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] flex-col overflow-y-auto"
            >
              {headings.map((heading) => (
                <button
                  key={heading.id}
                  type="button"
                  tabIndex={-1}
                  aria-current={inView.has(heading.id) ? "location" : undefined}
                  data-focused={heading.id === focused ? "" : undefined}
                  style={{
                    paddingInlineStart: 8 + (heading.level - top) * 12,
                  }}
                  className={cn(
                    menuRowClass,
                    text.bodySm,
                    "group/row hover:bg-accent data-focused:bg-accent",
                    heading.level > top &&
                      "text-muted-foreground hover:text-foreground aria-[current=location]:text-foreground",
                  )}
                  onClick={() => scrollToBlock(heading.id)}
                >
                  <span
                    aria-hidden
                    className="group-aria-[current=location]/row:bg-foreground size-1 shrink-0 rounded-full"
                  />
                  <span className="truncate">{heading.text}</span>
                </button>
              ))}
            </div>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
