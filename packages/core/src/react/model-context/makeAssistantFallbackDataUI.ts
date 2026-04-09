import type { FC } from "react";
import {
  type AssistantFallbackDataUIProps,
  useAssistantFallbackDataUI,
} from "./useAssistantFallbackDataUI";

export type AssistantFallbackDataUI = FC & {
  unstable_data: AssistantFallbackDataUIProps;
};

export const makeAssistantFallbackDataUI = <T = any>(
  dataUI: AssistantFallbackDataUIProps<T>,
) => {
  const DataUI: AssistantFallbackDataUI = () => {
    useAssistantFallbackDataUI(dataUI);
    return null;
  };
  DataUI.unstable_data = dataUI;
  return DataUI;
};
