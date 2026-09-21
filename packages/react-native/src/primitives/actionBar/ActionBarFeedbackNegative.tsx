import type { ReactNode } from "react";
import { Platform, Pressable, type PressableProps } from "react-native";
import { useActionBarFeedbackNegative } from "@assistant-ui/core/react";

export type ActionBarFeedbackNegativeProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((props: { isSubmitted: boolean; disabled: boolean }) => ReactNode);
};

export const ActionBarFeedbackNegative = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarFeedbackNegativeProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackNegative();
  const disabled = disabledProp ?? false;

  return (
    <Pressable
      onPress={submit}
      disabled={disabledProp}
      accessibilityRole="button"
      {...(Platform.OS === "web"
        ? { "aria-pressed": isSubmitted }
        : { "aria-selected": isSubmitted })}
      {...pressableProps}
    >
      {typeof children === "function"
        ? children({ isSubmitted, disabled })
        : children}
    </Pressable>
  );
};
