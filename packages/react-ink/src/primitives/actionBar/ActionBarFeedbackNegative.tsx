import type { ReactNode } from "react";
import { useActionBarFeedbackNegative } from "@assistant-ui/core/react";
import {
  Pressable,
  type PressableProps,
  type PressableState,
} from "../internal/Pressable";

export type ActionBarFeedbackNegativeProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((props: PressableState & { isSubmitted: boolean }) => ReactNode);
};

export const ActionBarFeedbackNegative = ({
  children,
  ...pressableProps
}: ActionBarFeedbackNegativeProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackNegative();

  return (
    <Pressable onPress={submit} {...pressableProps}>
      {typeof children === "function"
        ? (state) => children({ ...state, isSubmitted })
        : children}
    </Pressable>
  );
};
