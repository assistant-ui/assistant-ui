import * as React from "react";
import {
  CHECKBOX_GROUP_ATTR,
  FIELD_NAME_ATTR,
  FIELD_VALUE_ATTR,
  GENERATED_NAME_ATTR,
} from "../constants";
import type { Action } from "../ir";
import { BUTTON_STYLES } from "../ir";
import type {
  GenerativeUIDispatch,
  GenerativeUILibrary,
  GenerativeUIStatus,
} from "../types";
import { interactiveDefinitions } from "./definitions/interactive";
import {
  mapOptions,
  finiteNumber,
  clamp,
  UNDO_WINDOW_SECONDS,
  type Option,
} from "./interactiveValues";
import { A2uiBindingContext, useA2uiBinding } from "../bindingContext";
import { useAnsweredValue } from "../answeredValues";
import { actionAttr, fire } from "./dispatch";
import { toTextContent } from "./toTextContent";
import { useRadioGroupName } from "../RadioGroupScope";
import {
  classifyTemporal,
  fromLocalDateTime,
  getTemporalInputStep,
  normalizeTemporalInputValue,
  toLocalDateTime,
  toPickerLocalDateTime,
} from "../temporal";

const isComposing = (event: React.KeyboardEvent) =>
  event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;

type RadioGroupRenderProps = {
  value?: string;
  options: Option[];
  name?: string;
  label?: string;
  defaultValue?: string;
  children?: React.ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function RadioGroupRender({
  value,
  options,
  name,
  label,
  defaultValue,
  children,
  $action,
  $dispatch,
}: RadioGroupRenderProps) {
  const groupName = useRadioGroupName(name);
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : defaultValue;
  return (
    <fieldset
      key={initialValue}
      data-aui="radiogroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {mapOptions(options, (option, key) => (
        <label key={key} data-aui="radiogroup-option">
          <input
            type="radio"
            name={groupName}
            {...{ [FIELD_NAME_ATTR]: name }}
            {...(name == null ? { [GENERATED_NAME_ATTR]: "" } : {})}
            value={option.value}
            {...(isBound
              ? { checked: (answeredValue ?? value) === option.value }
              : { defaultChecked: initialValue === option.value })}
            onChange={(e) => {
              updateBinding?.(option.value);
              fire($action, $dispatch, option.value, e.currentTarget);
            }}
          />
          {option.description ? (
            <span data-aui="option-content">
              <span data-aui="option-label">{option.label}</span>
              <span data-aui="option-description">{option.description}</span>
            </span>
          ) : (
            option.label
          )}
        </label>
      ))}
      {children}
    </fieldset>
  );
}

