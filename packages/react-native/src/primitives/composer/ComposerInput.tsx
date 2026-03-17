import { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputProps,
} from "react-native";
import { useAui, useAuiState } from "@assistant-ui/store";

export type ComposerInputProps = Omit<
  TextInputProps,
  "value" | "onChangeText"
> & {
  /**
   * Controls how the Enter key submits messages (web only).
   * - "enter": Plain Enter submits (Shift+Enter for newline)
   * - "none": Enter inserts newline (no keyboard submission)
   * @default "enter"
   */
  submitMode?: "enter" | "none";
};

const adjustWebTextareaHeight = (ref: React.RefObject<TextInput | null>) => {
  if (Platform.OS !== "web") return;
  // On web, the TextInput ref IS the DOM element
  const el = ref.current as unknown as HTMLTextAreaElement | null;
  if (!el) return;
  // Ensure rows=1 so scrollHeight reflects actual content
  if (el.rows !== 1) el.rows = 1;
  el.style.overflow = "hidden";
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

export const ComposerInput = ({
  submitMode = "enter",
  onKeyPress: onKeyPressProp,
  numberOfLines,
  style,
  ...props
}: ComposerInputProps) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const inputRef = useRef<TextInput>(null);

  const onChangeText = useCallback(
    (value: string) => {
      aui.composer().setText(value);
    },
    [aui],
  );

  // Auto-resize textarea on web when text changes
  useEffect(() => {
    void text; // trigger re-run when text changes
    adjustWebTextareaHeight(inputRef);
  }, [text]);

  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      onKeyPressProp?.(e);

      if (Platform.OS !== "web") return;
      if (submitMode !== "enter") return;

      const nativeEvent = e.nativeEvent as TextInputKeyPressEventData & {
        shiftKey?: boolean;
      };
      if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
        (e as unknown as Event).preventDefault?.();
        aui.composer().send();
      }
    },
    [aui, submitMode, onKeyPressProp],
  );

  return (
    <TextInput
      ref={inputRef}
      value={text}
      onChangeText={onChangeText}
      onKeyPress={onKeyPress}
      numberOfLines={numberOfLines ?? (Platform.OS === "web" ? 1 : undefined)}
      style={style}
      {...props}
    />
  );
};
