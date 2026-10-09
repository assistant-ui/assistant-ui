import { useCallback, useEffect, useRef, useState } from "react";

function syncEventName(storageKey: string) {
  return `command-tabs:${storageKey}`;
}

export function useCommandTabsState(
  commands: Record<string, string>,
  storageKey?: string,
  onValueChange?: (value: string) => void,
) {
  const labels = Object.keys(commands);
  const [active, setActive] = useState(labels[0] ?? "");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const copyScope = useRef(0);

  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  useEffect(() => {
    return () => {
      copyScope.current += 1;
      clearTimeout(copyTimer.current);
      copyTimer.current = undefined;
      setCopied(false);
    };
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {}
    if (stored && Object.hasOwn(commandsRef.current, stored)) setActive(stored);

    const onSync = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (Object.hasOwn(commandsRef.current, value)) setActive(value);
    };
    window.addEventListener(syncEventName(storageKey), onSync);
    return () => window.removeEventListener(syncEventName(storageKey), onSync);
  }, [storageKey]);

  const select = useCallback(
    (value: string) => {
      setActive(value);
      onValueChange?.(value);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, value);
      } catch {}
      window.dispatchEvent(
        new CustomEvent(syncEventName(storageKey), { detail: value }),
      );
    },
    [storageKey, onValueChange],
  );

  const copy = useCallback(async (command: string) => {
    const scope = copyScope.current;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    if (scope !== copyScope.current) return;

    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      copyTimer.current = undefined;
      setCopied(false);
    }, 1500);
  }, []);

  const activeLabel = Object.hasOwn(commands, active)
    ? active
    : (labels[0] ?? "");

  return { labels, activeLabel, copied, select, copy };
}
