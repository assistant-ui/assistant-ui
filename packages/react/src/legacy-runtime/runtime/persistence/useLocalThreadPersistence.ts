import { useEffect, useRef } from "react";
import type { AssistantRuntime } from "../AssistantRuntime";
import type { ExportedMessageRepository } from "../../runtime-cores/utils/MessageRepository";

type UseLocalThreadPersistenceOptions = {
  /**
   * Whether persistence is enabled.
   * Defaults to true.
   */
  enabled?: boolean;

  /**
   * Storage key used in localStorage.
   * Defaults to "assistant-ui:thread".
   */
  key?: string;

  /**
   * Debounce duration (in ms) before writing to storage.
   * Defaults to 300ms.
   */
  debounceMs?: number;
};

/**
 * A small opt-in React hook that persists and restores the currently active assistant thread using browser storage.
 *
 * This hook persists only the currently active thread.
 * It does not persist thread list state or archived threads.
 *
 * @example
 * const runtime = useLocalRuntime(adapter);
 *
 * useLocalThreadPersistence(runtime, {
 *   key: "my-app:assistant",
 *   debounceMs: 500,
 * });
 *
 * IMPORTANT SCOPE NOTE
 * --------------------
 * Currently this hook is intended for runtimes that *own* their message state,
 * such as LocalRuntime.
 *
 * It does NOT currently work with AI SDK–based runtimes (e.g. useChatRuntime), where thread state is derived from an external adapter and rehydrated on mount.
 *
 * For AI SDK runtimes, persistence must happen at the adapter level (before the runtime is created), not via runtime.thread import/export.
 */
export function useLocalThreadPersistence(
  runtime: AssistantRuntime | null | undefined,
  options: UseLocalThreadPersistenceOptions = {},
) {
  // Defaults
  const key = options.key ?? "assistant-ui:thread";
  const enabled = options.enabled ?? true;
  const debounceMs = options.debounceMs ?? 300;

  const restoredKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  /**
   * Restore persisted state once on mount
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!enabled || !runtime || restoredKeyRef.current === key) {
      return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      restoredKeyRef.current = key;
      return;
    }

    try {
      const snapshot = JSON.parse(raw) as ExportedMessageRepository;
      if (snapshot && snapshot.messages) {
        runtime.thread.import(snapshot);
      } else {
        console.warn(
          "[assistant-ui] Failed to restore local thread: invalid data format",
        );
      }
    } catch (err) {
      console.warn(
        "[assistant-ui] Failed to restore local thread persistence",
        err,
      );
    }

    restoredKeyRef.current = key;
  }, [runtime, enabled, key]);

  /**
   * Persist thread state on changes
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!enabled || !runtime) {
      return;
    }

    const unsubscribe = runtime.thread.subscribe(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        try {
          const snapshot = runtime.thread.export();
          localStorage.setItem(key, JSON.stringify(snapshot));
        } catch (err) {
          console.warn(
            "[assistant-ui] Failed to persist local thread state",
            err,
          );
        }
      }, debounceMs);
    });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubscribe();
    };
  }, [runtime, enabled, key, debounceMs]);
}
