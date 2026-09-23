"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, WifiOffIcon } from "lucide-react";
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
  AgentAvatar,
  AgentStatus,
  agentPhase,
  useAgentName,
} from "@/components/pages/shop/agent-status";
import { FinishProposal } from "@/components/pages/shop/finish-proposal";
import { InputCard } from "@/components/pages/shop/input-card";
import { PlanCard, PlanMarkdown } from "@/components/pages/shop/plan-card";
import { SetupComposer } from "@/components/pages/shop/setup-composer";
import { SetupIntro } from "@/components/pages/shop/setup-intro";
import {
  livePage,
  pageTrail,
  type TrailPageId,
  type WizardPage,
  type WizardPageId,
} from "@/components/pages/shop/setup-wizard-page";
import {
  TimelineEntry,
  type EntryStatus,
} from "@/components/pages/shop/timeline";
import { WizardActionsProvider } from "@/components/pages/shop/wizard-actions";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { getCatalogItem } from "@/lib/catalog";
import { abandonCheckout, finishCheckout } from "@/lib/checkout/flow";
import { acknowledgeSetupIntro } from "@/lib/checkout/session-store";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

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
      <Button ref={trigger} variant="ghost" onClick={() => setOpen(true)}>
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

function AgentLog({
  state,
  agentName,
}: {
  state: Checkout.State;
  agentName: string;
}) {
  const entries = state.log.filter((entry) => entry.phase === state.status);
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
          <span className="sr-only">
            {entry.role === "user" ? "You: " : `${agentName}: `}
          </span>
          {entry.role === "user" ? `You: ${entry.text}` : entry.text}
        </li>
      ))}
    </ol>
  );
}

function Products({ slugs }: { slugs: readonly string[] }) {
  return (
    <ul role="list" className="flex flex-col gap-2">
      {slugs.map((slug) => {
        const product = getCatalogItem(slug);
        return (
          <li key={slug} className="flex items-center gap-2 text-sm">
            {product ? <NavGlyph kind={product.glyph} size="sm" /> : null}
            {product?.name ?? slug}
          </li>
        );
      })}
    </ul>
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
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const { state } = checkout;
  const phase = agentPhase(checkout);
  const live = livePage({
    state,
    session: checkout.session,
    phase,
    openInputs: checkout.openInputs,
    planPending: checkout.planPending,
  });
  const liveKey =
    live.id === "question" ? `question:${live.input.id}` : live.id;
  const [seenLive, setSeenLive] = useState(liveKey);
  const [viewing, setViewing] = useState<WizardPageId>();
  if (seenLive !== liveKey) {
    setSeenLive(liveKey);
    setViewing(undefined);
  }
  const trail = pageTrail(state, live);
  const liveIndex = trail.length - 1;
  const viewingIndex = viewing === undefined ? -1 : trail.indexOf(viewing);
  const index = viewingIndex === -1 ? liveIndex : viewingIndex;
  const page: WizardPage =
    index === liveIndex ? live : { id: trail[index]! as TrailPageId };
  const reviewing = index !== liveIndex;
  const fromCart = checkout.session.fromCart === true;
  const products = state?.products.length
    ? state.products.map((product) => product.name)
    : checkout.session.products.map(
        (slug) => getCatalogItem(slug)?.name ?? slug,
      );
  const done = state?.status === "done";
  const leave = () => {
    if (done) finishCheckout();
    else abandonCheckout();
    if (fromCart) router.push(done ? "/shop" : "/shop/cart");
    else leaveSetup();
  };

  const view = ((): PageView => {
    switch (page.id) {
      case "welcome":
        return {
          title: "Welcome",
          subtitle: `This sets up ${listProducts(products)} in your project.`,
          body: (
            <div className="flex flex-col gap-6">
              <Products slugs={checkout.session.products} />
              <SetupIntro onContinue={acknowledgeSetupIntro} />
            </div>
          ),
        };
      case "connect":
        return {
          title:
            phase === "connected"
              ? `${name} is connected`
              : phase === "quiet"
                ? "Reconnect your agent"
                : phase === "waiting"
                  ? "Connecting your agent"
                  : "Connect your coding agent",
          body: (
            <div className="flex flex-col gap-5">
              <AgentAvatar checkout={checkout} />
              <AgentStatus checkout={checkout} inline />
            </div>
          ),
        };
      case "question":
        return {
          title: `${name} has a question`,
          subtitle:
            page.total > 1
              ? `Question ${page.index} of ${page.total}`
              : undefined,
          body: (
            <InputCard
              key={page.input.id}
              input={page.input}
              checkout={checkout}
            />
          ),
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
              <AgentLog state={state} agentName={name} />
              <SetupComposer checkout={checkout} />
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
              : undefined,
          body: state ? (
            <div className="flex flex-col gap-5">
              {!reviewing && !done ? (
                <ProgressBar
                  value={total > 0 ? finished / total : undefined}
                  label={active ? active.title : "Installing"}
                />
              ) : null}
              {state.steps.length > 0 ? (
                <InstallSteps checkout={checkout} state={state} />
              ) : (
                <AgentLog state={state} agentName={name} />
              )}
              {reviewing ? null : <SetupComposer checkout={checkout} />}
            </div>
          ) : null,
        };
      }
      case "finish":
        return {
          title: `${name} finished`,
          body: (
            <div className="flex flex-col gap-5">
              <FinishProposal
                checkout={checkout}
                agentName={name}
                onClosed={leave}
              />
              <SetupComposer checkout={checkout} />
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

  const ownsActions =
    !reviewing &&
    page.id !== "working" &&
    page.id !== "install" &&
    page.id !== "closed";
  const closed = page.id === "closed";

  return (
    <section
      aria-labelledby="setup-wizard-title"
      className="border-foreground/10 bg-background flex h-[min(38rem,100%)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-lg"
    >
      <header className="border-foreground/10 shrink-0 border-b px-5 py-4 sm:px-6">
        <h1 id="setup-wizard-title" className="text-base font-medium">
          {view.title}
        </h1>
        {view.subtitle ? (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {view.subtitle}
          </p>
        ) : null}
      </header>
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {slot ? (
          <WizardActionsProvider
            value={ownsActions ? { element: slot, formId } : null}
          >
            {view.body}
          </WizardActionsProvider>
        ) : null}
      </div>
      <footer className="border-foreground/10 flex shrink-0 items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
        <div>{closed ? null : <CancelButton checkout={checkout} />}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setViewing(trail[index - 1])}
          >
            Back
          </Button>
          <div ref={setSlot} className="contents" />
          {reviewing ? (
            <Button
              onClick={() =>
                setViewing(
                  index + 1 === liveIndex ? undefined : trail[index + 1],
                )
              }
            >
              Next
            </Button>
          ) : closed ? (
            <Button onClick={leave} autoFocus>
              {done ? "Finish" : fromCart ? "Back to cart" : "Close"}
            </Button>
          ) : page.id === "working" || page.id === "install" ? (
            <Button disabled>Next</Button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
