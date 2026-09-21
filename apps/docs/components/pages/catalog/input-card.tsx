"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { ChoiceInputCard } from "@/components/pages/catalog/choice-input-card";
import { ModelInputCard } from "@/components/pages/catalog/model-input-card";
import {
  NoteField,
  SubmitRow,
  inputCardClassName,
  useInputActions,
} from "@/components/pages/catalog/input-shared";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";

function TextInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const { busy, answer: send, dismiss } = useInputActions(input, checkout);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (answer.trim() === "") return;
    void send(answer.trim(), note);
  };
  return (
    <form onSubmit={submit} className={inputCardClassName}>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
        <legend className="text-[0.9375rem] font-medium">{input.prompt}</legend>
        <Input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={input.placeholder ?? "Type your answer"}
          aria-label={input.prompt}
        />
        <NoteField value={note} onChange={setNote} />
      </fieldset>
      <SubmitRow
        input={input}
        busy={busy}
        disabled={answer.trim() === ""}
        onDismiss={dismiss}
      />
    </form>
  );
}

export function InputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  switch (input.kind) {
    case "choice":
      return <ChoiceInputCard input={input} checkout={checkout} />;
    case "model":
      return <ModelInputCard input={input} checkout={checkout} inSheet />;
    default:
      return <TextInputCard input={input} checkout={checkout} />;
  }
}
