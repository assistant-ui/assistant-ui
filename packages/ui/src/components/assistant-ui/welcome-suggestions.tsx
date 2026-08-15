"use client";

import {
  ThreadPrimitive,
  unstable_useComposerInputPluginRegistry,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRightIcon, CornerDownLeftIcon, XIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useDirection } from "@base-ui/react/direction-provider";
import { cn } from "@/lib/utils";

export type SuggestionItem = {
  label: string;
  prompt?: string;
  icon?: ReactNode;
};

export type SuggestionGroup = {
  label: string;
  icon?: ReactNode;
  suggestions: readonly SuggestionItem[];
};

export type SuggestionEntry = SuggestionItem | SuggestionGroup;

type RawSuggestion =
  | SuggestionEntry
  | { title: string; label: string; prompt: string };

const isGroup = (entry: SuggestionEntry): entry is SuggestionGroup =>
  "suggestions" in entry;

const promptOf = (item: SuggestionItem) => item.prompt ?? item.label;

// Legacy runtime suggestions split one display sentence across title and
// label; string configs land as title with an empty label.
const normalizeItem = (raw: RawSuggestion): SuggestionEntry =>
  "title" in raw
    ? {
        label: [raw.title, raw.label].filter(Boolean).join(" "),
        prompt: raw.prompt,
      }
    : raw;

// Tailwind's scanner needs the `has-[~[data-slot*=composer]]` class literals
// below spelled out verbatim, so their copies of this selector cannot
// reference the constant; keep them in sync by hand.
const COMPOSER_SELECTOR = '[data-slot*="composer"]';

// The suggestions and the composer are detached siblings, so the input is
// found through the DOM rather than context.
const findComposerInput = (from: Element | null) => {
  for (let el = from?.parentElement ?? null; el; el = el.parentElement) {
    const input = el.querySelector<HTMLTextAreaElement>(
      `${COMPOSER_SELECTOR} textarea`,
    );
    if (input) return input;
  }
  return null;
};

// Reads the same sibling relation the styles read with
// `has-[~[data-slot*=composer]]`, so the mirrored arrow directions and the
// flipped layout can never disagree.
const composerFollows = (from: Element | null) => {
  const root = from?.closest('[data-slot="aui_thread-welcome-suggestions"]');
  for (let el = root?.nextElementSibling; el; el = el.nextElementSibling) {
    if (el.matches(COMPOSER_SELECTOR)) return true;
  }
  return false;
};

// Physical keys resolve to layout-independent intents in one place: vertical
// arrows depend on whether the composer follows the list, the inline arrow on
// text direction. Every handler below works in these intents.
type LogicalKey =
  | "towardList"
  | "towardComposer"
  | "forward"
  | "back"
  | "enter"
  | "escape"
  | "tab";

const ACTION_KEYS: Record<string, LogicalKey> = {
  Enter: "enter",
  Escape: "escape",
  Tab: "tab",
};

const resolveKey = (
  key: string,
  composerAfter: boolean,
  rtl: boolean,
): LogicalKey | null => {
  if (key === "ArrowDown" || key === "ArrowUp") {
    return (key === "ArrowUp") === composerAfter
      ? "towardList"
      : "towardComposer";
  }
  if (key === "ArrowRight" || key === "ArrowLeft") {
    return (key === "ArrowLeft") === rtl ? "forward" : "back";
  }
  return ACTION_KEYS[key] ?? null;
};

const pillClass =
  "text-foreground hover:bg-muted border-border/60 inline-flex h-auto items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors [&_svg]:size-4";

const welcomeSuggestionRowVariants = cva(
  "group/row text-foreground/80 hover:text-foreground data-[highlighted]:text-foreground relative flex w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm [&_svg]:size-4",
  {
    variants: {
      highlight: {
        ghost: "data-[highlighted]:bg-muted/70",
        text: "[&[data-highlighted]_svg:last-child]:opacity-80",
      },
      density: {
        comfortable: "py-3",
        compact: "py-2",
      },
      separators: {
        true: "after:border-border/50 after:pointer-events-none after:absolute after:inset-x-[1.5%] after:bottom-0 after:border-b last:after:hidden",
        false: "",
      },
    },
    // ghost's fill collides with the separators touching the highlighted row.
    compoundVariants: [
      {
        highlight: "ghost",
        separators: true,
        className:
          "data-[highlighted]:after:hidden [&:has(+[data-highlighted])]:after:hidden",
      },
    ],
    defaultVariants: {
      highlight: "ghost",
      density: "comfortable",
      separators: true,
    },
  },
);

