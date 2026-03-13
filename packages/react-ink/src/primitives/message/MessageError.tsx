import type { FC, PropsWithChildren } from "react";
import { useMessageError } from "../error/useMessageError";

export const MessageError: FC<PropsWithChildren> = ({ children }) => {
  const error = useMessageError();
  return error !== undefined ? children : null;
};

MessageError.displayName = "MessagePrimitive.Error";
