import { useCallback } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useAui, useAuiState } from "@assistant-ui/store";

export type ComposerInputProps = Omit<TextInputProps, "value" | "onChangeText">;

export const ComposerInput = (props: ComposerInputProps) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);

  const onChangeText = useCallback(
    (value: string) => {
      aui.composer().setText(value);
    },
    [aui],
  );

  return <TextInput value={text} onChangeText={onChangeText} {...props} />;
};
