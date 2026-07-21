"use client";

import {
  ThreadPrimitive,
  unstable_useComposerInputPluginRegistry,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { XIcon } from "lucide-react";
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

const pillClass =
  "text-foreground hover:bg-muted border-border/60 inline-flex h-auto items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors [&_svg]:size-4";

const pickerItemClass =
  "aui-thread-welcome-picker-item text-foreground/80 hover:text-foreground data-[highlighted]:bg-muted/70 data-[highlighted]:text-foreground after:border-border/50 relative flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm after:pointer-events-none after:absolute after:inset-x-[1.5%] after:bottom-0 after:border-b last:after:hidden data-[highlighted]:after:hidden [&:has(+[data-highlighted])]:after:hidden [&_svg]:size-4";

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
  defaultOpen,
}: {
  suggestions: readonly SuggestionEntry[] | undefined;
  send: boolean;
  defaultOpen: string | undefined;
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

  const [openLabel, setOpenLabel] = useState<string | null>(
    defaultOpen ?? null,
  );
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

  // The composer keeps focus while the panel is open; this plugin routes its
  // keydowns to panel navigation. Tab returns false so the native focus move
  // proceeds (the previewed prompt stays: Tab reads as accept-without-send).
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
          close({ restoreDraft: true });
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
  }, [registry, group, moveHighlight, selectCurrent, close]);

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
  defaultOpen: string | undefined;
  children: ReactNode;
}> = ({ suggestions, send, defaultOpen, children }) => {
  const value = useWelcomeSuggestionsState({
    suggestions,
    send,
    defaultOpen,
  });

  if (value.entries.length === 0) return null;

  return (
    <WelcomeSuggestionsContext.Provider value={value}>
      <div className="aui-thread-welcome-suggestions relative mt-1 w-full">
        {children}
      </div>
    </WelcomeSuggestionsContext.Provider>
  );
};

export const WelcomeSuggestionsRoot: FC<{
  suggestions?: readonly SuggestionEntry[] | undefined;
  send?: boolean | undefined;
  defaultOpen?: string | undefined;
  children: ReactNode;
}> = ({ suggestions, send = true, defaultOpen, children }) => (
  <PickerCollection.Provider scope={undefined}>
    <PillCollection.Provider scope={undefined}>
      <ListCollection.Provider scope={undefined}>
        <WelcomeSuggestionsState
          suggestions={suggestions}
          send={send}
          defaultOpen={defaultOpen}
        >
          {children}
        </WelcomeSuggestionsState>
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
        <div className="mx-auto flex w-max items-center gap-2">
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
      <div className="aui-thread-welcome-suggestions-list flex w-full flex-col">
        {items.map((item, idx) => (
          <ListCollection.ItemSlot key={idx} scope={undefined}>
            <ThreadPrimitive.Suggestion
              prompt={promptOf(item)}
              send={send}
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
      <div className="aui-thread-welcome-picker fade-in slide-in-from-top-1 animate-in absolute inset-x-[2.5%] top-0 z-10 duration-150">
        <div className="aui-thread-welcome-picker-header text-muted-foreground/80 flex items-center justify-between gap-2 px-3 pb-2 text-xs font-medium">
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
  defaultOpen?: string | undefined;
}> = ({ suggestions, send, defaultOpen }) => (
  <WelcomeSuggestionsRoot
    suggestions={suggestions}
    send={send}
    defaultOpen={defaultOpen}
  >
    <WelcomeSuggestionsContent />
  </WelcomeSuggestionsRoot>
);
