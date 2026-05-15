import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type MessagePartPrimitiveDataProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  name?: string | undefined;
};

export namespace MessagePartPrimitiveData {
  export type Props = MessagePartPrimitiveDataProps;
}

export const MessagePartPrimitiveData = ({
  name,
  ...props
}: MessagePartPrimitiveData.Props) => {
  const partName = useAuiState((s) => {
    if (s.part.type !== "data") return null;
    if (name && s.part.name !== name) return null;
    return s.part.name;
  });
  if (partName === null) return null;
  return <Text {...props}>[data: {partName}]</Text>;
};

MessagePartPrimitiveData.displayName = "MessagePartPrimitive.Data";
