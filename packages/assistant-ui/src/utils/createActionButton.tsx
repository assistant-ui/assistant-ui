"use client";

import { forwardRef } from "react";
import { Primitive, ComponentPropsWithoutRef } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import {
  useThreadContext,
  useIsEditingContext,
  useMessageContext,
} from "./context/Context";
import { Message } from "ai";
import { UseChatWithBranchesHelpers } from "./hooks/useBranches";

type ActionCalback = (
  message: Message,
  chat: UseChatWithBranchesHelpers,
  isEditing: ReturnType<typeof useIsEditingContext>,
) => void;

type ActionIsEnabledCallback = (
  message: Message,
  chat: UseChatWithBranchesHelpers,
  isEditing: ReturnType<typeof useIsEditingContext>,
) => boolean;

export const createActionButton = (
  callback: ActionCalback,
  getEnabled: ActionIsEnabledCallback,
) => {
  type PrimitiveButtonElement = React.ElementRef<typeof Primitive.button>;
  type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

  return forwardRef<PrimitiveButtonElement, PrimitiveButtonProps>(
    (props, forwardedRef) => {
      const chat = useThreadContext();
      const message = useMessageContext();
      const isEditing = useIsEditingContext();

      const disabled = !getEnabled(message, chat, isEditing);

      return (
        <Primitive.button
          type="button"
          disabled={disabled}
          {...props}
          ref={forwardedRef}
          onClick={composeEventHandlers(props.onClick, () => {
            if (disabled) return;
            callback(message, chat, isEditing);
          })}
        />
      );
    },
  );
};
