import { useMemo } from "react";
import { DirectChatTransport, ToolLoopAgent } from "ai";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { apposModel } from "appos-client/ai-sdk";

/**
 * The chat runs in the app's own frame: the AI SDK agent loop is local, and
 * every model call goes to the shell (apposModel), which holds the key. The
 * shell is appOS, or a website that embeds the app with appos-host.
 */
export type AppOSRuntimeOptions = {
  /** System prompt for the agent. */
  instructions?: string;
  /** Model id hint; the user's provider decides. */
  model?: string;
};

const DEFAULT_INSTRUCTIONS = "You are a helpful assistant inside an appOS app.";

export function useAppOSRuntime({
  instructions = DEFAULT_INSTRUCTIONS,
  model = "claude-haiku-5-5",
}: AppOSRuntimeOptions = {}) {
  const transport = useMemo(
    () =>
      new DirectChatTransport({
        agent: new ToolLoopAgent({
          model: apposModel(model),
          instructions,
        }),
      }),
    [instructions, model],
  );
  return useChatRuntime({ transport });
}
