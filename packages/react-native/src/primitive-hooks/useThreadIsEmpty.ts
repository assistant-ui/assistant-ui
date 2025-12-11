import { useThread } from "../hooks/useThread";

export const useThreadIsEmpty = () => {
  return useThread((state) => state.isEmpty);
};
