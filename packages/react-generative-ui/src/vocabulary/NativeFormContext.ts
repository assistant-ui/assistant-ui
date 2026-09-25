import * as React from "react";

let nativeFormContext: React.Context<boolean> | undefined;

// Vocabulary schemas are also imported under React's server condition.
export const getNativeFormContext = () =>
  (nativeFormContext ??= React.createContext(false));

export const useNativeForm = () => React.useContext(getNativeFormContext());