export type IconReveal = "always" | "hover" | "off";

// The trailing row icons; swap these to customize.
const GroupIcon = ChevronRightIcon;
const ItemIcon = CornerDownLeftIcon;

const trailingClass = {
  always: "text-muted-foreground ml-auto size-4 opacity-50",
  // The row highlight tracks hover and arrow keys alike, so hover-reveal
  // follows keyboard navigation too.
  hover:
    "text-muted-foreground ml-auto size-4 opacity-0 group-data-[highlighted]/row:opacity-50",
};

type NavState = {
  /** Index of the open group within entries, or null at the top level. */
  group: number | null;
  /** Id of the highlighted row in the current level, or null. */
  active: string | null;
  /** The composer keeps DOM focus while arrows move this highlight. */
  virtual: boolean;
  /** The highlight was last moved by keyboard; only then does it preview. */
  keyboard: boolean;
};

const NAV_IDLE: NavState = {
  group: null,
  active: null,
  virtual: false,
  keyboard: false,
};

type RowRecord = { id: string; prompt: string; el: HTMLElement };

type GroupKeySurface = {
  onEscape?: (() => void) | undefined;
  onTab?: (() => void) | undefined;
  onExitEdge?: (() => void) | undefined;
};

// All navigation logic lives in this plain controller. It reads volatile
// values through refs, so every method is stable for the component lifetime
// and event handlers never close over stale state.
const createNavController = ({
  navRef,
  entriesRef,
  composerAfter,
  rowEls,
  setNav,
  popoverId,
  registry,
  acceptPrompt,
  caretAtEnd,
  caretAtStart,
}: {
  navRef: RefObject<NavState>;
  entriesRef: RefObject<readonly SuggestionEntry[]>;
  composerAfter: () => boolean;
  rowEls: RefObject<(HTMLElement | null)[]>;
  setNav: (update: (prev: NavState) => NavState) => void;
  popoverId: string;
  registry: ReturnType<typeof unstable_useComposerInputPluginRegistry>;
  acceptPrompt: (prompt: string) => boolean;
  caretAtEnd: () => boolean;
  caretAtStart: () => boolean;
}) => {
  // Group items register themselves so custom picker children take part in
  // navigation without the list scraping the DOM.
  const records = new Set<RowRecord>();

  const rowId = (index: number) => `${popoverId}t${index}`;

  // The active list: registered group items while a group is open, otherwise
  // the top-level entries addressed by their deterministic row ids.
  const rows = (): {
    id: string;
    entry?: SuggestionEntry;
    prompt: string | null;
    el: HTMLElement | null;
  }[] => {
    if (navRef.current.group !== null) {
      return Array.from(records).sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      );
    }
    return entriesRef.current.map((entry, index) => ({
      id: rowId(index),
      entry,
      prompt: isGroup(entry) ? null : promptOf(entry),
      el: rowEls.current[index] ?? null,
    }));
  };

  const activeRow = () => {
    const active = navRef.current.active;
    return active === null
      ? undefined
      : rows().find((row) => row.id === active);
  };

  const exitToIdle = () =>
    setNav((prev) =>
      prev.active === null && !prev.virtual
        ? prev
        : { ...prev, active: null, virtual: false, keyboard: false },
    );

  const close = () => setNav(() => NAV_IDLE);

  const openGroup = (group: SuggestionGroup) => {
    const index = entriesRef.current.indexOf(group);
    if (index === -1) return;
    setNav(() => ({
      group: index,
      active: null,
      virtual: true,
      keyboard: true,
    }));
    registry?.requestFocus();
  };

  const returnToTop = () => {
    const groupIndex = navRef.current.group;
    if (groupIndex === null) return close();
    setNav(() => ({
      group: null,
      active: rowId(groupIndex),
      virtual: true,
      keyboard: true,
    }));
    registry?.requestFocus();
  };

  // Same-row moves are ignored: a ghost preview can resize the composer, and
  // Chrome refires mousemove under a stationary cursor when rows shift.
  const highlightPointer = (id: string) =>
    setNav((prev) =>
      prev.active === id ? prev : { ...prev, active: id, keyboard: false },
    );

  const clearHighlight = () =>
    setNav((prev) =>
      prev.active === null ? prev : { ...prev, active: null, keyboard: false },
    );

  const focusList = () =>
    setNav((prev) => ({
      group: prev.group,
      active:
        prev.active ??
        rowId(composerAfter() ? entriesRef.current.length - 1 : 0),
      virtual: false,
      keyboard: true,
    }));

  const acceptActive = () => {
    const prompt = activeRow()?.prompt;
    return prompt == null ? false : acceptPrompt(prompt);
  };

  const isGroupOpen = () => navRef.current.group !== null;
  const caretAtComposerEdge = () =>
    composerAfter() ? caretAtStart() : caretAtEnd();

  // The top level clamps at the far edge and exits at the composer edge; the
  // composer edge row is index 0 unless the layout is flipped.
  const handleTopKey = (
    key: LogicalKey,
    source: "composer" | "list",
  ): boolean => {
    const list = rows();
    if (list.length === 0) return false;
    const nearIndex = composerAfter() ? list.length - 1 : 0;
    const activeIndex = list.findIndex(
      (row) => row.id === navRef.current.active,
    );
    const deeper = composerAfter() ? -1 : 1;

    const highlight = (index: number) =>
      setNav((prev) => ({
        ...prev,
        active: list[index]!.id,
        virtual: source === "composer",
        keyboard: true,
      }));
    const clamp = (index: number) =>
      Math.min(Math.max(index, 0), list.length - 1);

    switch (key) {
      case "towardList":
        if (activeIndex !== -1) highlight(clamp(activeIndex + deeper));
        else if (source === "list" || caretAtComposerEdge()) {
          highlight(nearIndex);
        } else return false;
        return true;
      case "towardComposer":
        if (activeIndex !== -1 && activeIndex !== nearIndex) {
          highlight(clamp(activeIndex - deeper));
        } else if (source === "list") registry?.requestFocus();
        else if (activeIndex === -1) return false;
        else exitToIdle();
        return true;
      case "forward":
      case "enter": {
        const entry = list[activeIndex]?.entry;
        if (!entry) return false;
        if (isGroup(entry)) openGroup(entry);
        else if (key === "enter") list[activeIndex]!.el?.click();
        else if (!acceptActive()) return false;
        else if (source === "list") registry?.requestFocus();
        return true;
      }
      case "escape":
        if (source !== "composer" || activeIndex === -1) return false;
        exitToIdle();
        return true;
      default:
        return false;
    }
  };

  // Group navigation wraps at the far edge; the composer edge climbs out a
  // level when the surface provides an exit.
  const handleGroupKey = (
    key: LogicalKey,
    surface: GroupKeySurface,
  ): boolean => {
    const list = rows();
    const activeIndex = list.findIndex(
      (row) => row.id === navRef.current.active,
    );
    const nearEdge = composerAfter() ? list.length - 1 : 0;
    const deeper = composerAfter() ? -1 : 1;

    const highlightWrapped = (delta: number) => {
      if (list.length === 0) return;
      const next =
        delta === 1
          ? activeIndex >= list.length - 1
            ? 0
            : activeIndex + 1
          : activeIndex <= 0
            ? list.length - 1
            : activeIndex - 1;
      setNav((prev) => ({ ...prev, active: list[next]!.id, keyboard: true }));
    };

    switch (key) {
      case "towardList":
        highlightWrapped(deeper);
        return true;
      case "towardComposer":
        if (
          surface.onExitEdge &&
          (activeIndex === -1 || activeIndex === nearEdge)
        ) {
          surface.onExitEdge();
        } else highlightWrapped(-deeper);
        return true;
      case "forward":
        return navRef.current.active !== null && acceptActive();
      case "enter":
        if (navRef.current.active === null) return false;
        activeRow()?.el?.click();
        return true;
      case "escape":
        (surface.onEscape ?? close)();
        return true;
      case "tab":
        if (surface.onTab) {
          surface.onTab();
          return true;
        }
        close();
        return false;
      default:
        return false;
    }
  };

  return {
    registerRow: (row: RowRecord) => {
      records.add(row);
      return () => void records.delete(row);
    },
    rowId,
    activeRow,
    exitToIdle,
    close,
    openGroup,
    returnToTop,
    highlightPointer,
    clearHighlight,
    focusList,
    composerAfter,
    isGroupOpen,
    caretAtComposerEdge,
    handleTopKey,
    handleGroupKey,
  };
};

