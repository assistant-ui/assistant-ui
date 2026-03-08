import type { FC } from "react";
import { Text } from "react-native";
import {
  MessagePrimitiveParts as MessagePrimitivePartsBase,
  MessagePartComponent as MessagePartComponentBase,
  MessagePrimitivePartByIndex as MessagePrimitivePartByIndexBase,
  messagePartsDefaultComponents,
} from "@assistant-ui/core/react";

const rnDefaultComponents = {
  ...messagePartsDefaultComponents,
  Text: ({ text }: { text: string }) => <Text>{text}</Text>,
} satisfies MessagePrimitiveParts.Props["components"];

export namespace MessagePrimitiveParts {
  export type Props = MessagePrimitivePartsBase.Props;
}

/**
 * Renders the parts of a message with React Native-specific default components.
 */
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = ({
  components,
  ...rest
}) => {
  const merged = components
    ? {
        Text: components.Text ?? rnDefaultComponents.Text,
        Image: components.Image ?? messagePartsDefaultComponents.Image,
        Reasoning:
          components.Reasoning ?? messagePartsDefaultComponents.Reasoning,
        Source: components.Source ?? messagePartsDefaultComponents.Source,
        File: components.File ?? messagePartsDefaultComponents.File,
        Unstable_Audio:
          components.Unstable_Audio ??
          messagePartsDefaultComponents.Unstable_Audio,
        ...("ChainOfThought" in components
          ? { ChainOfThought: components.ChainOfThought }
          : {
              tools: components.tools,
              data: components.data,
              ToolGroup:
                components.ToolGroup ?? messagePartsDefaultComponents.ToolGroup,
              ReasoningGroup:
                components.ReasoningGroup ??
                messagePartsDefaultComponents.ReasoningGroup,
            }),
        Empty: components.Empty,
      }
    : rnDefaultComponents;

  return <MessagePrimitivePartsBase components={merged as any} {...rest} />;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

export {
  MessagePartComponentBase as MessagePartComponent,
  MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex,
};
