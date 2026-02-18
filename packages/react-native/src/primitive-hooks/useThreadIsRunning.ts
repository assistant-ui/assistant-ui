import { useThread } from "../hooks/useThread";

export const useThreadIsRunning = (): boolean => {
  return useThread((s) => s.isRunning);
};
