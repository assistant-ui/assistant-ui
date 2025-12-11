import { useThread } from "../hooks/useThread";

export const useThreadMessages = () => {
  return useThread((state) => state.messages);
};
