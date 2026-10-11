import {
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAnsweredValue } from "../../answeredValues";
import { useA2uiBinding } from "../../bindingContext";
import {
  classifyTemporal,
  fromLocalDateTime,
  normalizeTemporalInputValue,
  toPickerLocalDateTime,
} from "../../temporal";
import type { Action, ButtonStyle } from "../../ir";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "../../types";
import { interactiveDefinitions } from "../../vocabulary/definitions/interactive";
import { fire } from "../../vocabulary/dispatch";
import {
  clamp,
  finiteNumber,
  mapOptions,
  UNDO_WINDOW_SECONDS,
  type Option,
} from "../../vocabulary/interactiveValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import { useField, useFieldScope } from "../fieldScope";
import { fade, RADIUS, TEXT_SIZE, useInk, useNativeTheme } from "../theme";
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
  choiceField: { gap: 6 },
  choiceLabel: { fontSize: TEXT_SIZE.sm },
  choiceHint: { fontSize: TEXT_SIZE.md },
  choiceGroup: {
    borderWidth: 1,
    borderRadius: RADIUS.control,
    overflow: "hidden",
  },
  choiceRow: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  choiceText: { fontSize: TEXT_SIZE.md, flexGrow: 1, flexShrink: 1 },
  choiceDescription: { fontSize: TEXT_SIZE.sm },
  choiceMark: { fontSize: TEXT_SIZE.md },
  checkboxRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: { fontSize: 12, lineHeight: 16 },
  radioCircle: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: RADIUS.control,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperSymbol: { fontSize: 18 },
  stepperValue: { minWidth: 64, alignItems: "center" },
  stepperNumber: { fontSize: 14, fontVariant: ["tabular-nums"] },
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
  useInsertionEffect(() => {
    latest.current = shown;
  });
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

type DatePickerProps = ActionProps & {
  inputType?: "date" | "datetime" | "time";
  value?: string;
  min?: string;
  max?: string;
  label?: string;
  name?: string;
};

const dateText = (value: string | undefined, inputType: string) =>
  inputType === "datetime"
    ? toPickerLocalDateTime(value ?? "").replace("T", " ")
    : normalizeTemporalInputValue(value ?? "");

