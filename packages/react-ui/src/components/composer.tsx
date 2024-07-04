"use client";

import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";

import { SendHorizonalIcon } from "lucide-react";
import { styled } from "../styled";
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
      <ComposerSendOrCancel />
    </ComposerRoot>
  );
};

Composer.displayName = "Composer";

export const ComposerRoot = styled(ComposerPrimitive.Root, {
  className: "aui-composer-root",
});

ComposerRoot.displayName = "ComposerRoot";

const ComposerInputStyled = styled(ComposerPrimitive.Input, {
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

export const ComposerSendOrCancel: FC = () => {
  // TODO detect cancel support
  // if (cancel === false) return <ComposerSend />;
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

ComposerSendOrCancel.displayName = "ComposerSendOrCancel";

const ComposerSendButton = styled(TooltipIconButton, {
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

const ComposerCancelButton = styled(TooltipIconButton, {
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
