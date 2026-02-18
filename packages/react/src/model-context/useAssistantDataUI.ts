"use client";

import { useEffect } from "react";
import { useAui } from "@assistant-ui/store";
import type { DataMessagePartComponent } from "../types/MessagePartComponentTypes";

export type AssistantDataUIProps<T = any> = {
  name: string;
  render: DataMessagePartComponent<T>;
};

export const useAssistantDataUI = (dataUI: AssistantDataUIProps | null) => {
  const aui = useAui();
  useEffect(() => {
    if (!dataUI?.name || !dataUI?.render) return undefined;
    return aui.dataRenderers().setDataUI(dataUI.name, dataUI.render);
  }, [aui, dataUI?.name, dataUI?.render]);
};