function DatePickerField({
  inputType = "date",
  value,
  label,
  name,
  initialValue,
  $action,
  $dispatch,
}: DatePickerProps & { initialValue: string | undefined }) {
  const theme = useNativeTheme();
  const ink = useInk();
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const boundValue = updateBinding
    ? typeof answeredValue === "string"
      ? answeredValue
      : value
    : initialValue;
  const [selection, setSelection] = useState(() => ({
    initialValue: boundValue,
    anchor: boundValue,
    committed: boundValue,
    text: dateText(boundValue, inputType),
    invalid: false,
  }));
  if (selection.initialValue !== boundValue) {
    const echo =
      updateBinding !== undefined && selection.committed === boundValue;
    setSelection({
      initialValue: boundValue,
      anchor: echo ? selection.anchor : boundValue,
      committed: boundValue,
      text: dateText(boundValue, inputType),
      invalid: false,
    });
  }
  const parse = (text: string) => {
    const raw = inputType === "datetime" ? text.replace(" ", "T") : text;
    const temporal = classifyTemporal(raw);
    const valid =
      raw === "" ||
      (inputType === "date" && temporal.kind === "date") ||
      (inputType === "time" && temporal.kind === "time") ||
      (inputType === "datetime" &&
        (temporal.kind === "floating" || temporal.kind === "instant"));
    if (!valid) return undefined;
    if (raw === "") return "";
    if (inputType === "date") return raw;
    const normalized = normalizeTemporalInputValue(raw);
    if (
      normalized === dateText(selection.committed, inputType).replace(" ", "T")
    )
      return selection.committed ?? "";
    return inputType === "datetime"
      ? fromLocalDateTime(normalized, selection.anchor)
      : normalized;
  };
  useField(name, "value", () => parse(selection.text) ?? "");
  const commit = () => {
    const next = parse(selection.text);
    if (next === undefined) {
      setSelection((current) => ({ ...current, invalid: true }));
      return;
    }
    setSelection((current) => ({
      ...current,
      committed: next,
      invalid: false,
    }));
    if (next === selection.committed) return;
    updateBinding?.(next);
    fire($action, $dispatch, next);
  };
  return (
    <View style={styles.choiceField}>
      {label !== undefined ? (
        <Text style={[styles.choiceLabel, { color: fade(ink, 0.62) }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholder={
          inputType === "time"
            ? "HH:MM"
            : inputType === "datetime"
              ? "YYYY-MM-DD HH:MM"
              : "YYYY-MM-DD"
        }
        placeholderTextColor={fade(ink, 0.45)}
        value={selection.text}
        onChangeText={(text) =>
          setSelection((current) => ({ ...current, text, invalid: false }))
        }
        onSubmitEditing={commit}
        onBlur={commit}
        style={[
          styles.field,
          {
            borderColor: selection.invalid ? theme.destructive : theme.input,
            color: ink,
          },
        ]}
      />
    </View>
  );
}

function DatePicker(props: DatePickerProps) {
  const answeredValue = useAnsweredValue(props.name);
  const updateBinding = useA2uiBinding(props.name);
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : props.value;
  return (
    <DatePickerField
      key={updateBinding ? "bound" : initialValue}
      {...props}
      initialValue={initialValue}
    />
  );
}

type ChoiceProps = ActionProps & {
  value?: string;
  options: Option[];
  placeholder?: string;
  label?: string;
  name?: string;
  defaultValue?: string;
  children?: ReactNode;
};

function ChoiceRows({
  options,
  label,
  selected,
  onSelect,
  radio,
  showLabel = true,
  children,
}: {
  options: Option[];
  label?: string | undefined;
  selected: string | undefined;
  onSelect: (value: string) => void;
  radio: boolean;
  showLabel?: boolean;
  children?: ReactNode;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  const entries = mapOptions(options, (option, key) => ({
    option,
    key,
  })).filter((entry) => entry !== null);
  return (
    <View style={styles.choiceField}>
      {showLabel && label !== undefined ? (
        <Text style={[styles.choiceLabel, { color: fade(ink, 0.62) }]}>
          {label}
        </Text>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.choiceGroup, { borderColor: theme.input }]}
      >
        {entries.map(({ option, key }, index) => {
          const checked = selected === option.value;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              aria-checked={checked}
              onPress={() => {
                if (!checked) onSelect(option.value);
              }}
              style={[
                styles.choiceRow,
                index > 0 && {
                  borderTopWidth: 1,
                  borderTopColor: theme.hairline,
                },
              ]}
            >
              {radio ? (
                <View
                  style={[styles.radioCircle, { borderColor: theme.input }]}
                >
                  {checked ? (
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: theme.primary },
                      ]}
                    />
                  ) : null}
                </View>
              ) : null}
              <View style={{ flexGrow: 1, flexShrink: 1 }}>
                <Text style={[styles.choiceText, { color: ink }]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text
                    style={[
                      styles.choiceDescription,
                      { color: fade(ink, 0.62) },
                    ]}
                  >
                    {option.description}
                  </Text>
                ) : null}
              </View>
              {!radio && checked ? (
                <Text style={[styles.choiceMark, { color: ink }]}>✓</Text>
              ) : null}
            </Pressable>
          );
        })}
        {children}
      </View>
    </View>
  );
}

