"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetupNavigation } from "@/components/shared/setup-navigation";
import { NavGlyph } from "@/components/shared/nav-glyph";
import {
  AgentIndicator,
  AgentStatus,
  agentPhase,
  useAgentName,
} from "@/components/pages/shop/agent-status";
import { FinishProposal } from "@/components/pages/shop/finish-proposal";
import { AnswerReview } from "@/components/pages/shop/answer-review";
import { InputCard } from "@/components/pages/shop/input-card";
import { PlanCard, PlanMarkdown } from "@/components/pages/shop/plan-card";
import { AgentChat, conversation } from "@/components/pages/shop/agent-chat";
import { SetupIntro } from "@/components/pages/shop/setup-intro";
import { SetupBackButton } from "@/components/pages/shop/setup-back-button";
import { StepActivity } from "@/components/pages/shop/step-activity";
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
import { analytics } from "@/lib/analytics";
import { getCatalogItem } from "@/lib/catalog";
import { abandonCheckout, finishCheckout } from "@/lib/checkout/flow";
import { acknowledgeSetupIntro } from "@/lib/checkout/session-store";
import { useSyntheticProgress } from "@/components/pages/shop/use-synthetic-progress";
import { useElapsed } from "@/components/pages/shop/use-elapsed";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  finishProposed,
  inputPrompt,
  stepActivity,
  stepsFinalized,
  unreadAgentEntries,
  type Checkout,
} from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

const ignoreNext = () => {};

const listProducts = (names: string[]) =>
  new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    names,
  );

/** The most products the welcome title names; a longer list, or a shorter one that wraps, moves under it, so the title stays on one line. */
const TITLE_PRODUCTS = 2;

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
      className="bg-muted flex shrink-0 flex-wrap items-center gap-3 border-b px-5 py-2 text-sm sm:px-6"
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

function EndSetupDialog({
  checkout,
  onEnd,
  open,
  onOpenChange,
  trigger,
}: {
  checkout: CheckoutContextValue;
  onEnd: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const fromCart = checkout.session.fromCart === true;
  const end = async () => {
    analytics.setup.cancelled();
    try {
      await checkout.commands["checkout/cancel"]();
    } catch {
      toast.warning(
        "Could not reach the session. Your agent may keep working until it times out.",
      );
    }
    onEnd();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={trigger}>
        <DialogHeader>
          <DialogTitle>End this setup?</DialogTitle>
          <DialogDescription>
            Your agent will be told to stop and the progress shown here will be
            lost.{fromCart ? " Its products go back into your cart." : ""}
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
  );
}

function DisconnectedDialog({
  checkout,
  name,
  open,
  onLeave,
  onEnd,
}: {
  checkout: CheckoutContextValue;
  name: string;
  open: boolean;
  onLeave: () => void;
  onEnd: () => void;
}) {
  const [ending, setEnding] = useState(false);
  if (!open && ending) setEnding(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOffIcon aria-hidden="true" className="size-4 shrink-0" />
            {name} disconnected
          </DialogTitle>
        </DialogHeader>
        <AgentStatus
          checkout={checkout}
          inline
          quietActions={
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    ref={trigger}
                    variant="outline"
                    size="icon"
                    aria-label="More options"
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-auto">
                <DropdownMenuItem onClick={onLeave}>
                  Leave, setup keeps running
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEnding(true)}>
                  End setup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <EndSetupDialog
          checkout={checkout}
          onEnd={onEnd}
          open={ending}
          onOpenChange={setEnding}
          trigger={trigger}
        />
      </DialogContent>
    </Dialog>
  );
}

function CancelButton({
  checkout,
  onEnd,
}: {
  checkout: CheckoutContextValue;
  onEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[role="dialog"]') !== null) return;
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <>
      <Button ref={trigger} variant="outline" onClick={() => setOpen(true)}>
        Cancel
      </Button>
      <EndSetupDialog
        checkout={checkout}
        onEnd={onEnd}
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
      />
    </>
  );
}

function ProgressBar({
  value,
  label,
  valueText,
  fillKey,
}: {
  /** A fraction of the work done, or `undefined` while it cannot be measured. */
  value: number | undefined;
  label: string;
  valueText?: string | undefined;
  /** Remounts the fill so a change of it snaps instead of animating. */
  fillKey?: string | undefined;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === undefined ? undefined : Math.round(value * 100)}
      aria-valuetext={valueText}
      className="bg-foreground/10 relative h-2 w-full overflow-hidden rounded-full"
    >
      <div
        key={fillKey}
        className={cn(
          "bg-foreground absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
          value === undefined && "w-full opacity-30 motion-safe:animate-pulse",
        )}
        style={value === undefined ? undefined : { width: `${value * 100}%` }}
      />
    </div>
  );
}

