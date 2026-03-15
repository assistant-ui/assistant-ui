import type { ReactNode } from "react";
import { Text } from "ink";

export type StatusBarModelNameProps = {
  name?: ReactNode;
};

export const StatusBarModelName = ({
  name = "unknown",
}: StatusBarModelNameProps) => {
  return <Text dimColor>{name}</Text>;
};

StatusBarModelName.displayName = "StatusBarPrimitive.ModelName";
