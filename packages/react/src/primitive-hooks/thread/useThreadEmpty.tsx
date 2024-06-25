import { useThreadIf } from "./useThreadIf";

export const useThreadEmpty = () => {
  return useThreadIf({ empty: true });
};
