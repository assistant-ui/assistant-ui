import { useThread } from "../hooks/useThread";

export const useThreadIsEmpty = (): boolean => {
  return useThread((s) => s.messages.length === 0);
};
