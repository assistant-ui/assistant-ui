import type { ReactNode } from "react";
import { Platform, type PressableStateCallbackType } from "react-native";
import { useActionBarFeedbackNegative } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ActionBarFeedbackNegativeProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        props: PressableStateCallbackType & {
          isSubmitted: boolean;
          disabled: boolean;
        },
      ) => ReactNode);
};

export const ActionBarFeedbackNegative = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarFeedbackNegativeProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackNegative();
  const disabled = disabledProp ?? false;

  return (
    <Primitive.Pressable
      onPress={submit}
      disabled={disabledProp}
      accessibilityRole="button"
      {...(Platform.OS === "web"
        ? { "aria-pressed": isSubmitted }
        : { "aria-selected": isSubmitted })}
      {...pressableProps}
    >
      {typeof children === "function"
        ? (state) => children({ ...state, isSubmitted, disabled })
        : children}
    </Primitive.Pressable>
  );
};