const agentWorking = (checkout: CheckoutContextValue) =>
  agentPhase(checkout) === "connected" &&
  checkout.state !== undefined &&
  checkout.state.status !== "waiting" &&
  checkout.openInputs.length === 0 &&
  !checkout.planPending &&
  !finishProposed(checkout.state);

function WorkingProgress({
  checkout,
  label,
}: {
  checkout: CheckoutContextValue;
  label: string;
}) {
  const active = agentWorking(checkout);
  const { value, complete } = useSyntheticProgress({
    active,
    stepKey: `${checkout.session.id}:${label}`,
  });
  return (
    <ProgressBar
      value={value}
      label={label}
      valueText={
        active || complete
          ? undefined
          : checkout.agentPresent
            ? "Waiting for your input"
            : "Waiting for the agent"
      }
    />
  );
}

const EXPLORING_VERBS = [
  "Exploring",
  "Reading",
  "Mapping",
  "Scanning",
  "Surveying",
  "Inspecting",
  "Studying",
];
const VERB_MS = 2400;

/** Swaps the title's verb while the agent works; the accessible name stays "Exploring your project". */
function ExploringTitle({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const rotating = active && !reduced;
  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % EXPLORING_VERBS.length),
      VERB_MS,
    );
    return () => clearInterval(timer);
  }, [rotating]);
  const verb = EXPLORING_VERBS[index]!;
  return (
    <>
      <span
        key={verb}
        aria-hidden="true"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 inline-block motion-safe:duration-300"
      >
        {verb}
      </span>
      <span className="sr-only">{EXPLORING_VERBS[0]}</span>
      {" your project"}
    </>
  );
}

const STEP_FILL_TAU_MS = 20_000;

const stepFill = (elapsed: number) => 1 - Math.exp(-elapsed / STEP_FILL_TAU_MS);

function InstallProgress({
  checkout,
  state,
}: {
  checkout: CheckoutContextValue;
  state: Checkout.State;
}) {
  const { done: finished, total } = checkout.progress;
  const active = state.steps.find((step) => step.status === "active");
  const finalized = stepsFinalized(state);
  const key = finalized ? active?.id : "planning";
  const partial = stepFill(useElapsed(key));
  return finalized ? (
    <ProgressBar
      value={(finished + partial) / total}
      label={active ? active.title : "Installing"}
      fillKey={key}
    />
  ) : (
    <ProgressBar value={partial} label="Planning the steps" fillKey={key} />
  );
}

const LEAVE_MS = 300;

function useLeaving(present: boolean) {
  const [leaving, setLeaving] = useState(false);
  const [was, setWas] = useState(present);
  if (was !== present) {
    setWas(present);
    setLeaving(!present);
  }
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(false), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);
  return leaving;
}

const scrollKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

