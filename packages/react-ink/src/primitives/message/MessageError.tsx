import type { FC, PropsWithChildren } from "react";
import { ErrorIf } from "../error/ErrorIf";

export const MessageError: FC<PropsWithChildren> = ErrorIf;

MessageError.displayName = "MessagePrimitive.Error";