type CheckboxGroupRenderProps = {
  value?: string[];
  options: Option[];
  name?: string;
  label?: string;
  defaultValue?: string[];
  progress?: boolean;
  children?: React.ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

const checkedGroupValues = (input: HTMLInputElement): string[] =>
  Array.from(
    input
      .closest("fieldset")
      ?.querySelectorAll<HTMLInputElement>(
        `:scope > label > input[${CHECKBOX_GROUP_ATTR}]:checked`,
      ) ?? [],
    (checkbox) => checkbox.value,
  );

function CheckboxGroupRender({
  value,
  options,
  name,
  label,
  defaultValue,
  progress,
  children,
  $action,
  $dispatch,
}: CheckboxGroupRenderProps) {
  const generatedName = React.useId();
  const fieldName = name ?? generatedName;
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const checkedValues =
    Array.isArray(answeredValue) &&
    answeredValue.every((value): value is string => typeof value === "string")
      ? answeredValue
      : Array.isArray(defaultValue)
        ? defaultValue
        : [];
  const resetKey = JSON.stringify(checkedValues);
  const [picked, setPicked] = React.useState({
    key: resetKey,
    values: checkedValues,
  });
  const current = isBound
    ? Array.isArray(answeredValue)
      ? checkedValues
      : (value ?? [])
    : picked.key === resetKey
      ? picked.values
      : checkedValues;
  const optionValues = mapOptions(options, (option) => option.value).filter(
    (option) => option !== null,
  );
  const done = optionValues.filter((option) => current.includes(option)).length;
  return (
    <fieldset
      key={resetKey}
      data-aui="checkboxgroup"
      data-aui-action={actionAttr($action)}
      aria-label={label}
    >
      {progress ? (
        <div data-aui="checkboxgroup-progress">
          <span data-aui="checkboxgroup-progress-label">
            {`${done} of ${optionValues.length}`}
          </span>
          <span data-aui="checkboxgroup-progress-track" aria-hidden="true">
            <span
              data-aui="checkboxgroup-progress-fill"
              style={{
                width: `${optionValues.length ? (done / optionValues.length) * 100 : 0}%`,
              }}
            />
          </span>
        </div>
      ) : null}
      {mapOptions(options, (option, key) => (
        <label key={key} data-aui="checkboxgroup-option">
          <input
            type="checkbox"
            name={fieldName}
            {...{ [CHECKBOX_GROUP_ATTR]: "" }}
            {...(name == null ? { [GENERATED_NAME_ATTR]: "" } : {})}
            value={option.value}
            {...(isBound
              ? {
                  checked: (Array.isArray(answeredValue)
                    ? checkedValues
                    : (value ?? [])
                  ).includes(option.value),
                }
              : { defaultChecked: checkedValues.includes(option.value) })}
            onChange={(e) => {
              const selected = checkedGroupValues(e.currentTarget);
              setPicked({ key: resetKey, values: selected });
              updateBinding?.(selected);
              fire($action, $dispatch, selected, e.currentTarget);
            }}
          />
          {option.description ? (
            <span data-aui="option-content">
              <span data-aui="option-label">{option.label}</span>
              <span data-aui="option-description">{option.description}</span>
            </span>
          ) : (
            option.label
          )}
        </label>
      ))}
      {children}
    </fieldset>
  );
}

type SelectRenderProps = {
  value?: string;
  options: Option[];
  placeholder?: string;
  label?: string;
  name?: string;
  defaultValue?: string;
  children?: React.ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function SelectRender({
  value,
  options,
  placeholder,
  label,
  name,
  defaultValue,
  $action,
  $dispatch,
  children,
}: SelectRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const placeholderText = toTextContent(placeholder);
  const initialValue =
    typeof answeredValue === "string"
      ? answeredValue
      : typeof defaultValue === "string"
        ? defaultValue
        : "";
  return (
    <select
      key={initialValue}
      data-aui="select"
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      {...(isBound
        ? {
            value:
              typeof answeredValue === "string" ? answeredValue : (value ?? ""),
          }
        : { defaultValue: initialValue })}
      onChange={(e) => {
        updateBinding?.(e.currentTarget.value);
        fire($action, $dispatch, e.currentTarget.value, e.currentTarget);
      }}
    >
      {placeholderText ? (
        <option value="" disabled>
          {placeholderText}
        </option>
      ) : null}
      {mapOptions(options, (option, key) => (
        <option key={key} value={option.value}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
}

type InputRenderProps = {
  value?: string;
  inputType?: "text" | "password" | "number";
  placeholder?: string;
  multiline?: boolean;
  label?: string;
  name?: string;
  defaultValue?: string;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function InputRender({
  value,
  inputType,
  placeholder,
  multiline,
  label,
  name,
  defaultValue,
  $action,
  $dispatch,
}: InputRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : defaultValue;
  const submit = (control: HTMLInputElement | HTMLTextAreaElement) =>
    fire($action, $dispatch, control.value, control);
  return multiline && (inputType === undefined || inputType === "text") ? (
    <textarea
      key={initialValue}
      data-aui="input"
      data-aui-multiline
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      placeholder={placeholder}
      {...(isBound
        ? {
            value:
              typeof answeredValue === "string" ? answeredValue : (value ?? ""),
          }
        : { defaultValue: initialValue })}
      onChange={
        updateBinding ? (e) => updateBinding(e.currentTarget.value) : undefined
      }
      onKeyDown={(e) => {
        if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey) || isComposing(e))
          return;
        if (e.currentTarget.form) {
          e.preventDefault();
          HTMLFormElement.prototype.requestSubmit.call(e.currentTarget.form);
        } else {
          submit(e.currentTarget);
        }
      }}
    />
  ) : (
    <input
      key={initialValue}
      type={inputType}
      step={inputType === "number" ? "any" : undefined}
      data-aui="input"
      data-aui-action={actionAttr($action)}
      name={name}
      aria-label={label}
      placeholder={placeholder}
      {...(isBound
        ? {
            value:
              typeof answeredValue === "string" ? answeredValue : (value ?? ""),
          }
        : { defaultValue: initialValue })}
      onChange={
        updateBinding ? (e) => updateBinding(e.currentTarget.value) : undefined
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isComposing(e) && !e.currentTarget.form)
          submit(e.currentTarget);
      }}
    />
  );
}

type DatePickerRenderProps = {
  inputType?: "date" | "datetime" | "time";
  value?: string;
  min?: string;
  max?: string;
  label?: string;
  name?: string;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

const subscribeToHydration = () => () => {};
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

function DatePickerRender({
  inputType = "date",
  value,
  min,
  max,
  label,
  name,
  $action,
  $dispatch,
}: DatePickerRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const initialValue =
    typeof answeredValue === "string" ? answeredValue : value;
  const [selection, setSelection] = React.useState({
    initialValue,
    value: initialValue,
    anchor: initialValue,
    committedValue: initialValue,
    edited: false,
  });
  if (selection.initialValue !== initialValue) {
    const isEcho = isBound && initialValue === selection.value;
    setSelection({
      initialValue,
      value: initialValue,
      anchor: isEcho ? selection.anchor : initialValue,
      committedValue: isEcho ? selection.committedValue : initialValue,
      edited: isEcho && selection.edited,
    });
  }
  const currentValue = isBound ? initialValue : selection.value;
  const temporal = classifyTemporal(currentValue ?? "");
  const anchor = classifyTemporal(selection.anchor ?? "");
  const hasInstantAnchor =
    inputType === "datetime" && anchor.kind === "instant";
  const canonicalFieldValue = (value: string | undefined) => {
    const current = value ?? "";
    const kind = classifyTemporal(current).kind;
    if (inputType === "time")
      return kind === "time" && normalizeTemporalInputValue(current) !== current
        ? value
        : undefined;
    if (inputType !== "datetime") return undefined;
    if (kind === "instant") return value;
    if (hasInstantAnchor) return selection.anchor;
    return kind === "floating" &&
      normalizeTemporalInputValue(current) !== current
      ? value
      : undefined;
  };
  const minimum = classifyTemporal(min ?? "");
  const maximum = classifyTemporal(max ?? "");
  const hydrated = React.useSyncExternalStore(
    subscribeToHydration,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  );
  const showRawValue =
    inputType === "datetime" && temporal.kind === "instant" && !hydrated;
  const displayValue =
    currentValue === undefined
      ? undefined
      : inputType === "datetime" && hydrated
        ? toPickerLocalDateTime(currentValue)
        : normalizeTemporalInputValue(currentValue);
  const keyboardActive = React.useRef(false);
  const valueFromInput = (input: HTMLInputElement) => {
    const inputValue = normalizeTemporalInputValue(input.value);
    return inputType === "datetime"
      ? fromLocalDateTime(inputValue, selection.anchor)
      : inputValue;
  };
  const commit = (input: HTMLInputElement) => {
    if (!selection.edited) return;
    const nextValue = valueFromInput(input);
    setSelection({ ...selection, committedValue: nextValue, edited: false });
    if (nextValue !== selection.committedValue)
      fire($action, $dispatch, nextValue, input);
  };
  return (
    <input
      key={isBound ? undefined : initialValue}
      type={
        showRawValue
          ? "text"
          : inputType === "datetime"
            ? "datetime-local"
            : inputType
      }
      readOnly={showRawValue || undefined}
      data-aui="datepicker"
      data-aui-action={actionAttr($action)}
      {...{
        [FIELD_VALUE_ATTR]: canonicalFieldValue(currentValue),
      }}
      name={name}
      aria-label={label}
      {...(isBound || inputType === "datetime"
        ? { value: displayValue ?? "" }
        : { defaultValue: displayValue })}
      min={
        inputType === "datetime" && hydrated && min !== undefined
          ? normalizeTemporalInputValue(
              toLocalDateTime(
                min,
                minimum.kind === "instant" ? minimum.precision : undefined,
              ),
            )
          : min === undefined
            ? undefined
            : normalizeTemporalInputValue(min)
      }
      max={
        inputType === "datetime" && hydrated && max !== undefined
          ? normalizeTemporalInputValue(
              toLocalDateTime(
                max,
                maximum.kind === "instant" ? maximum.precision : undefined,
              ),
            )
          : max === undefined
            ? undefined
            : normalizeTemporalInputValue(max)
      }
      step={
        inputType !== "date"
          ? getTemporalInputStep(
              selection.anchor,
              hasInstantAnchor ? displayValue : currentValue,
              min,
              max,
            )
          : undefined
      }
      onChange={(e) => {
        const nextValue = valueFromInput(e.currentTarget);
        const canonical = canonicalFieldValue(nextValue);
        if (canonical !== undefined) {
          e.currentTarget.setAttribute(FIELD_VALUE_ATTR, canonical);
        } else {
          e.currentTarget.removeAttribute(FIELD_VALUE_ATTR);
        }
        // A change without an editing key down is a pick from the native picker, which commits at once; a typed value waits for blur or Enter.
        const typed = keyboardActive.current;
        keyboardActive.current = false;
        setSelection({
          initialValue,
          value: nextValue,
          anchor: selection.anchor,
          committedValue: typed ? selection.committedValue : nextValue,
          edited: typed,
        });
        updateBinding?.(nextValue);
        if (!typed && nextValue !== selection.committedValue)
          fire($action, $dispatch, nextValue, e.currentTarget);
      }}
      onBlur={(e) => {
        keyboardActive.current = false;
        commit(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isComposing(e) && !e.currentTarget.form) {
          commit(e.currentTarget);
          return;
        }
        keyboardActive.current =
          !e.altKey &&
          !e.ctrlKey &&
          !e.metaKey &&
          (e.key.length === 1 ||
            [
              "ArrowDown",
              "ArrowUp",
              "Backspace",
              "Delete",
              "End",
              "Home",
              "PageDown",
              "PageUp",
            ].includes(e.key));
      }}
      onKeyUp={() => {
        keyboardActive.current = false;
      }}
      onPaste={() => {
        keyboardActive.current = true;
      }}
      onCut={() => {
        keyboardActive.current = true;
      }}
    />
  );
}

type CheckboxRenderProps = {
  checked?: boolean;
  label: string;
  name?: string;
  defaultChecked?: boolean;
  variant?: "checkbox" | "switch";
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function CheckboxRender({
  checked,
  label,
  name,
  defaultChecked,
  variant = "checkbox",
  $action,
  $dispatch,
}: CheckboxRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const initialChecked =
    typeof answeredValue === "boolean" ? answeredValue : defaultChecked;
  return (
    <label
      data-aui="checkbox"
      data-aui-variant={variant === "switch" ? variant : undefined}
    >
      <input
        key={String(initialChecked)}
        type="checkbox"
        role={variant === "switch" ? "switch" : undefined}
        data-aui-action={actionAttr($action)}
        name={name}
        {...(isBound
          ? {
              checked:
                typeof answeredValue === "boolean"
                  ? answeredValue
                  : checked === true,
            }
          : { defaultChecked: initialChecked })}
        onChange={(e) => {
          updateBinding?.(e.currentTarget.checked);
          fire($action, $dispatch, e.currentTarget.checked, e.currentTarget);
        }}
      />
      <span data-aui="checkbox-label">{toTextContent(label)}</span>
    </label>
  );
}

type SliderRenderProps = {
  value?: number;
  name?: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

type SliderControlProps = {
  controlledValue?: number;
  name?: string;
  label?: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  unit?: string;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function SliderControl({
  controlledValue,
  name,
  label,
  min,
  max,
  step,
  initialValue,
  unit,
  $action,
  $dispatch,
}: SliderControlProps) {
  const updateBinding = useA2uiBinding(name);
  const [localValue, setValue] = React.useState(initialValue);
  const value = controlledValue ?? localValue;
  const pointerActive = React.useRef(false);
  const keyboardActive = React.useRef(false);
  const lastCommitted = React.useRef(initialValue);
  const adjusting = React.useRef(false);
  const currentValue = (input: HTMLInputElement) =>
    clamp(Number(input.value), min, max);
  // A bound value can change without a commit, so an adjustment compares against the value it started from.
  const startAdjusting = () => {
    adjusting.current = true;
    if (controlledValue !== undefined) lastCommitted.current = value;
  };
  const commit = (input: HTMLInputElement) => {
    adjusting.current = false;
    const nextValue = currentValue(input);
    if (controlledValue === undefined) setValue(nextValue);
    if (lastCommitted.current === nextValue) return;
    lastCommitted.current = nextValue;
    fire($action, $dispatch, nextValue, input);
  };

  return (
    <label data-aui="slider-field">
      {label ? <span data-aui="slider-label">{label}</span> : null}
      <input
        type="range"
        data-aui="slider"
        data-aui-action={actionAttr($action)}
        name={name}
        aria-label={label}
        aria-valuetext={unit ? `${value} ${unit}` : String(value)}
        min={min}
        max={max}
        step={step}
        {...(controlledValue !== undefined
          ? { value }
          : { defaultValue: initialValue })}
        onInput={(e) => {
          const nextValue = currentValue(e.currentTarget);
          if (controlledValue === undefined) {
            setValue(nextValue);
            return;
          }
          if (!adjusting.current) startAdjusting();
          updateBinding?.(nextValue);
        }}
        onPointerDown={() => {
          pointerActive.current = true;
          startAdjusting();
        }}
        onPointerUp={(e) => {
          pointerActive.current = false;
          commit(e.currentTarget);
        }}
        onKeyDown={(e) => {
          keyboardActive.current = [
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "End",
            "Home",
            "PageDown",
            "PageUp",
          ].includes(e.key);
          if (keyboardActive.current && !e.repeat) startAdjusting();
        }}
        onKeyUp={(e) => {
          if (!keyboardActive.current) return;
          keyboardActive.current = false;
          commit(e.currentTarget);
        }}
        onChange={(e) => {
          if (!pointerActive.current && !keyboardActive.current)
            commit(e.currentTarget);
        }}
      />
      <output data-aui="slider-value">
        {value}
        {unit ? ` ${unit}` : ""}
      </output>
    </label>
  );
}

function SliderRender({
  value,
  name,
  label,
  min,
  max,
  step,
  defaultValue,
  unit,
  $action,
  $dispatch,
}: SliderRenderProps) {
  const answeredValue = useAnsweredValue(name);
  const updateBinding = useA2uiBinding(name);
  const isBound = updateBinding !== undefined;
  const safeMin = finiteNumber(min) ? min : 0;
  const safeMax = finiteNumber(max) ? Math.max(max, safeMin) : safeMin + 100;
  const safeStep = finiteNumber(step) && step > 0 ? step : 1;
  const defaultNumber = finiteNumber(isBound ? value : defaultValue)
    ? isBound
      ? value!
      : defaultValue!
    : safeMin;
  const initialValue = clamp(
    finiteNumber(answeredValue) ? answeredValue : defaultNumber,
    safeMin,
    safeMax,
  );
  return (
    <SliderControl
      key={`${safeMin}:${safeMax}:${safeStep}:${isBound ? "bound" : initialValue}`}
      {...(isBound ? { controlledValue: initialValue } : {})}
      min={safeMin}
      max={safeMax}
      step={safeStep}
      initialValue={initialValue}
      {...(name !== undefined ? { name } : {})}
      {...(label !== undefined ? { label } : {})}
      {...(unit !== undefined ? { unit } : {})}
      {...($action !== undefined ? { $action } : {})}
      {...($dispatch !== undefined ? { $dispatch } : {})}
    />
  );
}

type ButtonRenderProps = {
  label: string;
  buttonStyle?: (typeof BUTTON_STYLES)[number];
  block?: boolean;
  submit?: boolean;
  undoable?: boolean;
  children?: React.ReactNode;
  $status: GenerativeUIStatus;
  $action?: Action;
  $dispatch?: GenerativeUIDispatch;
};

function ButtonRender({
  label,
  buttonStyle,
  block,
  submit,
  undoable,
  children,
  $action,
  $dispatch,
}: ButtonRenderProps) {
  const bindings = React.useContext(A2uiBindingContext!)?.fields;
  const bindingsRef = React.useRef(bindings);
  bindingsRef.current = bindings;
  const [remaining, setRemaining] = React.useState<number | undefined>(
    undefined,
  );
  const labelText = String(toTextContent(label) ?? "");
  const undoLabel = labelText.trim();
  const pendingAction = React.useRef<
    | {
        $action: Action;
        $dispatch: GenerativeUIDispatch;
        source: HTMLButtonElement;
      }
    | undefined
  >(undefined);
  const canUndo =
    undoable && !submit && $action !== undefined && $dispatch !== undefined;

  React.useEffect(() => {
    if (remaining === undefined) return;
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1);
        return;
      }
      const action = pendingAction.current;
      pendingAction.current = undefined;
      setRemaining(undefined);
      if (action)
        fire(
          action.$action,
          action.$dispatch,
          undefined,
          action.source,
          bindingsRef.current,
        );
    }, 1_000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const cancelUndo = () => {
    pendingAction.current = undefined;
    setRemaining(undefined);
  };

  return (
    <button
      type={submit ? "submit" : "button"}
      data-aui="button"
      data-aui-style={buttonStyle}
      data-aui-block={block || undefined}
      data-aui-submit={submit || undefined}
      data-aui-state={remaining === undefined ? undefined : "pending"}
      data-aui-action={actionAttr($action)}
      aria-label={
        remaining === undefined
          ? undefined
          : undoLabel
            ? `Undo ${undoLabel}`
            : "Undo"
      }
      onClick={
        submit
          ? undefined
          : canUndo
            ? (e) => {
                if (remaining !== undefined) {
                  cancelUndo();
                  return;
                }
                pendingAction.current = {
                  $action,
                  $dispatch,
                  source: e.currentTarget,
                };
                setRemaining(UNDO_WINDOW_SECONDS);
              }
            : (e) =>
                fire($action, $dispatch, undefined, e.currentTarget, bindings)
      }
      onKeyDown={
        canUndo
          ? (e) => {
              if (e.key !== "Escape" || remaining === undefined) return;
              e.preventDefault();
              cancelUndo();
            }
          : undefined
      }
    >
      {remaining === undefined ? (
        <>
          {labelText}
          {children}
        </>
      ) : (
        <>
          Undo <span data-aui="button-countdown">{remaining}</span>
          <span data-aui="button-undo-status" role="status">
            {labelText} in {UNDO_WINDOW_SECONDS} seconds
          </span>
        </>
      )}
    </button>
  );
}

export const interactiveVocabulary = {
  Button: {
    ...interactiveDefinitions.Button,
    render: ButtonRender,
  },
  Select: {
    ...interactiveDefinitions.Select,
    render: SelectRender,
  },
  Input: {
    ...interactiveDefinitions.Input,
    render: InputRender,
  },
  DatePicker: {
    ...interactiveDefinitions.DatePicker,
    render: DatePickerRender,
  },
  Checkbox: {
    ...interactiveDefinitions.Checkbox,
    render: CheckboxRender,
  },
  Slider: {
    ...interactiveDefinitions.Slider,
    render: SliderRender,
  },
  RadioGroup: {
    ...interactiveDefinitions.RadioGroup,
    render: RadioGroupRender,
  },
  CheckboxGroup: {
    ...interactiveDefinitions.CheckboxGroup,
    render: CheckboxGroupRender,
  },
} satisfies GenerativeUILibrary;
