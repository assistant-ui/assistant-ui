import { useCallback, useRef } from "react";
import { parseA2uiMessage } from "../protocol/parser";
import type { A2uiServerMessage } from "../types";

export function createA2uiMessageHandler(
  processMessage: (msg: A2uiServerMessage) => void,
): (event: { name: string; value: unknown }) => void {
  return (event) => {
    if (!event.name.startsWith("a2ui:")) return;
    const type = event.name.slice("a2ui:".length);
    const payload =
      event.value && typeof event.value === "object" ? event.value : {};
    const parsed = parseA2uiMessage({
      type,
      ...(payload as Record<string, unknown>),
    });
    if (parsed) processMessage(parsed);
  };
}

export function useA2uiAgUiBridge(): {
  handleEvent: (event: { name: string; value: unknown }) => void;
  connect: (processMessage: (msg: A2uiServerMessage) => void) => void;
} {
  const processMessageRef = useRef<((msg: A2uiServerMessage) => void) | null>(
    null,
  );

  const handleEvent = useCallback((event: { name: string; value: unknown }) => {
    if (!processMessageRef.current) return;
    createA2uiMessageHandler(processMessageRef.current)(event);
  }, []);

  const connect = useCallback(
    (processMessage: (msg: A2uiServerMessage) => void) => {
      processMessageRef.current = processMessage;
    },
    [],
  );

  return { handleEvent, connect };
}
