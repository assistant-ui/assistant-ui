import type { ComponentProps } from "react";
import { Box, Text, useFocus, useInput } from "ink";
import { useAui, useAuiState } from "@assistant-ui/store";

export type EditComposerInputProps = ComponentProps<typeof Box> & {
  /** Placeholder text shown when the input is empty. */
  placeholder?: string | undefined;
  /** Whether this input should receive focus automatically. @default true */
  autoFocus?: boolean | undefined;
};

export const EditComposerInput = ({
  placeholder = "",
  autoFocus = true,
  ...boxProps
}: EditComposerInputProps) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const { isFocused } = useFocus({ autoFocus });

  useInput(
    (input, key) => {
      if (key.backspace || key.delete) {
        aui.composer().setText(text.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta && !key.return) {
        aui.composer().setText(text + input);
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box {...boxProps}>
      <Text dimColor={!text && !!placeholder}>{text || placeholder}</Text>
      {isFocused && <Text>▋</Text>}
    </Box>
  );
};
