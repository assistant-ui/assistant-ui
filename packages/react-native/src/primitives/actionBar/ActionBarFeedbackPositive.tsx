import type { ReactNode } from "react";
import { Platform, Pressable, type PressableProps } from "react-native";
import { useActionBarFeedbackPositive } from "@assistant-ui/core/react";

export type ActionBarFeedbackPositiveProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((props: { isSubmitted: boolean; disabled: boolean }) => ReactNode);
};

export const ActionBarFeedbackPositive = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarFeedbackPositiveProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackPositive();
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
