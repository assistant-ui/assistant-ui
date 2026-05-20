import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";

export type StatusBarPrimitiveModelNameProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  name?: ReactNode;
};

export namespace StatusBarPrimitiveModelName {
  export type Props = StatusBarPrimitiveModelNameProps;
}

export const StatusBarPrimitiveModelName = ({
  name = "unknown",
  ...textProps
}: StatusBarPrimitiveModelName.Props) => {
  return <Text {...textProps}>{name}</Text>;
};

StatusBarPrimitiveModelName.displayName = "StatusBarPrimitive.ModelName";
