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
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = (
  props,
) => {
  if ("children" in props) {
    return (
      <MessagePrimitivePartsBase>{props.children}</MessagePrimitivePartsBase>
    );
  }

  const { components, ...rest } = props;
  const merged = components
    ? { ...components, Text: components.Text ?? rnDefaultComponents.Text }
    : rnDefaultComponents;

  return <MessagePrimitivePartsBase components={merged as any} {...rest} />;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

export {
  MessagePartComponentBase as MessagePartComponent,
  MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex,
};