const useWelcomeSuggestionsState = ({
  suggestions,
  send,
}: {
  suggestions: readonly SuggestionEntry[] | undefined;
  send: boolean;
}) => {
  const registry = unstable_useComposerInputPluginRegistry();
  const aui = useAui();
  const staticSuggestions = useAuiState((s) => s.suggestions.suggestions);
  const composerText = useAuiState((s) => s.composer.text);
  const popoverId = useId();

  const entries = useMemo(
    () => (suggestions ?? staticSuggestions).map(normalizeItem),
    [suggestions, staticSuggestions],
  );

  const [nav, setNav] = useState<NavState>(NAV_IDLE);
  const navRef = useRef(nav);
  navRef.current = nav;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const rowEls = useRef<(HTMLElement | null)[]>([]);
  const pillEls = useRef<(HTMLButtonElement | null)[]>([]);
  const posRef = useRef(0);

  const [ctl] = useState(() =>
    createNavController({
      navRef,
      entriesRef,
      composerAfter: () => composerFollows(rootRef.current),
      rowEls,
      setNav,
      popoverId,
      registry,
      acceptPrompt: (prompt) => {
        if (aui.composer().getState().text) return false;
        aui.composer().setText(prompt);
        return true;
      },
      // Lexical's reported caret offset can overshoot the synced text around
      // empty leading lines, so the end comparison is lenient.
      caretAtEnd: () => posRef.current >= aui.composer().getState().text.length,
      caretAtStart: () => posRef.current <= 0,
    }),
  );

  const setCursorPosition = useCallback((pos: number) => {
    posRef.current = pos;
  }, []);

  const groupEntry = nav.group !== null ? entries[nav.group] : undefined;
  const openedGroup =
    groupEntry && isGroup(groupEntry) ? groupEntry : undefined;

  // The open group is an index into entries, so a suggestions update can
  // orphan it; close instead of letting the stale index block navigation.
  useEffect(() => {
    if (nav.group !== null && openedGroup === undefined) ctl.close();
  }, [nav.group, openedGroup, ctl]);

  // The ghost preview is derived state with a single writer: the highlighted
  // leaf's prompt while the highlight is keyboard-driven, nothing otherwise.
  const ghostRef = useRef<{
    input: HTMLTextAreaElement;
    placeholder: string;
  } | null>(null);

  const setGhost = useCallback((text: string | null) => {
    if (text === null) {
      if (!ghostRef.current) return;
      ghostRef.current.input.placeholder = ghostRef.current.placeholder;
      ghostRef.current = null;
      return;
    }
    const input = ghostRef.current?.input ?? findComposerInput(rootRef.current);
    if (!input) return;
    ghostRef.current ??= { input, placeholder: input.placeholder };
    input.placeholder = text;
  }, []);

  useEffect(() => {
    setGhost(
      nav.keyboard && nav.active !== null
        ? (ctl.activeRow()?.prompt ?? null)
        : null,
    );
  }, [nav, setGhost, ctl]);

  useEffect(() => () => setGhost(null), [setGhost]);

  // The composer advertises the combobox relation while it drives the
  // highlight, per the editable combobox pattern.
  useEffect(() => {
    if (!registry || !nav.virtual) return undefined;
    if (nav.group === null && nav.active === null) return undefined;
    registry.setActiveDescendant("welcome-suggestions", {
      popoverId,
      highlightedItemId: nav.active ?? undefined,
    });
    return () => registry.setActiveDescendant("welcome-suggestions", null);
  }, [registry, nav.virtual, nav.group, nav.active, popoverId]);

  // Any composer edit is the user's: close the group or hand the arrows back.
  const navEngagedRef = useRef(false);
  navEngagedRef.current = nav.group !== null || nav.virtual;
  useEffect(() => {
    if (navEngagedRef.current) ctl.close();
  }, [composerText, ctl]);

  // A press on a row must stay live so its click can commit; any other
  // outside press ends the virtual highlight.
  useEffect(() => {
    if (!nav.virtual || nav.group !== null) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && rootRef.current?.contains(target)) return;
      ctl.exitToIdle();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [nav.virtual, nav.group, ctl]);

  return useMemo(
    () => ({
      ...ctl,
      entries,
      group: openedGroup,
      groupIndex: nav.group,
      active: nav.active,
      send,
      popoverId,
      setCursorPosition,
      rowEls,
      pillEls,
      rootRef,
    }),
    [
      ctl,
      entries,
      openedGroup,
      nav.group,
      nav.active,
      send,
      popoverId,
      setCursorPosition,
    ],
  );
};

