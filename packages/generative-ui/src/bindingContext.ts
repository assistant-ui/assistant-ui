import * as React from "react";
import type { A2uiBinding } from "./binding";

export const A2uiBindingContext =
  typeof React.createContext === "function"
    ? React.createContext<
        | {
            readonly fields: ReadonlyMap<string, A2uiBinding>;
            readonly update: (path: string, value: unknown) => void;
          }
        | undefined
      >(undefined)
    : undefined;

export const useA2uiBinding = (name: string | undefined) => {
  const context = React.useContext(A2uiBindingContext!);
  const binding = name === undefined ? undefined : context?.fields.get(name);
  return context && binding && name !== undefined
    ? (value: unknown) =>
        context.update(name, binding.arrayValue ? [value] : value)
    : undefined;
};
