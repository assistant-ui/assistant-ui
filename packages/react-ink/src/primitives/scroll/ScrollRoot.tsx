import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Box,
  Text,
  useBoxMetrics,
  useInput,
  type DOMElement,
  type Key,
} from "ink";
import { ScrollContext } from "./ScrollContext";
import { useItemHeights } from "./useItemHeights";
import {
  createScrollActions,
  type ScrollKey,
  useScrollState,
} from "./useScrollState";

export type ScrollKeybindings = {
  pageUp?: string | string[] | undefined;
  pageDown?: string | string[] | undefined;
  top?: string | string[] | undefined;
  bottom?: string | string[] | undefined;
  lineUp?: string | string[] | undefined;
  lineDown?: string | string[] | undefined;
};

export type ScrollRootProps<T> = {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: ((item: T, index: number) => ScrollKey) | undefined;
  height?: number | undefined;
  stickToBottomThreshold?: number | undefined;
  initialScrollToBottom?: boolean | undefined;
  keybindings?: ScrollKeybindings | false | undefined;
  renderPausedHint?: (() => ReactNode) | false | undefined;
  scrollbar?: ReactNode;
  children?: ReactNode;
};

const DEFAULT_KEYBINDINGS: ScrollKeybindings = {
  pageUp: "pageup",
  pageDown: "pagedown",
  top: "home",
  bottom: "end",
};

const normalizeBinding = (binding?: string | string[]) => {
  if (!binding) return [];
  return Array.isArray(binding) ? binding : [binding];
};

const matchBinding = (input: string, key: Key, binding?: string | string[]) => {
  return normalizeBinding(binding).some((entry) => {
    const parts = entry.toLowerCase().split("+");
    const keyName = parts[parts.length - 1];
    const wantsCtrl = parts.includes("ctrl");
    const wantsShift = parts.includes("shift");
    const wantsMeta = parts.includes("meta");

    const matchedKey =
      keyName === "pageup"
        ? key.pageUp
        : keyName === "pagedown"
          ? key.pageDown
          : keyName === "home"
            ? key.home
            : keyName === "end"
              ? key.end
              : keyName === "uparrow"
                ? key.upArrow
                : keyName === "downarrow"
                  ? key.downArrow
                  : input.toLowerCase() === keyName;

    return (
      matchedKey &&
      Boolean(key.ctrl) === wantsCtrl &&
      Boolean(key.shift) === wantsShift &&
      Boolean(key.meta) === wantsMeta
    );
  });
};

const getPausedHintText = (newBelow: number) => {
  return `[paused | End to resume | ${newBelow} new below]`;
};

const MeasuredScrollItem = ({
  itemKey,
  onHeightChange,
  children,
}: {
  itemKey: ScrollKey;
  onHeightChange: (itemKey: ScrollKey, height: number) => void;
  children: ReactNode;
}) => {
  const ref = useRef<DOMElement>(null!);
  const { height, hasMeasured } = useBoxMetrics(ref);

  useEffect(() => {
    if (!hasMeasured) return;
    onHeightChange(itemKey, height);
  }, [itemKey, height, hasMeasured, onHeightChange]);

  return <Box ref={ref}>{children}</Box>;
};

const ScrollInput = ({
  onInput,
}: {
  onInput: (input: string, key: Key) => void;
}) => {
  useInput(onInput);
  return null;
};

const AutoMeasuredViewport = <T,>({
  items,
  itemKeys,
  renderItem,
  updateItemHeight,
  scrollOffset,
  onViewportHeightChange,
}: {
  items: readonly T[];
  itemKeys: readonly ScrollKey[];
  renderItem: (item: T, index: number) => ReactNode;
  updateItemHeight: (itemKey: ScrollKey, height: number) => void;
  scrollOffset: number;
  onViewportHeightChange: (height: number) => void;
}) => {
  const viewportRef = useRef<DOMElement>(null!);
  const viewportMetrics = useBoxMetrics(viewportRef);

  useEffect(() => {
    onViewportHeightChange(viewportMetrics.height);
  }, [onViewportHeightChange, viewportMetrics.height]);

  return (
    <Box
      ref={viewportRef}
      overflowY="hidden"
      flexDirection="column"
      flexGrow={1}
    >
      <Box flexDirection="column" marginTop={-scrollOffset}>
        {items.map((item, index) => (
          <MeasuredScrollItem
            key={String(itemKeys[index])}
            itemKey={itemKeys[index]!}
            onHeightChange={updateItemHeight}
          >
            {renderItem(item, index)}
          </MeasuredScrollItem>
        ))}
      </Box>
    </Box>
  );
};

