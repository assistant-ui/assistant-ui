const DERIVED_HOOK = Symbol("assistant-ui.derived-hook");

type Hook = (...args: any[]) => any;
type MarkedHook = Hook & { [DERIVED_HOOK]?: true };

export const markDerivedHook = (hook: Hook): void => {
  (hook as MarkedHook)[DERIVED_HOOK] = true;
};

export const isDerivedHook = (hook: Hook): boolean =>
  (hook as MarkedHook)[DERIVED_HOOK] === true;
