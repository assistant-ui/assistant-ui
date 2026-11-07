import * as React from "react";
import { AccessibilityInfo } from "react-native";

/** How a control contributes to a submitted form, mirroring the web's `collectFormValues`. */
export type FieldKind = "value" | "radio" | "checkboxes";

type Field = {
  name: string;
  kind: FieldKind;
  read(): unknown;
  validate?: (value: unknown) => boolean;
};

export type FieldScope = {
  register(field: Field): () => void;
  submit(): void;
};

const FieldScopeContext = React.createContext<FieldScope | undefined>(
  undefined,
);

/** Makes the controls inside a `Form` or an `asForm` Card report their values to it. */
export const FieldScopeProvider = FieldScopeContext.Provider;

/** The form scope a control renders in, if any. */
export const useFieldScope = () => React.useContext(FieldScopeContext);

const collect = (fields: Iterable<Field>) => {
  const values: Record<string, unknown> = Object.create(null);
  for (const { name, kind, read } of fields) {
    if (!name) continue;
    const value = read();
    const existing = values[name];
    if (kind === "radio") {
      if (value !== undefined) values[name] = value;
      else if (!Object.hasOwn(values, name)) values[name] = undefined;
    } else if (kind === "checkboxes") {
      values[name] = [
        ...(Array.isArray(existing) ? existing : []),
        ...(Array.isArray(value) ? value : []),
      ];
    } else if (!Object.hasOwn(values, name)) {
      values[name] = value;
    } else {
      values[name] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    }
  }
  return values;
};

/**
 * A form scope for the named controls rendered inside it. `submit()` calls `onSubmit` with their values keyed by `name`, in the order they mounted: a checkbox as a boolean, a radio group as its selected value or `undefined`, a checkbox group as the selected values, and any other repeated name as an array.
 */
export function useFieldScopeOwner(
  onSubmit: (values: Record<string, unknown>) => void,
): FieldScope {
  const handler = React.useRef(onSubmit);
  React.useInsertionEffect(() => {
    handler.current = onSubmit;
  });
  const [scope] = React.useState<FieldScope>(() => {
    const fields = new Set<Field>();
    return {
      register(field) {
        fields.add(field);
        return () => {
          fields.delete(field);
        };
      },
      submit() {
        let valid = true;
        for (const field of fields) {
          if (field.validate && !field.validate(field.read())) valid = false;
        }
        if (!valid) {
          AccessibilityInfo.announceForAccessibility(
            "Fix the highlighted fields to continue",
          );
          return;
        }
        handler.current(collect(fields));
      },
    };
  });
  return scope;
}

/** Registers a named control with the enclosing form scope, which calls `read` on submit, and returns that scope. */
export function useField(
  name: unknown,
  kind: FieldKind,
  read: () => unknown,
  validate?: (value: unknown) => boolean,
): { scope: FieldScope | undefined; invalid: boolean } {
  const scope = React.useContext(FieldScopeContext);
  const [failed, setFailed] = React.useState<string | undefined>();
  const reader = React.useRef(read);
  React.useInsertionEffect(() => {
    reader.current = read;
  });
  const validator = React.useRef(validate);
  React.useInsertionEffect(() => {
    validator.current = validate;
  });
  React.useEffect(() => {
    if (!scope || (!validate && (typeof name !== "string" || name === "")))
      return;
    return scope.register({
      name: typeof name === "string" ? name : "",
      kind,
      read: () => reader.current(),
      validate: (value) => {
        const valid = validator.current?.(value) ?? true;
        setFailed(valid ? undefined : JSON.stringify(value));
        return valid;
      },
    });
  }, [scope, name, kind, validate !== undefined]);
  return {
    scope,
    invalid: failed !== undefined && failed === JSON.stringify(read()),
  };
}
