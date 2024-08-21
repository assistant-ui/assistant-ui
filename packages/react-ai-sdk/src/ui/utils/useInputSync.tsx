import { useRef, useEffect } from "react";
import {
  ExternalStoreRuntime,
  subscribeToMainThread,
} from "@assistant-ui/react";
import { useAssistant, useChat } from "ai/react";

type VercelHelpers =
  | ReturnType<typeof useChat>
  | ReturnType<typeof useAssistant>;

export const useInputSync = (
  helpers: VercelHelpers,
  runtime: ExternalStoreRuntime,
) => {
  // sync input from vercel to assistant-ui
  const helpersRef = useRef(helpers);
  useEffect(() => {
    helpersRef.current = helpers;
    if (runtime.thread.composer.text !== helpers.input) {
      runtime.thread.composer.setText(helpers.input);
    }
  }, [helpers, runtime]);

  // sync input from assistant-ui to vercel
  useEffect(() => {
    return subscribeToMainThread(runtime, () => {
      if (runtime.thread.composer.text !== helpersRef.current.input) {
        helpersRef.current.setInput(runtime.thread.composer.text);
      }
    });
  }, [runtime]);
};