function SelectField({
  initialValue,
  value,
  options,
  placeholder,
  label,
  name,
  children,
  $action,
  $dispatch,
}: ChoiceProps & { initialValue: string }) {
  const ink = useInk();
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const [choice, setChoice] = useState(initialValue);
  const selected = updateBinding
    ? typeof answeredValue === "string"
      ? answeredValue
      : (value ?? "")
    : choice;
  const entries = mapOptions(options, (option) => option).filter(
    (option) => option !== null,
  );
  const effective = entries.some((option) => option.value === selected)
    ? selected
    : placeholder && selected === ""
      ? ""
      : (entries[0]?.value ?? "");
  useField(name, "value", () => effective);
  return (
    <View style={styles.choiceField}>
      {label !== undefined ? (
        <Text style={[styles.choiceLabel, { color: fade(ink, 0.62) }]}>
          {label}
        </Text>
      ) : null}
      {effective === "" && placeholder ? (
        <Text style={[styles.choiceHint, { color: fade(ink, 0.45) }]}>
          {placeholder}
        </Text>
      ) : null}
      <ChoiceRows
        options={options}
        label={label}
        showLabel={false}
        selected={effective}
        radio={false}
        onSelect={(next) => {
          setChoice(next);
          updateBinding?.(next);
          fire($action, $dispatch, next);
        }}
      >
        {children}
      </ChoiceRows>
    </View>
  );
}

function Select({ defaultValue, ...props }: ChoiceProps) {
  const answeredValue = useAnsweredValue(props.name);
  const initialValue =
    typeof answeredValue === "string"
      ? answeredValue
      : typeof defaultValue === "string"
        ? defaultValue
        : "";
  return (
    <SelectField key={initialValue} {...props} initialValue={initialValue} />
  );
}

type CheckboxProps = ActionProps & {
  checked?: boolean;
  label: string;
  name?: string;
  defaultChecked?: boolean;
  variant?: "checkbox" | "switch";
};

