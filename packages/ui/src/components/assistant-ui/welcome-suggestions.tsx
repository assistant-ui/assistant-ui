"use client";

import {
  ThreadPrimitive,
  unstable_useComposerInputPluginRegistry,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  ChevronRightIcon,
  CornerDownLeftIcon,
  SendHorizontalIcon,
  XIcon,
} from "lucide-react";
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
} from "react";
import { useDirection } from "@base-ui/react/direction-provider";
import { cn } from "@/lib/utils";

export type SuggestionItem = {
  label: string;
  prompt?: string;
};

export type SuggestionGroup = {
  label: string;
  icon?: ReactNode;
  suggestions: readonly SuggestionItem[];
};

export type SuggestionEntry = SuggestionItem | SuggestionGroup;

type RawSuggestion = SuggestionEntry | { prompt: string } | string;

const isGroup = (entry: SuggestionEntry): entry is SuggestionGroup =>
  "suggestions" in entry;

const promptOf = (item: SuggestionItem) => item.prompt ?? item.label;

function normalizeItem(raw: RawSuggestion): SuggestionEntry {
  if (typeof raw === "string") return { label: raw, prompt: raw };
  if ("suggestions" in raw) {
    return {
      ...raw,
      suggestions: raw.suggestions.map(
        (s) => normalizeItem(s) as SuggestionItem,
      ),
    };
  }
  if ("label" in raw) return { label: raw.label, prompt: promptOf(raw) };
  // legacy { title, label, prompt } and runtime { prompt }
  const legacy = raw as { title?: string; label?: string; prompt: string };
  return {
    label: legacy.title ?? legacy.label ?? legacy.prompt,
    prompt: legacy.prompt,
  };
}

const PickerPromptsContext = createContext<Map<string, string> | null>(null);

const usePickerPrompts = () => {
  const prompts = useContext(PickerPromptsContext);
  if (!prompts) {
    throw new Error(
      "WelcomeSuggestions sub-components must be used within WelcomeSuggestionsRoot",
    );
  }
  return prompts;
};

const getPickerOptions = (popoverId: string) =>
  Array.from(
    document
      .getElementById(popoverId)
      ?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
  );

// Ghost previews ride the composer's native placeholder: they show only
// while the composer is empty, style like any placeholder, and can never
// touch or be sent as the draft. The input is found in the DOM because the
// suggestions and the composer are detached siblings.
const findComposerInput = (from: Element | null) => {
  for (let el = from?.parentElement ?? null; el; el = el.parentElement) {
    const input = el.querySelector<HTMLTextAreaElement>(
      '[data-slot*="composer"] textarea',
    );
    if (input) return input;
  }
  return null;
};

// ArrowDown hands navigation to the suggestions only once it has no text
// travel left: the caret sits at the end of the composer text. Lexical's
// reported offset can overshoot the synced text around empty leading lines,
// so the comparison is lenient.
const useCaretAtEnd = () => {
  const aui = useAui();
  const posRef = useRef(0);
  const setCursorPosition = useCallback((pos: number) => {
    posRef.current = pos;
  }, []);
  const caretAtEnd = useCallback(
    () => posRef.current >= aui.composer().getState().text.length,
    [aui],
  );
  return { setCursorPosition, caretAtEnd };
};

const pillClass =
  "text-foreground hover:bg-muted border-border/60 inline-flex h-auto items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors [&_svg]:size-4";

const pillId = (popoverId: string, idx: number) => `${popoverId}p${idx}`;

const welcomeSuggestionRowVariants = cva(
  "group/aui-row text-foreground/80 hover:text-foreground data-[highlighted]:bg-muted/70 data-[highlighted]:text-foreground relative flex w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm [&_svg]:size-4",
  {
    variants: {
      density: {
        comfortable: "py-3",
        compact: "py-2",
      },
      separators: {
        true: "after:border-border/50 after:pointer-events-none after:absolute after:inset-x-[1.5%] after:bottom-0 after:border-b last:after:hidden data-[highlighted]:after:hidden [&:has(+[data-highlighted])]:after:hidden",
        false: "",
      },
    },
    defaultVariants: {
      density: "comfortable",
      separators: true,
    },
  },
);