type WelcomeSuggestionsContextValue = ReturnType<
  typeof useWelcomeSuggestionsState
>;

const WelcomeSuggestionsContext =
  createContext<WelcomeSuggestionsContextValue | null>(null);

export function useWelcomeSuggestions(): WelcomeSuggestionsContextValue {
  const ctx = useContext(WelcomeSuggestionsContext);
  if (!ctx) {
    throw new Error(
      "WelcomeSuggestions sub-components must be used within WelcomeSuggestionsRoot",
    );
  }
  return ctx;
}

export const WelcomeSuggestionsRoot: FC<{
  suggestions?: readonly SuggestionEntry[] | undefined;
  send?: boolean | undefined;
  children: ReactNode;
}> = ({ suggestions, send = true, children }) => {
  const value = useWelcomeSuggestionsState({ suggestions, send });

  if (value.entries.length === 0) return null;

  return (
    <WelcomeSuggestionsContext.Provider value={value}>
      <div
        ref={value.rootRef}
        data-slot="aui_thread-welcome-suggestions"
        data-open={value.group ? "" : undefined}
        className="group/suggestions relative w-full"
      >
        {children}
      </div>
    </WelcomeSuggestionsContext.Provider>
  );
};

// Mirrors Radix's DismissableLayer: a defaultPrevented pointerdown lets
// outside controls act on the panel without dismissing it, and Escape is
// consumed in the capture phase so enclosing handlers see it as handled.
// The composer is exempt: it drives the panel while open.
const useDismissOutside = (
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  {
    onDismiss,
    onEscape = onDismiss,
  }: { onDismiss: () => void; onEscape?: (() => void) | undefined },
) => {
  useEffect(() => {
    if (!active) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;
      if (!target || ref.current?.contains(target)) return;
      if (target.closest(COMPOSER_SELECTOR)) return;
      onDismiss();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onEscape();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [ref, active, onDismiss, onEscape]);
};

// Routes composer keydowns to group navigation while a group is open. Tab is
// intercepted because a native move would land on the composer's neighbors,
// not the suggestions.
const useComposerCoupling = (surface: GroupKeySurface) => {
  const registry = unstable_useComposerInputPluginRegistry();
  const direction = useDirection();
  const { group, handleGroupKey, composerAfter } = useWelcomeSuggestions();
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;
  const rtl = direction === "rtl";

  useEffect(() => {
    if (!group || !registry) return undefined;
    return registry.register({
      handleKeyDown(e) {
        const key = resolveKey(e.key, composerAfter(), rtl);
        if (key === null || key === "back") return false;
        const handled = handleGroupKey(key, surfaceRef.current);
        if (handled) e.preventDefault();
        return handled;
      },
      setCursorPosition() {},
    });
  }, [registry, group, handleGroupKey, composerAfter, rtl]);
};

export const WelcomeSuggestionsPills: FC = () => {
  const {
    entries,
    group,
    openGroup,
    send,
    isGroupOpen,
    caretAtComposerEdge,
    setCursorPosition,
    composerAfter,
    pillEls,
  } = useWelcomeSuggestions();
  const direction = useDirection();
  const registry = unstable_useComposerInputPluginRegistry();
  const rtl = direction === "rtl";

  useEffect(() => {
    if (!registry) return undefined;
    return registry.register({
      handleKeyDown(e) {
        if (isGroupOpen()) return false;
        if (resolveKey(e.key, composerAfter(), false) !== "towardList") {
          return false;
        }
        if (!caretAtComposerEdge()) return false;
        pillEls.current.find(Boolean)?.focus();
        e.preventDefault();
        return true;
      },
      setCursorPosition,
    });
  }, [
    registry,
    isGroupOpen,
    composerAfter,
    caretAtComposerEdge,
    setCursorPosition,
    pillEls,
  ]);

  const onPillKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    entry: SuggestionEntry,
  ) => {
    const key = resolveKey(e.key, composerAfter(), rtl);
    if (key === "escape" && registry) {
      registry.requestFocus();
      e.preventDefault();
      return;
    }
    if (key === "towardComposer") {
      if (registry) {
        registry.requestFocus();
        e.preventDefault();
      }
      return;
    }
    if (key === "towardList") {
      if (isGroup(entry)) {
        openGroup(entry);
        e.preventDefault();
      }
      return;
    }
    if (key !== "forward" && key !== "back") return;
    const pills = pillEls.current.filter(
      (el): el is HTMLButtonElement => el !== null,
    );
    const next =
      pills[pills.indexOf(e.currentTarget) + (key === "forward" ? 1 : -1)];
    if (next) {
      next.focus();
      e.preventDefault();
    }
  };

  return (
    <div
      aria-hidden={group ? true : undefined}
      className={cn(
        "scrollbar-none mx-1.5 w-[calc(100%-0.75rem)] overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_0.375rem,black_calc(100%-0.375rem),transparent)]",
        group && "invisible",
      )}
    >
      <div className="mx-auto flex w-max items-center justify-center gap-2 px-1.5">
        {entries.map((entry, idx) =>
          isGroup(entry) ? (
            <button
              key={idx}
              ref={(el) => {
                pillEls.current[idx] = el;
              }}
              type="button"
              className={pillClass}
              onClick={() => openGroup(entry)}
              onKeyDown={(e) => onPillKeyDown(e, entry)}
            >
              {entry.icon}
              {entry.label}
            </button>
          ) : (
            <ThreadPrimitive.Suggestion
              key={idx}
              ref={(el) => {
                pillEls.current[idx] = el;
              }}
              prompt={promptOf(entry)}
              send={send}
              className={pillClass}
              onKeyDown={(e) => onPillKeyDown(e, entry)}
            >
              {entry.icon}
              {entry.label}
            </ThreadPrimitive.Suggestion>
          ),
        )}
      </div>
    </div>
  );
};

export type WelcomeSuggestionsPickerItemProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "onClick"
> &
  VariantProps<typeof welcomeSuggestionRowVariants> & {
    prompt: string;
    label?: ReactNode;
    icon?: ReactNode;
    itemIcon?: IconReveal | undefined;
  };

export const WelcomeSuggestionsPickerItem: FC<
  WelcomeSuggestionsPickerItemProps
> = ({
  prompt,
  label,
  icon,
  children,
  itemIcon,
  highlight,
  density,
  separators,
  className,
  ...props
}) => {
  const id = useId();
  const { active, highlightPointer, close, send, registerRow } =
    useWelcomeSuggestions();
  const elRef = useRef<HTMLButtonElement | null>(null);
  const highlighted = active === id;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return undefined;
    return registerRow({ id, prompt, el });
  }, [registerRow, id, prompt]);

  return (
    <ThreadPrimitive.Suggestion
      ref={elRef}
      id={id}
      prompt={prompt}
      send={send}
      data-slot="aui_thread-welcome-picker-item"
      role="option"
      aria-selected={highlighted}
      data-highlighted={highlighted || undefined}
      onClick={() => close()}
      onMouseMove={() => highlightPointer(id)}
      className={cn(
        welcomeSuggestionRowVariants({ highlight, density, separators }),
        className,
      )}
      {...props}
    >
      {icon}
      {children ?? label}
      {itemIcon !== "off" && (
        <ItemIcon className={trailingClass[itemIcon ?? "always"]} />
      )}
    </ThreadPrimitive.Suggestion>
  );
};

