import {
  createContext,
  tapContext,
  withContextProvider,
} from "@assistant-ui/tap";
import type { ToolUIApi } from "./types/ToolUI";

const ToolUIContext = createContext<ToolUIApi | null>(null);

export const withToolUIProvider = <TResult>(
  toolUIs: ToolUIApi,
  fn: () => TResult,
) => {
  return withContextProvider(ToolUIContext, toolUIs, fn);
};

export const tapToolUI = () => {
  const toolUIs = tapContext(ToolUIContext);
  if (!toolUIs) throw new Error("ToolUI context is not available");

  return toolUIs;
};
