"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

/** What the wizard's Next button does while a page is showing. */
export type WizardNext = {
  label: string;
  disabled?: boolean;
  /** Submits the page's form (the one carrying `useWizardFormId()`) instead of running `onClick`. */
  submit?: boolean;
  onClick?: () => void;
};

export type WizardNextBinding = Omit<WizardNext, "onClick"> & {
  run: () => void;
};

type WizardHost = {
  formId: string;
  setNext: (next: WizardNextBinding | undefined) => void;
};

const WizardContext = createContext<WizardHost | null>(null);

export const WizardProvider = WizardContext.Provider;

/** The id a page's form takes so the wizard's Next button can submit it. */
export const useWizardFormId = () => useContext(WizardContext)?.formId;

/**
 * Hands the page's primary action to the wizard footer. Returns false when no
 * wizard hosts the component, which then renders its own buttons.
 */
export function useWizardNext(next: WizardNext): boolean {
  const host = useContext(WizardContext);
  const setNext = host?.setNext;
  const onClick = useRef(next.onClick);
  onClick.current = next.onClick;
  const run = useCallback(() => onClick.current?.(), []);
  const { label, disabled = false, submit = false } = next;
  useEffect(() => {
    if (!setNext) return;
    setNext({ label, disabled, submit, run });
    return () => setNext(undefined);
  }, [setNext, label, disabled, submit, run]);
  return host !== null;
}
