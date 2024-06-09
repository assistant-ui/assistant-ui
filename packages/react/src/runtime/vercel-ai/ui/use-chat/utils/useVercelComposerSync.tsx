import { useEffect } from "react";
import { useAssistantContext } from "../../../../../context";
import type { VercelHelpers } from "./VercelHelpers";

// two way sync between vercel helpers input state and composer text state
export const useVercelComposerSync = (vercel: VercelHelpers) => {
  const { useComposer } = useAssistantContext();

  useEffect(() => {
    useComposer.setState({
      value: vercel.input,
      setValue: vercel.setInput,
    });
  }, [useComposer, vercel.input, vercel.setInput]);
};
