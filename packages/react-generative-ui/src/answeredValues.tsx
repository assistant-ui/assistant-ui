import * as React from "react";

type AnsweredValues = Readonly<Record<string, unknown>>;

type ToolInteractionLog = {
  readonly entries: readonly {
    readonly type: string;
    readonly payload: unknown;
  }[];
};

let answeredValuesContext:
  | React.Context<AnsweredValues | undefined>
  | undefined;
const supportsContext = typeof React.createContext === "function";
const useValuesContext = supportsContext ? React.useContext : () => undefined;

const getAnsweredValuesContext = () =>
  supportsContext
    ? (answeredValuesContext ??= React.createContext<
        AnsweredValues | undefined
      >(undefined))
    : undefined;

const isPlainObject = (value: unknown): value is AnsweredValues => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const findAnsweredValues = (
  interactions: ToolInteractionLog | undefined,
): AnsweredValues | undefined => {
  const entries = interactions?.entries;
  if (!entries) return undefined;

  for (let index = entries.length - 1; index >= 0; index--) {
    const interaction = entries[index]!;
    if (interaction.type !== "action" || !isPlainObject(interaction.payload)) {
      continue;
    }
    const input = interaction.payload["$input"];
    if (isPlainObject(input)) return input;
  }
  return undefined;
};

export const AnsweredValuesProvider = ({
  values,
  children,
}: {
  values: AnsweredValues | undefined;
  children: React.ReactNode;
}) => {
  const Context = getAnsweredValuesContext();
  return Context ? (
    <Context.Provider value={values}>{children}</Context.Provider>
  ) : (
    children
  );
};

export const useAnsweredValue = (name: string | undefined): unknown => {
  const values = useValuesContext(getAnsweredValuesContext()!);
  return name !== undefined && values && Object.hasOwn(values, name)
    ? values[name]
    : undefined;
};
