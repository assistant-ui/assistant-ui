import { useActionBarEdit } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ActionBarEditProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ActionBarEdit = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarEditProps) => {
  const { edit, disabled } = useActionBarEdit();

  return (
    <Pressable
      onPress={edit}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
