import type { ReactNode } from "react";
import { useActionBarFeedbackNegative } from "../../primitive-hooks/useActionBarFeedback";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ActionBarFeedbackNegativeProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: ReactNode | ((props: { isSubmitted: boolean }) => ReactNode);
};

export const ActionBarFeedbackNegative = ({
  children,
  ...pressableProps
}: ActionBarFeedbackNegativeProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackNegative();

  return (
    <Pressable onPress={submit} {...pressableProps}>
      {typeof children === "function" ? children({ isSubmitted }) : children}
    </Pressable>
  );
};
