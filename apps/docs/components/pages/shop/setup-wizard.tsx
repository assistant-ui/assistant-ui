"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  WifiOffIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { StatewireClient } from "statewire";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSetupNavigation } from "@/components/shared/setup-navigation";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  AgentStatus,
  agentPhase,
  useAgentName,
} from "@/components/pages/shop/agent-status";
import { FinishProposal } from "@/components/pages/shop/finish-proposal";
import { LicenseAgreement } from "@/components/pages/shop/license-agreement";
import { AnswerReview } from "@/components/pages/shop/answer-review";
import { InputCard } from "@/components/pages/shop/input-card";
import { PlanCard, PlanMarkdown } from "@/components/pages/shop/plan-card";
import { SetupComposer } from "@/components/pages/shop/setup-composer";
import { SetupIntro } from "@/components/pages/shop/setup-intro";
import {
  livePage,
  pageKey,
  pageTrail,
  type WizardPage,
} from "@/components/pages/shop/setup-wizard-page";
import {
  TimelineEntry,
  type EntryStatus,
} from "@/components/pages/shop/timeline";
import {
  WizardProvider,
  type WizardNextBinding,
} from "@/components/pages/shop/wizard-actions";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { getCatalogItem } from "@/lib/catalog";
import { abandonCheckout, finishCheckout } from "@/lib/checkout/flow";
import {
  acceptSetupLicense,
  acknowledgeSetupIntro,
} from "@/lib/checkout/session-store";
import { finishProposed, type Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

const ignoreNext = () => {};

const listProducts = (names: string[]) =>
  new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    names,
  );

