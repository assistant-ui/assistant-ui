import { useThreadContext } from "@assistant-ui/react/experimental";
import { useEffect } from "react";
import type { VercelHelpers } from "./VercelHelpers";

// two way sync between vercel helpers input state and composer text state
export const useVercelAIComposerSync = (vercel: VercelHelpers) => {
  const { useComposer } = useThreadContext();

  useEffect(() => {
    useComposer.setState({
      value: vercel.input,
      setValue: vercel.setInput,
    });
  }, [useComposer, vercel.input, vercel.setInput]);
};
