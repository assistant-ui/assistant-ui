"use client";
import { useAssistantContext } from "../utils/context/AssistantContext";

export const useCancelRun = () => {
  const { useThread } = useAssistantContext();
  const [isRunning, cancelRun] = useThread((s) => [s.isRunning, s.cancelRun]);

  if (!isRunning) return null;
  return cancelRun;
};
