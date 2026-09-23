"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  CornerDownRightIcon,
  MessageSquareIcon,
  HandIcon,
} from "lucide-react";
import {
  finishProposed,
  followedUpSinceProposal,
  initialCheckoutState,
} from "@/lib/checkout/protocol";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import { useAgentIdentity } from "./agent-status";
import { ShimmerLabel } from "@/components/assistant-ui/elements/surfaces";
import { TypingIndicator } from "@/components/assistant-ui/elements/typing-indicator";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { cn } from "@/lib/utils";
import { PlanCard } from "./plan-card";
import { Button } from "@/components/ui/button";
import { InputCard } from "./input-card";
import { SetupComposer } from "./setup-composer";
import { setupMessages, type SetupMessage } from "./setup-messages";

const isAgentUpdate = (message: SetupMessage | undefined) =>
  message?.role === "agent" &&
  !message.question &&
  !message.plan &&
  !message.replyTo &&
  !message.products;

export function SetupConversation({
  checkout,
  agentName,
  completion,
}: {
  checkout: CheckoutContextValue;
  agentName: string;
  completion?: ReactNode;
}) {
  const agent = useAgentIdentity(checkout);
  const viewport = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  const slack = useRef<HTMLDivElement>(null);
  const pendingPlan = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const questions = useRef(new Map<string, HTMLLIElement>());
  const [offscreenQuestion, setOffscreenQuestion] = useState<string>();
  const [jumpToQuestion, setJumpToQuestion] = useState<{ inputId: string }>();
  const [selectedQuestion, setSelectedQuestion] = useState<string>();
  const [batch, setBatch] = useState(() =>
    checkout.openInputs.map((input) => input.id),
  );
  const continuing = batch.some((id) =>
    checkout.openInputs.some((input) => input.id === id),
  );
  const nextBatch = continuing
    ? [
        ...batch,
        ...checkout.openInputs
          .filter((input) => !batch.includes(input.id))
          .map((input) => input.id),
      ]
    : checkout.openInputs.map((input) => input.id);
  if (nextBatch.join("\0") !== batch.join("\0")) setBatch(nextBatch);
  const currentQuestion =
    checkout.openInputs.find((input) => input.id === selectedQuestion) ??
    checkout.openInputs[0];
  const currentIndex = checkout.openInputs.findIndex(
    (input) => input.id === currentQuestion?.id,
  );
  const answering = useRef(false);
  const [highlightedAnswer, setHighlightedAnswer] = useState<string>();
  const answers = useRef(new Map<string, HTMLLIElement>());
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { state } = checkout;
  const closed = state?.status === "done" || state?.status === "cancelled";
  const messages = setupMessages(
    state ?? initialCheckoutState(),
    checkout.session,
  );
  const lastId = messages.at(-1)?.id;
  const activeStep = state?.steps.find((step) => step.status === "active");
  const workingLabel =
    !checkout.agentPresent ||
    checkout.degraded ||
    closed ||
    (state !== undefined &&
      finishProposed(state) &&
      !followedUpSinceProposal(state)) ||
    checkout.planPending ||
    checkout.openInputs.some((input) => !input.optional)
      ? undefined
      : state?.status === "planning"
        ? checkout.plan?.status === "changes-requested"
          ? "Revising plan…"
          : "Exploring…"
        : state?.status === "installing"
          ? activeStep
            ? `${activeStep.title}…`
            : state.steps.some((step) => step.status === "blocked")
              ? undefined
              : state.steps.length === 0
                ? "Planning…"
                : "Installing…"
          : undefined;
  useEffect(() => {
    if (viewport.current && atBottom.current && lastId !== undefined)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [lastId, workingLabel]);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const currentQuestionId = closed ? undefined : currentQuestion?.id;
  useEffect(() => {
    const element = viewport.current;
    if (!element || lastId === undefined) return;
    const question = currentQuestionId
      ? questions.current.get(currentQuestionId)
      : undefined;
    const layout = () => {
      const footerHeight = footer.current?.offsetHeight ?? 0;
      element.style.scrollPaddingBottom = `${footerHeight}px`;
      if (slack.current) {
        const spacer = slack.current.getBoundingClientRect();
        const room = question
          ? (element.clientHeight - footerHeight - question.offsetHeight) / 2 -
            (spacer.top - question.getBoundingClientRect().bottom)
          : 0;
        slack.current.style.height = `${Math.max(0, room)}px`;
      }
      if (atBottom.current) element.scrollTop = element.scrollHeight;
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(element);
    if (footer.current) observer.observe(footer.current);
    if (question) observer.observe(question);
    return () => observer.disconnect();
  }, [lastId, currentQuestionId]);
  useEffect(() => {
    if (!currentQuestionId) return;
    const element = questions.current.get(currentQuestionId);
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setOffscreenQuestion(
          entry?.isIntersecting ? undefined : currentQuestionId,
        ),
      { root: viewport.current },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentQuestionId]);
  useEffect(() => {
    if (!jumpToQuestion) return;
    const question = questions.current.get(jumpToQuestion.inputId);
    question?.scrollIntoView({ block: "start" });
    question
      ?.querySelector<HTMLElement>(
        "[data-question-form] input, [data-question-form] textarea, [data-question-form] button",
      )
      ?.focus({ preventScroll: true });
  }, [jumpToQuestion]);
  useEffect(() => {
    if (!currentQuestionId || !(answering.current || atBottom.current)) return;
    const question = questions.current.get(currentQuestionId);
    question?.scrollIntoView({ block: "center" });
    if (!answering.current) return;
    question
      ?.querySelector<HTMLElement>(
        "[data-question-form] input, [data-question-form] textarea, [data-question-form] button",
      )
      ?.focus({ preventScroll: true });
  }, [currentQuestionId]);
  const unseenQuestions =
    currentQuestion && offscreenQuestion === currentQuestion.id
      ? checkout.openInputs
      : [];

  const showAnswer = (inputId: string) => {
    const answer = answers.current.get(inputId);
    if (!answer) return;
    answer.scrollIntoView({ block: "nearest" });
    answer.focus({ preventScroll: true });
    clearTimeout(highlightTimer.current);
    setHighlightedAnswer(inputId);
    highlightTimer.current = setTimeout(
      () => setHighlightedAnswer(undefined),
      1600,
    );
  };

  const renderMessage = (message: SetupMessage, continuation: boolean) => (
    <li
      key={message.id}
      hidden={
        message.question?.status === "open" &&
        !closed &&
        message.question.id !== currentQuestion?.id
      }
      ref={(element) => {
        if (message.question) {
          if (element) questions.current.set(message.question.id, element);
          else questions.current.delete(message.question.id);
        }
        if (message.replyTo) {
          if (element) answers.current.set(message.replyTo.inputId, element);
          else answers.current.delete(message.replyTo.inputId);
        }
      }}
      tabIndex={message.replyTo ? -1 : undefined}
      data-question-id={message.question?.id}
      data-answer-id={message.replyTo?.inputId}
      data-agent-continuation={continuation || undefined}
      data-highlighted={
        (message.replyTo !== undefined &&
          message.replyTo.inputId === highlightedAnswer) ||
        undefined
      }
      className={cn(
        "rounded-thread flex min-w-0 flex-col gap-3 outline-none [&[hidden]]:hidden",
        continuation && "-mt-4 sm:-mt-5",
        message.role === "user" && "items-end",
      )}
    >
      {message.role === "agent" ? (
        continuation ? (
          <span className="sr-only">{agentName}: </span>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <AgentKindIcon kind={agent.kind} className="size-4 shrink-0" />
            {agentName}
          </p>
        )
      ) : null}
      {message.products ? (
        <div className="bg-foreground/[0.04] dark:bg-foreground/[0.06] rounded-thread flex max-w-[90%] flex-col gap-2.5 px-5 py-4 text-sm">
          <p className="text-muted-foreground">Set up these components</p>
          <ul role="list" className="flex flex-col gap-2">
            {message.products.map((product) => {
              return (
                <li key={product.slug} className="flex items-center gap-2">
                  <span className="font-mono">{product.name}</span>
                </li>
              );
            })}
          </ul>
          {message.text ? (
            <p className="border-foreground/10 border-t pt-3 [overflow-wrap:anywhere] whitespace-pre-wrap">
              {message.text}
            </p>
          ) : null}
        </div>
      ) : message.question ? (
        message.question.status === "open" && !closed ? (
          <div className="border-foreground/10 bg-foreground/[0.015] relative w-full min-w-0 rounded-xl border p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm tabular-nums">
                {nextBatch.length > 1
                  ? `Question ${nextBatch.indexOf(message.question.id) + 1} of ${nextBatch.length}`
                  : null}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                  <HandIcon aria-hidden="true" className="size-3.5" />
                  {message.question.optional
                    ? "Input requested"
                    : "Input required"}
                </p>
                {nextBatch.length > 1 ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Previous question"
                      disabled={currentIndex <= 0}
                      onClick={() =>
                        setSelectedQuestion(
                          checkout.openInputs[currentIndex - 1]?.id,
                        )
                      }
                    >
                      <ChevronLeftIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Next question"
                      disabled={currentIndex >= checkout.openInputs.length - 1}
                      onClick={() =>
                        setSelectedQuestion(
                          checkout.openInputs[currentIndex + 1]?.id,
                        )
                      }
                    >
                      <ChevronRightIcon aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <fieldset
              data-question-form
              disabled={checkout.degraded || state?.createdAt == null}
              className="min-w-0"
              aria-label={message.text}
            >
              <InputCard input={message.question} checkout={checkout} />
            </fieldset>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => showAnswer(message.question!.id)}
            className={cn(
              "text-muted-foreground hover:bg-foreground/[0.025] focus-visible:ring-ring rounded-control flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
            )}
            aria-label={`View answer to: ${message.text}`}
          >
            <MessageSquareIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-foreground font-medium">{message.text}</p>
              <p className="mt-1 text-xs">View reply</p>
            </div>
          </button>
        )
      ) : message.plan ? (
        <div
          ref={
            message.plan.revision === checkout.plan?.revision
              ? pendingPlan
              : undefined
          }
          tabIndex={-1}
          className="focus-visible:ring-ring w-full rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <PlanCard
            plans={[message.plan]}
            checkout={checkout}
            closed={closed || message.plan.revision !== checkout.plan?.revision}
          />
        </div>
      ) : (
        <div
          className={cn(
            "min-w-0 text-base [overflow-wrap:anywhere] sm:text-sm",
            message.role === "user" && "rounded-thread max-w-[90%] px-5 py-4",
            message.replyTo?.inputId === highlightedAnswer &&
              highlightedAnswer !== undefined
              ? "bg-foreground/[0.08] ring-foreground/20 ring-1"
              : message.role === "user" &&
                  "bg-foreground/[0.04] dark:bg-foreground/[0.06]",
          )}
        >
          {message.replyTo ? (
            <div className="text-muted-foreground mb-2.5 flex items-center gap-2 text-xs">
              <CornerDownRightIcon
                aria-hidden="true"
                className="size-4 shrink-0"
              />
              <p className="min-w-0 truncate" title={message.replyTo.prompt}>
                {message.replyTo.prompt}
              </p>
            </div>
          ) : null}
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      )}
    </li>
  );

  return (
    <section
      aria-label="Setup chat"
      onFocusCapture={(event) => {
        answering.current = event.target.closest("[data-question-id]") !== null;
        if (answering.current) atBottom.current = false;
      }}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <div
        ref={viewport}
        className="flex min-h-0 flex-1 [scrollbar-gutter:stable_both-edges] flex-col overflow-y-auto overscroll-contain"
        onScroll={(event) => {
          const el = event.currentTarget;
          atBottom.current =
            !answering.current &&
            el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6"
        >
          <ol
            role="list"
            className="flex flex-col gap-7 py-6 sm:gap-8 sm:py-10"
          >
            {messages.map((message, index) =>
              renderMessage(
                message,
                isAgentUpdate(message) &&
                  isAgentUpdate(messages[index - 1]) &&
                  message.stage === messages[index - 1]?.stage,
              ),
            )}
            {workingLabel ? (
              <li>
                <div className="flex items-start gap-3 py-2">
                  <TypingIndicator
                    variant="bare"
                    aria-hidden
                    className="[&>span]:bg-foreground [&>span]:motion-safe:animate-setup-working-dot h-5 w-4 shrink-0 items-center gap-0.5 [&>span]:size-1"
                  />
                  <div>
                    <p
                      role="status"
                      aria-label={`${agentName}: ${workingLabel}`}
                      className="text-sm font-medium"
                    >
                      <ShimmerLabel className="text-muted-foreground shimmer-color-foreground shimmer-spread-12 shimmer-angle-0 shimmer-duration-1500 shimmer-repeat-delay-0 inline-block">
                        {workingLabel}
                      </ShimmerLabel>
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {state?.status === "planning"
                        ? "A plan will appear here for your review."
                        : "Follow each step in your setup progress."}
                    </p>
                  </div>
                </div>
              </li>
            ) : null}
          </ol>
          <div ref={slack} aria-hidden="true" />
        </div>
        <div
          ref={footer}
          className="sticky bottom-0 mx-auto w-full max-w-3xl shrink-0"
        >
          {!closed && unseenQuestions.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setJumpToQuestion({ inputId: currentQuestion!.id })
              }
              className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring absolute bottom-full left-1/2 mb-2 flex min-h-9 -translate-x-1/2 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ArrowDownIcon aria-hidden="true" className="size-4 shrink-0" />
              {unseenQuestions.length}{" "}
              {unseenQuestions.length === 1
                ? "question needs"
                : "questions need"}{" "}
              your input
            </button>
          ) : null}
          {checkout.planPending ? (
            <div className="bg-[linear-gradient(to_bottom,transparent_50%,var(--color-background)_50%)] px-4 pb-2 sm:px-6">
              <Button
                variant="outline"
                onClick={() => {
                  pendingPlan.current?.scrollIntoView({ block: "start" });
                  pendingPlan.current?.focus({ preventScroll: true });
                }}
              >
                Review plan
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </div>
          ) : null}
          {completion ? (
            <div
              className={cn(
                "px-4 pb-3 sm:px-6",
                checkout.planPending
                  ? "bg-background"
                  : "bg-[linear-gradient(to_bottom,transparent_50%,var(--color-background)_50%)]",
              )}
            >
              {completion}
            </div>
          ) : null}
          <div
            className={cn(
              "px-4 sm:px-6",
              completion || checkout.planPending
                ? "bg-background"
                : "bg-[linear-gradient(to_bottom,transparent_50%,var(--color-background)_50%)]",
            )}
          >
            <SetupComposer checkout={checkout} />
          </div>
          <div className="bg-background h-[max(1rem,env(safe-area-inset-bottom))] sm:h-6" />
        </div>
      </div>
    </section>
  );
}
