"use client";

import {
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BotIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  CpuIcon,
  FileIcon,
  InfoIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  PackageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  parsePlan,
  type PlanFact,
  type PlanSection,
} from "@/lib/checkout/plan-sections";
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
    <blockquote className="border-foreground/30 text-muted-foreground my-2 border-l-2 ps-3">
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

const inlineComponents: Components = {
  ...components,
  p: ({ children }) => <>{children}</>,
};

function PlanInline({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineComponents}>
      {markdown}
    </ReactMarkdown>
  );
}

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type Row = { icon: Icon; label?: string; value: string; sub?: string };

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul role="list" className="flex flex-col gap-2 text-sm">
      {rows.map((row, index) => (
        <li key={index} className="flex min-w-0 gap-1.5">
          <row.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 truncate">
            {row.label ? (
              <span className="me-2 font-medium">{row.label}</span>
            ) : null}
            <span className={cn(row.label && "text-muted-foreground")}>
              <PlanInline markdown={row.value} />
            </span>
            {row.sub ? (
              <span className="text-muted-foreground ms-2">
                <PlanInline markdown={row.sub} />
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

const foundRows = (facts: PlanFact[]): Row[] => {
  const left = [...facts];
  const take = (test: RegExp, exclude?: RegExp) => {
    const index = left.findIndex(
      (fact) => test.test(fact.label) && !exclude?.test(fact.label),
    );
    return index === -1 ? undefined : left.splice(index, 1)[0];
  };
  const app = take(/\b(app|framework|stack)\b/i, /agent/i);
  const appSub = app && take(/package manager|language/i);
  const agent = take(/agent/i);
  const provider = take(/provider/i);
  const model = take(/\bmodel\b/i);
  const rows: Row[] = [];
  if (app) {
    rows.push({
      icon: LayoutGridIcon,
      label: "App",
      value: app.value,
      ...(appSub && { sub: appSub.value }),
    });
  }
  if (agent) rows.push({ icon: BotIcon, label: "Agent", value: agent.value });
  if (provider || model) {
    rows.push({
      icon: CpuIcon,
      label: "Model",
      value: (provider ?? model)!.value,
      ...(provider && model && { sub: model.value }),
    });
  }
  return [...rows, ...left.map((fact) => ({ icon: InfoIcon, ...fact }))];
};

const installIcon = (text: string): Icon => {
  if (/chat|thread|assistant|ui\b/i.test(text)) return MessageSquareIcon;
  if (/agent|model|provider|llm/i.test(text)) return BotIcon;
  if (/\.[a-z]{1,4}`?(\s|$)|^`?(app|src|pages|components)\//i.test(text)) {
    return FileIcon;
  }
  return PackageIcon;
};

const installRows = (section: PlanSection): Row[] => [
  ...section.facts.map((fact) => ({ ...fact, icon: installIcon(fact.label) })),
  ...section.items.map((item) => ({
    value: item.text,
    icon: installIcon(item.text),
  })),
];

function Steps({ titles }: { titles: string[] }) {
  return (
    <ol role="list" className="flex flex-col gap-2 text-sm">
      {titles.map((title, index) => (
        <li key={index} className="flex min-w-0 gap-3">
          <span className="text-muted-foreground w-4 shrink-0 text-right font-mono text-xs leading-5">
            {index + 1}
          </span>
          <span className="min-w-0 truncate">
            <PlanInline markdown={title} />
          </span>
        </li>
      ))}
    </ol>
  );
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

type Section = { id: string; title: string; eyebrow: string; body: ReactNode };

/** The plan as accordion rows, one per section the agent wrote, with one row open at a time. */
export function PlanAccordion({
  markdown,
  steps = [],
}: {
  markdown: string;
  steps?: readonly Checkout.Step[] | undefined;
}) {
  const plan = parsePlan(markdown);
  const stepTitles =
    steps.length > 0
      ? steps.map((step) => step.title)
      : (plan.steps?.items.map((item) => item.text) ?? []);
  const sections: Section[] = [];
  const listed = (section: PlanSection, list: ReactNode, listed: number) =>
    listed > 0 ? (
      <div className="flex flex-col gap-2">
        {list}
        {section.rest ? (
          <div className="text-muted-foreground">
            <PlanMarkdown markdown={section.rest} />
          </div>
        ) : null}
      </div>
    ) : (
      <PlanMarkdown markdown={section.markdown} />
    );
  if (plan.found) {
    const rows = foundRows(plan.found.facts);
    sections.push({
      id: "found",
      title: "What I found",
      eyebrow: count(rows.length, "item"),
      body: listed(plan.found, <Rows rows={rows} />, rows.length),
    });
  }
  if (plan.install) {
    const rows = installRows(plan.install);
    sections.push({
      id: "install",
      title: "What I will install",
      eyebrow: count(rows.length, "item"),
      body: listed(plan.install, <Rows rows={rows} />, rows.length),
    });
  }
  if (plan.steps || stepTitles.length > 0) {
    const section = plan.steps ?? {
      heading: "Steps",
      markdown: "",
      facts: [],
      items: [],
      rest: "",
    };
    sections.push({
      id: "steps",
      title: "Steps",
      eyebrow:
        stepTitles.length > 0 ? count(stepTitles.length, "step") : "As written",
      body: listed(section, <Steps titles={stepTitles} />, stepTitles.length),
    });
  }
  if (plan.other) {
    sections.push({
      id: "other",
      title: sections.length > 0 ? "Also in the plan" : "The plan",
      eyebrow: "As written",
      body: <PlanMarkdown markdown={plan.other} />,
    });
  }
  if (plan.questions) {
    const rows = plan.questions.items.map((item) => ({
      icon: CircleHelpIcon,
      value: item.text,
    }));
    sections.push({
      id: "questions",
      title: "Open questions",
      eyebrow: count(rows.length, "question"),
      body: listed(plan.questions, <Rows rows={rows} />, rows.length),
    });
  }
  const first =
    sections.find((section) => section.id === "steps") ?? sections[0];
  return (
    <Accordion
      defaultValue={first ? [first.id] : []}
      className="border-foreground/10 rounded-lg border"
    >
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="border-foreground/10"
        >
          <AccordionTrigger className="items-center gap-3 px-3 py-2.5 hover:no-underline [&>svg]:translate-y-0">
            <span className="min-w-0 flex-1 truncate">{section.title}</span>
            <span className="text-muted-foreground text-xs font-normal">
              {section.eyebrow}
            </span>
          </AccordionTrigger>
          <AccordionContent className="max-h-28 overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1rem),transparent)] px-3 pb-4">
            {section.body}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function PlanDecisionForm({ checkout }: { checkout: CheckoutContextValue }) {
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
  const revising = feedback.trim() !== "";
  useWizardNext(
    revising
      ? { label: "Send", disabled: busy, submit: true }
      : {
          label: "Install",
          disabled: busy,
          onClick: () => void decide({ decision: "approve" }),
        },
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!revising) return;
    void decide({ decision: "revise", feedback: feedback.trim() });
  };
  return (
    <form id={formId} onSubmit={submit}>
      <label htmlFor={`${formId}-feedback`} className="sr-only">
        What should I account for before I start?
      </label>
      <Textarea
        id={`${formId}-feedback`}
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        onKeyDown={submitOnModifiedEnter}
        placeholder="Add a note, or leave it empty to install as proposed."
        rows={2}
        disabled={busy}
        className="bg-background"
      />
    </form>
  );
}

function RevisionSummary({ plan }: { plan: Checkout.Plan }) {
  return (
    <Collapsible className="border-foreground/10 rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left text-sm">
        <span className="font-medium">Revision {plan.revision}</span>
        <span className="text-muted-foreground min-w-0 flex-1 truncate">
          {plan.feedback ? `You asked: ${plan.feedback}` : "Superseded"}
        </span>
        <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-foreground/10 border-t p-3">
        <PlanMarkdown markdown={plan.markdown} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PlanCard({
  plans,
  steps,
  checkout,
  closed,
}: {
  plans: readonly Checkout.Plan[];
  steps?: readonly Checkout.Step[];
  checkout: CheckoutContextValue;
  closed: boolean;
}) {
  const [showApproved, setShowApproved] = useState(false);
  const current = plans.at(-1);
  if (current === undefined) return null;
  const earlier = plans.slice(0, -1);
  const proposed = current.status === "proposed" && !closed;
  const collapsed = current.status === "approved" && !showApproved;

  const label = `${
    current.status === "approved"
      ? "Approved plan"
      : current.status === "changes-requested"
        ? "Plan under revision"
        : earlier.length > 0
          ? "Revised plan"
          : "Proposed plan"
  } · Revision ${current.revision}`;
  const header = (
    <div className="flex items-center justify-between gap-3">
      {earlier.length > 0 ? (
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1.5 text-xs">
          {earlier.length === 1
            ? "1 earlier revision"
            : `${earlier.length} earlier revisions`}
          <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
      ) : null}
      <p className="text-muted-foreground ml-auto text-xs">{label}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {earlier.length > 0 ? (
        <Collapsible className="flex flex-col gap-3">
          {header}
          <CollapsibleContent className="flex flex-col gap-2">
            {earlier.map((plan) => (
              <RevisionSummary key={plan.revision} plan={plan} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        header
      )}

      <div className="flex min-w-0 flex-col gap-3">
        {current.status === "changes-requested" && current.feedback ? (
          <p className="text-muted-foreground text-sm">
            You asked: {current.feedback}
          </p>
        ) : null}
        {current.status === "approved" ? (
          <button
            type="button"
            aria-expanded={showApproved}
            onClick={() => setShowApproved((shown) => !shown)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
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
          <PlanAccordion markdown={current.markdown} steps={steps} />
        )}
        {proposed ? <PlanDecisionForm checkout={checkout} /> : null}
      </div>
    </div>
  );
}
