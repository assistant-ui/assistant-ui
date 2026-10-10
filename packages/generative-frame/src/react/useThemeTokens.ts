import { useSyncExternalStore } from "react";
import {
  DEFAULT_LIGHT_TOKENS,
  type ThemeTokenSources,
  type ThemeTokens,
} from "../theme";
import { getThemeTokenStore, type ThemeObserveOptions } from "./themeStore";

const noStore = {
  subscribe: () => () => {},
  getSnapshot: () => DEFAULT_LIGHT_TOKENS,
};
const getServerSnapshot = () => DEFAULT_LIGHT_TOKENS;

/**
 * Reads the page's theme tokens and keeps them current. All components that
 * ask for the same element, sources, and options share one observer, and a
 * theme change costs one read per animation frame however many widgets use
 * it. The first client render already has the page's tokens; the server
 * render uses the light defaults.
 */
export function useThemeTokens(
  element?: Element | null,
  sources?: ThemeTokenSources,
  options: ThemeObserveOptions = {},
): ThemeTokens {
  const target =
    element ??
    (typeof document === "undefined" ? undefined : document.documentElement);
  const store = target ? getThemeTokenStore(target, sources, options) : noStore;
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
}
