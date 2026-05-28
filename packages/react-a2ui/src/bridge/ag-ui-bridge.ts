import { useCallback, useRef } from "react";
import { parseA2uiMessage } from "../protocol/parser";
import type { A2uiServerMessage } from "../types";

function parseAgUiEvent(event: {
  name: string;
  value: unknown;
}): A2uiServerMessage | null {
  if (!event.name.startsWith("a2ui:")) return null;
  const type = event.name.slice("a2ui:".length);
  const payload =
    event.value && typeof event.value === "object" ? event.value : {};
  return parseA2uiMessage({
    ...(payload as Record<string, unknown>),
    type,
  });
}

export function createA2uiMessageHandler(
  processMessage: (msg: A2uiServerMessage) => void,
): (event: { name: string; value: unknown }) => void {
  return (event) => {
    const parsed = parseAgUiEvent(event);
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
    const parsed = parseAgUiEvent(event);
    if (parsed) processMessageRef.current(parsed);
  }, []);

  const connect = useCallback(
    (processMessage: (msg: A2uiServerMessage) => void) => {
      processMessageRef.current = processMessage;
    },
    [],
  );

  return { handleEvent, connect };
}
