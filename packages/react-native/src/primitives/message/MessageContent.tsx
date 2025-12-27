import { FC, ReactElement } from "react";
import { View, ViewProps, Text } from "react-native";
import { useMessage } from "../../hooks/useMessage";
import type { ThreadMessage } from "@assistant-ui/core";

export type MessageContentProps = ViewProps & {
  /**
   * Custom render function for text content
   */
  renderText?: (text: string, message: ThreadMessage) => ReactElement;
};

export const MessageContent: FC<MessageContentProps> = ({
  renderText,
  ...viewProps
}) => {
  const message = useMessage((state) => state.message);

  const textContent = message.content
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");

  if (renderText) {
    return <View {...viewProps}>{renderText(textContent, message)}</View>;
  }

  return (
    <View {...viewProps}>
      <Text>{textContent}</Text>
    </View>
  );
};
