import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

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
  url?: string | undefined;
}) => {
  if (title && url) return `[source: ${title} ${url}]`;
  if (title) return `[source: ${title}]`;
  if (url) return `[source: ${url}]`;
  return "[source]";
};

export const MessagePartPrimitiveSource = (
  props: MessagePartPrimitiveSource.Props,
) => {
  const label = useAuiState((s) => {
    if (s.part.type !== "source")
      throw new Error(
        "MessagePartPrimitive.Source can only be used inside source message parts.",
      );
    return formatSource(s.part);
  });
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveSource.displayName = "MessagePartPrimitive.Source";
