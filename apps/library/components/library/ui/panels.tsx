"use client";

import * as React from "react";
import {
  Cancel01Icon,
  LayoutAlignBottomIcon,
  LayoutAlignLeftIcon,
  LayoutAlignRightIcon,
  SidebarBottomIcon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Layout, LayoutChangedMeta } from "react-resizable-panels";
import { usePanelRef } from "react-resizable-panels";

import { useIsMobile } from "@/hooks/use-mobile";
import { buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { readStored, writeStored } from "@/lib/library/persisted-state";
import { cn } from "@/lib/utils";

/*
 * Panels: Ellie's app layout. A main area with up to three collapsible
 * panels (left, right, bottom) built from Resizable, each with a 40px header
 * and its own show/hide toggle. ⌘B, ⌘I and ⌘J toggle them; dragging a panel
 * past its minimum snaps it shut. On a phone the left and right panels become
 * Sheets. Not a shadcn component: its API is its own.
 *
 * Look: panels on `background`, split by Resizable's hairlines. Toggles are `icon-sm` Buttons: ghost with a grey
 * icon, or `secondary` while the right or bottom panel is open; each has a
 * Tooltip with its shortcut in a Kbd. Header titles are 14px at 430. A glass
 * main header lets the content scroll under it. Opening and closing ease the
 * panel's size over 200ms with `ease-move`; reduced motion snaps. No rings.
 *
 * With a `storageKey`, which panels are open and how wide each was dragged
 * are kept in localStorage, so a reload comes back to the same layout, and a
 * reopened panel comes back at the size it was closed at.
 */

type Side = "left" | "right" | "bottom";

const SIDES: readonly Side[] = ["left", "right", "bottom"];

/** What a `storageKey` keeps: each panel's open state and pixel size. */
type StoredPanels = {
  open: Partial<Record<Side, boolean>>;
  size: Partial<Record<Side, string>>;
};

function parseStoredPanels(stored: unknown): StoredPanels | undefined {
  if (!stored || typeof stored !== "object") return undefined;
  const { open, size } = stored as Record<string, unknown>;
  const result: StoredPanels = { open: {}, size: {} };
  for (const side of SIDES) {
    const isOpen = (open as Record<string, unknown> | undefined)?.[side];
    if (typeof isOpen === "boolean") result.open[side] = isOpen;
    const px = (size as Record<string, unknown> | undefined)?.[side];
    if (typeof px === "string" && /^\d+px$/.test(px)) result.size[side] = px;
  }
  return result;
}

// `fill` is whether a panel's toggle takes a fill while the panel is open.
const PANELS = {
  left: {
    title: "",
    name: "left",
    size: ["18rem", "12rem", "28rem"],
    key: "b",
    openIcon: SidebarLeftIcon,
    closedIcon: LayoutAlignLeftIcon,
    fill: false,
  },
  right: {
    title: "",
    name: "right",
    size: ["24rem", "16rem", "42rem"],
    key: "i",
    openIcon: SidebarRightIcon,
    closedIcon: LayoutAlignRightIcon,
    fill: true,
  },
  bottom: {
    title: "",
    name: "bottom",
    size: ["16rem", "8rem", "70%"],
    key: "j",
    openIcon: SidebarBottomIcon,
    closedIcon: LayoutAlignBottomIcon,
    fill: true,
  },
} as const;

// The system's motion tokens: expand and collapse take `duration-200` with
// `ease-move`.
const DURATION = 200;
const EASE_MOVE = "cubic-bezier(0.4, 0, 0.2, 1)";

type PanelsContextValue = {
  isOpen: (side: Side) => boolean;
  toggle: (side: Side) => void;
  /** Closes a side panel's sheet on a phone. Does nothing on a wide screen. */
  closeSheet: () => void;
};

const PanelsContext = React.createContext<PanelsContextValue | null>(null);

function usePanels() {
  const context = React.useContext(PanelsContext);
  if (!context) throw new Error("usePanels must be used within <Panels>.");
  return context;
}

function PanelToggle({ side, close = false }: { side: Side; close?: boolean }) {
  const { isOpen, toggle } = usePanels();
  const { name, key, openIcon, closedIcon, fill } = PANELS[side];
  const open = isOpen(side);
  const label = `${open ? "Hide" : "Show"} ${name} panel`;
  const filled = open && !close && fill;

  return (
    <Tooltip>
      <TooltipTrigger
        data-slot="panel-toggle"
        aria-pressed={close ? undefined : open}
        onClick={() => toggle(side)}
        className={cn(
          buttonVariants({
            variant: filled ? "secondary" : "ghost",
            size: "icon-sm",
          }),
          !filled &&
            "[&_svg]:text-muted-foreground hover:[&_svg]:text-foreground",
        )}
      >
        {/* Keyed so the glyph remounts as it swaps. */}
        <HugeiconsIcon
          key={String(open)}
          icon={close ? Cancel01Icon : open ? openIcon : closedIcon}
          strokeWidth={1.5}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        <Kbd>⌘{key.toUpperCase()}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function PanelHeader({
  title,
  start,
  end,
  glass = false,
}: {
  title: React.ReactNode;
  start?: React.ReactNode;
  end?: React.ReactNode;
  /** Lays the header over the panel's top edge, so the body scrolls under it. */
  glass?: boolean;
}) {
  return (
    <header
      data-slot="panel-header"
      className={cn(
        "bg-background text-foreground flex h-10 shrink-0 items-center gap-2 px-2 font-sans text-sm/5 font-normal",
        glass &&
          "bg-popover supports-[backdrop-filter]:bg-glass [@media(prefers-reduced-transparency:reduce)]:bg-popover absolute inset-x-0 top-0 z-[var(--z-sticky,20)] supports-[backdrop-filter]:backdrop-blur-(--glass-blur) [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none",
      )}
    >
      {start}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {typeof title === "string" && title ? (
          <span className="font-strong text-foreground min-w-0 truncate px-1">
            {title}
          </span>
        ) : (
          title
        )}
      </div>
      {end ? (
        <div className="flex shrink-0 items-center gap-1">{end}</div>
      ) : null}
    </header>
  );
}

// Collapses rather than unmounting: an unmounted panel hands its space to a
// neighbour, which can throw the other side out to its largest size. The
// handle is disabled, not removed, or the library lets the gap be dragged.
function CollapsiblePanel({
  side,
  open,
  sizes,
  restored,
  children,
}: {
  side: Side;
  open: boolean;
  /** The last size each panel was open at, which opening goes back to. */
  sizes: React.RefObject<Partial<Record<Side, string>>>;
  /** Goes up when a stored layout is read, so an open panel takes its size. */
  restored: number;
  children: React.ReactNode;
}) {
  const panelRef = usePanelRef();
  const elementRef = React.useRef<HTMLDivElement>(null);
  const [defaultSize, minSize, maxSize] = PANELS[side].size;

  // Only a change of `open`, or a stored layout, moves the panel, so a drag
  // that closes it isn't echoed back as an expand.
  const syncedRef = React.useRef<boolean | null>(null);
  const restoredRef = React.useRef(restored);
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (syncedRef.current === open && restoredRef.current === restored) return;
    syncedRef.current = open;
    restoredRef.current = restored;
    if (open) panel.resize(sizes.current[side] ?? defaultSize);
    else panel.collapse();
  }, [open, restored, panelRef, sizes, side, defaultSize]);

  // A closed panel can't be reached by Tab. Set as an attribute so it works
  // the same in React 18 and 19.
  React.useEffect(() => {
    elementRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  const handle = (
    <ResizableHandle
      disabled={!open}
      className={cn(!open && "pointer-events-none invisible")}
    />
  );

  // `defaultSize` and `minSize` are only read on mount, so they have to agree
  // with the first render.
  const panel = (
    <ResizablePanel
      id={`panel-${side}`}
      panelRef={panelRef}
      elementRef={elementRef}
      collapsible
      collapsedSize={0}
      defaultSize={open ? defaultSize : 0}
      minSize={open ? minSize : 0}
      maxSize={maxSize}
      groupResizeBehavior="preserve-pixel-size"
      // Positioned, so a closed panel also clips what's absolute inside it
      // (a toggle's screen-reader label), which would otherwise stretch the
      // page.
      className="bg-background relative flex flex-col"
      style={{ overflow: "hidden" }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={
          side === "bottom" ? { minHeight: minSize } : { minWidth: minSize }
        }
      >
        {children}
      </div>
    </ResizablePanel>
  );

  return side === "left" ? (
    <>
      {panel}
      {handle}
    </>
  ) : (
    <>
      {handle}
      {panel}
    </>
  );
}

function PanelBody({
  scroll = true,
  children,
}: {
  scroll?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="panel-body"
      className={cn(
        "min-h-0 flex-1",
        scroll
          ? "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] overflow-auto"
          : "flex flex-col overflow-hidden",
      )}
    >
      {children}
    </div>
  );
}

function PanelSheet({
  side,
  header,
  toggleAt = "end",
  open,
  onOpenChange,
  children,
}: {
  side: "left" | "right";
  header?: React.ReactNode;
  toggleAt?: "start" | "end" | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { title, name } = PANELS[side];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className="bg-background text-foreground gap-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title || name} panel</SheetTitle>
          <SheetDescription>
            Slides over the page on small screens.
          </SheetDescription>
        </SheetHeader>
        <PanelHeader
          title={header === undefined ? title : header}
          {...{ [toggleAt]: <PanelToggle side={side} close /> }}
        />
        <PanelBody>{children}</PanelBody>
      </SheetContent>
    </Sheet>
  );
}

// Only on while a toggle animates, since a drag has to follow the pointer.
const ANIMATING =
  "data-animating:*:transition-[flex-grow] data-animating:*:duration-[var(--duration-200,200ms)] data-animating:*:ease-[var(--ease-move,cubic-bezier(0.4,0,0.2,1))] motion-reduce:*:transition-none";

// A drag past a panel's minimum snaps it shut, or open again, in one step. A
// CSS transition can't be switched on in time for that step without also
// dragging behind the pointer, so the snap is played back from the sizes on
// either side of it.
function useSnapAnimation(skip: React.RefObject<boolean>) {
  const groupRef = React.useRef<HTMLDivElement>(null);
  const layoutRef = React.useRef<Layout | null>(null);

  const onLayoutChange = (layout: Layout) => {
    const previous = layoutRef.current;
    layoutRef.current = layout;
    const group = groupRef.current;
    if (!previous || !group || skip.current) return;

    const snapped = Object.keys(layout).some(
      (id) => (previous[id] ?? 0) > 0 !== (layout[id] ?? 0) > 0,
    );
    if (!snapped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const id of Object.keys(layout)) {
      const panel = group.querySelector<HTMLElement>(`:scope > [id="${id}"]`);
      if (!panel || previous[id] === undefined) continue;
      panel.getAnimations().forEach((animation) => animation.cancel());
      panel.animate([{ flexGrow: previous[id] }, { flexGrow: layout[id] }], {
        duration: DURATION,
        easing: EASE_MOVE,
      });
    }
  };

  return { elementRef: groupRef, onLayoutChange };
}

function Panels({
  left,
  right,
  bottom,
  headers = {},
  glassHeader = false,
  toggleAt = {},
  toggles = {},
  defaultOpen = { left: true, right: false, bottom: false },
  storageKey,
  className,
  children,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  bottom?: React.ReactNode;
  /** What each header shows in place of the panel's name. */
  headers?: Partial<Record<Side | "main", React.ReactNode>>;
  /** Main content scrolls under its header, so it must pad its own top 40px. */
  glassHeader?: boolean;
  /** "end" by default, or "start", ahead of whatever `headers` gives it. */
  toggleAt?: Partial<Record<Side, "start" | "end">>;
  /**
   * Which panels' show buttons the other headers leave off. Each has one by
   * default. Its shortcut still opens it, and once open it keeps its own.
   */
  toggles?: Partial<Record<Side, boolean>>;
  defaultOpen?: Partial<Record<Side, boolean>>;
  /** Where in localStorage to keep the layout across reloads. */
  storageKey?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const hasLeft = left != null;
  const hasRight = right != null;
  const hasBottom = bottom != null;
  const has = React.useMemo(
    () => ({ left: hasLeft, right: hasRight, bottom: hasBottom }),
    [hasLeft, hasRight, hasBottom],
  );
  const [open, setOpen] = React.useState({
    left: false,
    right: false,
    bottom: false,
    ...defaultOpen,
  });
  // The side sheet that is up, on a phone. It is separate from the rails so a
  // sheet never pops open by itself on the way down from a wide screen.
  const [sheet, setSheet] = React.useState<"left" | "right" | null>(null);
  const [animating, setAnimating] = React.useState(false);
  // Read by the snap animation, which a toggle's own transition already covers.
  const animatingRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timerRef.current), []);
  const rowSnap = useSnapAnimation(animatingRef);
  const columnSnap = useSnapAnimation(animatingRef);

  // The stored layout is read after hydration, so the server's render and the
  // first client render agree, and applied before the next paint.
  const sizesRef = React.useRef<Partial<Record<Side, string>>>({});
  const openRef = React.useRef(open);
  openRef.current = open;
  const loadedRef = React.useRef(false);
  const [restored, setRestored] = React.useState(0);
  const save = React.useCallback(() => {
    if (!storageKey || !loadedRef.current) return;
    writeStored(storageKey, {
      open: openRef.current,
      size: sizesRef.current,
    } satisfies StoredPanels);
  }, [storageKey]);

  // Read once: Strict Mode runs this twice, after a save has already run.
  const storedRef = React.useRef<StoredPanels | null | undefined>(undefined);
  React.useLayoutEffect(() => {
    if (!storageKey) return;
    if (storedRef.current === undefined)
      storedRef.current = parseStoredPanels(readStored(storageKey)) ?? null;
    const stored = storedRef.current;
    if (stored) {
      sizesRef.current = { ...sizesRef.current, ...stored.size };
      // Saves before the next render must already see the stored state.
      openRef.current = { ...openRef.current, ...stored.open };
      // Coming back isn't a toggle: no snap, no transition.
      clearTimeout(timerRef.current);
      animatingRef.current = true;
      timerRef.current = setTimeout(() => {
        animatingRef.current = false;
      }, DURATION);
      setOpen((current) => ({ ...current, ...stored.open }));
      setRestored((count) => count + 1);
    }
    loadedRef.current = true;
  }, [storageKey]);

  React.useEffect(save, [open, save]);

  const panelProps = { sizes: sizesRef, restored };

  const value = React.useMemo<PanelsContextValue>(
    () => ({
      isOpen: (side) =>
        isMobile && side !== "bottom" ? sheet === side : open[side],
      toggle: (side) => {
        if (isMobile && side !== "bottom") {
          setSheet((current) => (current === side ? null : side));
          return;
        }
        clearTimeout(timerRef.current);
        setAnimating(true);
        animatingRef.current = true;
        timerRef.current = setTimeout(() => {
          setAnimating(false);
          animatingRef.current = false;
        }, DURATION);
        setOpen((current) => ({ ...current, [side]: !current[side] }));
      },
      closeSheet: () => setSheet(null),
    }),
    [isMobile, open, sheet],
  );

  // Growing past a phone's width drops the sheets; forget them too, or
  // shrinking back would bring one straight back.
  if (!isMobile && sheet) setSheet(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return;
      const side = (Object.keys(PANELS) as Side[]).find(
        // Some keydowns carry no key, such as the ones autofill sends.
        (side) => has[side] && PANELS[side].key === event.key?.toLowerCase(),
      );
      if (!side) return;
      event.preventDefault();
      value.toggle(side);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value, has]);

  // A drag or a resize key can close a panel, or open a closed one, so the
  // state follows the layout whenever the person, not the code, changed it.
  const syncFrom =
    (sides: Side[]) =>
    (layout: Layout, { isUserInteraction }: LayoutChangedMeta) => {
      if (!isUserInteraction) return;
      // Keep each open panel's size in pixels, which is what it was dragged
      // to. One dragged shut forgets it and reopens at its default.
      const group = (sides.includes("bottom") ? columnSnap : rowSnap).elementRef
        .current;
      const axis = sides.includes("bottom")
        ? group?.offsetHeight
        : group?.offsetWidth;
      const sizes = { ...sizesRef.current };
      for (const side of sides) {
        const share = layout[`panel-${side}`] ?? 0;
        if (share > 0 && axis)
          sizes[side] = `${Math.round((axis * share) / 100)}px`;
        else delete sizes[side];
      }
      sizesRef.current = sizes;
      save();
      setOpen((current) => {
        const next = { ...current };
        for (const side of sides) {
          if (has[side]) next[side] = (layout[`panel-${side}`] ?? 0) > 0;
        }
        return next;
      });
    };

  const leftOpen = open.left && !isMobile;
  const rightOpen = open.right && !isMobile;
  const shows = (side: Side) => has[side] && toggles[side] !== false;
  const bottomToggle = shows("bottom") ? <PanelToggle side="bottom" /> : null;

  return (
    <PanelsContext.Provider value={value}>
      <ResizablePanelGroup
        data-slot="panels"
        data-animating={animating || undefined}
        {...rowSnap}
        onLayoutChanged={syncFrom(isMobile ? [] : ["left", "right"])}
        className={cn("bg-background h-svh", ANIMATING, className)}
      >
        {has.left ? (
          <CollapsiblePanel side="left" open={leftOpen} {...panelProps}>
            <PanelHeader
              title={"left" in headers ? headers.left : PANELS.left.title}
              {...{ [toggleAt.left ?? "end"]: <PanelToggle side="left" /> }}
            />
            {/* On a phone `left` is in its sheet, so it isn't mounted twice. */}
            <PanelBody>{isMobile ? null : left}</PanelBody>
          </CollapsiblePanel>
        ) : null}
        <ResizablePanel id="panel-content">
          <ResizablePanelGroup
            orientation="vertical"
            data-animating={animating || undefined}
            {...columnSnap}
            onLayoutChanged={syncFrom(["bottom"])}
            className={ANIMATING}
          >
            <ResizablePanel
              id="panel-main"
              className={cn("flex flex-col", glassHeader && "relative isolate")}
              style={{ overflow: "hidden" }}
            >
              <PanelHeader
                title={headers.main}
                glass={glassHeader}
                start={
                  shows("left") && !leftOpen ? (
                    <PanelToggle side="left" />
                  ) : null
                }
                end={
                  rightOpen ? null : (
                    <>
                      {bottomToggle}
                      {shows("right") ? <PanelToggle side="right" /> : null}
                    </>
                  )
                }
              />
              <PanelBody scroll={false}>{children}</PanelBody>
            </ResizablePanel>
            {has.bottom ? (
              <CollapsiblePanel
                side="bottom"
                open={open.bottom}
                {...panelProps}
              >
                <PanelHeader
                  title={headers.bottom ?? PANELS.bottom.title}
                  {...{
                    [toggleAt.bottom ?? "end"]: (
                      <PanelToggle side="bottom" close />
                    ),
                  }}
                />
                <PanelBody>{bottom}</PanelBody>
              </CollapsiblePanel>
            ) : null}
          </ResizablePanelGroup>
        </ResizablePanel>
        {has.right ? (
          <CollapsiblePanel side="right" open={rightOpen} {...panelProps}>
            <PanelHeader
              title={headers.right ?? PANELS.right.title}
              start={
                toggleAt.right === "start" ? <PanelToggle side="right" /> : null
              }
              end={
                <>
                  {bottomToggle}
                  {toggleAt.right === "start" ? null : (
                    <PanelToggle side="right" />
                  )}
                </>
              }
            />
            <PanelBody>{isMobile ? null : right}</PanelBody>
          </CollapsiblePanel>
        ) : null}
      </ResizablePanelGroup>

      {isMobile ? (
        <>
          {has.left ? (
            <PanelSheet
              side="left"
              header={headers.left}
              toggleAt={toggleAt.left}
              open={sheet === "left"}
              onOpenChange={(next) => setSheet(next ? "left" : null)}
            >
              {left}
            </PanelSheet>
          ) : null}
          {has.right ? (
            <PanelSheet
              side="right"
              header={headers.right}
              toggleAt={toggleAt.right}
              open={sheet === "right"}
              onOpenChange={(next) => setSheet(next ? "right" : null)}
            >
              {right}
            </PanelSheet>
          ) : null}
        </>
      ) : null}
    </PanelsContext.Provider>
  );
}

export { Panels, usePanels };
