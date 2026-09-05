import type { FC } from "react";
import {
  type AssistantDataUIProps,
  useAssistantDataUI,
} from "./useAssistantDataUI";

/**
 * Component returned by {@link makeAssistantDataUI}.
 *
 * Rendering the component registers a renderer for matching `data` message
 * parts.
 */
export type AssistantDataUI = FC & {
  /** Data renderer registered by this component. */
  unstable_data: AssistantDataUIProps;
};

/**
 * Creates a React component that registers a named data-part renderer when
 * rendered.
 *
 * @param dataUI - Data renderer registration.
 */
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
