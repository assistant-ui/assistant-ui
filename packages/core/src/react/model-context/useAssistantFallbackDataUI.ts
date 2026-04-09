import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { DataMessagePartComponent } from "../types/MessagePartComponentTypes";

export type AssistantFallbackDataUIProps<T = any> = {
  render: DataMessagePartComponent<T>;
};

export const useAssistantFallbackDataUI = (
  dataUI: AssistantFallbackDataUIProps | null,
) => {
  const aui = useAui();
  useEffect(() => {
    if (!dataUI?.render) return undefined;
    return aui.dataRenderers().setFallbackDataUI(dataUI.render);
  }, [aui, dataUI?.render]);
};
