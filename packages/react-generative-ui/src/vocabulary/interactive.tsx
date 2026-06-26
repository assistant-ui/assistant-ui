import { z } from "zod";
import type { Action } from "../ir";
import { BUTTON_STYLES } from "../ir";
import type { GenerativeUIDispatch, GenerativeUILibrary } from "../types";

const optionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const actionAttr = (a: Action | undefined): string | undefined =>
  a ? JSON.stringify(a) : undefined;

/** Fires `$action` through `$dispatch` when both are present, merging a runtime
 * value into the payload under the reserved `$input` key (not `value`) so the
 * user's input never clobbers a model-supplied `value` field. No-op when no
 * registry is wired. The returned promise from an async handler is caught and
 * re-thrown on a microtask so rejections surface rather than going unhandled. */
const fire = (
  $action: Action | undefined,
  $dispatch: GenerativeUIDispatch | undefined,
  input?: unknown,
) => {
  if (!$action || !$dispatch) return;
  const payload = input === undefined ? $action : { ...$action, $input: input };
  void Promise.resolve($dispatch(payload)).catch((error) => {
    queueMicrotask(() => {
      throw error;
    });
  });
};

export const interactiveVocabulary = {
  Button: {
    description:
      "A clickable button. Carries `$action` describing the side effect or resume value.",
    properties: z.object({
      label: z.string().describe("Button label."),
      buttonStyle: z.enum(BUTTON_STYLES).optional().describe("Visual style."),
      block: z
        .boolean()
        .optional()
        .describe("Whether the button spans the full width."),
    }),
    render: ({ label, buttonStyle, block, $action, $dispatch, children }) => (
      <button
        data-aui="button"
        data-aui-style={buttonStyle}
        data-aui-block={block || undefined}
        data-aui-action={actionAttr($action)}
        onClick={() => fire($action, $dispatch)}
      >
        {label}
        {children}
      </button>
    ),
  },
  Select: {
    description:
      "A dropdown selector. Carries `$action` describing the on-select behavior.",
    properties: z.object({
      options: z.array(optionSchema).describe("Selectable options."),
      placeholder: z
        .string()
        .optional()
        .describe("Placeholder shown when nothing is selected."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
    }),
    render: ({ options, placeholder, label, $action, $dispatch, children }) => (
      <select
        data-aui="select"
        data-aui-action={actionAttr($action)}
        aria-label={label}
        defaultValue=""
        onChange={(e) => fire($action, $dispatch, e.currentTarget.value)}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o: { label: string; value: string }, i: number) => (
          <option key={i} value={o.value}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
    ),
  },
  Input: {
    description:
      "A text input. Carries `$action` describing the on-submit behavior.",
    properties: z.object({
      placeholder: z.string().optional().describe("Placeholder text."),
      multiline: z
        .boolean()
        .optional()
        .describe("Render a textarea instead of a single-line input."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
    }),
    render: ({ placeholder, multiline, label, $action, $dispatch }) => {
      const submit = (v: string) => fire($action, $dispatch, v);
      return multiline ? (
        <textarea
          data-aui="input"
          data-aui-multiline
          data-aui-action={actionAttr($action)}
          aria-label={label}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.ctrlKey || e.metaKey) &&
              !e.nativeEvent.isComposing
            )
              submit(e.currentTarget.value);
          }}
        />
      ) : (
        <input
          data-aui="input"
          data-aui-action={actionAttr($action)}
          aria-label={label}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing)
              submit(e.currentTarget.value);
          }}
        />
      );
    },
  },
  DatePicker: {
    description:
      "A date input. Carries `$action` describing the on-select behavior.",
    properties: z.object({
      value: z.string().optional().describe("Initial date (YYYY-MM-DD)."),
      min: z.string().optional().describe("Minimum date (YYYY-MM-DD)."),
      max: z.string().optional().describe("Maximum date (YYYY-MM-DD)."),
      label: z
        .string()
        .optional()
        .describe("Accessible label for the control."),
    }),
    render: ({ value, min, max, label, $action, $dispatch }) => (
      <input
        type="date"
        data-aui="datepicker"
        data-aui-action={actionAttr($action)}
        aria-label={label}
        defaultValue={value}
        min={min}
        max={max}
        onChange={(e) => fire($action, $dispatch, e.currentTarget.value)}
      />
    ),
  },
} satisfies GenerativeUILibrary;
