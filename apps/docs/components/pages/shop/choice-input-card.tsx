"use client";

import { useState, type FormEvent } from "react";
import { PencilLineIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  ChoiceIcon,
  InputHelp,
  NoteField,
  SubmitRow,
  inputCardClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

const OTHER = "\0other";

const variantsOf = (option: Checkout.ChoiceOption | undefined) =>
  option?.variants ?? [];

export function ChoiceInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const options = input.options ?? [];
  const [selected, setSelected] = useState(input.default ?? "");
  const [variant, setVariant] = useState(
    variantsOf(options.find((option) => option.id === input.default))[0]?.id ??
      "",
  );
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const { busy, answer, dismiss } = useInputActions(input, checkout);
  const other = selected === OTHER;
  const current = options.find((option) => option.id === selected);
  const variants = variantsOf(current);
  const complete = other
    ? custom.trim() !== ""
    : current !== undefined && (variants.length === 0 || variant !== "");
  const locked = options.length === 1;
  const compact = options.length > 3;

  const choose = (option: Checkout.ChoiceOption) => {
    setSelected(option.id);
    setVariant(variantsOf(option)[0]?.id ?? "");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!complete) return;
    void answer(
      other
        ? custom.trim()
        : variants.length > 0
          ? `${selected}:${variant}`
          : selected,
      note,
    );
  };

  const tileClassName = (active: boolean) =>
    cn(
      "has-focus-visible:ring-ring flex min-w-0 cursor-pointer gap-3 rounded-lg border p-3 [overflow-wrap:anywhere] transition-colors has-focus-visible:ring-2",
      active
        ? "border-foreground bg-foreground/[0.04]"
        : "border-foreground/10 hover:border-foreground/30",
      compact && "flex-col items-start gap-2",
    );

  return (
    <form onSubmit={submit} className={inputCardClassName}>
      <fieldset disabled={busy} className="min-w-0">
        <legend className="min-w-0 text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
          {input.prompt}
        </legend>
        <div
          className={cn(
            "mt-3 grid gap-2",
            compact ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-2",
          )}
        >
          {options.map((option) => {
            const active = option.id === selected;
            return (
              <label key={option.id} className={tileClassName(active)}>
                <input
                  type="radio"
                  name={input.id}
                  value={option.id}
                  checked={active}
                  onChange={() => choose(option)}
                  className="sr-only"
                />
                {option.icon ? (
                  <ChoiceIcon icon={option.icon} className="size-5 shrink-0" />
                ) : null}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-snug [overflow-wrap:anywhere]">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
          <label className={tileClassName(other)}>
            <input
              type="radio"
              name={input.id}
              value={OTHER}
              checked={other}
              onChange={() => setSelected(OTHER)}
              className="sr-only"
            />
            <PencilLineIcon className="text-muted-foreground size-5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <span className="block text-sm font-medium">Something else</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                Tell your agent in your own words
              </span>
            </span>
          </label>
        </div>
        {other ? (
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="What should it use instead?"
            aria-label="Your own answer"
            autoFocus
            className="mt-3"
          />
        ) : null}
        {!other && variants.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Language</span>
            <div role="radiogroup" aria-label="Language" className="flex gap-1">
              {variants.map((entry) => (
                <label
                  key={entry.id}
                  className={cn(
                    "has-focus-visible:ring-ring min-w-0 cursor-pointer rounded-md border px-2.5 py-1 text-sm [overflow-wrap:anywhere] transition-colors has-focus-visible:ring-2",
                    entry.id === variant
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/10 hover:border-foreground/30",
                  )}
                >
                  <input
                    type="radio"
                    name={`${input.id}-variant`}
                    value={entry.id}
                    checked={entry.id === variant}
                    onChange={() => setVariant(entry.id)}
                    className="sr-only"
                  />
                  {entry.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-3">
          <NoteField value={note} onChange={setNote} />
        </div>
      </fieldset>
      {input.help && !locked ? <InputHelp help={input.help} /> : null}
      <SubmitRow
        input={input}
        busy={busy}
        disabled={!complete}
        label={locked && !other ? "Confirm" : "Send"}
        onDismiss={dismiss}
      />
    </form>
  );
}