const ActionGlyph: FC<{
  indicator: "none" | "send" | "enter" | undefined;
}> = ({ indicator }) => {
  if (indicator !== "send" && indicator !== "enter") return null;
  const Icon = indicator === "send" ? SendHorizontalIcon : CornerDownLeftIcon;
  return (
    <Icon
      className={cn(
        "text-muted-foreground ml-auto size-4 opacity-50",
        indicator === "send" && "rtl:rotate-180",
      )}
    />
  );
};

type WelcomeSuggestionsContextValue = {
  entries: readonly SuggestionEntry[];
  group: SuggestionGroup | undefined;
  openGroup: (group: SuggestionGroup) => void;
  close: () => void;
  setGhost: (text: string | null) => void;
  moveHighlight: (delta: 1 | -1) => void;
  highlightItem: (id: string) => void;
  highlightAtTop: () => boolean;
  selectCurrent: () => void;
  currentId: string | null;
  setCurrentId: (id: string | null) => void;
  send: boolean;
  popoverId: string;
  hasRegistry: boolean;
};

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

const useWelcomeSuggestionsState = ({
  suggestions,
  send,
}: {
  suggestions: readonly SuggestionEntry[] | undefined;
  send: boolean;
}) => {
  const registry = unstable_useComposerInputPluginRegistry();
  const staticSuggestions = useAuiState((s) => s.suggestions.suggestions);
  const composerText = useAuiState((s) => s.composer.text);
  const pickerPrompts = usePickerPrompts();
  const popoverId = useId();

  const entries = useMemo(
    () => (suggestions ?? staticSuggestions).map(normalizeItem),
    [suggestions, staticSuggestions],
  );

  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  const group = entries.find(
    (e): e is SuggestionGroup => isGroup(e) && e.label === openLabel,
  );

  const ghostRef = useRef<{
    input: HTMLTextAreaElement;
    placeholder: string;
  } | null>(null);

  const setGhost = useCallback(
    (text: string | null) => {
      if (text === null) {
        if (!ghostRef.current) return;
        ghostRef.current.input.placeholder = ghostRef.current.placeholder;
        ghostRef.current = null;
        return;
      }
      const input =
        ghostRef.current?.input ??
        findComposerInput(document.getElementById(popoverId));
      if (!input) return;
      ghostRef.current ??= { input, placeholder: input.placeholder };
      input.placeholder = text;
    },
    [popoverId],
  );

  useEffect(() => () => setGhost(null), [setGhost]);

  const close = useCallback(() => {
    setOpenLabel(null);
    setCurrentId(null);
    setGhost(null);
  }, [setGhost]);

  const openGroup = useCallback(
    (g: SuggestionGroup) => {
      setOpenLabel(g.label);
      setCurrentId(null);
      currentIdRef.current = null;
      registry?.requestFocus();
    },
    [registry],
  );

  // Enter and click share one select path: Enter clicks the highlighted
  // item's option element, so ThreadPrimitive.Suggestion handles both.
  const selectCurrent = useCallback(() => {
    getPickerOptions(popoverId)
      .find((option) => option.id === currentIdRef.current)
      ?.click();
  }, [popoverId]);

  // Hover and arrows share this path so the ghost preview always shows the
  // highlighted item's prompt.
  const highlightItem = useCallback(
    (id: string) => {
      if (currentIdRef.current === id) return;
      currentIdRef.current = id;
      setCurrentId(id);
      const prompt = pickerPrompts.get(id);
      if (prompt !== undefined) setGhost(prompt);
    },
    [setGhost, pickerPrompts],
  );

  const moveHighlight = useCallback(
    (delta: 1 | -1) => {
      const options = getPickerOptions(popoverId);
      if (options.length === 0) return;
      const index = options.findIndex(
        (option) => option.id === currentIdRef.current,
      );
      const nextIndex =
        delta === 1
          ? index >= options.length - 1
            ? 0
            : index + 1
          : index <= 0
            ? options.length - 1
            : index - 1;
      highlightItem(options[nextIndex]!.id);
    },
    [popoverId, highlightItem],
  );

  const highlightAtTop = useCallback(() => {
    const options = getPickerOptions(popoverId);
    return options.findIndex((o) => o.id === currentIdRef.current) <= 0;
  }, [popoverId]);

  // The panel never touches the draft, so any composer edit while a group
  // is open is the user's: hand control back. Gated on a ref so the check
  // runs only when the text changes, not when the group opens.
  const groupOpenRef = useRef(false);
  groupOpenRef.current = group !== undefined;
  useEffect(() => {
    if (groupOpenRef.current) close();
  }, [composerText, close]);

  return useMemo<WelcomeSuggestionsContextValue>(
    () => ({
      entries,
      group,
      openGroup,
      close,
      setGhost,
      moveHighlight,
      highlightItem,
      highlightAtTop,
      selectCurrent,
      currentId,
      setCurrentId,
      send,
      popoverId,
      hasRegistry: registry !== null,
    }),
    [
      entries,
      group,
      openGroup,
      close,
      setGhost,
      moveHighlight,
      highlightItem,
      highlightAtTop,
      selectCurrent,
      currentId,
      send,
      popoverId,
      registry,
    ],
  );
};

