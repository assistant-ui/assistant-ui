import type { ReactNode } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListNew } from "@assistant-ui/core/react";
import {
  Pressable,
  type PressableProps,
  type PressableState,
} from "../internal/Pressable";

export type ThreadListNewProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((state: PressableState & { isActive: boolean }) => ReactNode);
};

export const ThreadListNew = ({
  children,
  ...pressableProps
}: ThreadListNewProps) => {
  const isActive = useAuiState(
    (s) => s.threads.newThreadId === s.threads.mainThreadId,
  );
  const { switchToNewThread } = useThreadListNew();

  return (
    <Pressable onPress={switchToNewThread} {...pressableProps}>
      {typeof children === "function"
        ? (state) => children({ ...state, isActive })
        : children}
    </Pressable>
  );
};
