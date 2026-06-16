"use client";

import { useSyncExternalStore } from "react";
import { DevToolsOverlay } from "./shell/DevToolsOverlay";
import { ShadowRoot } from "./shell/ShadowRoot";
import type { DevToolsPanelPlugin } from "./shell/registry";
import type { DevToolsClient } from "./data/types";

export interface DevToolsModalProps {
  /** Extra inspector tabs appended after the builtins. */
  plugins?: DevToolsPanelPlugin[];
  /** Force a theme. Defaults to "system", which follows the host `.dark` class. */
  theme?: "light" | "dark" | "system";
  /** Data source. Defaults to the in-process DevToolsHooks client. */
  client?: DevToolsClient;
}

const isDarkMode = (): boolean => {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark")
  );
};

const subscribeToThemeChanges = (callback: () => void) => {
  if (typeof MutationObserver === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  if (document.body !== document.documentElement) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  return () => observer.disconnect();
};

const DevToolsModalImpl = ({
  plugins,
  theme = "system",
  client,
}: DevToolsModalProps) => {
  const darkMode = useSyncExternalStore(
    subscribeToThemeChanges,
    isDarkMode,
    () => false,
  );
  const resolved = theme === "system" ? (darkMode ? "dark" : "light") : theme;

  return (
    <ShadowRoot theme={resolved}>
      <DevToolsOverlay theme={resolved} plugins={plugins} client={client} />
    </ShadowRoot>
  );
};

// Renders only in development; production bundlers dead-code-eliminate the body.
export const DevToolsModal = (props: DevToolsModalProps = {}) => {
  if (
    typeof process !== "undefined" &&
    process.env?.NODE_ENV === "production"
  ) {
    return null;
  }

  return <DevToolsModalImpl {...props} />;
};
