import type { ComponentProps } from "react";
import { Text } from "ink";
import { useMessagePartSource } from "@assistant-ui/core/react";

export type MessagePartPrimitiveSourceProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveSource {
  export type Props = MessagePartPrimitiveSourceProps;
}

const formatSource = ({
  title,
  url,
}: {
  title?: string | undefined;
  url: string;
}) => {
  if (title && url) return `[source: ${title} ${url}]`;
  if (title) return `[source: ${title}]`;
  return `[source: ${url}]`;
};

export const MessagePartPrimitiveSource = (
  props: MessagePartPrimitiveSource.Props,
) => {
  const source = useMessagePartSource();
  return <Text {...props}>{formatSource(source)}</Text>;
};

MessagePartPrimitiveSource.displayName = "MessagePartPrimitive.Source";
