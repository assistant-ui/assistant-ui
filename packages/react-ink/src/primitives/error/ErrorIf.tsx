import type { FC, PropsWithChildren } from "react";
import { useMessageError } from "./useMessageError";

export type ErrorIfProps = PropsWithChildren;

export const ErrorIf: FC<ErrorIfProps> = ({ children }) => {
  const error = useMessageError();
  return error !== undefined ? children : null;
};

ErrorIf.displayName = "ErrorPrimitive.If";
