import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useActionBarFeedbackPositive } from "../../primitive-hooks/useActionBarFeedback";

export type ActionBarFeedbackPositiveProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: ReactNode | ((props: { isSubmitted: boolean }) => ReactNode);
};

export const ActionBarFeedbackPositive = ({
  children,
  ...pressableProps
}: ActionBarFeedbackPositiveProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackPositive();

  return (
    <Pressable onPress={submit} {...pressableProps}>
      {typeof children === "function" ? children({ isSubmitted }) : children}
    </Pressable>
  );
};
