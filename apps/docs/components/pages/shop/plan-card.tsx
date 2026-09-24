"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import {
  getHttpsUrl,
  submitOnModifiedEnter,
} from "@/components/pages/shop/input-shared";
import type { Checkout } from "@/lib/checkout/protocol";
import {
  useWizardFormId,
  useWizardNext,
} from "@/components/pages/shop/wizard-actions";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 mb-1.5 text-sm font-medium first:mt-0">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-2 text-sm leading-relaxed first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul
      role="list"
      className="my-2 flex flex-col gap-2 text-sm first:mt-0 last:mb-0"
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      role="list"
      className="marker:text-muted-foreground my-2 flex list-decimal flex-col gap-2 ps-5 text-sm first:mt-0 last:mb-0"
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="before:bg-foreground/40 relative ps-4 leading-relaxed before:absolute before:top-[0.65em] before:left-0.5 before:size-1 before:rounded-full [ol>&]:ps-0 [ol>&]:before:hidden">
      {children}
    </li>
  ),
  strong: ({ children }) => <strong className="font-medium">{children}</strong>,
  code: ({ children }) => (
    <code className="font-mono text-[0.875em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted my-2 overflow-x-auto rounded-lg p-3 font-mono text-[13px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
      {children}
    </pre>
  ),
  a: ({ children, href }) => {
    const url = getHttpsUrl(href);
    if (url === undefined) return <>{children}</>;
    return (
      <>
        <a
          href={url.href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          {children}
        </a>
        <span className="text-muted-foreground"> ({url.host})</span>
      </>
    );
  },
  img: ({ alt }) => alt || null,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-foreground/10 text-muted-foreground border-b py-1 pr-3 text-left font-normal">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-foreground/10 border-b py-1 pr-3 align-top">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-foreground/20 text-muted-foreground my-2 border-l-2 ps-3">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-foreground/10 my-4" />,
};

export function PlanMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function PlanDecisionForm({ checkout }: { checkout: CheckoutContextValue }) {
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const decide = async (decision: Checkout.PlanDecision) => {
    setBusy(true);
    try {
      await checkout.commands["checkout/plan"](decision);
    } catch {
      toast.error("Could not send your decision");
    } finally {
      setBusy(false);
    }
  };
  const formId = useWizardFormId();
  const wizard = useWizardNext(
    revising
      ? {
          label: "Send",
          disabled: busy || feedback.trim() === "",
          submit: true,
        }
      : {
          label: "Install",
          disabled: busy,
          onClick: () => void decide({ decision: "approve" }),
        },
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (feedback.trim() === "") return;
    void decide({ decision: "revise", feedback: feedback.trim() });
  };
  if (!revising) {
    if (wizard) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => setRevising(true)}
          className="text-muted-foreground hover:text-foreground mt-4 self-start text-sm underline-offset-4 hover:underline disabled:opacity-50"
        >
          Request changes…
        </button>
      );
    }
    return (
      <div className="border-foreground/10 mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button
          disabled={busy}
          onClick={() => void decide({ decision: "approve" })}
        >
          Approve and install
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setRevising(true)}
        >
          Request changes
        </Button>
      </div>
    );
  }
  return (
    <form
      id={formId}
      onSubmit={submit}
      className="border-foreground/10 mt-4 flex flex-col gap-3 border-t pt-4"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">What should change?</span>
        <Textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          onKeyDown={submitOnModifiedEnter}
          placeholder="Use Anthropic instead, and skip the thread list for now."
          rows={3}
          autoFocus
          disabled={busy}
        />
      </label>
      {wizard ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setRevising(false)}
          className="text-muted-foreground hover:text-foreground self-start text-sm underline-offset-4 hover:underline disabled:opacity-50"
        >
          Keep the plan as proposed
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || feedback.trim() === ""}>
            Send feedback
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setRevising(false)}
          >
            Back
          </Button>
        </div>
      )}
    </form>
  );
}

function RevisionSummary({ plan }: { plan: Checkout.Plan }) {
  return (
    <Collapsible className="border-foreground/10 rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
        <span className="font-medium">Revision {plan.revision}</span>
        <span className="text-muted-foreground min-w-0 flex-1 truncate">
          {plan.feedback ? `You asked: ${plan.feedback}` : "Superseded"}
        </span>
        <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-foreground/10 border-t px-3 py-3">
        <PlanMarkdown markdown={plan.markdown} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PlanCard({
  plans,
  checkout,
  closed,
}: {
  plans: readonly Checkout.Plan[];
  checkout: CheckoutContextValue;
  closed: boolean;
}) {
  const [showApproved, setShowApproved] = useState(false);
  const current = plans.at(-1);
  if (current === undefined) return null;
  const earlier = plans.slice(0, -1);
  const proposed = current.status === "proposed" && !closed;
  const collapsed = current.status === "approved" && !showApproved;

  return (
    <div className="flex flex-col gap-3">
      {earlier.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1 text-sm">
            {earlier.length === 1
              ? "1 earlier revision"
              : `${earlier.length} earlier revisions`}
            <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-col gap-2">
            {earlier.map((plan) => (
              <RevisionSummary key={plan.revision} plan={plan} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <div
        className={cn(
          "min-w-0 border-l-2 py-1 pl-4",
          proposed
            ? "border-blue-500 dark:border-blue-400"
            : current.status === "approved"
              ? "border-emerald-500 dark:border-emerald-400"
              : "border-foreground/15",
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[0.9375rem] font-medium">
            {current.status === "approved"
              ? "Approved plan"
              : current.status === "changes-requested"
                ? "Plan under revision"
                : earlier.length > 0
                  ? `Revised plan`
                  : "Proposed plan"}
          </p>
          <p className="text-muted-foreground text-xs">
            Revision {current.revision}
          </p>
        </div>
        {current.status === "changes-requested" && current.feedback ? (
          <p className="text-muted-foreground mt-1 text-sm">
            You asked: {current.feedback}
          </p>
        ) : null}
        {current.status === "approved" ? (
          <button
            type="button"
            aria-expanded={showApproved}
            onClick={() => setShowApproved((shown) => !shown)}
            className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-sm"
          >
            {showApproved ? "Hide the plan" : "Show the plan"}
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform",
                showApproved && "rotate-180",
              )}
            />
          </button>
        ) : null}
        {collapsed ? null : (
          <div className="mt-3">
            <PlanMarkdown markdown={current.markdown} />
          </div>
        )}
        {proposed ? <PlanDecisionForm checkout={checkout} /> : null}
      </div>
    </div>
  );
}
