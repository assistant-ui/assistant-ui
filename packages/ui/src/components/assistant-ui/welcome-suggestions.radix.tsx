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
import { Direction } from "radix-ui";
import {
  Collection as CollectionPrimitive,
  DismissableLayer as DismissableLayerPrimitive,
} from "radix-ui/internal";
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

type PickerItemData = { id: string; prompt: string };

const [PickerCollection, usePickerCollection] =
  CollectionPrimitive.createCollection<HTMLButtonElement, PickerItemData>(
    "ThreadWelcomePicker",
  );

const [PillCollection, usePillCollection] =
  CollectionPrimitive.createCollection<HTMLButtonElement>("ThreadWelcomePills");

const [StackCollection, useStackCollection] =
  CollectionPrimitive.createCollection<HTMLButtonElement>("ThreadWelcomeStack");

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
  openGroup: (group: SuggestionGroup, knownDraft?: string) => void;
  close: (options?: { keepText?: boolean }) => string;
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
  const aui = useAui();
  const registry = unstable_useComposerInputPluginRegistry();
  const staticSuggestions = useAuiState((s) => s.suggestions.suggestions);
  const composerText = useAuiState((s) => s.composer.text);
  const getItems = usePickerCollection(undefined);
  const popoverId = useId();

  const entries = useMemo(
    () => (suggestions ?? staticSuggestions).map(normalizeItem),
    [suggestions, staticSuggestions],
  );

  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const expectedTextRef = useRef("");
  const draftRef = useRef("");
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  const group = entries.find(
    (e): e is SuggestionGroup => isGroup(e) && e.label === openLabel,
  );

  // A preview is ghost text: closing puts back the draft captured at open
  // time, and only selection commits — its trigger runs after this restore,
  // so send/clearComposer act on the real draft, never on a preview. The
  // draft is returned because the store lags writes by a flush: a caller
  // that keeps navigating must adopt it without re-reading stale state.
  const close = useCallback(
    (options?: { keepText?: boolean }) => {
      setOpenLabel(null);
      setCurrentId(null);
      if (!options?.keepText) {
        expectedTextRef.current = draftRef.current;
        aui.composer().setText(draftRef.current);
      }
      return draftRef.current;
    },
    [aui],
  );

  // knownDraft: the store lags writes by a flush, so a caller that just
  // restored the draft passes it instead of re-reading stale state.
  const openGroup = useCallback(
    (g: SuggestionGroup, knownDraft?: string) => {
      setOpenLabel(g.label);
      setCurrentId(null);
      currentIdRef.current = null;
      draftRef.current = knownDraft ?? aui.composer().getState().text;
      expectedTextRef.current = draftRef.current;
      registry?.requestFocus();
    },
    [aui, registry],
  );

  // Enter and click share one select path: Enter clicks the highlighted
  // item's collection ref, so ThreadPrimitive.Suggestion handles both.
  const selectCurrent = useCallback(() => {
    const current = getItems().find((item) => item.id === currentIdRef.current);
    current?.ref.current?.click();
  }, [getItems]);

  // Hover and arrows share this path so the ghost preview always shows the
  // highlighted item's prompt. Overwriting is safe while open: typing closes
  // the panel, so the composer only holds the draft or a previous preview.
  const highlightItem = useCallback(
    (id: string) => {
      if (currentIdRef.current === id) return;
      currentIdRef.current = id;
      setCurrentId(id);
      const prompt = getItems().find((item) => item.id === id)?.prompt;
      if (prompt === undefined) return;
      expectedTextRef.current = prompt;
      aui.composer().setText(prompt);
    },
    [aui, getItems],
  );

  const moveHighlight = useCallback(
    (delta: 1 | -1) => {
      const items = getItems();
      if (items.length === 0) return;
      const index = items.findIndex((item) => item.id === currentIdRef.current);
      const nextIndex =
        delta === 1
          ? index >= items.length - 1
            ? 0
            : index + 1
          : index <= 0
            ? items.length - 1
            : index - 1;
      highlightItem(items[nextIndex]!.id);
    },
    [getItems, highlightItem],
  );

  const highlightAtTop = useCallback(() => {
    const items = getItems();
    return items.findIndex((item) => item.id === currentIdRef.current) <= 0;
  }, [getItems]);

  // Any composer text the picker did not write itself means the user is
  // typing (or a selection cleaned the preview up): hand control back and
  // keep that text — it is theirs, not a preview.
  useEffect(() => {
    if (group && composerText !== expectedTextRef.current)
      close({ keepText: true });
  }, [group, composerText, close]);

  return useMemo<WelcomeSuggestionsContextValue>(
    () => ({
      entries,
      group,
      openGroup,
      close,
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
}> = ({ suggestions, send = true, children }) => (
  <PickerCollection.Provider scope={undefined}>
    <PillCollection.Provider scope={undefined}>
      <StackCollection.Provider scope={undefined}>
        <WelcomeSuggestionsState suggestions={suggestions} send={send}>
          {children}
        </WelcomeSuggestionsState>
      </StackCollection.Provider>
    </PillCollection.Provider>
  </PickerCollection.Provider>
);

export const WelcomeSuggestionsPills: FC = () => {
  const { entries, group, openGroup, send } = useWelcomeSuggestions();
  const direction = Direction.useDirection();
  const getPills = usePillCollection(undefined);
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
        getPills()[0]?.ref.current?.focus();
        e.preventDefault();
        return true;
      },
      setCursorPosition,
    });
  }, [registry, group, caretAtEnd, setCursorPosition, getPills]);

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
    const pills = getPills()
      .map((item) => item.ref.current)
      .filter((node): node is HTMLButtonElement => node !== null);
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
      <PillCollection.Slot scope={undefined}>
        <div className="mx-auto flex w-max items-center justify-center gap-2 px-1.5">
          {entries.map((entry, idx) => (
            <PillCollection.ItemSlot key={idx} scope={undefined}>
              {isGroup(entry) ? (
                <button
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
                  prompt={promptOf(entry)}
                  send={send}
                  className={cn(pillClass)}
                  onKeyDown={(e) => onPillKeyDown(e, entry)}
                >
                  {entry.label}
                </ThreadPrimitive.Suggestion>
              )}
            </PillCollection.ItemSlot>
          ))}
        </div>
      </PillCollection.Slot>
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
  const highlighted = currentId === id;
  return (
    <PickerCollection.ItemSlot scope={undefined} id={id} prompt={prompt}>
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
    </PickerCollection.ItemSlot>
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
  const getPills = usePillCollection(undefined);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Tab and ArrowUp-at-the-top hand focus back to the pill that opened the
  // group. The pills row is invisible until the close commits, so the focus
  // move waits a frame.
  const returnToPills = useCallback(() => {
    const idx = group ? entries.indexOf(group) : -1;
    close();
    if (idx === -1) return;
    requestAnimationFrame(() => {
      getPills()[idx]?.ref.current?.focus();
    });
  }, [group, entries, close, getPills]);

  useComposerCoupling({ onTab: returnToPills, onExitUp: returnToPills });

  // Without a registry the composer cannot drive the panel, so the panel
  // focuses itself and handles navigation keys locally.
  useEffect(() => {
    if (group && !hasRegistry) listboxRef.current?.focus();
  }, [group, hasRegistry]);

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
    <DismissableLayerPrimitive.Root
      asChild
      onEscapeKeyDown={() => close()}
      onFocusOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => {
        // A defaultPrevented pointerdown is an opt-out, so outside controls
        // can act on the open panel without dismissing it.
        const original = e.detail.originalEvent;
        const target = original.target as Element | null;
        if (
          original.defaultPrevented ||
          target?.closest('[data-slot*="composer"]')
        )
          e.preventDefault();
      }}
      onDismiss={() => close()}
    >
      <div
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
        <PickerCollection.Slot scope={undefined}>
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
        </PickerCollection.Slot>
      </div>
    </DismissableLayerPrimitive.Root>
  );
};

