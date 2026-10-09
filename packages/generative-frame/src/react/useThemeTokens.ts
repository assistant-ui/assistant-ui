import { useEffect, useState } from "react";
import {
  DEFAULT_LIGHT_TOKENS,
  readThemeTokens,
  type ThemeTokenSources,
  type ThemeTokens,
} from "../theme";

const sameTokens = (a: ThemeTokens, b: ThemeTokens) =>
  a.colorScheme === b.colorScheme &&
  JSON.stringify(a.variables) === JSON.stringify(b.variables);

/**
 * Reads the page's theme tokens and re-reads them when the root element's
 * class, style, or theme attributes change, or the system color scheme flips.
 */
export function useThemeTokens(
  element?: Element | null,
  sources?: ThemeTokenSources,
): ThemeTokens {
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_LIGHT_TOKENS);
  const sourcesKey = JSON.stringify(sources ?? {});

  useEffect(() => {
    const target = element ?? document.documentElement;
    const parsedSources = JSON.parse(sourcesKey) as ThemeTokenSources;
    const update = () => {
      const next = readThemeTokens(target, parsedSources);
      setTokens((previous) => (sameTokens(previous, next) ? previous : next));
    };
    update();

    const observer = new MutationObserver(update);
    const attributeFilter = ["class", "style", "data-theme", "data-mode"];
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter,
    });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter });
    }
    if (target !== document.documentElement && target !== document.body) {
      observer.observe(target, { attributes: true, attributeFilter });
    }
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media?.removeEventListener("change", update);
    };
  }, [element, sourcesKey]);

  return tokens;
}
