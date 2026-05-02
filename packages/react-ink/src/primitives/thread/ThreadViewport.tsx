import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentProps,
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
import { useAuiEvent } from "@assistant-ui/store";
import { ThreadViewportProvider } from "./ThreadViewportProvider";
import {
  useOptionalThreadViewport,
  useThreadViewport,
  type ThreadViewportStateSnapshot,
} from "./useThreadViewport";

export type ThreadViewportKeybindings = {
  pageUp?: string | string[] | undefined;
  pageDown?: string | string[] | undefined;
  top?: string | string[] | undefined;
  bottom?: string | string[] | undefined;
  lineUp?: string | string[] | undefined;
  lineDown?: string | string[] | undefined;
};

export type ThreadViewportProps = ComponentProps<typeof Box> & {
  children: ReactNode;
  height?: number | undefined;
  autoScroll?: boolean | undefined;
  initialScrollToBottom?: boolean | undefined;
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
  stickToBottomThreshold?: number | undefined;
  keybindings?: ThreadViewportKeybindings | false | undefined;
  renderPausedHint?:
    | ((state: ThreadViewportStateSnapshot) => ReactNode)
    | false
    | undefined;
};

const DEFAULT_KEYBINDINGS: ThreadViewportKeybindings = {
  pageUp: "pageup",
  pageDown: "pagedown",
  top: "home",
  bottom: "end",
};

const normalizeBinding = (binding?: string | string[]) => {
  if (!binding) return [];
  return Array.isArray(binding) ? binding : [binding];
};

const matchBinding = (input: string, key: Key, binding?: string | string[]) =>
  normalizeBinding(binding).some((entry) => {
    const parts = entry.toLowerCase().split("+");
    const keyName = parts[parts.length - 1];
    const wantsCtrl = parts.includes("ctrl");
    const wantsShift = parts.includes("shift");
    const wantsMeta = parts.includes("meta");

    const keyRecord = key as Key & {
      pageup?: boolean;
      pagedown?: boolean;
    };
    const matchedKey =
      keyName === "pageup"
        ? key.pageUp || keyRecord.pageup
        : keyName === "pagedown"
          ? key.pageDown || keyRecord.pagedown
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

const getPausedHintText = (newBelow: number) =>
  `[paused | End to resume | ${newBelow} new below]`;

const ThreadViewportInner = ({
  children,
  height,
  autoScroll: _autoScroll,
  initialScrollToBottom: _initialScrollToBottom,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
  stickToBottomThreshold: _stickToBottomThreshold,
  keybindings,
  renderPausedHint,
  ...boxProps
}: ThreadViewportProps) => {
  const viewport = useThreadViewport();
  const setViewportHeight = viewport.setViewportHeight;
  const setViewportWidth = viewport.setViewportWidth;
  const viewportRef = useRef<DOMElement>(null!);
  const viewportMetrics = useBoxMetrics(viewportRef);
  const effectiveHeight = height ?? viewportMetrics.height ?? 1;

  useLayoutEffect(() => {
    setViewportHeight(effectiveHeight > 0 ? effectiveHeight : 1);
    setViewportWidth(viewportMetrics.width > 0 ? viewportMetrics.width : 80);
  }, [
    effectiveHeight,
    setViewportHeight,
    setViewportWidth,
    viewportMetrics.width,
  ]);

  useAuiEvent("thread.runStart", () => {
    if (scrollToBottomOnRunStart) viewport.actions.scrollToBottom();
  });
  useAuiEvent("thread.initialize", () => {
    if (scrollToBottomOnInitialize) viewport.actions.scrollToBottom();
  });
  useAuiEvent("threadListItem.switchedTo", () => {
    if (scrollToBottomOnThreadSwitch) viewport.actions.scrollToBottom();
  });

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
        viewport.actions.scrollByPage("up");
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.pageDown)) {
        viewport.actions.scrollByPage("down");
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.top)) {
        viewport.actions.scrollToTop();
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.bottom)) {
        viewport.actions.scrollToBottom();
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.lineUp)) {
        viewport.actions.scrollBy(-1);
        return;
      }
      if (matchBinding(input, key, effectiveKeybindings.lineDown)) {
        viewport.actions.scrollBy(1);
      }
    },
    [effectiveKeybindings, viewport.actions],
  );

  useInput(handleInput, { isActive: effectiveKeybindings !== false });

  const newBelow = Math.max(
    0,
    viewport.state.messageKeys.length - viewport.state.visibleLastIndex - 1,
  );
  const shouldShowPausedHint =
    viewport.state.autoScroll === false &&
    viewport.state.maxScrollOffset > viewport.state.scrollOffset &&
    newBelow > 0;

  return (
    <Box flexDirection="column">
      <Box
        ref={viewportRef}
        height={height}
        minHeight={height === undefined ? 1 : undefined}
        overflowY="hidden"
        flexDirection="column"
        flexGrow={height === undefined ? 1 : undefined}
        {...boxProps}
      >
        {children}
      </Box>
      {shouldShowPausedHint && renderPausedHint !== false ? (
        renderPausedHint ? (
          renderPausedHint(viewport.state)
        ) : (
          <Text>{getPausedHintText(newBelow)}</Text>
        )
      ) : null}
    </Box>
  );
};

export const ThreadViewport = (props: ThreadViewportProps) => {
  const outerViewport = useOptionalThreadViewport();

  if (outerViewport) return <ThreadViewportInner {...props} />;

  return (
    <ThreadViewportProvider
      options={{
        autoScroll: props.autoScroll,
        initialScrollToBottom: props.initialScrollToBottom,
        stickToBottomThreshold: props.stickToBottomThreshold,
      }}
    >
      <ThreadViewportInner {...props} />
    </ThreadViewportProvider>
  );
};

ThreadViewport.displayName = "ThreadPrimitive.Viewport";

export namespace ThreadViewport {
  export type Props = ThreadViewportProps;
}
