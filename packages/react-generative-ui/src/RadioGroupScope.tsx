import * as React from "react";

let radioGroupContext: React.Context<string | undefined> | undefined;
const supportsContext = typeof React.createContext === "function";
const useScopeId = supportsContext ? React.useId : () => undefined;
const useScopeContext = supportsContext ? React.useContext : () => undefined;

// Vocabulary schemas are also imported under React's server condition.
const getRadioGroupContext = () =>
  supportsContext
    ? (radioGroupContext ??= React.createContext<string | undefined>(undefined))
    : undefined;

export const RadioGroupScope = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const scopeId = useScopeId();
  const Context = getRadioGroupContext();
  return Context ? (
    <Context.Provider value={scopeId}>{children}</Context.Provider>
  ) : (
    children
  );
};

export const useRadioGroupName = (name: string | undefined) => {
  const scopeId = useScopeContext(getRadioGroupContext()!);
  const groupId = React.useId();
  return scopeId !== undefined && name != null
    ? JSON.stringify([scopeId, name])
    : (name ?? groupId);
};
