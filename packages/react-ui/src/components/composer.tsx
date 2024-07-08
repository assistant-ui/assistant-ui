"use client";

import {
  ComposerPrimitive,
  ThreadPrimitive,
  useThreadContext,
} from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";

import { SendHorizonalIcon } from "lucide-react";
import { withDefaults } from "../utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { CircleStopIcon } from "./base/CircleStopIcon";

export const Composer: FC = () => {
  return (
    <ComposerRoot>
      <ComposerInput autoFocus />
      <ComposerAction />
    </ComposerRoot>
  );
};

Composer.displayName = "Composer";

export const ComposerRoot = withDefaults(ComposerPrimitive.Root, {
  className: "aui-composer-root",
});

ComposerRoot.displayName = "ComposerRoot";

const ComposerInputStyled = withDefaults(ComposerPrimitive.Input, {
  rows: 1,
  autoFocus: true,
  className: "aui-composer-input",
});

type ComposerInputProps = ComponentPropsWithoutRef<typeof ComposerInputStyled>;
export const ComposerInput = forwardRef<
  HTMLTextAreaElement,
  ComposerInputProps
>((props, ref) => {
  const {
    strings: {
      composer: { input: { placeholder = "Write a message..." } = {} } = {},
    } = {},
  } = useThreadConfig();
  return <ComposerInputStyled placeholder={placeholder} {...props} ref={ref} />;
});

ComposerInput.displayName = "ComposerInput";

const useAllowCancel = () => {
  const { useThreadActions } = useThreadContext();
  const cancelSupported = useThreadActions((t) => t.capabilities.cancel);
  return cancelSupported;
};

export const ComposerAction: FC = () => {
  const allowCancel = useAllowCancel();
  if (!allowCancel) return <ComposerSend />;
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerSend />
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerCancel />
      </ThreadPrimitive.If>
    </>
  );
};

ComposerAction.displayName = "ComposerAction";

const ComposerSendButton = withDefaults(TooltipIconButton, {
  variant: "default",
  className: "aui-composer-send",
});

export const ComposerSend = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { composer: { send: { tooltip = "Send" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <ComposerPrimitive.Send asChild>
      <ComposerSendButton tooltip={tooltip} {...props} ref={ref}>
        <SendHorizonalIcon />
      </ComposerSendButton>
    </ComposerPrimitive.Send>
  );
});

ComposerSend.displayName = "ComposerSend";

const ComposerCancelButton = withDefaults(TooltipIconButton, {
  variant: "default",
  className: "aui-composer-cancel",
});

export const ComposerCancel = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { composer: { cancel: { tooltip = "Cancel" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <ComposerPrimitive.Cancel asChild>
      <ComposerCancelButton tooltip={tooltip} {...props} ref={ref}>
        <CircleStopIcon />
      </ComposerCancelButton>
    </ComposerPrimitive.Cancel>
  );
});

ComposerCancel.displayName = "ComposerCancel";
