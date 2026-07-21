"use client";

import {
  ThreadPrimitive,
  unstable_useComposerInputPluginRegistry,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { ChevronRightIcon, XIcon } from "lucide-react";
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

const [ListCollection, useListCollection] =
  CollectionPrimitive.createCollection<HTMLButtonElement>("ThreadWelcomeList");

const [StackCollection, useStackCollection] =
  CollectionPrimitive.createCollection<HTMLButtonElement>("ThreadWelcomeStack");

const pillClass =
  "text-foreground hover:bg-muted border-border/60 inline-flex h-auto items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors [&_svg]:size-4";

const pickerItemClass =
  "text-foreground/80 hover:text-foreground data-[highlighted]:bg-muted/70 data-[highlighted]:text-foreground after:border-border/50 relative flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm after:pointer-events-none after:absolute after:inset-x-[1.5%] after:bottom-0 after:border-b last:after:hidden data-[highlighted]:after:hidden [&:has(+[data-highlighted])]:after:hidden [&_svg]:size-4";

type WelcomeSuggestionsContextValue = {
  entries: readonly SuggestionEntry[];
  group: SuggestionGroup | undefined;
  openGroup: (group: SuggestionGroup) => void;
  close: (options?: { restoreDraft?: boolean }) => void;
  moveHighlight: (delta: 1 | -1) => void;
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

  // Escape is cancel: it puts back the draft captured at open time. Tab and
  // selection keep whatever the picker wrote.
  const close = useCallback(
    (options?: { restoreDraft?: boolean }) => {
      setOpenLabel(null);
      setCurrentId(null);
      if (options?.restoreDraft) aui.composer().setText(draftRef.current);
    },
    [aui],
  );

  const openGroup = useCallback(
    (g: SuggestionGroup) => {
      setOpenLabel(g.label);
      setCurrentId(null);
      currentIdRef.current = null;
      draftRef.current = aui.composer().getState().text;
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
      const next = items[nextIndex]!;
      currentIdRef.current = next.id;
      setCurrentId(next.id);
      // Overwriting is safe while open: typing closes the panel, so the
      // composer only holds the open-time draft or a previous preview.
      expectedTextRef.current = next.prompt;
      aui.composer().setText(next.prompt);
    },
    [aui, getItems],
  );

  // Any composer text the picker did not write itself means the user is
  // typing (or a selection cleaned the preview up): hand control back.
  useEffect(() => {
    if (group && composerText !== expectedTextRef.current) close();
  }, [group, composerText, close]);

  return useMemo<WelcomeSuggestionsContextValue>(
    () => ({
      entries,
      group,
      openGroup,
      close,
      moveHighlight,
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
      <ListCollection.Provider scope={undefined}>
        <StackCollection.Provider scope={undefined}>
          <WelcomeSuggestionsState suggestions={suggestions} send={send}>
            {children}
          </WelcomeSuggestionsState>
        </StackCollection.Provider>
      </ListCollection.Provider>
    </PillCollection.Provider>
  </PickerCollection.Provider>
);

export const WelcomeSuggestionsPills: FC = () => {
  const { entries, group, openGroup, send } = useWelcomeSuggestions();
  const direction = Direction.useDirection();
  const getPills = usePillCollection(undefined);

  const onPillKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    entry: SuggestionEntry,
  ) => {
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
        "scrollbar-none w-full overflow-x-auto",
        group && "invisible",
      )}
    >
      <PillCollection.Slot scope={undefined}>
        <div className="mx-auto flex w-max max-w-full flex-wrap items-center justify-center gap-2">
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

export const WelcomeSuggestionsList: FC = () => {
  const { entries, send } = useWelcomeSuggestions();
  const getListItems = useListCollection(undefined);
  const items = entries.filter((e): e is SuggestionItem => !isGroup(e));

  const onItemKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const nodes = getListItems()
      .map((item) => item.ref.current)
      .filter((node): node is HTMLButtonElement => node !== null);
    const next =
      nodes[nodes.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) {
      next.focus();
      e.preventDefault();
    }
  };

  return (
    <ListCollection.Slot scope={undefined}>
      <div
        data-slot="aui_thread-welcome-suggestions-list"
        className="flex w-full flex-col"
      >
        {items.map((item, idx) => (
          <ListCollection.ItemSlot key={idx} scope={undefined}>
            <ThreadPrimitive.Suggestion
              prompt={promptOf(item)}
              send={send}
              data-slot="aui_thread-welcome-list-item"
              className={cn(pickerItemClass)}
              onKeyDown={onItemKeyDown}
            >
              {item.label}
            </ThreadPrimitive.Suggestion>
          </ListCollection.ItemSlot>
        ))}
      </div>
    </ListCollection.Slot>
  );
};

export type WelcomeSuggestionsPickerItemProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "onClick"
> & {
  prompt: string;
  label?: ReactNode;
};

export const WelcomeSuggestionsPickerItem: FC<
  WelcomeSuggestionsPickerItemProps
> = ({ prompt, label, children, className, ...props }) => {
  const id = useId();
  const { currentId, setCurrentId, close, send } = useWelcomeSuggestions();
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
        onMouseMove={() => setCurrentId(id)}
        className={cn(pickerItemClass, className)}
        {...props}
      >
        {children ?? label}
      </ThreadPrimitive.Suggestion>
    </PickerCollection.ItemSlot>
  );
};

// Mounted by surfaces whose open group is composer-driven (Picker, Stack's
// sub-level). The composer keeps focus while the group is open; this plugin
// routes its keydowns to panel navigation. Tab returns false so the native
// focus move proceeds (the previewed prompt stays: Tab reads as
// accept-without-send). Surfaces with their own keyboard home (the Stack's
// top-level listbox) pass onEscape to also take focus back on cancel.
const useComposerCoupling = (onEscape?: () => void) => {
  const registry = unstable_useComposerInputPluginRegistry();
  const { group, moveHighlight, selectCurrent, close, currentId, popoverId } =
    useWelcomeSuggestions();
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
          moveHighlight(-1);
          e.preventDefault();
          return true;
        }
        if (e.key === "Enter" && currentIdRef.current) {
          selectCurrent();
          e.preventDefault();
          return true;
        }
        if (e.key === "Escape") {
          if (onEscape) onEscape();
          else close({ restoreDraft: true });
          return true;
        }
        if (e.key === "Tab") {
          close();
          return false;
        }
        return false;
      },
      setCursorPosition() {},
    });
  }, [registry, group, moveHighlight, selectCurrent, close, onEscape]);

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

