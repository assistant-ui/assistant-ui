import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

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
  const part = useAuiState("part");
  const label = part.type !== "data" ? "" : `[data: ${part.name}]`;
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveData.displayName = "MessagePartPrimitive.Data";
