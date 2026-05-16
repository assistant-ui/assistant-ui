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
  const partName = useAuiState((s) => {
    if (s.part.type !== "data")
      throw new Error(
        "MessagePartPrimitive.Data can only be used inside data message parts.",
      );
    return s.part.name;
  });
  return <Text {...props}>[data: {partName}]</Text>;
};

MessagePartPrimitiveData.displayName = "MessagePartPrimitive.Data";
