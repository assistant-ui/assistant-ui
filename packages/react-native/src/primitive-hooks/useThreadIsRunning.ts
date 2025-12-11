import { useThread } from "../hooks/useThread";

export const useThreadIsRunning = () => {
  return useThread((state) => state.isRunning);
};
