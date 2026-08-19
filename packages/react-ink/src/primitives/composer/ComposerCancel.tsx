import { useComposerCancel } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ComposerCancelProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerCancel = ({
  children,
  disabled,
  ...pressableProps
}: ComposerCancelProps) => {
  const { cancel, disabled: hookDisabled } = useComposerCancel();

  return (
    <Pressable
      onPress={cancel}
      disabled={disabled ?? hookDisabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
