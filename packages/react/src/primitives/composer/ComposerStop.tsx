"use client";

import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const useComposerStop = () => {
  const [isLoading, stop] = useThreadContext("Composer.Stop", (s) => [
    s.chat.isLoading,
    s.chat.stop,
  ]);

  if (!isLoading) return null;
  return stop;
};

export const ComposerStop = createActionButton(useComposerStop);
