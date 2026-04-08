import { useA2uiContext } from "../react/A2uiContext";

export function useA2ui() {
  const { processMessage } = useA2uiContext();
  return { processMessage };
}
