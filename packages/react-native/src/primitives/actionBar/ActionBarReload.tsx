import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useActionBarReload } from "../../primitive-hooks/useActionBarReload";

export type ActionBarReloadProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
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
