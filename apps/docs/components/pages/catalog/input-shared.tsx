"use client";

import { useId, useState, type ComponentType, type SVGProps } from "react";
import { ChevronDownIcon, MessageSquarePlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ClaudeIcon } from "@/components/icons/claude";
import { GeminiIcon } from "@/components/icons/gemini";
import { LangGraphIcon } from "@/components/icons/langgraph";
import { MastraIcon } from "@/components/icons/mastra";
import { VercelIcon } from "@/components/icons/vercel";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

const COMPONENT_ICONS: Record<
  string,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  vercel: VercelIcon,
  mastra: MastraIcon,
  langgraph: LangGraphIcon,
  claude: ClaudeIcon,
  gemini: GeminiIcon,
};

/** Single-colour marks under public/icons are painted with the current text colour so they follow the theme. */
const MONO_MARKS = new Set(["openai", "anthropic", "xai"]);
const COLOUR_MARKS = new Set([
  "google",
  "mistral",
  "deepseek",
  "groq",
  "fireworks",
]);

export function ChoiceIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string | undefined;
}) {
  const Component = COMPONENT_ICONS[icon];
  if (Component) return <Component className={className} />;
  if (MONO_MARKS.has(icon)) {
    return (
      <span
        aria-hidden
        className={cn("block bg-current", className)}
        style={{
          maskImage: `url(/icons/${icon}.svg)`,
          maskSize: "contain",
          maskPosition: "center",
          maskRepeat: "no-repeat",
        }}
      />
    );
  }
  if (COLOUR_MARKS.has(icon)) {
    return <img alt="" src={`/icons/${icon}.svg`} className={className} />;
  }
  return null;
}

const withNote = (note: string) =>
  note.trim() === "" ? {} : { note: note.trim() };

export const useInputActions = (
  input: Checkout.Input,
  checkout: CheckoutContextValue,
) => {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    try {
      await action();
    } catch {
      toast.error(failure);
    } finally {
      setBusy(false);
    }
  };
  const send = (answer: string, note: string) =>
    checkout.commands["checkout/answer"]({
      inputId: input.id,
      answer,
      ...withNote(note),
    });
  const deposit = async (secret: string) => {
    const response = await fetch(
      `${checkout.url}/secret/${encodeURIComponent(input.id)}`,
      { method: "PUT", body: secret },
    );
    if (!response.ok) throw new Error(`secret rejected: ${response.status}`);
  };
  return {
    busy,
    answer: (answer: string, note = "") =>
      run(() => send(answer, note), "Could not send the answer"),
    /** Deposits a secret with the checkout for the agent to take, then answers. */
    answerWithSecret: (answer: string, secret: string, note = "") =>
      run(async () => {
        await deposit(secret);
        await send(answer, note);
      }, "Could not send the answer"),
    dismiss: () =>
      run(
        () => checkout.commands["checkout/dismiss"]({ inputId: input.id }),
        "Could not skip the question",
      ),
  };
};

export function InputHelp({ help }: { help: Checkout.InputHelp }) {
  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1 text-sm">
        Need help choosing?
        <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {help.summary}
        {help.href ? (
          <>
            {" "}
            <a
              href={help.href}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              Read the full guide
            </a>
            .
          </>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** A remark the user can attach to any answer; it rides along to the agent. */
export function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <MessageSquarePlusIcon className="size-3.5" />
        Add a note for your agent
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="text-muted-foreground">
        Note for your agent
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Anything it should know or do differently"
        rows={2}
        autoFocus
        className="min-h-0"
      />
    </div>
  );
}

export function SubmitRow({
  input,
  busy,
  disabled,
  label = "Send",
  onDismiss,
}: {
  input: Checkout.Input;
  busy: boolean;
  disabled: boolean;
  label?: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <Button type="submit" disabled={busy || disabled}>
        {label}
      </Button>
      {input.optional ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onDismiss}
        >
          Skip
        </Button>
      ) : null}
    </div>
  );
}

export const inputCardClassName =
  "border-foreground rounded-document border p-4 sm:p-5";
