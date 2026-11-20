import { useMemo } from "react";
import { DirectChatTransport, ToolLoopAgent } from "ai";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { apposModel } from "appos-client/ai-sdk";

/**
 * A chat runtime whose agent loop runs in the browser. The model is served
 * by the page that hosts the app, which holds the key.
 */
export function useAgentRuntime({
  instructions,
  model = "claude-haiku-5-5",
}: {
  /** System prompt for the agent. */
  instructions: string;
  /** Model id hint; the host decides. */
  model?: string;
}) {
  const transport = useMemo(
    () =>
      new DirectChatTransport({
        agent: new ToolLoopAgent({ model: apposModel(model), instructions }),
      }),
    [instructions, model],
  );
  return useChatRuntime({ transport });
}