const WelcomeSuggestionsState: FC<{
  suggestions: readonly SuggestionEntry[] | undefined;
  send: boolean;
  children: ReactNode;
}> = ({ suggestions, send, children }) => {
  const value = useWelcomeSuggestionsState({ suggestions, send });

  if (value.entries.length === 0) return null;

  return (
    <WelcomeSuggestionsContext.Provider value={value}>
      <div
        data-slot="aui_thread-welcome-suggestions"
        data-open={value.group ? "" : undefined}
        className="relative mt-1 w-full"
      >
        {children}
      </div>
    </WelcomeSuggestionsContext.Provider>
  );
};

export const WelcomeSuggestionsRoot: FC<{
  suggestions?: readonly SuggestionEntry[] | undefined;
  send?: boolean | undefined;
  children: ReactNode;
}> = ({ suggestions, send = true, children }) => {
  const [prompts] = useState(() => new Map<string, string>());
  return (
    <PickerPromptsContext.Provider value={prompts}>
      <WelcomeSuggestionsState suggestions={suggestions} send={send}>
        {children}
      </WelcomeSuggestionsState>
    </PickerPromptsContext.Provider>
  );
};

export const WelcomeSuggestionsPills: FC = () => {
  const { entries, group, openGroup, send, popoverId } =
    useWelcomeSuggestions();
  const direction = useDirection();
  const pillsRef = useRef<HTMLDivElement>(null);
  const registry = unstable_useComposerInputPluginRegistry();
  const { setCursorPosition, caretAtEnd } = useCaretAtEnd();

  // ArrowDown at the end of the composer text jumps focus to the first pill,
  // so the row is reachable without tabbing; ArrowUp or Escape on a pill
  // hands focus back.
  useEffect(() => {
    if (!registry) return undefined;
    return registry.register({
      handleKeyDown(e) {
        if (group || e.key !== "ArrowDown" || !caretAtEnd()) return false;
        pillsRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
        e.preventDefault();
        return true;
      },
      setCursorPosition,
    });
  }, [registry, group, caretAtEnd, setCursorPosition]);

  const onPillKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    entry: SuggestionEntry,
  ) => {
    if ((e.key === "Escape" || e.key === "ArrowUp") && registry) {
      registry.requestFocus();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      if (isGroup(entry)) {
        openGroup(entry);
        e.preventDefault();
      }
      return;
    }
    const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    if (e.key !== forwardKey && e.key !== backKey) return;
    const pills = Array.from(
      pillsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const next =
      pills[pills.indexOf(e.currentTarget) + (e.key === forwardKey ? 1 : -1)];
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
      <div
        ref={pillsRef}
        className="mx-auto flex w-max items-center justify-center gap-2 px-1.5"
      >
        {entries.map((entry, idx) =>
          isGroup(entry) ? (
            <button
              key={idx}
              id={pillId(popoverId, idx)}
              type="button"
              className={cn(pillClass)}
              onClick={() => openGroup(entry)}
              onKeyDown={(e) => onPillKeyDown(e, entry)}
            >
              {entry.icon}
              {entry.label}
            </button>
          ) : (
            <ThreadPrimitive.Suggestion
              key={idx}
              id={pillId(popoverId, idx)}
              prompt={promptOf(entry)}
              send={send}
              className={cn(pillClass)}
              onKeyDown={(e) => onPillKeyDown(e, entry)}
            >
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
    indicator?: "none" | "send" | "enter";
  };

export const WelcomeSuggestionsPickerItem: FC<
  WelcomeSuggestionsPickerItemProps
> = ({
  prompt,
  label,
  children,
  indicator,
  density,
  separators,
  className,
  ...props
}) => {
  const id = useId();
  const { currentId, highlightItem, close, send } = useWelcomeSuggestions();
  const prompts = usePickerPrompts();
  const highlighted = currentId === id;

  // Keyboard navigation previews the highlighted option's prompt in the
  // composer; options are found in the DOM, so the prompt needs a registry.
  useEffect(() => {
    prompts.set(id, prompt);
    return () => void prompts.delete(id);
  }, [prompts, id, prompt]);

  return (
    <ThreadPrimitive.Suggestion
      id={id}
      prompt={prompt}
      send={send}
      data-slot="aui_thread-welcome-picker-item"
      role="option"
      aria-selected={highlighted}
      data-highlighted={highlighted || undefined}
      onClick={() => close()}
      onMouseMove={() => highlightItem(id)}
      className={cn(
        welcomeSuggestionRowVariants({ density, separators }),
        className,
      )}
      {...props}
    >
      {children ?? label}
      <ActionGlyph indicator={indicator} />
    </ThreadPrimitive.Suggestion>
  );
};

// Mounted by surfaces whose open group is composer-driven (Picker, Stack's
// sub-level). The composer keeps focus while the group is open; this plugin
// routes its keydowns to panel navigation. The arrows wrap; a surface may
// opt in to onExitUp to make ArrowUp on the top item climb out one level
// instead (the pills picker exits to its pill). Escape and Tab both leave
// without selecting, so both put the open-time draft back; each hands focus
// back to the surface's top level via its callback — a native Tab move would
// land on the composer's neighbors, not the suggestions.
const useComposerCoupling = ({
  onEscape,
  onTab,
  onExitUp,
}: {
  onEscape?: () => void;
  onTab?: () => void;
  onExitUp?: () => void;
} = {}) => {
  const registry = unstable_useComposerInputPluginRegistry();
  const {
    group,
    moveHighlight,
    highlightAtTop,
    selectCurrent,
    close,
    currentId,
    popoverId,
  } = useWelcomeSuggestions();
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  useEffect(() => {
    if (!group || !registry) return undefined;
    return registry.register({
      handleKeyDown(e) {
        if (e.key === "ArrowDown") {
          moveHighlight(1);
          e.preventDefault();
          return true;
        }
        if (e.key === "ArrowUp") {
          if (onExitUp && highlightAtTop()) onExitUp();
          else moveHighlight(-1);
          e.preventDefault();
          return true;
        }
        if (e.key === "Enter" && currentIdRef.current) {
          selectCurrent();
          e.preventDefault();
          return true;
        }
        if (e.key === "Escape") {
          // Consume the event like a Radix layer would, so enclosing Escape
          // handlers (dialogs, fullscreen panels) see it as already handled.
          e.preventDefault();
          if (onEscape) onEscape();
          else close();
          return true;
        }
        if (e.key === "Tab") {
          if (onTab) {
            onTab();
            e.preventDefault();
            return true;
          }
          close();
          return false;
        }
        return false;
      },
      setCursorPosition() {},
    });
  }, [
    registry,
    group,
    moveHighlight,
    highlightAtTop,
    selectCurrent,
    close,
    onEscape,
    onTab,
    onExitUp,
  ]);

  useEffect(() => {
    if (!registry || !group) return undefined;
    return () => registry.setActiveDescendant("welcome-suggestions", null);
  }, [registry, group]);

  useEffect(() => {
    if (!registry || !group) return;
    registry.setActiveDescendant("welcome-suggestions", {
      popoverId,
      highlightedItemId: currentId ?? undefined,
    });
  }, [registry, group, popoverId, currentId]);
};

export type WelcomeSuggestionsPickerProps = VariantProps<
  typeof welcomeSuggestionRowVariants
> & {
  indicator?: "none" | "send" | "enter";
  children?: ReactNode;
};

export const WelcomeSuggestionsPicker: FC<WelcomeSuggestionsPickerProps> = ({
  indicator,
  density,
  separators,
  children,
}) => {
  const {
    entries,
    group,
    close,
    send,
    moveHighlight,
    selectCurrent,
    currentId,
    popoverId,
    hasRegistry,
  } = useWelcomeSuggestions();
  // send={false} makes activation insert into the composer rather than send,
  // so the automatic send glyph would lie there.
  const resolvedIndicator = indicator ?? (send ? "send" : "none");
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Tab and ArrowUp-at-the-top hand focus back to the pill that opened the
  // group. The pills row is invisible until the close commits, so the focus
  // move waits a frame.
  const returnToPills = useCallback(() => {
    const idx = group ? entries.indexOf(group) : -1;
    close();
    if (idx === -1) return;
    requestAnimationFrame(() => {
      document.getElementById(pillId(popoverId, idx))?.focus();
    });
  }, [group, entries, close, popoverId]);

  useComposerCoupling({ onTab: returnToPills, onExitUp: returnToPills });

  // Without a registry the composer cannot drive the panel, so the panel
  // focuses itself and handles navigation keys locally.
  useEffect(() => {
    if (group && !hasRegistry) listboxRef.current?.focus();
  }, [group, hasRegistry]);

  // Escape and outside pointer-downs dismiss the panel, except inside a
  // composer surface: the composer keeps focus and drives it while open.
  // Like DismissableLayer, a defaultPrevented pointerdown is an opt-out, so
  // outside controls can act on the open panel without dismissing it.
  useEffect(() => {
    if (!group) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;
      if (!target || panelRef.current?.contains(target)) return;
      if (target.closest('[data-slot*="composer"]')) return;
      close();
    };
    // Capture phase with preventDefault, like Radix's DismissableLayer:
    // enclosing Escape handlers check defaultPrevented to yield to us.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [group, close]);

  const onFallbackKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (hasRegistry) return;
    if (e.key === "ArrowDown") {
      moveHighlight(1);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      moveHighlight(-1);
      e.preventDefault();
    } else if (e.key === "Enter") {
      selectCurrent();
      e.preventDefault();
    } else if (e.key === "Tab") {
      returnToPills();
      e.preventDefault();
    }
  };

  if (!group) return null;
  return (
    <div
      ref={panelRef}
      data-slot="aui_thread-welcome-picker"
      className="fade-in slide-in-from-top-1 animate-in absolute inset-x-[2.5%] top-0 z-10 duration-150"
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
        ref={listboxRef}
        id={popoverId}
        role="listbox"
        aria-label={group.label}
        aria-activedescendant={currentId ?? undefined}
        tabIndex={-1}
        onKeyDown={onFallbackKeyDown}
        className="flex flex-col outline-none"
      >
        {children ??
          group.suggestions.map((item, idx) => (
            <WelcomeSuggestionsPickerItem
              key={idx}
              prompt={promptOf(item)}
              label={item.label}
              indicator={resolvedIndicator}
              density={density}
              separators={separators}
            />
          ))}
      </div>
    </div>
  );
};

// ChatGPT-style vertical layout: top-level rows stay visible and passive
// (typing is never intercepted); opening a group swaps its items in place
// and hands navigation to the composer, exactly like the Picker.
//
// Both levels are the same listbox: one persistent container holds DOM focus
// (the composer holds it while a group is open) and a single highlighted row
// tracks pointer and arrows alike, so hover and keyboard can never light two
// rows, and Escape or Tab can hand focus back for arrow nav to continue.
export type WelcomeSuggestionsStackProps = VariantProps<
  typeof welcomeSuggestionRowVariants
> & {
  indicator?: "none" | "send" | "enter";
  chevron?: boolean;
  className?: string;
};

export const WelcomeSuggestionsStack: FC<WelcomeSuggestionsStackProps> = ({
  indicator,
  chevron = true,
  density,
  separators,
  className,
}) => {
  const {
    entries,
    group,
    openGroup,
    close,
    setGhost,
    send,
    moveHighlight,
    selectCurrent,
    currentId,
    popoverId,
    hasRegistry,
  } = useWelcomeSuggestions();
  // send={false} makes activation insert into the composer rather than send,
  // so the automatic send glyph would lie there.
  const resolvedIndicator = indicator ?? (send ? "send" : "none");
  const direction = useDirection();
  const registry = unstable_useComposerInputPluginRegistry();
  const composerText = useAuiState((s) => s.composer.text);
  const { setCursorPosition, caretAtEnd } = useCaretAtEnd();
  const listRef = useRef<HTMLDivElement>(null);
  const [topIdx, setTopIdx] = useState<number | null>(null);
  // Composer-driven top-level navigation: the composer keeps DOM focus while
  // the arrows move a virtual highlight, so typing at any point resumes
  // composing without a refocus.
  const [composerNav, setComposerNav] = useState(false);
  const composerNavRef = useRef(false);
  const topIdxRef = useRef(topIdx);
  topIdxRef.current = topIdx;

  const enterComposerNav = useCallback(() => {
    composerNavRef.current = true;
    setComposerNav(true);
  }, []);
  const rowId = useCallback(
    (idx: number) => `${popoverId}t${idx}`,
    [popoverId],
  );

  const exitComposerNav = useCallback(() => {
    composerNavRef.current = false;
    setComposerNav(false);
    setTopIdx(null);
    setGhost(null);
  }, [setGhost]);

  // Browsing ghost-previews a flat row's prompt; group rows have none.
  const previewRow = useCallback(
    (idx: number) => {
      const entry = entries[idx];
      if (!entry) return;
      setGhost(isGroup(entry) ? null : promptOf(entry));
    },
    [entries, setGhost],
  );

  // Escape and Tab both leave the sub-level without selecting; the group's
  // own row comes back highlighted so the arrows keep working. With a
  // registry the return is virtual — the composer keeps focus and keeps
  // driving the arrows — otherwise the listbox takes DOM focus.
  const returnToTop = useCallback(() => {
    const idx = group ? entries.indexOf(group) : -1;
    close();
    if (idx === -1) return;
    setTopIdx(idx);
    if (registry) {
      enterComposerNav();
      registry.requestFocus();
    } else {
      listRef.current?.focus({ preventScroll: true });
    }
  }, [group, entries, close, registry, enterComposerNav]);

  useComposerCoupling({ onEscape: returnToTop, onTab: returnToTop });

  useEffect(() => {
    if (group) exitComposerNav();
  }, [group, exitComposerNav]);

  useEffect(() => {
    if (group && !hasRegistry) listRef.current?.focus();
  }, [group, hasRegistry]);

  // Navigation never touches the draft, so any composer edit is the user's:
  // hand the arrows back. Gated on a ref so the check runs only when the
  // text changes, not when navigation starts.
  useEffect(() => {
    if (composerNavRef.current) exitComposerNav();
  }, [composerText, exitComposerNav]);

  // The highlight would otherwise outlive the composer's focus: any pointer
  // press outside the list ends composer-driven navigation; a press on a
  // row stays live and its click handler commits instead.
  useEffect(() => {
    if (!composerNav) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && listRef.current?.contains(target)) return;
      exitComposerNav();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [composerNav, exitComposerNav]);

  // ArrowDown at the end of the composer text enters top-level navigation.
  // The highlight is spatially anchored to the composer, so the bottom edge
  // clamps and the top edge exits back into the composer instead of wrapping.
  useEffect(() => {
    if (!registry) return undefined;
    const openKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    return registry.register({
      handleKeyDown(e) {
        if (group) return false;
        if (e.key === "ArrowDown") {
          if (topIdxRef.current === null && !caretAtEnd()) return false;
          enterComposerNav();
          const next =
            topIdxRef.current === null
              ? 0
              : Math.min(topIdxRef.current + 1, entries.length - 1);
          topIdxRef.current = next;
          setTopIdx(next);
          previewRow(next);
          e.preventDefault();
          return true;
        }
        const idx = topIdxRef.current;
        if (idx === null) return false;
        if (e.key === "ArrowUp") {
          if (idx === 0) exitComposerNav();
          else {
            enterComposerNav();
            topIdxRef.current = idx - 1;
            setTopIdx(idx - 1);
            previewRow(idx - 1);
          }
          e.preventDefault();
          return true;
        }
        if (e.key === "Escape") {
          exitComposerNav();
          e.preventDefault();
          return true;
        }
        if (e.key === "Tab") {
          exitComposerNav();
          return false;
        }
        const entry = entries[idx];
        if (!entry) return false;
        if (e.key === "Enter") {
          if (isGroup(entry)) openGroup(entry);
          else
            listRef.current
              ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
              [idx]?.click();
          e.preventDefault();
          return true;
        }
        if (e.key === openKey && isGroup(entry)) {
          openGroup(entry);
          e.preventDefault();
          return true;
        }
        return false;
      },
      setCursorPosition,
    });
  }, [
    registry,
    group,
    direction,
    entries,
    openGroup,
    exitComposerNav,
    enterComposerNav,
    previewRow,
    caretAtEnd,
    setCursorPosition,
  ]);

  useEffect(() => {
    if (!registry || !composerNav || topIdx === null) return undefined;
    registry.setActiveDescendant("welcome-suggestions-top", {
      popoverId,
      highlightedItemId: rowId(topIdx),
    });
    return () => registry.setActiveDescendant("welcome-suggestions-top", null);
  }, [registry, composerNav, topIdx, popoverId, rowId]);

  // Escape and outside pointer-downs return to the top level, except inside
  // a composer surface: the composer keeps focus and drives the sub-level.
  // Like DismissableLayer, a defaultPrevented pointerdown is an opt-out, so
  // outside controls can act on the open sub-level without dismissing it.
  useEffect(() => {
    if (!group) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;
      if (!target || listRef.current?.contains(target)) return;
      if (target.closest('[data-slot*="composer"]')) return;
      close();
    };
    // Capture phase with preventDefault, like Radix's DismissableLayer:
    // enclosing Escape handlers check defaultPrevented to yield to us.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      returnToTop();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [group, close, returnToTop]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (group) {
      if (hasRegistry) return;
      if (e.key === "ArrowDown") {
        moveHighlight(1);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        moveHighlight(-1);
        e.preventDefault();
      } else if (e.key === "Enter") {
        selectCurrent();
        e.preventDefault();
      } else if (e.key === "Tab") {
        returnToTop();
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const last = entries.length - 1;
      setTopIdx((idx) =>
        idx === null
          ? e.key === "ArrowDown"
            ? 0
            : last
          : e.key === "ArrowDown"
            ? idx >= last
              ? 0
              : idx + 1
            : idx <= 0
              ? last
              : idx - 1,
      );
      e.preventDefault();
      return;
    }
    const openKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    if (e.key !== openKey && e.key !== "Enter") return;
    if (topIdx === null) return;
    const entry = entries[topIdx];
    if (!entry) return;
    if (isGroup(entry)) {
      openGroup(entry);
      e.preventDefault();
    } else if (e.key === "Enter") {
      listRef.current
        ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
        [topIdx]?.click();
      e.preventDefault();
    }
  };

  // Rows never take DOM focus (mousedown is prevented, tabIndex -1): the
  // container is the only tab stop and the highlight is the only indicator.
  // While composer navigation is active, hover moves the same highlight the
  // arrows use, so the ghost preview follows it.
  const rowProps = (idx: number) => ({
    id: rowId(idx),
    "data-slot": "aui_thread-welcome-stack-row",
    role: "option",
    "aria-selected": topIdx === idx,
    "data-highlighted": topIdx === idx || undefined,
    tabIndex: -1,
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onMouseMove: () => {
      if (topIdxRef.current === idx) return;
      topIdxRef.current = idx;
      setTopIdx(idx);
      if (composerNavRef.current) previewRow(idx);
    },
  });

  return (
    <div
      ref={listRef}
      id={popoverId}
      role="listbox"
      aria-label={group ? group.label : "Suggestions"}
      aria-activedescendant={
        group
          ? (currentId ?? undefined)
          : topIdx !== null
            ? rowId(topIdx)
            : undefined
      }
      tabIndex={group ? -1 : 0}
      onKeyDown={onKeyDown}
      onFocus={() => {
        if (group) return;
        const idx = topIdxRef.current;
        exitComposerNav();
        setTopIdx(idx ?? 0);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setTopIdx(null);
      }}
      onMouseLeave={() => {
        if (
          !group &&
          !composerNav &&
          document.activeElement !== listRef.current
        )
          setTopIdx(null);
      }}
      data-slot="aui_thread-welcome-stack"
      data-indicator={resolvedIndicator}
      data-chevron={chevron}
      data-density={density}
      data-separators={separators}
      className={cn("-mt-1 flex w-full flex-col outline-none", className)}
    >
      <div
        key={group ? group.label : "top"}
        role="presentation"
        className="fade-in animate-in flex w-full flex-col duration-150"
      >
        {group
          ? group.suggestions.map((item, idx) => (
              <WelcomeSuggestionsPickerItem
                key={idx}
                prompt={promptOf(item)}
                label={item.label}
                indicator={resolvedIndicator}
                density={density}
                separators={separators}
              />
            ))
          : entries.map((entry, idx) =>
              isGroup(entry) ? (
                <button
                  key={idx}
                  type="button"
                  {...rowProps(idx)}
                  className={welcomeSuggestionRowVariants({
                    density,
                    separators,
                  })}
                  onClick={() => openGroup(entry)}
                >
                  {entry.icon}
                  {entry.label}
                  {chevron && (
                    <ChevronRightIcon className="text-muted-foreground ml-auto size-4 opacity-50 rtl:rotate-180" />
                  )}
                </button>
              ) : (
                <ThreadPrimitive.Suggestion
                  key={idx}
                  prompt={promptOf(entry)}
                  send={send}
                  {...rowProps(idx)}
                  className={welcomeSuggestionRowVariants({
                    density,
                    separators,
                  })}
                  onClick={() => exitComposerNav()}
                >
                  {entry.label}
                  <ActionGlyph indicator={resolvedIndicator} />
                </ThreadPrimitive.Suggestion>
              ),
            )}
      </div>
    </div>
  );
};

export const ThreadWelcomeSuggestions: FC<{
  suggestions?: readonly SuggestionEntry[] | undefined;
  send?: boolean | undefined;
}> = ({ suggestions, send }) => (
  <WelcomeSuggestionsRoot suggestions={suggestions} send={send}>
    <WelcomeSuggestionsStack />
  </WelcomeSuggestionsRoot>
);
