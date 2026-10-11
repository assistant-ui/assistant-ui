"use client";

import { useState, type FormEvent } from "react";
import { AppWindowIcon, PanelRightIcon, SquareIcon } from "lucide-react";
import {
  NoteField,
  SubmitRow,
  inputCardClassName,
  tileClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
import { useWizardFormId } from "@/components/pages/shop/wizard-actions";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { inputPrompt, type Checkout } from "@/lib/checkout/protocol";

const icons = {
  modal: AppWindowIcon,
  sidebar: PanelRightIcon,
  "full-page": SquareIcon,
};
const labels = {
  modal: "Modal",
  sidebar: "Sidebar",
  "full-page": "Full page",
};

export function EntryPointInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const options = input.options ?? [];
  const [picked, setPicked] = useState(input.answer ?? input.default ?? "");
  const [note, setNote] = useState(input.note ?? "");
  const { busy, answer, dismiss } = useInputActions(input, checkout);
  const selected = options.some((option) => option.id === picked);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected) void answer(picked, note);
  };

  return (
    <form
      id={useWizardFormId()}
      onSubmit={submit}
      className={inputCardClassName}
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
        <legend className="sr-only">{inputPrompt(input)}</legend>
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const entry = option.entryPoint;
            if (!entry) return null;
            const Icon = icons[entry.formFactor];
            return (
              <label
                key={option.id}
                className={tileClassName(option.id === picked)}
              >
                <input
                  type="radio"
                  name={input.id}
                  value={option.id}
                  checked={option.id === picked}
                  onChange={() => setPicked(option.id)}
                  aria-label={option.label}
                  aria-describedby={`${input.id}-${option.id}-detail ${input.id}-${option.id}-format ${input.id}-${option.id}-access`}
                  className="sr-only"
                />
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span
                      id={`${input.id}-${option.id}-format`}
                      className="text-muted-foreground text-xs"
                    >
                      {labels[entry.formFactor]}
                      {entry.recommended ? " · Recommended" : ""}
                    </span>
                  </span>
                  <span
                    id={`${input.id}-${option.id}-detail`}
                    className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-snug"
                    title={option.description}
                  >
                    {option.description}
                  </span>
                  <span
                    id={`${input.id}-${option.id}-access`}
                    className="mt-2 line-clamp-2 text-xs leading-snug"
                    title={`${entry.placement} · ${entry.trigger}`}
                  >
                    {entry.placement} · {entry.trigger}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <NoteField value={note} onChange={setNote} />
      </fieldset>
      <SubmitRow
        input={input}
        busy={busy}
        disabled={!selected}
        onDismiss={dismiss}
      />
    </form>
  );
}
