"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Composer,
  ComposerBar,
  ComposerSend,
} from "@/components/assistant-ui/elements/composer";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import { parseModelAnswer, type Checkout } from "@/lib/checkout/protocol";
import { useAgentIdentity } from "./agent-status";
import { ChoiceIcon } from "./input-shared";

function getSelectedModel(inputs: readonly Checkout.Input[]) {
  let selected:
    | { input: Checkout.Input; model: Checkout.ModelAnswer }
    | undefined;
  for (const input of inputs) {
    if (input.kind !== "model" || input.status !== "answered") continue;
    const model = parseModelAnswer(input.answer ?? "");
    if (!model) continue;
    if (
      selected &&
      (input.answeredAt ?? input.createdAt) <
        (selected.input.answeredAt ?? selected.input.createdAt)
    ) {
      continue;
    }
    selected = { input, model };
  }
  return selected;
}

export function SetupComposer({
  checkout,
}: {
  checkout: CheckoutContextValue;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const agent = useAgentIdentity(checkout);
  const selected = getSelectedModel(checkout.state?.inputs ?? []);
  const provider = selected?.input.options?.find(
    (option) => option.id === selected.model.provider,
  );
  const modelLabel = selected
    ? `${provider?.label ?? selected.model.provider} · ${selected.model.model}`
    : undefined;
  const closed =
    checkout.state?.status === "done" || checkout.state?.status === "cancelled";
  const disabled =
    closed || checkout.degraded || checkout.state?.createdAt == null;

  useEffect(() => {
    textarea.current?.focus();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || disabled) return;
    setSending(true);
    setError(undefined);
    try {
      await checkout.commands["checkout/message"]({ text });
      setDraft("");
    } catch {
      setError("Your message could not be sent. Try again.");
    } finally {
      setSending(false);
      textarea.current?.focus();
    }
  };

  if (closed) return null;

  return (
    <Composer className="max-w-none shrink-0">
      <ComposerBar className="border-foreground/10 focus-within:border-foreground/30 rounded-thread gap-0 bg-[color-mix(in_oklab,var(--color-foreground)_2%,var(--color-background))] p-3 transition-colors dark:bg-[color-mix(in_oklab,var(--color-foreground)_4%,var(--color-background))]">
        <form onSubmit={(event) => void submit(event)}>
          <div className="flex flex-col gap-2">
            <textarea
              ref={textarea}
              name="message"
              aria-label="Message your agent"
              placeholder="Message your agent…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={sending}
              rows={2}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="placeholder:text-muted-foreground field-sizing-content max-h-[min(25dvh,12rem)] min-h-12 min-w-0 resize-none bg-transparent px-1 py-1 text-base leading-6 outline-none sm:text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-muted-foreground flex min-w-0 items-center gap-2 px-1 text-xs"
                title={
                  modelLabel
                    ? `Selected setup model: ${modelLabel}`
                    : agent.name
                }
              >
                {selected ? (
                  <>
                    <ChoiceIcon
                      icon={provider?.icon ?? selected.model.provider}
                      className="size-3.5 shrink-0"
                    />
                    <span className="sr-only">Selected setup model: </span>
                    <span className="truncate">{selected.model.model}</span>
                  </>
                ) : (
                  <>
                    <AgentKindIcon
                      kind={agent.kind}
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{agent.name}</span>
                  </>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground hidden text-xs sm:block">
                  Enter to send
                </span>
                <ComposerSend
                  type="submit"
                  streaming={false}
                  idle={!draft.trim()}
                  disabled={disabled || sending || !draft.trim()}
                  aria-label={sending ? "Sending message" : "Send message"}
                />
              </div>
            </div>
          </div>
          {error ? (
            <p
              role="alert"
              className="text-destructive px-3 pb-2 text-base sm:text-sm"
            >
              {error}
            </p>
          ) : null}
        </form>
      </ComposerBar>
    </Composer>
  );
}
