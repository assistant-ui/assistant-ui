import { useActionBarReload } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ActionBarReloadProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ActionBarReload = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarReloadProps) => {
  const { reload, disabled } = useActionBarReload();

  return (
    <Pressable
      onPress={reload}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
