import { useOpenAiGlobal } from "./use-openai-global";

export const useMaxHeight = (): number | null => {
  return useOpenAiGlobal("maxHeight");
};
