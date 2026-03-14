import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { useMessageError } from "@assistant-ui/core/react";

export type ErrorRootProps = ViewProps & {
  children: ReactNode;
};

export const ErrorRoot = ({ children, ...viewProps }: ErrorRootProps) => {
  const error = useMessageError();
  if (error === undefined) return null;

  return <View {...viewProps}>{children}</View>;
};

ErrorRoot.displayName = "ErrorPrimitive.Root";
