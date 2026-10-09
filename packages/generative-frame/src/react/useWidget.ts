import { useCallback, useEffect, useRef, useState } from "react";
import { RPC_ERROR, RpcError } from "../rpc";
import {
  createWidget,
  type CreateWidgetOptions,
  type WidgetHandle,
  type WidgetHandlers,
} from "../widget";

export type UseWidgetOptions = Omit<CreateWidgetOptions, "container" | "code">;

export type UseWidgetResult = {
  /** Attach to the element the frame mounts in. */
  ref: (element: HTMLElement | null) => void;
  /** The mounted widget, or `null` before mount and after unmount. */
  widget: WidgetHandle | null;
};

const HANDLER_KEYS = [
  "onPrompt",
  "onMessage",
  "onOpenLink",
  "onCallTool",
  "onRequestDisplayMode",
  "onUpdateModelContext",
  "onWidgetState",
  "onResize",
  "onError",
  "onLog",
] as const satisfies readonly (keyof WidgetHandlers)[];

/**
 * Mounts a widget frame into the element passed to `ref`. Mount options are
 * read once per mount; handlers always call their latest version, and a
 * changed `tokens` object is sent to the frame as a theme change.
 */
export function useWidget(options: UseWidgetOptions = {}): UseWidgetResult {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [widget, setWidget] = useState<WidgetHandle | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!element) return;
    const initial = optionsRef.current;
    const handlers: Record<string, unknown> = {};
    for (const key of HANDLER_KEYS) {
      if (!initial[key]) continue;
      handlers[key] = (...args: unknown[]) => {
        const handler = optionsRef.current[key] as
          | ((...args: unknown[]) => unknown)
          | undefined;
        if (!handler) {
          throw new RpcError(
            RPC_ERROR.methodNotFound,
            `${key} is no longer handled`,
          );
        }
        return handler(...args);
      };
    }
    const handle = createWidget({
      ...initial,
      ...(handlers as WidgetHandlers),
      container: element,
    });
    setWidget(handle);
    return () => {
      handle.dispose();
      setWidget(null);
    };
  }, [element]);

  const tokens = options.tokens;
  const sentTokens = useRef(tokens);
  useEffect(() => {
    if (!widget || !tokens || sentTokens.current === tokens) return;
    sentTokens.current = tokens;
    widget.setTheme(tokens);
  }, [widget, tokens]);

  const ref = useCallback((next: HTMLElement | null) => setElement(next), []);
  return { ref, widget };
}
