import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, TextInput } from "react-native";
import { useAnsweredValue } from "../../answeredValues";
import { useA2uiBinding } from "../../bindingContext";
import type { Action, ButtonStyle } from "../../ir";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "../../types";
import { interactiveDefinitions } from "../../vocabulary/definitions/interactive";
import { fire } from "../../vocabulary/dispatch";
import { UNDO_WINDOW_SECONDS } from "../../vocabulary/interactiveValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import { useField, useFieldScope } from "../fieldScope";
import { fade, RADIUS, useInk, useNativeTheme } from "../theme";
import { ActionButton } from "./button";

const styles = StyleSheet.create({
  field: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    fontSize: 14,
  },
  multiline: { paddingVertical: 10, lineHeight: 21, textAlignVertical: "top" },
});

type ActionProps = {
  $action?: Action | undefined;
  $dispatch?: GenerativeUIDispatch | undefined;
};

function Button({
  label,
  buttonStyle,
  block,
  submit,
  undoable,
  children,
  $action,
  $dispatch,
}: ActionProps & {
  label?: string;
  buttonStyle?: ButtonStyle;
  block?: boolean;
  submit?: boolean;
  undoable?: boolean;
  children?: ReactNode;
}) {
  const scope = useFieldScope();
  const [remaining, setRemaining] = useState<number | undefined>(undefined);
  const pending = useRef<{ $action: Action; $dispatch: GenerativeUIDispatch }>(
    undefined,
  );
  const labelText = String(toTextContent(label) ?? "");
  const undoLabel = labelText.trim();

  useEffect(() => {
    if (remaining === undefined) return;
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1);
        return;
      }
      const action = pending.current;
      pending.current = undefined;
      setRemaining(undefined);
      if (action) fire(action.$action, action.$dispatch);
    }, 1_000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const onPress = () => {
    if (submit) {
      scope?.submit();
      return;
    }
    if (!undoable || $action === undefined || $dispatch === undefined) {
      fire($action, $dispatch);
      return;
    }
    if (remaining !== undefined) {
      pending.current = undefined;
      setRemaining(undefined);
      return;
    }
    pending.current = { $action, $dispatch };
    setRemaining(UNDO_WINDOW_SECONDS);
    AccessibilityInfo.announceForAccessibility(
      `${labelText} in ${UNDO_WINDOW_SECONDS} seconds`,
    );
  };

  return (
    <ActionButton
      label={remaining === undefined ? labelText : `Undo ${remaining}`}
      tone={buttonStyle}
      block={block}
      pending={remaining !== undefined}
      accessibilityLabel={
        remaining === undefined
          ? undefined
          : undoLabel
            ? `Undo ${undoLabel}`
            : "Undo"
      }
      onPress={onPress}
    >
      {remaining === undefined ? children : null}
    </ActionButton>
  );
}

type InputProps = ActionProps & {
  value?: string;
  inputType?: "text" | "password" | "number";
  placeholder?: string;
  multiline?: boolean;
  label?: string;
  name?: string;
  defaultValue?: string;
};

function InputField({
  value,
  inputType,
  placeholder,
  multiline,
  label,
  name,
  initialValue,
  $action,
  $dispatch,
}: Omit<InputProps, "defaultValue"> & { initialValue: string | undefined }) {
  const theme = useNativeTheme();
  const ink = useInk();
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const shown = updateBinding
    ? typeof answeredValue === "string"
      ? answeredValue
      : (value ?? "")
    : undefined;
  const typed = useRef(initialValue ?? "");
  const latest = useRef(shown);
  latest.current = shown;
  const read = () => latest.current ?? typed.current;
  const scope = useField(name, "value", read);
  const isMultiline =
    multiline === true && (inputType === undefined || inputType === "text");

  return (
    <TextInput
      {...(label !== undefined ? { accessibilityLabel: label } : {})}
      {...(placeholder !== undefined ? { placeholder } : {})}
      placeholderTextColor={fade(ink, 0.45)}
      {...(shown !== undefined
        ? { value: shown }
        : initialValue !== undefined
          ? { defaultValue: initialValue }
          : {})}
      secureTextEntry={inputType === "password"}
      {...(inputType === "number" ? { keyboardType: "numeric" as const } : {})}
      multiline={isMultiline}
      onChangeText={(text) => {
        typed.current = text;
        updateBinding?.(text);
      }}
      {...(isMultiline
        ? {}
        : {
            onSubmitEditing: () =>
              scope ? scope.submit() : fire($action, $dispatch, read()),
          })}
      style={[
        styles.field,
        isMultiline && styles.multiline,
        { borderColor: theme.input, color: ink },
      ]}
    />
  );
}

function Input({ defaultValue, ...props }: InputProps) {
  const answeredValue = useAnsweredValue(props.name);
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : defaultValue;
  return (
    <InputField key={initialValue} {...props} initialValue={initialValue} />
  );
}

export const interactiveVocabulary = {
  Button: {
    ...interactiveDefinitions.Button,
    render: (props) => <Button {...props} />,
  },
  Input: {
    ...interactiveDefinitions.Input,
    render: (props) => <Input {...props} />,
  },
} satisfies GenerativeUILibrary;
