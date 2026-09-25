import * as React from "react";

let radioGroupContext: React.Context<string | undefined> | undefined;

// Vocabulary schemas are also imported under React's server condition.
const getRadioGroupContext = () =>
  (radioGroupContext ??= React.createContext<string | undefined>(undefined));

export const RadioGroupScope = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const scopeId = React.useId();
  const Context = getRadioGroupContext();
  return <Context.Provider value={scopeId}>{children}</Context.Provider>;
};

export const useRadioGroupName = (name: string | undefined) => {
  const scopeId = React.useContext(getRadioGroupContext());
  const groupId = React.useId();
  return scopeId !== undefined && name != null
    ? JSON.stringify([scopeId, name])
    : groupId;
};
