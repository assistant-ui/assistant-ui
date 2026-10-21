import {
  forwardRef,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerSend } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerSendProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerSend: ForwardRefExoticComponent<
  ComposerSendProps & RefAttributes<ComponentRef<typeof Pressable>>
> = forwardRef<ComponentRef<typeof Pressable>, ComposerSendProps>(
  ({ children, disabled, ...pressableProps }, ref) => {
    const { send, disabled: hookDisabled } = useComposerSend();

    return (
      <Primitive.Pressable
        ref={ref}
        onPress={() => send()}
        disabled={disabled ?? hookDisabled}
        accessibilityRole="button"
        {...pressableProps}
      >
        {children}
      </Primitive.Pressable>
    );
  },
);