function CheckboxRow({
  label,
  description,
  checked,
  onPress,
}: {
  label: string;
  description?: string | undefined;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={styles.checkboxRow}
    >
      <View
        style={[
          styles.checkboxBox,
          { borderColor: theme.input },
          checked && { backgroundColor: theme.primary },
        ]}
      >
        {checked ? (
          <Text
            style={[styles.checkboxMark, { color: theme.primaryForeground }]}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <Text style={[styles.choiceText, { color: ink }]}>{label}</Text>
        {description ? (
          <Text style={[styles.choiceDescription, { color: fade(ink, 0.62) }]}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SwitchRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={styles.checkboxRow}
    >
      <Text style={[styles.choiceText, { color: ink }]}>{label}</Text>
      <View aria-hidden style={{ pointerEvents: "none" }}>
        <Switch
          value={checked}
          trackColor={{ false: theme.input, true: theme.primary }}
        />
      </View>
    </Pressable>
  );
}

function CheckboxField({
  initialChecked,
  checked,
  label,
  name,
  variant,
  $action,
  $dispatch,
}: CheckboxProps & { initialChecked: boolean }) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const [choice, setChoice] = useState(initialChecked);
  const selected = updateBinding
    ? typeof answeredValue === "boolean"
      ? answeredValue
      : checked === true
    : choice;
  useField(name, "value", () => selected);
  const Row = variant === "switch" ? SwitchRow : CheckboxRow;
  return (
    <Row
      label={label}
      checked={selected}
      onPress={() => {
        const next = !selected;
        setChoice(next);
        updateBinding?.(next);
        fire($action, $dispatch, next);
      }}
    />
  );
}

function Checkbox({ defaultChecked, ...props }: CheckboxProps) {
  const answeredValue = useAnsweredValue(props.name);
  const initialChecked =
    typeof answeredValue === "boolean"
      ? answeredValue
      : defaultChecked === true;
  return (
    <CheckboxField
      key={String(initialChecked)}
      {...props}
      initialChecked={initialChecked}
    />
  );
}

type SliderProps = ActionProps & {
  value?: number;
  name?: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
};

function SliderField({
  value,
  name,
  label,
  min,
  max,
  step,
  unit,
  initialValue,
  $action,
  $dispatch,
}: SliderProps & { initialValue: number }) {
  const theme = useNativeTheme();
  const ink = useInk();
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const safeMin = finiteNumber(min) ? min : 0;
  const safeMax = finiteNumber(max) ? Math.max(max, safeMin) : safeMin + 100;
  const safeStep = finiteNumber(step) && step > 0 ? step : 1;
  const [localValue, setLocalValue] = useState(initialValue);
  const selected = updateBinding
    ? clamp(
        finiteNumber(answeredValue)
          ? answeredValue
          : finiteNumber(value)
            ? value
            : safeMin,
        safeMin,
        safeMax,
      )
    : localValue;
  const text = unit ? `${selected} ${unit}` : String(selected);
  useField(name, "value", () => selected);
  const adjust = (direction: -1 | 1) => {
    const position = (selected - safeMin) / safeStep;
    const index =
      direction === 1
        ? Math.floor(position + 1e-9) + 1
        : Math.ceil(position - 1e-9) - 1;
    const decimals = safeStep.toString().split(".")[1]?.length ?? 0;
    const next = clamp(
      Number((safeMin + index * safeStep).toFixed(decimals)),
      safeMin,
      safeMax,
    );
    if (next === selected) return;
    setLocalValue(next);
    updateBinding?.(next);
    fire($action, $dispatch, next);
  };
  return (
    <View style={styles.choiceField}>
      {label !== undefined ? (
        <Text style={[styles.choiceLabel, { color: fade(ink, 0.62) }]}>
          {label}
        </Text>
      ) : null}
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `Decrease ${label}` : "Decrease"}
          accessibilityState={{ disabled: selected <= safeMin }}
          aria-disabled={selected <= safeMin}
          disabled={selected <= safeMin}
          onPress={() => adjust(-1)}
          style={[styles.stepperButton, { borderColor: theme.input }]}
        >
          <Text style={[styles.stepperSymbol, { color: ink }]}>−</Text>
        </Pressable>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{
            min: safeMin,
            max: safeMax,
            now: selected,
            text,
          }}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuenow={selected}
          aria-valuetext={text}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") adjust(1);
            if (event.nativeEvent.actionName === "decrement") adjust(-1);
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          style={styles.stepperValue}
        >
          <Text style={[styles.stepperNumber, { color: ink }]}>{text}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `Increase ${label}` : "Increase"}
          accessibilityState={{ disabled: selected >= safeMax }}
          aria-disabled={selected >= safeMax}
          disabled={selected >= safeMax}
          onPress={() => adjust(1)}
          style={[styles.stepperButton, { borderColor: theme.input }]}
        >
          <Text style={[styles.stepperSymbol, { color: ink }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Slider(props: SliderProps) {
  const answeredValue = useAnsweredValue(props.name);
  const updateBinding = useA2uiBinding(props.name);
  const safeMin = finiteNumber(props.min) ? props.min : 0;
  const safeMax = finiteNumber(props.max)
    ? Math.max(props.max, safeMin)
    : safeMin + 100;
  const initialValue = clamp(
    finiteNumber(answeredValue)
      ? answeredValue
      : finiteNumber(updateBinding ? props.value : props.defaultValue)
        ? (updateBinding ? props.value : props.defaultValue)!
        : safeMin,
    safeMin,
    safeMax,
  );
  return (
    <SliderField
      key={`${safeMin}:${safeMax}:${props.step ?? 1}:${updateBinding ? "bound" : initialValue}`}
      {...props}
      initialValue={initialValue}
    />
  );
}

type GroupProps = ActionProps & {
  value?: string;
  options: Option[];
  name?: string;
  label?: string;
  defaultValue?: string;
  children?: ReactNode;
};

function RadioGroupField({
  initialValue,
  value,
  options,
  name,
  label,
  children,
  $action,
  $dispatch,
}: GroupProps & { initialValue: string | undefined }) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const [choice, setChoice] = useState(initialValue);
  const selected = updateBinding
    ? typeof answeredValue === "string"
      ? answeredValue
      : value
    : choice;
  const entries = mapOptions(options, (option) => option).filter(
    (option) => option !== null,
  );
  useField(name, "radio", () =>
    entries.some((option) => option.value === selected) ? selected : undefined,
  );
  return (
    <ChoiceRows
      options={options}
      label={label}
      selected={selected}
      radio
      onSelect={(next) => {
        setChoice(next);
        updateBinding?.(next);
        fire($action, $dispatch, next);
      }}
    >
      {children}
    </ChoiceRows>
  );
}

function RadioGroup({ defaultValue, ...props }: GroupProps) {
  const answeredValue = useAnsweredValue(props.name);
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : defaultValue;
  return (
    <RadioGroupField
      key={initialValue}
      {...props}
      initialValue={initialValue}
    />
  );
}

type CheckboxGroupProps = ActionProps & {
  value?: string[];
  options: Option[];
  name?: string;
  label?: string;
  defaultValue?: string[];
  children?: ReactNode;
};

function CheckboxGroupField({
  initialValues,
  value,
  options,
  name,
  label,
  children,
  $action,
  $dispatch,
}: CheckboxGroupProps & { initialValues: string[] }) {
  const ink = useInk();
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const entries = mapOptions(options, (option, key) => ({
    option,
    key,
  })).filter((entry) => entry !== null);
  const [choice, setChoice] = useState(() =>
    entries
      .filter(({ option }) => initialValues.includes(option.value))
      .map(({ key }) => key),
  );
  const boundValues = Array.isArray(answeredValue)
    ? answeredValue
    : (value ?? []);
  const selected = updateBinding
    ? entries
        .filter(({ option }) => boundValues.includes(option.value))
        .map(({ key }) => key)
    : choice;
  const values = entries
    .filter(({ key }) => selected.includes(key))
    .map(({ option }) => option.value);
  useField(name, "checkboxes", () => values);
  return (
    <View
      accessibilityRole="group"
      accessibilityLabel={label}
      style={styles.choiceField}
    >
      {label !== undefined ? (
        <Text style={[styles.choiceLabel, { color: fade(ink, 0.62) }]}>
          {label}
        </Text>
      ) : null}
      {entries.map(({ option, key }) => (
        <CheckboxRow
          key={key}
          label={option.label}
          description={option.description}
          checked={selected.includes(key)}
          onPress={() => {
            const nextKeys = selected.includes(key)
              ? selected.filter((item) => item !== key)
              : [...selected, key];
            const next = entries
              .filter((item) => nextKeys.includes(item.key))
              .map((item) => item.option.value);
            setChoice(nextKeys);
            updateBinding?.(next);
            fire($action, $dispatch, next);
          }}
        />
      ))}
      {children}
    </View>
  );
}

function CheckboxGroup({ defaultValue, ...props }: CheckboxGroupProps) {
  const answeredValue = useAnsweredValue(props.name);
  const initialValues =
    Array.isArray(answeredValue) &&
    answeredValue.every((value) => typeof value === "string")
      ? answeredValue
      : Array.isArray(defaultValue)
        ? defaultValue
        : [];
  return (
    <CheckboxGroupField
      key={JSON.stringify(initialValues)}
      {...props}
      initialValues={initialValues}
    />
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
  DatePicker: {
    ...interactiveDefinitions.DatePicker,
    render: (props) => <DatePicker {...props} />,
  },
  Select: {
    ...interactiveDefinitions.Select,
    render: (props) => <Select {...props} />,
  },
  Checkbox: {
    ...interactiveDefinitions.Checkbox,
    render: (props) => <Checkbox {...props} />,
  },
  Slider: {
    ...interactiveDefinitions.Slider,
    render: (props) => <Slider {...props} />,
  },
  RadioGroup: {
    ...interactiveDefinitions.RadioGroup,
    render: (props) => <RadioGroup {...props} />,
  },
  CheckboxGroup: {
    ...interactiveDefinitions.CheckboxGroup,
    render: (props) => <CheckboxGroup {...props} />,
  },
} satisfies GenerativeUILibrary;
