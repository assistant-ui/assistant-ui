import { useState, type ReactNode } from "react";
import {
  WizardProvider,
  type WizardNextBinding,
} from "@/components/pages/shop/wizard-actions";

/** The wizard footer, reduced to what a page's tests need: Back when the page owns one, and Next. */
export function WizardHost({ children }: { children: ReactNode }) {
  const [next, setNext] = useState<WizardNextBinding>();
  return (
    <WizardProvider value={{ formId: "wizard-form", setNext }}>
      {children}
      {next ? (
        <footer>
          {next.back ? (
            <button type="button" onClick={next.back}>
              Back
            </button>
          ) : null}
          <button
            type={next.submit ? "submit" : "button"}
            form={next.submit ? "wizard-form" : undefined}
            disabled={next.disabled}
            onClick={next.submit ? undefined : next.run}
          >
            {next.label}
          </button>
        </footer>
      ) : null}
    </WizardProvider>
  );
}
