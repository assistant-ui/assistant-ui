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
  ChevronRightIcon,
  CpuIcon,
  FileIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  PackageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import {
  fieldClassName,
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

function PlanSectionCard({
  number,
  title,
  eyebrow,
  children,
}: {
  number: number;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <li className="relative flex flex-col gap-2 sm:block">
      <span
        aria-hidden="true"
        className="text-muted-foreground bg-background font-mono text-xs sm:absolute sm:top-5 sm:-left-12 sm:w-7 sm:py-1 sm:text-center"
      >
        {String(number).padStart(2, "0")}
      </span>
      <section className="bg-muted flex min-w-0 flex-col gap-4 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-medium">{title}</h2>
          <span className="text-muted-foreground text-xs">{eyebrow}</span>
        </div>
        {children}
      </section>
    </li>
  );
}

function PlanDetails({ label, markdown }: { label: string; markdown: string }) {
  return (
    <Collapsible className="flex flex-col items-start">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1.5 text-sm">
        {label}
        <ChevronRightIcon className="size-3.5 transition-transform group-data-[panel-open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-foreground/10 mt-3 w-full border-t pt-3">
        <PlanMarkdown markdown={markdown} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function FactRows({ facts }: { facts: PlanFact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {facts.map((fact) => (
        <div key={fact.label} className="contents">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="min-w-0">
            <PlanInline markdown={fact.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

type Column = {
  icon: Icon;
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
};

const columnsOf = (facts: PlanFact[]) => {
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
  const columns: Column[] = [];
  if (app) {
    columns.push({
      icon: LayoutGridIcon,
      label: "App",
      value: app.value,
      ...(appSub && { sub: appSub.value }),
    });
  }
  if (agent)
    columns.push({ icon: BotIcon, label: "Agent", value: agent.value });
  if (provider || model) {
    columns.push({
      icon: CpuIcon,
      label: "Model",
      value: (provider ?? model)!.value,
      ...(provider && model && { sub: model.value, mono: true }),
    });
  }
  return { columns, rows: left };
};

function FoundBody({ section }: { section: PlanSection }) {
  const { columns, rows } = columnsOf(section.facts);
  return (
    <>
      {columns.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.label} className="flex min-w-0 flex-col gap-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <column.icon className="size-3.5" />
                {column.label}
              </span>
              <span className="text-sm font-medium [overflow-wrap:anywhere]">
                <PlanInline markdown={column.value} />
              </span>
              {column.sub ? (
                <span
                  className={cn(
                    "text-muted-foreground text-sm [overflow-wrap:anywhere]",
                    column.mono && "font-mono text-xs",
                  )}
                >
                  <PlanInline markdown={column.sub} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <FactRows facts={rows} />
      {section.rest ? <PlanMarkdown markdown={section.rest} /> : null}
    </>
  );
}

const installIcon = (text: string): Icon => {
  if (/chat|thread|assistant|ui\b/i.test(text)) return MessageSquareIcon;
  if (/agent|model|provider|llm/i.test(text)) return BotIcon;
  if (/\.[a-z]{1,4}`?(\s|$)|^`?(app|src|pages|components)\//i.test(text)) {
    return FileIcon;
  }
  return PackageIcon;
};

function InstallBody({ section }: { section: PlanSection }) {
  const rows = [
    ...section.facts.map((fact) => ({
      ...fact,
      icon: installIcon(fact.label),
    })),
    ...section.items.map((item) => ({
      label: undefined,
      value: item.text,
      icon: installIcon(item.text),
    })),
  ];
  return (
    <>
      <ul role="list" className="flex flex-col gap-2 text-sm">
        {rows.map((row, index) => (
          <li key={index} className="flex min-w-0 gap-1.5">
            <row.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            {row.label ? (
              <span className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5">
                <span className="font-medium">{row.label}</span>
                <span className="text-muted-foreground [overflow-wrap:anywhere]">
                  <PlanInline markdown={row.value} />
                </span>
              </span>
            ) : (
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <PlanInline markdown={row.value} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {section.rest ? <PlanMarkdown markdown={section.rest} /> : null}
    </>
  );
}

function StepsBody({ titles, rest }: { titles: string[]; rest: string }) {
  return (
    <>
      <ol role="list" className="flex flex-col gap-2 text-sm">
        {titles.map((title, index) => (
          <li key={index} className="flex min-w-0 gap-3">
            <span className="text-muted-foreground w-4 shrink-0 text-right font-mono text-xs leading-5">
              {index + 1}
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <PlanInline markdown={title} />
            </span>
          </li>
        ))}
      </ol>
      {rest ? <PlanMarkdown markdown={rest} /> : null}
    </>
  );
}

const structured = (section: PlanSection) =>
  section.facts.length > 0 || section.items.length > 0;

/** The plan as numbered cards, one per section the agent wrote; the review form rides in the last one. */
export function PlanCards({
  markdown,
  steps = [],
  form,
}: {
  markdown: string;
  steps?: readonly Checkout.Step[] | undefined;
  form?: ReactNode;
}) {
  const plan = parsePlan(markdown);
  const stepTitles =
    steps.length > 0
      ? steps.map((step) => step.title)
      : (plan.steps?.items.map((item) => item.text) ?? []);
  const cards: ReactNode[] = [];
  const card = (title: string, eyebrow: string, body: ReactNode) =>
    cards.push(
      <PlanSectionCard
        key={title}
        number={cards.length + 1}
        title={title}
        eyebrow={eyebrow}
      >
        {body}
      </PlanSectionCard>,
    );
  const body = (
    section: PlanSection,
    label: string,
    view: ReactNode,
    shown = structured(section),
  ) =>
    shown ? (
      <>
        {view}
        <PlanDetails label={label} markdown={section.markdown} />
      </>
    ) : (
      <PlanMarkdown markdown={section.markdown} />
    );
  if (plan.found) {
    card(
      "What I found",
      "The starting point",
      body(plan.found, "Project details", <FoundBody section={plan.found} />),
    );
  }
  if (plan.install) {
    card(
      "What I will install",
      "Only the essentials",
      body(
        plan.install,
        "Packages & files",
        <InstallBody section={plan.install} />,
      ),
    );
  }
  if (plan.steps || stepTitles.length > 0) {
    const section = plan.steps ?? {
      heading: "Steps",
      markdown: "",
      facts: [],
      items: [],
      rest: "",
    };
    card(
      "Steps",
      stepTitles.length === 1
        ? "1 step, start to finish"
        : `${stepTitles.length} steps, start to finish`,
      body(
        section,
        "Implementation details",
        <StepsBody titles={stepTitles} rest={section.rest} />,
        stepTitles.length > 0,
      ),
    );
  }
  if (plan.other) {
    card(
      cards.length > 0 ? "Also in the plan" : "The plan",
      "As written",
      <PlanMarkdown markdown={plan.other} />,
    );
  }
  if (plan.questions || form) {
    card(
      "Open questions",
      "Optional",
      <>
        {plan.questions ? (
          <PlanMarkdown markdown={plan.questions.markdown} />
        ) : null}
        {form}
      </>,
    );
  }
  return (
    <ol className="relative flex flex-col gap-4 sm:pl-12">
      <span
        aria-hidden="true"
        className="bg-foreground/10 absolute top-6 bottom-6 left-3.5 hidden w-px sm:block"
      />
      {cards}
    </ol>
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
    <form id={formId} onSubmit={submit} className={fieldClassName}>
      <label htmlFor={`${formId}-feedback`} className="font-medium">
        What should I account for before I start?
      </label>
      <p className="text-muted-foreground">
        Add a note, constraint, or open question for this plan. Leave it empty
        to install as proposed.
      </p>
      <Textarea
        id={`${formId}-feedback`}
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        onKeyDown={submitOnModifiedEnter}
        placeholder="Write a note for the plan…"
        rows={3}
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

  return (
    <div className="flex flex-col gap-3">
      {earlier.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1.5 text-sm">
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

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <p className="text-muted-foreground text-xs">
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
          <PlanCards
            markdown={current.markdown}
            steps={steps}
            form={proposed ? <PlanDecisionForm checkout={checkout} /> : null}
          />
        )}
      </div>
    </div>
  );
}