/** jsdom computes no overflow, so there the list stands in for its scroller. */
function scrollerOf(element: HTMLElement): HTMLElement {
  for (
    let node: HTMLElement | null = element;
    node !== null;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return element;
}

function InstallSteps({
  checkout,
  state,
}: {
  checkout: CheckoutContextValue;
  state: Checkout.State;
}) {
  const closed = state.status === "done" || state.status === "cancelled";
  const drafting = !closed && !finishProposed(state) && !stepsFinalized(state);
  const leaving = useLeaving(drafting);
  const name = useAgentName(checkout);
  const activeId = state.steps.find((step) => step.status === "active")?.id;
  const activeLast =
    activeId === undefined
      ? undefined
      : stepActivity(state, activeId).at(-1)?.id;
  const list = useRef<HTMLOListElement>(null);
  const following = useRef(true);
  const center = () => {
    if (activeId === undefined || !following.current) return;
    list.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "center" });
  };
  useEffect(() => {
    following.current = true;
    const element = list.current;
    if (!element) return;
    const scroller = scrollerOf(element);
    let interacted = false;
    const pause = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest('[role="log"]')) return;
      if (event.type === "keydown") {
        const { key } = event as KeyboardEvent;
        if (!scrollKeys.has(key)) return;
        if (key === " " && target?.closest("button")) return;
      }
      if (event.type === "pointerdown" && target !== scroller) return;
      interacted = true;
      following.current = false;
    };
    const interactions = [
      "wheel",
      "touchmove",
      "keydown",
      "pointerdown",
    ] as const;
    for (const type of interactions) {
      scroller.addEventListener(type, pause, { passive: true });
    }
    // Rows mount at 0fr and unfold over 0.3s, so a list that fit at mount time has grown by the time the animation ends, and the growth may have pushed the row out of view.
    const unfolded = (event: Event) => {
      if ((event as AnimationEvent).animationName !== "unfold" || interacted)
        return;
      following.current = true;
      center();
    };
    element.addEventListener("animationend", unfolded);
    let observer: IntersectionObserver | undefined;
    const row = element.querySelector('[aria-current="step"]');
    // jsdom has no IntersectionObserver, so the list always follows there.
    if (row && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries.at(-1);
          if (!entry) return;
          if (entry.intersectionRatio >= 1) following.current = true;
          else if (!entry.isIntersecting) following.current = false;
        },
        { threshold: [0, 1] },
      );
      observer.observe(row);
    }
    return () => {
      observer?.disconnect();
      for (const type of interactions) {
        scroller.removeEventListener(type, pause);
      }
      element.removeEventListener("animationend", unfolded);
    };
  }, [activeId]);
  useEffect(center, [activeId, activeLast]);
  let lastProduct: string | undefined;
  return (
    <ol
      ref={list}
      role="list"
      aria-label="Installation steps"
      className={cn("flex flex-col", !closed && "pb-6")}
    >
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
        const activity = stepActivity(state, step.id);
        return (
          <TimelineEntry
            key={step.id}
            status={status}
            current={step.id === activeId}
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
          >
            {activity.length > 0 || step.id === activeId ? (
              <StepActivity
                entries={activity}
                live={step.id === activeId}
                agentName={name}
                stepTitle={step.title}
              />
            ) : null}
          </TimelineEntry>
        );
      })}
      {drafting || leaving ? (
        <TimelineEntry
          status="drafting"
          leaving={leaving}
          title={
            state.steps.length === 0
              ? "Planning the steps…"
              : "Writing the next step…"
          }
        />
      ) : null}
    </ol>
  );
}

type PageView = {
  title: ReactNode;
  subtitle?: string | undefined;
  header?: ReactNode;
  body: ReactNode;
};

