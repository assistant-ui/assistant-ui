"use client";

import { useId, useState, type FormEvent } from "react";
import { CheckIcon, PencilLineIcon } from "lucide-react";
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

const PROJECT_FRAMEWORKS: Record<
  string,
  { icon: string; description: string }
> = {
  next: { icon: "nextjs", description: "Full-stack React with the App Router" },
  vite: {
    icon: "vite",
    description: "React with a fast dev server",
  },
  "react-router": {
    icon: "react-router",
    description: "React routing with loaders and actions",
  },
  "tanstack-start": {
    icon: "tanstack",
    description: "Full-stack React with type-safe routing",
  },
  expo: { icon: "expo", description: "React Native for iOS, Android, and web" },
};

const variantsOf = (option: Checkout.ChoiceOption | undefined) =>
  option?.variants ?? [];

export function ChoiceInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const variantId = useId();
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
  const variantLabel = input.preset === "project" ? "Framework" : "Language";
  const complete = other
    ? custom.trim() !== ""
    : current !== undefined && (variants.length === 0 || variant !== "");
  const locked = options.length === 1;

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
      "has-focus-visible:ring-ring rounded-control flex min-w-0 cursor-pointer items-start gap-3 border p-3.5 [overflow-wrap:anywhere] transition-colors duration-150 has-focus-visible:ring-2 motion-reduce:transition-none",
      active
        ? "border-foreground/60 bg-foreground/[0.04]"
        : "border-foreground/10 hover:bg-foreground/[0.025]",
    );

  return (
    <form onSubmit={submit} className={inputCardClassName}>
      <fieldset disabled={busy} className="min-w-0">
        <legend className="font-display min-w-0 text-lg leading-snug font-medium [overflow-wrap:anywhere]">
          {input.prompt}
        </legend>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
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
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="text-muted-foreground mt-1 block text-sm leading-snug [overflow-wrap:anywhere]">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                    active
                      ? "bg-foreground text-background"
                      : "border-foreground/20 border",
                  )}
                >
                  {active ? <CheckIcon className="size-2.5" /> : null}
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
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <span className="block text-sm font-medium">Something else</span>
              <span className="text-muted-foreground mt-1 block text-sm leading-snug">
                Tell your agent in your own words
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                other
                  ? "bg-foreground text-background"
                  : "border-foreground/20 border",
              )}
            >
              {other ? <CheckIcon className="size-2.5" /> : null}
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
          <div
            className={cn(
              "mt-5",
              input.preset !== "project" && "flex flex-wrap items-center gap-2",
            )}
          >
            <span className="text-muted-foreground text-sm">
              {variantLabel}
            </span>
            <div
              role="radiogroup"
              aria-label={variantLabel}
              className={
                input.preset === "project"
                  ? "mt-3 grid gap-2 sm:grid-cols-2"
                  : "flex flex-wrap gap-1"
              }
            >
              {variants.map((entry, index) => {
                const framework =
                  input.preset === "project"
                    ? PROJECT_FRAMEWORKS[entry.id]
                    : undefined;
                const labelId = `${variantId}-${index}-label`;
                const descriptionId = `${variantId}-${index}-description`;
                return (
                  <label
                    key={entry.id}
                    className={
                      input.preset === "project"
                        ? tileClassName(entry.id === variant)
                        : cn(
                            "has-focus-visible:ring-ring min-w-0 cursor-pointer rounded-md border px-2.5 py-1 text-sm [overflow-wrap:anywhere] transition-colors has-focus-visible:ring-2",
                            entry.id === variant
                              ? "border-foreground bg-foreground text-background"
                              : "border-foreground/10 hover:border-foreground/30",
                          )
                    }
                  >
                    <input
                      type="radio"
                      name={`${input.id}-variant`}
                      value={entry.id}
                      checked={entry.id === variant}
                      onChange={() => setVariant(entry.id)}
                      aria-labelledby={labelId}
                      aria-describedby={framework ? descriptionId : undefined}
                      className="sr-only"
                    />
                    {framework ? (
                      <ChoiceIcon
                        icon={framework.icon}
                        className="size-5 shrink-0"
                      />
                    ) : null}
                    <span
                      className={
                        input.preset === "project"
                          ? "min-w-0 flex-1"
                          : undefined
                      }
                    >
                      <span
                        id={labelId}
                        className={
                          input.preset === "project"
                            ? "block text-sm font-medium"
                            : undefined
                        }
                      >
                        {entry.label}
                      </span>
                      {framework ? (
                        <span
                          id={descriptionId}
                          className="text-muted-foreground mt-1 block text-sm leading-snug"
                        >
                          {framework.description}
                        </span>
                      ) : null}
                    </span>
                    {input.preset === "project" ? (
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                          entry.id === variant
                            ? "bg-foreground text-background"
                            : "border-foreground/20 border",
                        )}
                      >
                        {entry.id === variant ? (
                          <CheckIcon className="size-2.5" />
                        ) : null}
                      </span>
                    ) : null}
                  </label>
                );
              })}
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
