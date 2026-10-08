import type { ReactNode } from "react";
import { useActionBarFeedbackPositive } from "@assistant-ui/core/react";
import {
  Pressable,
  type PressableProps,
  type PressableState,
} from "../internal/Pressable";

export type ActionBarFeedbackPositiveProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((props: PressableState & { isSubmitted: boolean }) => ReactNode);
};

export const ActionBarFeedbackPositive = ({
  children,
  ...pressableProps
}: ActionBarFeedbackPositiveProps) => {
  const { submit, isSubmitted } = useActionBarFeedbackPositive();

  return (
    <Pressable onPress={submit} {...pressableProps}>
      {typeof children === "function"
        ? (state) => children({ ...state, isSubmitted })
        : children}
    </Pressable>
  );
};
