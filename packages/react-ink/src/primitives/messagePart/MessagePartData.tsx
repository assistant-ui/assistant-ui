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
  const label = useAuiState("part", (s) => {
    if (s.type !== "data") return "";
    return `[data: ${s.name}]`;
  });
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveData.displayName = "MessagePartPrimitive.Data";