const GroupPickerItems: FC<
  VariantProps<typeof welcomeSuggestionRowVariants> & {
    group: SuggestionGroup;
    itemIcon?: IconReveal | undefined;
  }
> = ({ group, itemIcon, highlight, density, separators }) => (
  <>
    {group.suggestions.map((item, idx) => (
      <WelcomeSuggestionsPickerItem
        key={idx}
        prompt={promptOf(item)}
        label={item.label}
        icon={item.icon}
        itemIcon={itemIcon}
        highlight={highlight}
        density={density}
        separators={separators}
      />
    ))}
  </>
);

export type WelcomeSuggestionsPickerProps = VariantProps<
  typeof welcomeSuggestionRowVariants
> & {
  itemIcon?: IconReveal | undefined;
  children?: ReactNode;
};

export const WelcomeSuggestionsPicker: FC<WelcomeSuggestionsPickerProps> = ({
  itemIcon,
  highlight,
  density,
  separators,
  children,
}) => {
  const { group, groupIndex, close, popoverId, pillEls } =
    useWelcomeSuggestions();
  const panelRef = useRef<HTMLDivElement>(null);

  // The pills row is invisible until the close commits, so the focus move
  // waits a frame.
  const returnToPills = useCallback(() => {
    const index = groupIndex;
    close();
    if (index === null) return;
    requestAnimationFrame(() => pillEls.current[index]?.focus());
  }, [groupIndex, close, pillEls]);

  useComposerCoupling({ onTab: returnToPills, onExitEdge: returnToPills });

  useDismissOutside(panelRef, group !== undefined, { onDismiss: close });

  if (!group) return null;
  return (
    <div
      ref={panelRef}
      data-slot="aui_thread-welcome-picker"
      className="fade-in slide-in-from-top-1 animate-in group-has-[~[data-slot*=composer]]/suggestions:slide-in-from-bottom-1 absolute inset-x-[2.5%] top-0 z-10 duration-150 group-has-[~[data-slot*=composer]]/suggestions:top-auto group-has-[~[data-slot*=composer]]/suggestions:bottom-0"
    >
      <div
        data-slot="aui_thread-welcome-picker-header"
        className="text-muted-foreground/80 flex items-center justify-between gap-2 px-3 pb-2 text-xs font-medium"
      >
        <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
          {group.icon}
          {group.label}
        </span>
        <button
          type="button"
          aria-label="Close suggestions"
          onClick={() => close()}
          className="hover:text-foreground rounded-md p-0.5 transition-colors"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <div
        id={popoverId}
        role="listbox"
        aria-label={group.label}
        className="flex flex-col outline-none"
      >
        {children ?? (
          <GroupPickerItems
            group={group}
            itemIcon={itemIcon}
            highlight={highlight}
            density={density}
            separators={separators}
          />
        )}
      </div>
    </div>
  );
};

