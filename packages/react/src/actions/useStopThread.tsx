"use client";
import { useAssistantContext } from "../utils/context/AssistantContext";

export const useStopThread = () => {
  const { useThread } = useAssistantContext();
  const [isLoading, stop] = useThread((s) => [s.isLoading, s.stop]);

  if (!isLoading) return null;
  return stop;
};
