import { useThreadContext, ComposerState } from "@assistant-ui/react";
import { useEffect } from "react";
import type { VercelHelpers } from "./VercelHelpers";
import { StoreApi } from "zustand";

// two way sync between vercel helpers input state and composer text state
export const useVercelAIComposerSync = (vercel: VercelHelpers) => {
  const { useComposer } = useThreadContext();

  useEffect(() => {
    (useComposer as unknown as StoreApi<ComposerState>).setState({
      text: vercel.input,
      setText: vercel.setInput,
    });
  }, [useComposer, vercel.input, vercel.setInput]);
};
