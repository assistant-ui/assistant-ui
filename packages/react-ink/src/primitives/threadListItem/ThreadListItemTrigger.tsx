import type { ReactNode } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListItemTrigger } from "@assistant-ui/core/react";
import {
  Pressable,
  type PressableProps,
  type PressableState,
} from "../internal/Pressable";

export type ThreadListItemTriggerProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((state: PressableState & { isActive: boolean }) => ReactNode);
};

export const ThreadListItemTrigger = ({
  children,
  ...pressableProps
}: ThreadListItemTriggerProps) => {
  const isActive = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );
  const { switchTo } = useThreadListItemTrigger();

  return (
    <Pressable onPress={switchTo} {...pressableProps}>
      {typeof children === "function"
        ? (state) => children({ ...state, isActive })
        : children}
    </Pressable>
  );
};
