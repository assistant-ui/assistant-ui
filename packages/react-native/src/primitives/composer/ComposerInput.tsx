import { useCallback } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useComposerRuntime } from "../../context";
import { useComposer } from "../../hooks/useComposer";

export type ComposerInputProps = Omit<TextInputProps, "value" | "onChangeText">;

export const ComposerInput = (props: ComposerInputProps) => {
  const runtime = useComposerRuntime();
  const text = useComposer((s) => s.text);

  const onChangeText = useCallback(
    (value: string) => {
      runtime.setText(value);
    },
    [runtime],
  );

  return <TextInput value={text} onChangeText={onChangeText} {...props} />;
};
