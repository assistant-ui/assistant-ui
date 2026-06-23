"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DevToolsOverlay } from "./shell/DevToolsOverlay";
import { ShadowRoot } from "./shell/ShadowRoot";
import type { DevToolsModalProps } from "./DevToolsModal";

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

  // Stable element identity so the shadow root only re-renders on real changes,
  // not on every render of the host tree.
  const overlay = useMemo(
    () => (
      <DevToolsOverlay theme={resolved} plugins={plugins} client={client} />
    ),
    [resolved, plugins, client],
  );

  return <ShadowRoot theme={resolved}>{overlay}</ShadowRoot>;
};

export default DevToolsModalImpl;
