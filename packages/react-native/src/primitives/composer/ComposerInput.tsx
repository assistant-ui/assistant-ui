import { FC, useCallback } from "react";
import { TextInput, TextInputProps } from "react-native";
import { useComposer } from "../../hooks/useComposer";
import { useComposerRuntime } from "../../hooks/useComposerRuntime";
import { useThread } from "../../hooks/useThread";

export type ComposerInputProps = Omit<TextInputProps, "value" | "onChangeText">;

export const ComposerInput: FC<ComposerInputProps> = (props) => {
  const runtime = useComposerRuntime();
  const text = useComposer((state) => state.text);
  const isRunning = useThread((state) => state.isRunning);

  const handleChangeText = useCallback(
    (newText: string) => {
      runtime.setText(newText);
    },
    [runtime],
  );

  return (
    <TextInput
      value={text}
      onChangeText={handleChangeText}
      editable={!isRunning}
      placeholder="Type a message..."
      multiline
      {...props}
    />
  );
};