export function SetupWizard({
  checkout,
  initialPage,
  onExit,
}: {
  checkout: CheckoutContextValue;
  /** The page key to open on instead of the live page, when it is on the trail. */
  initialPage?: string | undefined;
  /** Called before the session ends and the page is left. */
  onExit?: () => void;
}) {
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
  const [viewing, setViewing] = useState(initialPage);
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
  const step = page.id;
  useEffect(() => {
    analytics.setup.stepViewed(step);
  }, [shownKey, step]);
  const previousPhase = useRef(phase);
  useEffect(() => {
    const previous = previousPhase.current;
    previousPhase.current = phase;
    if (
      phase === "connected" &&
      (previous === "unconnected" || previous === "waiting")
    )
      analytics.setup.agentConnected();
  }, [phase]);
  const reviewing = index !== liveIndex;
  const fromCart = checkout.session.fromCart === true;
  const products = state?.products.length
    ? state.products.map((product) => product.name)
    : checkout.session.products.map(
        (slug) => getCatalogItem(slug)?.name ?? slug,
      );
  const productList = listProducts(products);
  const [wrappedList, setWrappedList] = useState<string>();
  const titleNamesProducts =
    page.id === "welcome" &&
    products.length <= TITLE_PRODUCTS &&
    wrappedList !== productList;
  const titleText = useRef<HTMLSpanElement>(null);
  // An inline element has one client rect per line box, and the frame never widens on its own, so a title that wrapped once stays short.
  useLayoutEffect(() => {
    if (!titleNamesProducts) return;
    const demoteIfWrapped = () => {
      if ((titleText.current?.getClientRects().length ?? 0) > 1)
        setWrappedList(productList);
    };
    demoteIfWrapped();
    const block = heading.current;
    if (typeof ResizeObserver !== "function" || block === null) return;
    const observer = new ResizeObserver(demoteIfWrapped);
    observer.observe(block);
    return () => observer.disconnect();
  }, [titleNamesProducts, productList]);
  const done = state?.status === "done";
  useEffect(() => {
    if (done) analytics.setup.installFinished();
  }, [done]);
  const exit = (finished: boolean) => {
    onExit?.();
    if (finished) finishCheckout();
    else abandonCheckout();
    if (fromCart) router.push(finished ? "/components" : "/components/cart");
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
          title: titleNamesProducts
            ? `Welcome to the setup wizard for ${productList}`
            : "Welcome to the setup wizard",
          subtitle: titleNamesProducts
            ? undefined
            : `Setting up ${productList}.`,
          body: <SetupIntro onContinue={acknowledgeSetupIntro} />,
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
          title: inputPrompt(page.input),
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
                steps={state.steps}
                checkout={checkout}
                closed={!checkout.planPending}
              />
            ) : null,
        };
      case "working": {
        const revising = checkout.plan?.status === "changes-requested";
        return {
          title: revising ? (
            "Revising the plan"
          ) : (
            <ExploringTitle active={agentWorking(checkout)} />
          ),
          body: state ? (
            <div className="flex flex-col gap-4">
              <WorkingProgress
                checkout={checkout}
                label={revising ? "Revising the plan" : "Exploring"}
              />
              {proposal}
            </div>
          ) : null,
        };
      }
      case "install": {
        const { done: finished, total } = checkout.progress;
        return {
          title: reviewing || done ? "Installation" : "Installing",
          subtitle:
            state !== undefined && stepsFinalized(state)
              ? `${finished} of ${total} ${total === 1 ? "step" : "steps"} done`
              : undefined,
          header:
            !reviewing && !done && state ? (
              <InstallProgress checkout={checkout} state={state} />
            ) : undefined,
          body: state ? (
            <div className="flex flex-col gap-4">
              {proposal}
              <InstallSteps checkout={checkout} state={state} />
            </div>
          ) : null,
        };
      }
      case "finish":
        return {
          title: `${name} finished`,
          body: (
            <FinishProposal
              checkout={checkout}
              agentName={name}
              onClosed={() => exit(true)}
              summary
            />
          ),
        };
      case "closed":
        return {
          title: done ? "Setup complete" : "Setup cancelled",
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
  const entries = conversation(state);
  const latest = entries.at(-1)?.at ?? 0;
  const [chatOpen, setChatOpen] = useState(false);
  const [readAt, setReadAt] = useState(latest);
  if (chatOpen && readAt < latest) setReadAt(latest);
  const unread = unreadAgentEntries(state, entries, readAt).length;
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
      className="border-foreground/10 bg-background flex h-full max-h-full w-full max-w-[52rem] flex-col overflow-hidden border shadow-xl sm:aspect-[16/10] sm:h-auto sm:min-h-[min(38rem,100%)]"
    >
      <header className="flex shrink-0 items-center justify-between bg-black px-3 py-2 sm:hidden">
        <SetupBackButton className="text-white hover:bg-white/15 hover:text-white" />
        <Image
          src="/favicon/icon.svg"
          alt=""
          width={24}
          height={24}
          className="invert"
        />
      </header>
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
          <DisconnectedDialog
            checkout={checkout}
            name={name}
            open={
              phase === "quiet" && page.id !== "connect" && !checkout.degraded
            }
            onLeave={leaveSetup}
            onEnd={() => exit(false)}
          />
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-5 pt-8 sm:px-6 sm:pt-10">
              <h1
                ref={heading}
                id="setup-wizard-title"
                tabIndex={-1}
                className="text-lg font-semibold text-balance"
              >
                <span ref={titleText}>{view.title}</span>
              </h1>
              {view.subtitle ? (
                <p className="text-muted-foreground motion-safe:animate-in motion-safe:fade-in mt-1 text-sm motion-safe:duration-300">
                  {view.subtitle}
                </p>
              ) : null}
              {view.header ? <div className="mt-4">{view.header}</div> : null}
            </div>
            <div className="[container-type:size] flex min-h-0 flex-1 flex-col overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem,black_calc(100%_-_4rem),transparent)] px-5 pt-6 pb-8 motion-safe:scroll-smooth sm:px-6 sm:pb-10">
              <WizardProvider
                value={{ formId, setNext: ownsActions ? setNext : ignoreNext }}
              >
                {view.body}
              </WizardProvider>
            </div>
          </div>
        </div>
      </div>
      <footer
        ref={footer}
        className="border-foreground/10 flex shrink-0 items-center justify-between gap-4 border-t px-5 py-4 sm:px-6"
      >
        <AgentIndicator
          checkout={checkout}
          unread={unread}
          onClick={() => setChatOpen(true)}
        />
        <AgentChat
          checkout={checkout}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
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
            <CancelButton checkout={checkout} onEnd={() => exit(false)} />
          )}
        </div>
      </footer>
    </section>
  );
}
