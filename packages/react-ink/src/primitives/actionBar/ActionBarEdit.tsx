import type { ReactNode } from "react";
import { useActionBarEdit } from "../../primitive-hooks/useActionBarEdit";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ActionBarEditProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
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
