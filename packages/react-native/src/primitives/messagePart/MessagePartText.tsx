import {
  type ComponentRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
} from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export namespace MessagePartPrimitiveText {
  export type Element = ComponentRef<typeof Text>;
  export type Props = Omit<TextProps, "children">;
}

export const MessagePartPrimitiveText: ForwardRefExoticComponent<
  MessagePartPrimitiveText.Props &
    RefAttributes<MessagePartPrimitiveText.Element>
> = forwardRef<
  MessagePartPrimitiveText.Element,
  MessagePartPrimitiveText.Props
>((props, forwardedRef) => {
  const text = useAuiState((s) => {
    const part = s.part;
    return part.type === "text" || part.type === "reasoning" ? part.text : "";
  });

  return (
    <Text {...props} ref={forwardedRef}>
      {text}
    </Text>
  );
});

MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";

export type MessagePartTextProps = MessagePartPrimitiveText.Props;
