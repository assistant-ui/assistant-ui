"use client";

import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";

import { SendHorizontalIcon } from "lucide-react";
import { withDefaults } from "./utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { CircleStopIcon } from "./base/CircleStopIcon";
import { ComposerPrimitive, ThreadPrimitive } from "../primitives";
import { useThreadContext } from "../context";

const Composer: FC = () => {
  return (
    <ComposerRoot>
      <ComposerInput autoFocus />
      <ComposerAction />
    </ComposerRoot>
  );
};

Composer.displayName = "Composer";

const ComposerRoot = withDefaults(ComposerPrimitive.Root, {
  className: "aui-composer-root",
});

ComposerRoot.displayName = "ComposerRoot";

const ComposerInputStyled = withDefaults(ComposerPrimitive.Input, {
  rows: 1,
  autoFocus: true,
  className: "aui-composer-input",
});

export type ComposerInputProps = ComponentPropsWithoutRef<
  typeof ComposerInputStyled
>;
const ComposerInput = forwardRef<HTMLTextAreaElement, ComposerInputProps>(
  (props, ref) => {
    const {
      strings: {
        composer: { input: { placeholder = "Write a message..." } = {} } = {},
      } = {},
    } = useThreadConfig();
    return (
      <ComposerInputStyled placeholder={placeholder} {...props} ref={ref} />
    );
  },
);

ComposerInput.displayName = "ComposerInput";

const useAllowCancel = () => {
  const { useThread } = useThreadContext();
  const cancelSupported = useThread((t) => t.capabilities.cancel);
  return cancelSupported;
};

const ComposerAction: FC = () => {
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

const ComposerSend = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { composer: { send: { tooltip = "Send" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <ComposerPrimitive.Send asChild>
      <ComposerSendButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? <SendHorizontalIcon />}
      </ComposerSendButton>
    </ComposerPrimitive.Send>
  );
});

ComposerSend.displayName = "ComposerSend";

const ComposerCancelButton = withDefaults(TooltipIconButton, {
  variant: "default",
  className: "aui-composer-cancel",
});

const ComposerCancel = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { composer: { cancel: { tooltip = "Cancel" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <ComposerPrimitive.Cancel asChild>
      <ComposerCancelButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? <CircleStopIcon />}
      </ComposerCancelButton>
    </ComposerPrimitive.Cancel>
  );
});

ComposerCancel.displayName = "ComposerCancel";

const exports = {
  Root: ComposerRoot,
  Input: ComposerInput,
  Action: ComposerAction,
  Send: ComposerSend,
  Cancel: ComposerCancel,
};

export default Object.assign(Composer, exports) as typeof Composer &
  typeof exports;