function ConnectionNotice({
  connection,
  degraded,
}: {
  connection: StatewireClient.Connection;
  degraded: boolean;
}) {
  if (!degraded) return null;
  const retrying = connection.status === "retrying";
  return (
    <div
      role="status"
      className="border-foreground/10 bg-muted/40 flex shrink-0 flex-wrap items-center gap-3 border-b px-5 py-2 text-sm"
    >
      {retrying ? (
        <LoaderCircleIcon className="size-4 shrink-0 animate-spin" />
      ) : (
        <WifiOffIcon className="text-destructive size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        {retrying
          ? `Reconnecting to the setup (attempt ${connection.attempt})…`
          : `Lost the connection to the setup${
              connection.degraded && connection.message
                ? `: ${connection.message}`
                : "."
            }`}
      </span>
      <Button size="sm" variant="outline" onClick={connection.reconnect}>
        Retry now
      </Button>
    </div>
  );
}

function CancelButton({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const { leaveSetup } = useSetupNavigation();
  const fromCart = checkout.session.fromCart === true;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const end = async () => {
    try {
      await checkout.commands["checkout/cancel"]();
    } catch {
      toast.warning(
        "Could not reach the session. Your agent may keep working until it times out.",
      );
    }
    abandonCheckout();
    if (fromCart) router.push("/shop/cart");
    else leaveSetup();
  };
  return (
    <>
      <Button ref={trigger} variant="outline" onClick={() => setOpen(true)}>
        Cancel
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent finalFocus={trigger}>
          <DialogHeader>
            <DialogTitle>End this setup?</DialogTitle>
            <DialogDescription>
              Your agent will be told to stop and the progress shown here will
              be lost.{fromCart ? " Its products go back into your cart." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep going
            </DialogClose>
            <Button variant="destructive" onClick={end}>
              End setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProgressBar({
  value,
  label,
}: {
  /** A fraction of the work done, or `undefined` while it cannot be measured. */
  value: number | undefined;
  label: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === undefined ? undefined : Math.round(value * 100)}
      className="bg-foreground/10 relative h-2 w-full overflow-hidden rounded-full"
    >
      <div
        className={cn(
          "bg-foreground absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
          value === undefined && "w-full opacity-30 motion-safe:animate-pulse",
        )}
        style={value === undefined ? undefined : { width: `${value * 100}%` }}
      />
    </div>
  );
}

function InstallSteps({
  checkout,
  state,
}: {
  checkout: CheckoutContextValue;
  state: Checkout.State;
}) {
  const closed = state.status === "done" || state.status === "cancelled";
  let lastProduct: string | undefined;
  return (
    <ol role="list" aria-label="Installation steps" className="flex flex-col">
      {state.steps.map((step) => {
        const inputs = checkout.openInputs.filter(
          (input) => input.stepId === step.id,
        );
        const status: EntryStatus =
          !closed && inputs.length > 0 ? "attention" : step.status;
        const product =
          step.product !== undefined && step.product !== lastProduct
            ? state.products.find((entry) => entry.slug === step.product)
            : undefined;
        lastProduct = step.product ?? lastProduct;
        const glyph = product ? getCatalogItem(product.slug)?.glyph : undefined;
        return (
          <TimelineEntry
            key={step.id}
            status={status}
            title={step.title}
            detail={step.note ?? step.detail}
            eyebrow={
              product && state.products.length > 1 ? (
                <p className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  {glyph ? <NavGlyph kind={glyph} size="sm" /> : null}
                  {product.name}
                </p>
              ) : undefined
            }
          />
        );
      })}
    </ol>
  );
}

/** The lines the session writes itself when a step closes; the step list already shows them. */
const isStepLine = (entry: Checkout.LogEntry, state: Checkout.State) =>
  entry.role === "agent" &&
  entry.stepId !== undefined &&
  state.steps.some((step) =>
    ["Completed", "Skipped"].some(
      (verb) =>
        entry.text === `${verb}: ${step.title}` ||
        entry.text.startsWith(`${verb}: ${step.title}\n\n`),
    ),
  );

function AgentLog({
  state,
  agentName,
  since = 0,
}: {
  state: Checkout.State;
  agentName: string;
  since?: number | undefined;
}) {
  const entries = state.log.filter(
    (entry) =>
      entry.phase === state.status &&
      entry.at >= since &&
      !isStepLine(entry, state),
  );
  if (entries.length === 0) return null;
  return (
    <ol
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      className="flex flex-col gap-2"
    >
      {entries.slice(-4).map((entry) => (
        <li
          key={entry.id}
          className={cn(
            "text-sm [overflow-wrap:anywhere]",
            entry.role === "user" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {entry.role === "user" ? null : (
            <span className="sr-only">{`${agentName}: `}</span>
          )}
          {entry.role === "user" ? `You: ${entry.text}` : entry.text}
        </li>
      ))}
    </ol>
  );
}

type PageView = {
  title: string;
  subtitle?: string | undefined;
  body: ReactNode;
};

export function SetupWizard({ checkout }: { checkout: CheckoutContextValue }) {
  const router = useRouter();
  const { leaveSetup } = useSetupNavigation();
  const name = useAgentName(checkout);
  const formId = useId();
  const [pageNext, setPageNext] = useState<WizardNextBinding>();
  const setNext = useCallback(
    (next: WizardNextBinding | undefined) => setPageNext(next),
    [],
  );
  const { state } = checkout;
  const phase = agentPhase(checkout);
  const live = livePage({
    state,
    session: checkout.session,
    phase,
    openInputs: checkout.openInputs,
    planPending: checkout.planPending,
  });
  const liveKey = pageKey(live);
  const [seenLive, setSeenLive] = useState(liveKey);
  const [viewing, setViewing] = useState<string>();
  if (seenLive !== liveKey) {
    setSeenLive(liveKey);
    setViewing(undefined);
  }
  const heading = useRef<HTMLHeadingElement>(null);
  const footer = useRef<HTMLElement>(null);
  const shownKey = viewing ?? liveKey;
  const mountedKey = useRef(shownKey);
  useEffect(() => {
    if (mountedKey.current === shownKey) return;
    mountedKey.current = shownKey;
    const active = document.activeElement;
    const fromFooter =
      active === null ||
      active === document.body ||
      footer.current?.contains(active) === true;
    if (fromFooter) heading.current?.focus();
  }, [shownKey]);
  const trail = pageTrail(state, live);
  const keys = trail.map(pageKey);
  const liveIndex = trail.length - 1;
  const viewingIndex = viewing === undefined ? -1 : keys.indexOf(viewing);
  const index = viewingIndex === -1 ? liveIndex : viewingIndex;
  const page: WizardPage = trail[index]!;
  const reviewing = index !== liveIndex;
  const fromCart = checkout.session.fromCart === true;
  const products = state?.products.length
    ? state.products.map((product) => product.name)
    : checkout.session.products.map(
        (slug) => getCatalogItem(slug)?.name ?? slug,
      );
  const done = state?.status === "done";
  const exit = (finished: boolean) => {
    if (finished) finishCheckout();
    else abandonCheckout();
    if (fromCart) router.push(finished ? "/shop" : "/shop/cart");
    else leaveSetup();
  };
  const leave = () => exit(done);

  const proposal =
    !reviewing && state !== undefined && finishProposed(state) ? (
      <FinishProposal
        checkout={checkout}
        agentName={name}
        onClosed={() => exit(true)}
      />
    ) : null;

  const view = ((): PageView => {
    switch (page.id) {
      case "welcome":
        return {
          title: `Welcome to the setup wizard for ${listProducts(products)}`,
          subtitle: `Your coding agent will set up ${listProducts(products)} in your project. To continue, click Next.`,
          body: <SetupIntro onContinue={acknowledgeSetupIntro} />,
        };
      case "license":
        return {
          title: "License agreement",
          subtitle: "Please read the following license agreement carefully.",
          body: (
            <LicenseAgreement
              accepted={checkout.session.licenseAccepted === true}
              onAccept={acceptSetupLicense}
            />
          ),
        };
      case "connect":
        return {
          title:
            phase === "connected"
              ? `${name} is connected`
              : phase === "quiet"
                ? "Reconnect your agent"
                : "Connect your coding agent",
          body: <AgentStatus checkout={checkout} inline />,
        };
      case "question":
        return {
          title: `${name} has a question`,
          subtitle:
            page.total > 2
              ? `${page.total - 1} more questions waiting`
              : page.total === 2
                ? "1 more question waiting"
                : undefined,
          body: (
            <InputCard
              key={page.input.id}
              input={page.input}
              checkout={checkout}
            />
          ),
        };
      case "answer":
        return {
          title:
            page.input.status === "answered"
              ? "Your answer"
              : "A question you skipped",
          body: <AnswerReview input={page.input} agentName={name} />,
        };
      case "plan":
        return {
          title: reviewing ? "The plan" : "Review the plan",
          subtitle: reviewing
            ? undefined
            : "Nothing changes until you approve it.",
          body:
            reviewing && checkout.plan ? (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-xs">
                  Revision {checkout.plan.revision}
                  {checkout.plan.status === "approved" ? " · Approved" : ""}
                </p>
                <PlanMarkdown markdown={checkout.plan.markdown} />
              </div>
            ) : state ? (
              <PlanCard
                plans={state.plans}
                checkout={checkout}
                closed={!checkout.planPending}
              />
            ) : null,
        };
      case "working": {
        const revising = checkout.plan?.status === "changes-requested";
        return {
          title: revising ? "Revising the plan" : "Exploring your project",
          subtitle: `${name} will ask when it needs you.`,
          body: state ? (
            <div className="flex flex-col gap-5">
              <ProgressBar
                value={undefined}
                label={revising ? "Revising the plan" : "Exploring"}
              />
              {proposal}
              <AgentLog state={state} agentName={name} />
            </div>
          ) : null,
        };
      }
      case "install": {
        const { done: finished, total } = checkout.progress;
        const active = state?.steps.find((step) => step.status === "active");
        return {
          title: reviewing || done ? "Installation" : "Installing",
          subtitle:
            total > 0
              ? `${finished} of ${total} ${total === 1 ? "step" : "steps"} done`
              : reviewing || done
                ? undefined
                : `${name} is starting on the plan.`,
          body: state ? (
            <div className="flex flex-col gap-5">
              {!reviewing && !done ? (
                <ProgressBar
                  value={total > 0 ? finished / total : undefined}
                  label={active ? active.title : "Installing"}
                />
              ) : null}
              {proposal}
              {state.steps.length > 0 ? (
                <InstallSteps checkout={checkout} state={state} />
              ) : null}
              <AgentLog state={state} agentName={name} />
            </div>
          ) : null,
        };
      }
      case "finish":
        return {
          title: `${name} finished`,
          body: (
            <div className="flex flex-col gap-5">
              {state ? (
                <AgentLog
                  state={state}
                  agentName={name}
                  since={state.completion?.proposedAt}
                />
              ) : null}
              <FinishProposal
                checkout={checkout}
                agentName={name}
                onClosed={() => exit(true)}
              />
            </div>
          ),
        };
      case "closed":
        return {
          title: done ? "Setup complete" : "Setup cancelled",
          subtitle: done
            ? `${listProducts(products)} ${products.length === 1 ? "is" : "are"} set up in your project.`
            : undefined,
          body:
            state && state.steps.length > 0 ? (
              <InstallSteps checkout={checkout} state={state} />
            ) : null,
        };
    }
  })();

  const proposed = state !== undefined && finishProposed(state);
  const ownsActions =
    !reviewing &&
    (proposed ||
      (page.id !== "working" && page.id !== "install" && page.id !== "closed"));
  const closed = state?.status === "done" || state?.status === "cancelled";
  const back = ownsActions ? pageNext?.back : undefined;
  const composing =
    page.id !== "welcome" &&
    page.id !== "license" &&
    page.id !== "connect" &&
    page.id !== "closed";
  const next: WizardNextBinding | undefined = reviewing
    ? {
        label: "Next",
        run: () =>
          setViewing(index + 1 === liveIndex ? undefined : keys[index + 1]),
      }
    : closed
      ? { label: "Finish", run: leave }
      : ownsActions
        ? pageNext
        : { label: "Next", disabled: true, run: () => {} };

  return (
    <section
      aria-labelledby="setup-wizard-title"
      className="border-foreground/15 bg-background flex h-full max-h-full w-full max-w-[52rem] flex-col overflow-hidden border shadow-xl sm:aspect-[16/10] sm:h-auto"
    >
      <div className="flex min-h-0 flex-1">
        <aside
          aria-hidden="true"
          className="hidden w-48 shrink-0 flex-col items-center bg-black px-6 pt-12 sm:flex"
        >
          <span className="flex size-14 items-center justify-center border border-white">
            <Image
              src="/favicon/icon.svg"
              alt=""
              width={32}
              height={32}
              className="invert"
            />
          </span>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <ConnectionNotice
            connection={checkout.connection}
            degraded={checkout.degraded}
          />
          {phase === "quiet" && page.id !== "connect" && !checkout.degraded ? (
            <div
              role="status"
              className="border-foreground/10 bg-muted/40 flex shrink-0 flex-col gap-2 border-b px-5 py-3 text-sm sm:px-6"
            >
              <p className="flex items-center gap-2 font-medium">
                <WifiOffIcon aria-hidden="true" className="size-4 shrink-0" />
                {name} disconnected.
              </p>
              <AgentStatus checkout={checkout} inline />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-8 pb-5 sm:px-6 sm:pt-10">
            <h1
              ref={heading}
              id="setup-wizard-title"
              tabIndex={-1}
              className="text-lg font-semibold text-balance"
            >
              {view.title}
            </h1>
            {view.subtitle ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {view.subtitle}
              </p>
            ) : null}
            <div className="mt-5">
              <WizardProvider
                value={{ formId, setNext: ownsActions ? setNext : ignoreNext }}
              >
                {view.body}
              </WizardProvider>
            </div>
          </div>
          {composing ? (
            <div className="shrink-0 px-5 pb-4 sm:px-6">
              <SetupComposer checkout={checkout} />
            </div>
          ) : null}
        </div>
      </div>
      <footer
        ref={footer}
        className="border-foreground/10 flex shrink-0 items-center justify-end gap-2 border-t px-5 py-4 sm:px-6"
      >
        <Button
          variant="outline"
          disabled={back === undefined && index === 0}
          onClick={back ?? (() => setViewing(keys[index - 1]))}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <Button
          type={next?.submit ? "submit" : "button"}
          form={next?.submit ? formId : undefined}
          disabled={next === undefined || next.disabled === true}
          onClick={next?.submit ? undefined : next?.run}
        >
          {next?.label ?? "Next"}
          {next?.label === "Finish" ? null : (
            <ChevronRightIcon data-icon="inline-end" />
          )}
        </Button>
        <span className="w-2" aria-hidden="true" />
        {closed ? (
          <Button variant="outline" disabled>
            Cancel
          </Button>
        ) : (
          <CancelButton checkout={checkout} />
        )}
      </footer>
    </section>
  );
}
