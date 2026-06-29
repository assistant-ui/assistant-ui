import { type ComponentProps } from "react";

import { Box } from "ink";
import { useAui, useAuiState } from "@assistant-ui/store";
import { TextInput } from "../textInput/TextInput";

export type ComposerInputProps = ComponentProps<typeof Box> & {
  submitOnEnter?: boolean | undefined;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  multiLine?: boolean | undefined;
  onSubmit?: ((text: string) => void) | undefined;
};

export const ComposerInput = ({
  submitOnEnter = false,
  placeholder = "",
  autoFocus = true,
  multiLine = false,
  onSubmit,
  ...boxProps
}: ComposerInputProps) => {
  const aui = useAui();
  const storeText = useAuiState((s) => s.composer.text);

  const submit = (submittedText: string) => {
    if (onSubmit) {
      onSubmit(submittedText);
      return;
    }

    const threadState = aui.thread().getState();
    if (threadState.isRunning && !threadState.capabilities.queue) return;

    aui.composer().send();
  };

  return (
    <TextInput
      {...boxProps}
      value={storeText}
      onChange={(text) => aui.composer().setText(text)}
      onSubmit={submit}
      submitOnEnter={submitOnEnter}
      placeholder={placeholder}
      autoFocus={autoFocus}
      multiLine={multiLine}
    />
  );
};