export const ScrollRoot = <T,>({
  items,
  renderItem,
  keyExtractor,
  height,
  stickToBottomThreshold = 2,
  initialScrollToBottom = true,
  keybindings,
  renderPausedHint,
  scrollbar,
  children,
}: ScrollRootProps<T>) => {
  const [measuredViewportHeight, setMeasuredViewportHeight] = useState(0);
  const hasEverPinnedToBottomRef = useRef(initialScrollToBottom);
  const itemKeys = useMemo(
    () => items.map((item, index) => keyExtractor?.(item, index) ?? index),
    [items, keyExtractor],
  );

  const { itemHeights, itemKeyOrder, updateItemHeight } = useItemHeights({
    itemKeys,
  });

  const { state, derived, dispatchWithDerived } = useScrollState({
    viewportHeight: height ?? measuredViewportHeight,
    itemHeights,
    itemKeyOrder,
    itemCount: items.length,
    stickToBottomThreshold,
    initialScrollToBottom,
  });

  const actions = useMemo(
    () => createScrollActions(dispatchWithDerived),
    [dispatchWithDerived],
  );

  const effectiveKeybindings = useMemo(() => {
    if (keybindings === false) return false;
    return {
      ...DEFAULT_KEYBINDINGS,
      ...keybindings,
    };
  }, [keybindings]);

  const handleInput = useCallback(
    (input: string, key: Key) => {
      if (!effectiveKeybindings) return;
      if (matchBinding(input, key, effectiveKeybindings.pageUp)) {
        actions.scrollByPage("up");
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.pageDown)) {
        actions.scrollByPage("down");
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.top)) {
        actions.scrollToTop();
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.bottom)) {
        actions.scrollToBottom();
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.lineUp)) {
        actions.scrollBy(-1);
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.lineDown)) {
        actions.scrollBy(1);
      }
    },
    [actions, effectiveKeybindings],
  );

  useEffect(() => {
    if (derived.isAtBottom) {
      hasEverPinnedToBottomRef.current = true;
    }
  }, [derived.isAtBottom]);

  const newBelow = Math.max(0, items.length - derived.visibleLastIndex - 1);
  const shouldShowPausedHint =
    hasEverPinnedToBottomRef.current &&
    state.autoScroll === false &&
    derived.maxScrollOffset > state.scrollOffset;

  const contextValue = useMemo(
    () => ({
      state,
      derived,
      actions,
    }),
    [state, derived, actions],
  );

  return (
    <ScrollContext.Provider value={contextValue}>
      <Box flexDirection="column">
        {effectiveKeybindings ? <ScrollInput onInput={handleInput} /> : null}
        <Box flexDirection="row">
          {height !== undefined ? (
            <Box height={height} overflowY="hidden" flexDirection="column">
              <Box flexDirection="column" marginTop={-state.scrollOffset}>
                {items.map((item, index) => (
                  <MeasuredScrollItem
                    key={String(itemKeys[index])}
                    itemKey={itemKeys[index]!}
                    onHeightChange={updateItemHeight}
                  >
                    {renderItem(item, index)}
                  </MeasuredScrollItem>
                ))}
              </Box>
            </Box>
          ) : (
            <AutoMeasuredViewport
              items={items}
              itemKeys={itemKeys}
              renderItem={renderItem}
              updateItemHeight={updateItemHeight}
              scrollOffset={state.scrollOffset}
              onViewportHeightChange={setMeasuredViewportHeight}
            />
          )}
          {scrollbar ? <Box marginLeft={1}>{scrollbar}</Box> : null}
        </Box>
        {shouldShowPausedHint &&
          renderPausedHint !== false &&
          (renderPausedHint ? (
            renderPausedHint()
          ) : (
            <Text>{getPausedHintText(newBelow)}</Text>
          ))}
        {children}
      </Box>
    </ScrollContext.Provider>
  );
};

ScrollRoot.displayName = "ScrollPrimitive.Root";

export namespace ScrollRoot {
  export type Props<T> = ScrollRootProps<T>;
}
