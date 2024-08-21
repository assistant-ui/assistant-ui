import { useThreadContext, ComposerState } from "@assistant-ui/react";
import { useEffect } from "react";
import type { VercelHelpers } from "./VercelHelpers";
import { StoreApi } from "zustand";

// two way sync between vercel helpers input state and composer text state
export const useVercelAIComposerSync = (vercel: VercelHelpers) => {
  const { useComposer, useThreadRuntime } = useThreadContext();

  useEffect(() => {
    useThreadRuntime.getState().composer.setText(vercel.input);
  }, [useComposer, useThreadRuntime, vercel.input]);

  useEffect(() => {
    (useComposer as unknown as StoreApi<ComposerState>).setState({
      setText: (t) => {
        vercel.setInput(t);
        useThreadRuntime.getState().composer.setText(t);
      },
    });
  }, [useComposer, useThreadRuntime, vercel]);
};
