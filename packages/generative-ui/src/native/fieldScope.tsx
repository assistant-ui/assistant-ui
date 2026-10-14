import {
  createContext,
  useContext,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";

/** How a control contributes to a submitted form, mirroring the web's `collectFormValues`. */
export type FieldKind = "value" | "radio" | "checkboxes";

type Field = { name: string; kind: FieldKind; read(): unknown };

export type FieldScope = {
  register(field: Field): () => void;
  submit(): void;
};

const FieldScopeContext = createContext<FieldScope | undefined>(undefined);

/** Makes the controls inside a `Form` or an `asForm` Card report their values to it. */
export const FieldScopeProvider = FieldScopeContext.Provider;

/** The form scope a control renders in, if any. */
export const useFieldScope = () => useContext(FieldScopeContext);

const collect = (fields: Iterable<Field>) => {
  const values: Record<string, unknown> = Object.create(null);
  for (const { name, kind, read } of fields) {
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
  const handler = useRef(onSubmit);
  useInsertionEffect(() => {
    handler.current = onSubmit;
  });
  const [scope] = useState<FieldScope>(() => {
    const fields = new Set<Field>();
    return {
      register(field) {
        fields.add(field);
        return () => {
          fields.delete(field);
        };
      },
      submit() {
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
): FieldScope | undefined {
  const scope = useContext(FieldScopeContext);
  const reader = useRef(read);
  useInsertionEffect(() => {
    reader.current = read;
  });
  useEffect(() => {
    if (!scope || typeof name !== "string" || name === "") return;
    return scope.register({ name, kind, read: () => reader.current() });
  }, [scope, name, kind]);
  return scope;
}
