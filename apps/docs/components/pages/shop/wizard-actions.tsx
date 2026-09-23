"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type WizardActionsSlot = { element: HTMLElement; formId: string };

const WizardActionsContext = createContext<WizardActionsSlot | null>(null);

export const WizardActionsProvider = WizardActionsContext.Provider;

/** The id a page's form takes so a submit button in the wizard footer can target it. */
export const useWizardFormId = () => useContext(WizardActionsContext)?.formId;

export const useInWizard = () => useContext(WizardActionsContext) !== null;

/** A page's primary buttons: shown in the wizard footer when one hosts the page, inline otherwise. */
export function WizardActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const slot = useContext(WizardActionsContext);
  if (slot) return createPortal(children, slot.element);
  return <div className={cn("flex gap-2", className)}>{children}</div>;
}
