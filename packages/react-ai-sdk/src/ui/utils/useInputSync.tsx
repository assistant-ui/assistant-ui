import { useEffect } from "react";
import { useAssistant, useChat } from "ai/react";
import { AssistantRuntime } from "@assistant-ui/react";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";

type VercelHelpers =
  | ReturnType<typeof useChat>
  | ReturnType<typeof useAssistant>;

export const useInputSync = (
  helpers: VercelHelpers,
  runtime: AssistantRuntime,
) => {
  // sync input from vercel to assistant-ui
  useEffect(() => {
    if (runtime.thread.composer.getState().text !== helpers.input) {
      runtime.thread.composer.setText(helpers.input);
    }
  }, [helpers, runtime]);

  // sync input from assistant-ui to vercel
  const handleThreadUpdate = useCallbackRef(() => {
    if (runtime.thread.composer.getState().text !== helpers.input) {
      helpers.setInput(runtime.thread.composer.getState().text);
    }
  });

  useEffect(() => {
    return runtime.thread.subscribe(handleThreadUpdate);
  }, [runtime, handleThreadUpdate]);
};
