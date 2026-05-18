import type { ReactNode } from "react";
import { Text } from "ink";

export type StatusBarPrimitiveModelNameProps = {
  name?: ReactNode;
};

export namespace StatusBarPrimitiveModelName {
  export type Props = StatusBarPrimitiveModelNameProps;
}

export const StatusBarPrimitiveModelName = ({
  name = "unknown",
}: StatusBarPrimitiveModelName.Props) => {
  return <Text dimColor>{name}</Text>;
};

StatusBarPrimitiveModelName.displayName = "StatusBarPrimitive.ModelName";
