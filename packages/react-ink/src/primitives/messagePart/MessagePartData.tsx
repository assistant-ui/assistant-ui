import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

export type MessagePartPrimitiveDataProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveData {
  export type Props = MessagePartPrimitiveDataProps;
}

export const MessagePartPrimitiveData = (
  props: MessagePartPrimitiveData.Props,
) => {
  const label = useAuiState((s) => {
    if (s.part.type !== "data") return "";
    return `[data: ${s.part.name}]`;
  });
  return <Text {...props}>{sanitizeTerminalText(label)}</Text>;
};

MessagePartPrimitiveData.displayName = "MessagePartPrimitive.Data";
