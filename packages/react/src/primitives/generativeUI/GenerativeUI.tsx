"use client";

import { useAuiState } from "@assistant-ui/store";
import {
  Renderer,
  type ActionEvent,
  type Library,
} from "@openuidev/react-lang";
import type { FC } from "react";

export namespace MessagePrimitiveGenerativeUI {
  export type Props = {
    library: Library;
    /** Override source; default reads from the surrounding generative-ui part. */
    source?: string;
    /** Whether the model is still streaming. Defaults from message status. */
    isStreaming?: boolean;
    onAction?: (event: ActionEvent) => void;
    onStateUpdate?: (state: Record<string, unknown>) => void;
  };
}

/**
 * Renders a generative-ui message part with OpenUI Lang.
 */
export const MessagePrimitiveGenerativeUI: FC<
  MessagePrimitiveGenerativeUI.Props
> = ({
  library,
  source: sourceProp,
  isStreaming: isStreamingProp,
  onAction,
  onStateUpdate,
}) => {
  const storeSource = useAuiState((s) => {
    const part = s.part as { type?: string; source?: string };
    return part?.type === "generative-ui" ? part.source : undefined;
  });
  const messageIsStreaming = useAuiState(
    (s) => s.message.status?.type === "running",
  );

  const source = sourceProp ?? storeSource;
  const isStreaming = isStreamingProp ?? messageIsStreaming;

  if (!source) return null;

  return (
    <Renderer
      library={library}
      response={source}
      isStreaming={isStreaming}
      onAction={onAction}
      onStateUpdate={onStateUpdate}
    />
  );
};

MessagePrimitiveGenerativeUI.displayName = "MessagePrimitive.GenerativeUI";
