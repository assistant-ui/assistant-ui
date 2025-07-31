"use client";

import { useEffect } from "react";
import { useAssistant, useChat } from "@ai-sdk/react";
import { AssistantRuntime } from "@assistant-ui/react";

type VercelHelpers =
  | ReturnType<typeof useChat>
  | ReturnType<typeof useAssistant>;

export const useInputSync = (
  { setInput, input }: VercelHelpers,
  runtime: AssistantRuntime,
) => {
  // sync input from vercel to assistant-ui
  useEffect(() => {
    runtime.thread.composer.setText(input);
  }, [runtime, input]);

  // sync input from assistant-ui to vercel
  useEffect(() => {
    return runtime.thread.composer.subscribe(() => {
      setInput(runtime.thread.composer.getState().text);
    });
  }, [runtime, setInput]);
};