export const WelcomeSuggestionsPicker: FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const {
    group,
    close,
    moveHighlight,
    selectCurrent,
    currentId,
    popoverId,
    hasRegistry,
  } = useWelcomeSuggestions();
  useComposerCoupling();
  const listboxRef = useRef<HTMLDivElement>(null);

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
      close();
    }
  };

  if (!group) return null;
  return (
    <DismissableLayerPrimitive.Root
      asChild
      onEscapeKeyDown={() => close({ restoreDraft: true })}
      onFocusOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => {
        const target = e.detail.originalEvent.target as Element | null;
        if (target?.closest('[data-slot*="composer"]')) e.preventDefault();
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
            onClick={() => close({ restoreDraft: true })}
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
// rows, and Escape can hand focus back for arrow nav to continue. The
// DismissableLayer wraps only the sub-level's children, not the container:
// remounting the container on close would drop the restored focus.
export const WelcomeSuggestionsStack: FC = () => {
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
  const direction = Direction.useDirection();
  const getStackRows = useStackCollection(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const [topIdx, setTopIdx] = useState<number | null>(null);
  const rowId = (idx: number) => `${popoverId}t${idx}`;

  // Escape is cancel-and-return: the group's own row comes back highlighted
  // with the listbox focused, so the arrows keep working after backing out.
  const cancelClose = useCallback(() => {
    if (group) {
      const idx = entries.indexOf(group);
      if (idx !== -1) setTopIdx(idx);
      listRef.current?.focus({ preventScroll: true });
    }
    close({ restoreDraft: true });
  }, [group, entries, close]);

  useComposerCoupling(cancelClose);

  useEffect(() => {
    if (group) setTopIdx(null);
  }, [group]);

  useEffect(() => {
    if (group && !hasRegistry) listRef.current?.focus();
  }, [group, hasRegistry]);

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
        close();
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
  const rowProps = (idx: number) => ({
    id: rowId(idx),
    "data-slot": "aui_thread-welcome-stack-row",
    role: "option",
    "aria-selected": topIdx === idx,
    "data-highlighted": topIdx === idx || undefined,
    tabIndex: -1,
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onMouseMove: () => setTopIdx(idx),
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
        if (!group) setTopIdx((idx) => idx ?? 0);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setTopIdx(null);
      }}
      onMouseLeave={() => {
        if (!group && document.activeElement !== listRef.current)
          setTopIdx(null);
      }}
      data-slot="aui_thread-welcome-stack"
      className="flex w-full flex-col outline-none"
    >
      {group ? (
        <DismissableLayerPrimitive.Root
          asChild
          onEscapeKeyDown={() => cancelClose()}
          onFocusOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            const target = e.detail.originalEvent.target as Element | null;
            if (target?.closest('[data-slot*="composer"]')) e.preventDefault();
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
                    className={cn(pickerItemClass, "group")}
                    onClick={() => openGroup(entry)}
                  >
                    {entry.icon}
                    {entry.label}
                    <ChevronRightIcon className="text-muted-foreground/30 group-data-[highlighted]:text-muted-foreground/70 ml-auto size-4 transition-colors" />
                  </button>
                ) : (
                  <ThreadPrimitive.Suggestion
                    prompt={promptOf(entry)}
                    send={send}
                    {...rowProps(idx)}
                    className={cn(pickerItemClass)}
                  >
                    {entry.label}
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

const WelcomeSuggestionsContent: FC = () => {
  const { entries } = useWelcomeSuggestions();
  if (entries.some(isGroup)) {
    return (
      <>
        <WelcomeSuggestionsPills />
        <WelcomeSuggestionsPicker />
      </>
    );
  }
  return <WelcomeSuggestionsList />;
};

export const ThreadWelcomeSuggestions: FC<{
  suggestions?: readonly SuggestionEntry[] | undefined;
  send?: boolean | undefined;
}> = ({ suggestions, send }) => (
  <WelcomeSuggestionsRoot suggestions={suggestions} send={send}>
    <WelcomeSuggestionsContent />
  </WelcomeSuggestionsRoot>
);
