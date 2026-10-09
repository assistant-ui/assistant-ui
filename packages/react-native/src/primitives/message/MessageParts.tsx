import type { FC } from "react";
import { Text } from "react-native";
import {
  MessagePrimitiveParts as MessagePrimitivePartsBase,
  MessagePartComponent as MessagePartComponentBase,
  MessagePrimitivePartByIndex as MessagePrimitivePartByIndexBase,
  messagePartsDefaultComponents,
} from "@assistant-ui/core/react";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage";

// React Native derives no intrinsic size from a remote or data URI, so an
// Image with no dimensions lays out at zero. The default fills the available
// width and keeps the picture whole inside a square box; a consumer that knows
// its own aspect ratio overrides `components.Image`.
const DEFAULT_IMAGE_STYLE = { width: "100%", aspectRatio: 1 } as const;

const rnDefaultComponents = {
  ...messagePartsDefaultComponents,
  Text: ({ text }: { text: string }) => <Text>{text}</Text>,
  Image: () => (
    <MessagePartPrimitiveImage
      style={DEFAULT_IMAGE_STYLE}
      resizeMode="contain"
    />
  ),
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
    ? {
        ...components,
        Text: components.Text ?? rnDefaultComponents.Text,
        Image: components.Image ?? rnDefaultComponents.Image,
      }
    : rnDefaultComponents;

  return <MessagePrimitivePartsBase components={merged as any} {...rest} />;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

export {
  MessagePartComponentBase as MessagePartComponent,
  MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex,
};
