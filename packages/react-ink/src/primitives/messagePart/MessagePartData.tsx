import type { ComponentProps } from "react";
import { Text } from "ink";
import { useMessagePartData } from "@assistant-ui/core/react";

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
  const part = useMessagePartData(name);
  if (!part) return null;
  return <Text {...props}>[data: {part.name}]</Text>;
};

MessagePartPrimitiveData.displayName = "MessagePartPrimitive.Data";
