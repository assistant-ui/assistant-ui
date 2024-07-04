"use client";
import { ComposerPrimitive } from "@assistant-ui/react";
import { forwardRef, type FC } from "react";
import { Button, ButtonProps } from "./base/button";
import { styled } from "../styled";
import { useThreadConfig } from "./thread-config";

export const EditComposer: FC = () => {
  return (
    <EditComposerRoot>
      <EditComposerInput />

      <EditComposerFooter>
        <EditComposerCancel />
        <EditComposerSend />
      </EditComposerFooter>
    </EditComposerRoot>
  );
};

EditComposer.displayName = "EditComposer";

export const EditComposerRoot = styled(ComposerPrimitive.Root, {
  className: "aui-edit-composer-root",
});

EditComposerRoot.displayName = "EditComposerRoot";

export const EditComposerInput = styled(ComposerPrimitive.Input, {
  className: "aui-edit-composer-input",
});

EditComposerInput.displayName = "EditComposerInput";

export const EditComposerFooter = styled("div", {
  className: "aui-edit-composer-footer",
});

EditComposerFooter.displayName = "EditComposerFooter";

export const EditComposerCancel = forwardRef<
  HTMLButtonElement,
  Partial<ButtonProps>
>((props, ref) => {
  const {
    strings: { editComposer: { cancel: { label = "Cancel" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <ComposerPrimitive.Cancel asChild>
      <Button variant="ghost" {...props} ref={ref}>
        {label}
      </Button>
    </ComposerPrimitive.Cancel>
  );
});

EditComposerCancel.displayName = "EditComposerCancel";

export const EditComposerSend = forwardRef<
  HTMLButtonElement,
  Partial<ButtonProps>
>((props, ref) => {
  const {
    strings: { editComposer: { send: { label = "Send" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <ComposerPrimitive.Send asChild>
      <Button {...props} ref={ref}>
        {label}
      </Button>
    </ComposerPrimitive.Send>
  );
});

EditComposerSend.displayName = "EditComposerSend";
