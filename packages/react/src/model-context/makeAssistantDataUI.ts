"use client";

import type { FC } from "react";
import {
  type AssistantDataUIProps,
  useAssistantDataUI,
} from "./useAssistantDataUI";

export type AssistantDataUI = FC & {
  unstable_data: AssistantDataUIProps;
};

export const makeAssistantDataUI = <T = any>(
  dataUI: AssistantDataUIProps<T>,
) => {
  const DataUI: AssistantDataUI = () => {
    useAssistantDataUI(dataUI);
    return null;
  };
  DataUI.unstable_data = dataUI;
  return DataUI;
};
