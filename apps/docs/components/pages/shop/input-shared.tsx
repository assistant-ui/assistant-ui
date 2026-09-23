"use client";

import {
  useId,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { ChevronDownIcon, MessageSquarePlusIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { CursorIcon } from "@/components/icons/cursor";
import { ClaudeIcon } from "@/components/icons/claude";
import { GeminiIcon } from "@/components/icons/gemini";
import { LangGraphIcon } from "@/components/icons/langgraph";
import { MastraIcon } from "@/components/icons/mastra";
import { OpenCodeIcon } from "@/components/icons/opencode";
import { VercelIcon } from "@/components/icons/vercel";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { useWizardNext } from "@/components/pages/shop/wizard-actions";
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
  cursor: CursorIcon,
  gemini: GeminiIcon,
  opencode: OpenCodeIcon,
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

/** An agent supplied link is followed only when it is an absolute https URL. */
export const getHttpsUrl = (href: string | undefined) => {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
};

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
  const guideUrl = getHttpsUrl(help.href);
  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1 text-sm">
        Need help choosing?
        <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {help.summary}
        {guideUrl ? (
          <>
            {" "}
            <a
              href={guideUrl.href}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              Read the full guide
            </a>
            <span className="text-muted-foreground"> ({guideUrl.host})</span>.
          </>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

export const submitOnModifiedEnter = (
  event: KeyboardEvent<HTMLTextAreaElement>,
) => {
  if (
    event.key !== "Enter" ||
    event.nativeEvent.isComposing ||
    !(event.shiftKey || event.metaKey || event.ctrlKey)
  )
    return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
};

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
        onKeyDown={submitOnModifiedEnter}
        rows={2}
        autoFocus
        className="min-h-0"
      />
    </div>
  );
}

export const inputLinkClassName =
  "text-muted-foreground hover:text-foreground self-start text-sm underline-offset-4 hover:underline disabled:opacity-50";

/** The secondary choices a question offers under the wizard, where Next lives in the footer. */
export function InputLinks({
  input,
  busy,
  onDismiss,
  children,
}: {
  input: Checkout.Input;
  busy: boolean;
  onDismiss: () => void;
  children?: ReactNode;
}) {
  if (!input.optional && !children) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {children}
      {input.optional ? (
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className={inputLinkClassName}
        >
          Skip this question
        </button>
      ) : null}
    </div>
  );
}

/** Binds the footer's Next to the card's form and lists the question's secondary choices. */
export function SubmitRow({
  input,
  busy,
  disabled,
  onDismiss,
}: {
  input: Checkout.Input;
  busy: boolean;
  disabled: boolean;
  onDismiss: () => void;
}) {
  useWizardNext({ label: "Next", disabled: busy || disabled, submit: true });
  return <InputLinks input={input} busy={busy} onDismiss={onDismiss} />;
}

export const inputCardClassName = "py-1";
