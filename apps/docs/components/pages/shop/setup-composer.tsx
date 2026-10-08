"use client";

import {
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import {
  Composer,
  ComposerBar,
  ComposerSend,
} from "@/components/assistant-ui/elements/composer";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";

export function SetupComposer({
  checkout,
  ref,
}: {
  checkout: CheckoutContextValue;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => textarea.current!, []);
  const closed =
    checkout.state?.status === "done" || checkout.state?.status === "cancelled";
  const disabled =
    closed || checkout.degraded || checkout.state?.createdAt == null;

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

  return (
    <Composer className="max-w-none shrink-0">
      <ComposerBar className="focus-within:border-foreground/30 bg-muted gap-0 border-transparent p-1.5">
        <form onSubmit={(event) => void submit(event)}>
          <div className="flex items-end gap-1.5">
            <textarea
              ref={textarea}
              name="message"
              aria-label="Message your agent"
              placeholder={
                closed ? "The setup is closed." : "Message your agent…"
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={sending || closed}
              rows={1}
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
              className="placeholder:text-muted-foreground field-sizing-content max-h-[min(25dvh,12rem)] min-w-0 flex-1 resize-none bg-transparent px-3 py-1.5 text-base leading-5 outline-none sm:text-sm"
            />
            <ComposerSend
              type="submit"
              streaming={false}
              idle={!draft.trim()}
              disabled={disabled || sending || !draft.trim()}
              aria-label={sending ? "Sending message" : "Send message"}
            />
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