export type WelcomeSuggestionsStackProps = VariantProps<
  typeof welcomeSuggestionRowVariants
> & {
  groupIcon?: IconReveal | undefined;
  itemIcon?: IconReveal | undefined;
  className?: string;
};

export const WelcomeSuggestionsStack: FC<WelcomeSuggestionsStackProps> = ({
  groupIcon,
  itemIcon,
  highlight,
  density,
  separators,
  className,
}) => {
  const {
    entries,
    group,
    active,
    rowId,
    openGroup,
    close,
    returnToTop,
    exitToIdle,
    highlightPointer,
    clearHighlight,
    focusList,
    isGroupOpen,
    handleTopKey,
    composerAfter,
    setCursorPosition,
    send,
    popoverId,
    rowEls,
  } = useWelcomeSuggestions();
  const direction = useDirection();
  const registry = unstable_useComposerInputPluginRegistry();
  const rtl = direction === "rtl";
  const listRef = useRef<HTMLDivElement>(null);

  useComposerCoupling({ onEscape: returnToTop, onTab: returnToTop });

  useEffect(() => {
    if (!registry) return undefined;
    return registry.register({
      handleKeyDown(e) {
        if (isGroupOpen()) return false;
        const key = resolveKey(e.key, composerAfter(), rtl);
        if (key === null || key === "back") return false;
        if (key === "tab") {
          exitToIdle();
          return false;
        }
        // A caret-blocked vertical arrow must stay a caret move.
        if (!handleTopKey(key, "composer")) return false;
        e.preventDefault();
        return true;
      },
      setCursorPosition,
    });
  }, [
    registry,
    isGroupOpen,
    composerAfter,
    rtl,
    exitToIdle,
    handleTopKey,
    setCursorPosition,
  ]);

  useDismissOutside(listRef, group !== undefined, {
    onDismiss: close,
    onEscape: returnToTop,
  });

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (group) return;
    const key = resolveKey(e.key, composerAfter(), rtl);
    if (key === null || key === "back" || key === "escape" || key === "tab") {
      return;
    }
    if (handleTopKey(key, "list")) e.preventDefault();
  };

  // mousedown is prevented so rows never take DOM focus from the container
  // or composer.
  const rowProps = (idx: number) => ({
    id: rowId(idx),
    ref: (el: HTMLElement | null) => {
      rowEls.current[idx] = el;
    },
    "data-slot": "aui_thread-welcome-stack-row",
    role: "option",
    "aria-selected": active === rowId(idx),
    "data-highlighted": active === rowId(idx) || undefined,
    tabIndex: -1,
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onMouseMove: () => highlightPointer(rowId(idx)),
  });

  return (
    <div
      ref={listRef}
      id={popoverId}
      role="listbox"
      aria-label={group ? group.label : "Suggestions"}
      aria-activedescendant={!group && active !== null ? active : undefined}
      tabIndex={group ? -1 : 0}
      onKeyDown={onKeyDown}
      onFocus={() => {
        if (!group) focusList();
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        clearHighlight();
      }}
      onMouseLeave={() => {
        if (!group && document.activeElement !== listRef.current) {
          clearHighlight();
        }
      }}
      data-slot="aui_thread-welcome-stack"
      className={cn("mx-[2.5%] flex flex-col outline-none", className)}
    >
      <div
        key={group ? group.label : "top"}
        role="presentation"
        className="fade-in animate-in flex w-full flex-col duration-150"
      >
        {group ? (
          <GroupPickerItems
            group={group}
            itemIcon={itemIcon}
            highlight={highlight}
            density={density}
            separators={separators}
          />
        ) : (
          entries.map((entry, idx) =>
            isGroup(entry) ? (
              <button
                key={idx}
                type="button"
                {...rowProps(idx)}
                className={welcomeSuggestionRowVariants({
                  highlight,
                  density,
                  separators,
                })}
                onClick={() => openGroup(entry)}
              >
                {entry.icon}
                {entry.label}
                {groupIcon !== "off" && (
                  <GroupIcon
                    className={cn(
                      trailingClass[groupIcon ?? "always"],
                      "rtl:rotate-180",
                    )}
                  />
                )}
              </button>
            ) : (
              <ThreadPrimitive.Suggestion
                key={idx}
                prompt={promptOf(entry)}
                send={send}
                {...rowProps(idx)}
                className={welcomeSuggestionRowVariants({
                  highlight,
                  density,
                  separators,
                })}
                onClick={() => exitToIdle()}
              >
                {entry.icon}
                {entry.label}
                {itemIcon !== "off" && (
                  <ItemIcon className={trailingClass[itemIcon ?? "always"]} />
                )}
              </ThreadPrimitive.Suggestion>
            ),
          )
        )}
      </div>
    </div>
  );
};

const AutoLayout: FC = () => {
  const { entries } = useWelcomeSuggestions();
  if (!entries.some(isGroup)) return <WelcomeSuggestionsStack />;
  return (
    <>
      <WelcomeSuggestionsPills />
      <WelcomeSuggestionsPicker />
    </>
  );
};

export const ThreadWelcomeSuggestions: FC<{
  suggestions?: readonly SuggestionEntry[] | undefined;
  send?: boolean | undefined;
}> = ({ suggestions, send }) => (
  <WelcomeSuggestionsRoot suggestions={suggestions} send={send}>
    <AutoLayout />
  </WelcomeSuggestionsRoot>
);
