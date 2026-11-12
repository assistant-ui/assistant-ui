/**
 * React sugar over `window.rc`. A React app does not need this package to
 * be a remote component (layout, theme and focus work without it); it is
 * only for reading props and opening overlays from React.
 * Importing it starts the runtime if the page has no `rc-runtime.js` tag.
 */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  rc,
  type DismissReason,
  type OverlayHandle,
  type Placement,
  type RcOverlayOptions,
} from "@assistant-ui/remote-components-runtime";

export { rc };
export type { DismissReason, OverlayHandle, Placement };

const subscriber =
  (type: "props-changed" | "theme-changed") => (fn: () => void) => {
    rc.addEventListener(type, fn);
    return () => rc.removeEventListener(type, fn);
  };
const onProps = subscriber("props-changed");
const onTheme = subscriber("theme-changed");
const getProps = (): Record<string, unknown> => rc.props;

/** The host's props (`rc.props`). Function props are async calls into the host. */
export function useProps<P extends object = Record<string, unknown>>(): P {
  return useSyncExternalStore(onProps, getProps, getProps) as P;
}

let themeVersion = 0;
const getThemeVersion = (): number => themeVersion;
if (typeof window !== "undefined")
  rc.addEventListener("theme-changed", () => themeVersion++);

/**
 * Counts `theme-changed` events. Use it as an effect dependency to re-read
 * computed styles (a canvas chart that reads `--chart-1`). CSS needs nothing.
 */
export function useThemeVersion(): number {
  return useSyncExternalStore(onTheme, getThemeVersion, getThemeVersion);
}

export interface UseOverlayOptions extends Omit<
  RcOverlayOptions,
  "anchor" | "onDismiss"
> {
  /** Anchor ref for popovers. */
  anchorRef?: RefObject<Element | null>;
}

/**
 * Controlled overlay (`rc.overlay`). While `open` is true the host renders
 * the content with `props`; prop changes are forwarded.
 * `onOpenChange(false, reason)` is called when the host dismisses it.
 */
export function useOverlay(
  open: boolean,
  onOpenChange: (open: boolean, reason?: DismissReason) => void,
  options: UseOverlayOptions,
): OverlayHandle | null {
  const [handle, setHandle] = useState<OverlayHandle | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;
  const changeRef = useRef(onOpenChange);
  changeRef.current = onOpenChange;
  const handleRef = useRef<OverlayHandle | null>(null);

  useEffect(() => {
    if (!open) return;
    const { anchorRef, ...rest } = optsRef.current;
    const h = rc.overlay({
      ...rest,
      anchor: anchorRef?.current ?? null,
      onDismiss: (reason) => changeRef.current(false, reason),
    });
    h.ready.catch((err: unknown) => {
      console.error("[rc] overlay rejected", err);
      changeRef.current(false, "error");
    });
    handleRef.current = h;
    setHandle(h);
    return () => {
      h.close();
      handleRef.current = null;
      setHandle(null);
    };
  }, [open, options.src, options.html, options.kind]);

  const props = options.props;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (props !== undefined) handleRef.current?.update(props);
  }, [props]);

  const { placement, offset, label, matchAnchorWidth } = options;
  useEffect(() => {
    const h = handleRef.current;
    if (h === null) return;
    const anchor = optsRef.current.anchorRef?.current;
    h.setOptions({
      ...(placement !== undefined ? { placement } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(matchAnchorWidth !== undefined ? { matchAnchorWidth } : {}),
      ...(anchor !== undefined && anchor !== null ? { anchor } : {}),
    });
  });
  return handle;
}