// ChatGPT-style vertical layout: top-level rows stay visible and passive
// (typing is never intercepted); opening a group swaps its items in place
// and hands navigation to the composer, exactly like the Picker.
//
// Both levels are the same listbox: one persistent container holds DOM focus
// (the composer holds it while a group is open) and a single highlighted row
// tracks pointer and arrows alike, so hover and keyboard can never light two
// rows, and Escape or Tab can hand focus back for arrow nav to continue. The
// DismissableLayer wraps only the sub-level's children, not the container:
// remounting the container on close would drop the restored focus.
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
  const direction = Direction.useDirection();
  const getStackRows = useStackCollection(undefined);
  const aui = useAui();
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
  const draftRef = useRef("");
  const expectedTextRef = useRef("");
  const topIdxRef = useRef(topIdx);
  topIdxRef.current = topIdx;

  // knownText: the store lags writes by a flush, so a caller that just
  // restored the draft passes it instead of re-reading stale state.
  const enterComposerNav = useCallback(
    (knownText?: string) => {
      if (!composerNavRef.current) {
        draftRef.current = knownText ?? aui.composer().getState().text;
        expectedTextRef.current = draftRef.current;
      }
      composerNavRef.current = true;
      setComposerNav(true);
    },
    [aui],
  );
  const rowId = useCallback(
    (idx: number) => `${popoverId}t${idx}`,
    [popoverId],
  );

  const exitComposerNav = useCallback(() => {
    composerNavRef.current = false;
    setComposerNav(false);
    setTopIdx(null);
  }, []);

  // Keyboard browsing ghost-previews a flat row's prompt in the composer; a
  // group row puts the entry-time draft back. expectedTextRef marks the
  // write as navigation's own so the typing detector stays quiet.
  const previewRow = useCallback(
    (idx: number) => {
      const entry = entries[idx];
      if (!entry) return;
      const text = isGroup(entry) ? draftRef.current : promptOf(entry);
      expectedTextRef.current = text;
      aui.composer().setText(text);
    },
    [entries, aui],
  );

  // Returns the restored draft (when navigation was active) so callers can
  // hand it to openGroup without re-reading the still-flushing store.
  const cancelComposerNav = useCallback(() => {
    if (!composerNavRef.current) {
      exitComposerNav();
      return undefined;
    }
    const draft = draftRef.current;
    expectedTextRef.current = draft;
    aui.composer().setText(draft);
    exitComposerNav();
    return draft;
  }, [aui, exitComposerNav]);

  // Escape and Tab both leave the sub-level without selecting, so both put
  // the draft back; the group's own row comes back highlighted so the arrows
  // keep working. With a registry the return is virtual — the composer keeps
  // focus and keeps driving the arrows — otherwise the listbox takes DOM
  // focus.
  const returnToTop = useCallback(() => {
    const idx = group ? entries.indexOf(group) : -1;
    const draft = close();
    if (idx === -1) return;
    setTopIdx(idx);
    if (registry) {
      enterComposerNav(draft);
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

  // Composer-driven navigation only owns the arrows while the composer holds
  // text it wrote itself: any other edit means the user is composing again.
  // The check runs only when the rendered text changes: the store flushes a
  // macrotask after setText, so a check on the composerNav flip would compare
  // the pre-preview snapshot and abort navigation immediately.
  useEffect(() => {
    if (composerNavRef.current && composerText !== expectedTextRef.current)
      exitComposerNav();
  }, [composerText, exitComposerNav]);

  // The highlight would otherwise outlive the composer's focus: any pointer
  // press outside the list ends composer-driven navigation. The press is not
  // a selection, so the ghost preview gives way to the draft — a press on a
  // row stays live and its click handler commits instead.
  useEffect(() => {
    if (!composerNav) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && listRef.current?.contains(target)) return;
      cancelComposerNav();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [composerNav, cancelComposerNav]);

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
          if (idx === 0) cancelComposerNav();
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
          cancelComposerNav();
          e.preventDefault();
          return true;
        }
        if (e.key === "Tab") {
          cancelComposerNav();
          return false;
        }
        const entry = entries[idx];
        if (!entry) return false;
        if (e.key === "Enter") {
          if (isGroup(entry)) openGroup(entry);
          else getStackRows()[idx]?.ref.current?.click();
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
    cancelComposerNav,
    previewRow,
    caretAtEnd,
    setCursorPosition,
    getStackRows,
  ]);

  useEffect(() => {
    if (!registry || !composerNav || topIdx === null) return undefined;
    registry.setActiveDescendant("welcome-suggestions-top", {
      popoverId,
      highlightedItemId: rowId(topIdx),
    });
    return () => registry.setActiveDescendant("welcome-suggestions-top", null);
  }, [registry, composerNav, topIdx, popoverId, rowId]);

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
      getStackRows()[topIdx]?.ref.current?.click();
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
        cancelComposerNav();
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
      {group ? (
        <DismissableLayerPrimitive.Root
          asChild
          onEscapeKeyDown={() => returnToTop()}
          onFocusOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // A defaultPrevented pointerdown is an opt-out, so outside
            // controls can act on the open sub-level without dismissing it.
            const original = e.detail.originalEvent;
            const target = original.target as Element | null;
            if (
              original.defaultPrevented ||
              target?.closest('[data-slot*="composer"]')
            )
              e.preventDefault();
          }}
          onDismiss={() => close()}
        >
          <PickerCollection.Slot scope={undefined}>
            <div
              key={group.label}
              role="presentation"
              className="fade-in animate-in flex w-full flex-col duration-150"
            >
              {group.suggestions.map((item, idx) => (
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
          </PickerCollection.Slot>
        </DismissableLayerPrimitive.Root>
      ) : (
        <StackCollection.Slot scope={undefined}>
          <div
            role="presentation"
            className="fade-in animate-in flex w-full flex-col duration-150"
          >
            {entries.map((entry, idx) => (
              <StackCollection.ItemSlot key={idx} scope={undefined}>
                {isGroup(entry) ? (
                  <button
                    type="button"
                    {...rowProps(idx)}
                    className={welcomeSuggestionRowVariants({
                      density,
                      separators,
                    })}
                    onClick={() => {
                      // openGroup must capture the real draft, not a lingering
                      // ghost preview, so the restored value is handed through.
                      openGroup(entry, cancelComposerNav());
                    }}
                  >
                    {entry.icon}
                    {entry.label}
                    {chevron && (
                      <ChevronRightIcon className="text-muted-foreground ml-auto size-4 opacity-50 rtl:rotate-180" />
                    )}
                  </button>
                ) : (
                  <ThreadPrimitive.Suggestion
                    prompt={promptOf(entry)}
                    send={send}
                    {...rowProps(idx)}
                    className={welcomeSuggestionRowVariants({
                      density,
                      separators,
                    })}
                    // Runs before the suggestion trigger: send/clearComposer
                    // must act on the draft, not on the ghost preview.
                    onClick={() => cancelComposerNav()}
                  >
                    {entry.label}
                    <ActionGlyph indicator={resolvedIndicator} />
                  </ThreadPrimitive.Suggestion>
                )}
              </StackCollection.ItemSlot>
            ))}
          </div>
        </StackCollection.Slot>
      )}
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
