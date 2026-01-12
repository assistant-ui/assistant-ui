import { useOpenAiGlobal } from "./use-openai-global";
import { type DisplayMode } from "./types";

export const useDisplayMode = (): DisplayMode | null => {
  return useOpenAiGlobal("displayMode");
};
