"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ChoiceInputCard } from "@/components/pages/shop/choice-input-card";
import { ProductInputCard } from "@/components/pages/shop/product-input-card";
import { ModelInputCard } from "@/components/pages/shop/model-input-card";
import {
  InputLinks,
  NoteField,
  SubmitRow,
  inputCardClassName,
  inputLinkClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
import { useAgentName } from "@/components/pages/shop/agent-status";
import {
  useWizardFormId,
  useWizardNext,
} from "@/components/pages/shop/wizard-actions";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { inputPrompt, type Checkout } from "@/lib/checkout/protocol";

/** A text question that reads like a request for a credential, which has no place in the session state. A false positive costs one click, so the match is deliberately broad. */
export const asksForSecret = (input: Checkout.Input) =>
  input.kind === "text" &&
  /(?<![a-z])(keys?|secrets?|tokens?|passwords?|passphrases?|credentials?)(?![a-z])/i.test(
    input.prompt,
  );

const SECRET_REFUSAL =
  "Ask for keys with the model question (ask --preset llm-provider); it hands you the key through env without it passing through this session. For anything else secret, tell me what to put in .env.local and I will add it myself.";

function SecretRequestCard({
  input,
  checkout,
  onTypeAnyway,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
  onTypeAnyway: () => void;
}) {
  const agentName = useAgentName(checkout);
  const { busy, dismiss } = useInputActions(input, checkout);
  const [sending, setSending] = useState(false);
  const refuse = async () => {
    setSending(true);
    try {
      await checkout.commands["checkout/message"]({ text: SECRET_REFUSAL });
    } catch {
      toast.error("Could not message your agent");
      setSending(false);
      return;
    }
    setSending(false);
    void dismiss();
  };
  useWizardNext({
    label: "Next",
    disabled: busy || sending,
    onClick: onTypeAnyway,
  });
  return (
    <div className={inputCardClassName}>
      <p className="max-w-full text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
        {inputPrompt(input)}
      </p>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        Answers are kept with the session, in the clear, so a key does not
        belong here. Next lets you type it anyway. The link below tells{" "}
        {agentName} how to ask for it safely and to go on without an answer.
      </p>
      <InputLinks input={input} busy={busy || sending} onDismiss={dismiss}>
        <button
          type="button"
          disabled={busy || sending}
          onClick={() => void refuse()}
          className={inputLinkClassName}
        >
          Ask {agentName} for it the safe way instead
        </button>
      </InputLinks>
    </div>
  );
}

function TextInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const [guarded, setGuarded] = useState(() => asksForSecret(input));
  const [answer, setAnswer] = useState(input.default ?? "");
  const [note, setNote] = useState("");
  const { busy, answer: send, dismiss } = useInputActions(input, checkout);
  const formId = useWizardFormId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (answer.trim() === "") return;
    void send(answer.trim(), note);
  };
  if (guarded) {
    return (
      <SecretRequestCard
        input={input}
        checkout={checkout}
        onTypeAnyway={() => setGuarded(false)}
      />
    );
  }
  return (
    <form id={formId} onSubmit={submit} className={inputCardClassName}>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
        <legend className="max-w-full text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
          {inputPrompt(input)}
        </legend>
        <Input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={input.placeholder ?? "Type your answer"}
          aria-label={inputPrompt(input)}
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
      return <ModelInputCard input={input} checkout={checkout} />;
    case "product":
      return <ProductInputCard input={input} checkout={checkout} />;
    default:
      return <TextInputCard input={input} checkout={checkout} />;
  }
}
