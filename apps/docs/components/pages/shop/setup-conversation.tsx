"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CornerDownRightIcon,
  MessageSquareIcon,
} from "lucide-react";
import { getCatalogItem } from "@/lib/catalog";
import { initialCheckoutState } from "@/lib/checkout/protocol";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { setupStages, type SetupStageId } from "./setup-stages";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import { ThinkingIndicator } from "@/components/assistant-ui/elements/thinking-indicator";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { cn } from "@/lib/utils";
import { PlanCard } from "./plan-card";
import { Button } from "@/components/ui/button";
import { InputCard } from "./input-card";
import { SetupComposer } from "./setup-composer";
import { setupMessages, type SetupMessage } from "./setup-messages";

export function SetupConversation({
  checkout,
  agentName,
  completion,
}: {
  checkout: CheckoutContextValue;
  agentName: string;
  completion?: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
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
  const [collapsed, setCollapsed] = useState<ReadonlySet<SetupStageId>>(
    new Set(["order"]),
  );
  const stages = setupStages(state, true);
  const currentStage = closed
    ? "complete"
    : stages.find((stage) => stage.active)?.id;
  const sections = stages.filter(
    (stage) =>
      stage.id === currentStage ||
      messages.some((message) => message.stage === stage.id),
  );
  const latestSection = sections.at(-1)?.id;
  const lastId = messages.at(-1)?.id;
  const activeStep = state?.steps.find((step) => step.status === "active");
  const workingLabel =
    !checkout.agentPresent ||
    checkout.degraded ||
    closed ||
    checkout.planPending ||
    checkout.openInputs.some((input) => !input.optional)
      ? undefined
      : state?.status === "planning"
        ? checkout.plan?.status === "changes-requested"
          ? "Revising plan…"
          : "Planning…"
        : state?.status === "installing"
          ? activeStep
            ? `${activeStep.title}…`
            : state.steps.some((step) => step.status === "blocked")
              ? undefined
              : "Installing…"
          : undefined;
  useEffect(() => {
    if (viewport.current && atBottom.current && lastId !== undefined)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [lastId, workingLabel]);
  useEffect(() => {
    const element = viewport.current;
    if (!element || lastId === undefined) return;
    const observer = new ResizeObserver(() => {
      if (atBottom.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [lastId]);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const currentQuestionId = closed ? undefined : currentQuestion?.id;
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
    if (!currentQuestionId || !answering.current) return;
    const question = questions.current.get(currentQuestionId);
    question?.scrollIntoView({ block: "nearest" });
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

  const renderMessage = (message: SetupMessage) => (
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
      data-highlighted={
        (message.replyTo !== undefined &&
          message.replyTo.inputId === highlightedAnswer) ||
        undefined
      }
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl outline-none [&[hidden]]:hidden",
        message.role === "user" && "items-end",
      )}
    >
      {message.role === "agent" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-base sm:text-sm">
          <AgentKindIcon kind={state?.agent.kind} className="size-4 shrink-0" />
          {agentName}
        </p>
      ) : null}
      {message.products ? (
        <div className="bg-muted flex max-w-[90%] flex-col gap-3 rounded-2xl px-4 py-3 text-base sm:text-sm">
          <p className="font-medium">Set up these components</p>
          <ul role="list" className="flex flex-col gap-2">
            {message.products.map((product) => {
              const catalogProduct = getCatalogItem(product.slug);
              return (
                <li key={product.slug} className="flex items-center gap-2">
                  {catalogProduct ? (
                    <NavGlyph kind={catalogProduct.glyph} size="sm" />
                  ) : null}
                  {product.name}
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
          <div className="w-full min-w-0 border-l-2 border-blue-500 py-1 pl-4 dark:border-blue-400">
            {nextBatch.length > 1 ? (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm tabular-nums">
                  Question {nextBatch.indexOf(message.question.id) + 1} of{" "}
                  {nextBatch.length}
                </p>
                <div className="flex gap-1">
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
                </div>
              </div>
            ) : null}
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
              "border-foreground/15 focus-visible:ring-ring flex w-full items-start gap-3 border-l-2 py-2 pl-4 text-left focus-visible:ring-2 focus-visible:outline-none",
              message.question.status === "answered"
                ? "hover:border-emerald-500 dark:hover:border-emerald-400"
                : "hover:border-foreground/40",
            )}
            aria-label={`View answer to: ${message.text}`}
          >
            <MessageSquareIcon aria-hidden="true" className="size-4 shrink-0" />
            <div className="min-w-0 flex-1 text-base sm:text-sm">
              <p className="font-medium">{message.text}</p>
              <p className="text-muted-foreground mt-1">View reply</p>
            </div>
            <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
          </button>
        )
      ) : message.plan ? (
        <div className="w-full">
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
            message.role === "user" && "max-w-[90%] rounded-2xl px-4 py-3",
            message.replyTo?.inputId === highlightedAnswer &&
              highlightedAnswer !== undefined
              ? "bg-emerald-500/10 ring-1 ring-emerald-500/40 motion-safe:animate-pulse"
              : message.role === "user" && "bg-muted",
          )}
        >
          {message.replyTo ? (
            <div className="text-muted-foreground border-foreground/20 mb-3 flex items-center gap-2 border-l-2 pl-3">
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
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="min-h-0 flex-1 [scrollbar-gutter:stable_both-edges] overflow-y-auto overscroll-contain"
        onScroll={(event) => {
          const el = event.currentTarget;
          atBottom.current =
            !answering.current &&
            el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="divide-foreground/10 divide-y py-4 sm:py-6">
            {sections.map((stage) => {
              const latest = stage.id === latestSection;
              const expanded = latest || !collapsed.has(stage.id);
              const entries = messages.filter(
                (message) => message.stage === stage.id,
              );
              return (
                <section
                  key={stage.id}
                  aria-labelledby={`setup-section-${stage.id}-heading`}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <h2
                    id={`setup-section-${stage.id}-heading`}
                    className="text-muted-foreground text-sm font-medium"
                  >
                    {latest ? (
                      <div className="py-2">{stage.label}</div>
                    ) : (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`setup-section-${stage.id}`}
                        onClick={() =>
                          setCollapsed((previous) => {
                            const next = new Set(previous);
                            if (next.has(stage.id)) next.delete(stage.id);
                            else next.add(stage.id);
                            return next;
                          })
                        }
                        className="hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-2 rounded-md py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <ChevronDownIcon
                          aria-hidden="true"
                          className={cn(
                            "size-4 shrink-0",
                            !expanded && "-rotate-90",
                          )}
                        />
                        {stage.label}
                        <span className="ml-auto tabular-nums">
                          {entries.length}{" "}
                          {entries.length === 1 ? "message" : "messages"}
                        </span>
                      </button>
                    )}
                  </h2>
                  <div id={`setup-section-${stage.id}`} hidden={!expanded}>
                    <ol role="list" className="flex flex-col gap-6 py-4">
                      {entries.map(renderMessage)}
                      {stage.id === currentStage && workingLabel ? (
                        <li>
                          <ThinkingIndicator
                            label={workingLabel}
                            role="status"
                            aria-label={`${agentName}: ${workingLabel}`}
                          />
                        </li>
                      ) : null}
                    </ol>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        {completion}
        {!closed && unseenQuestions.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const input = currentQuestion!;
              const stage = messages.find(
                (message) => message.question?.id === input.id,
              )?.stage;
              setCollapsed((previous) => {
                const next = new Set(previous);
                if (stage) next.delete(stage);
                return next;
              });
              setJumpToQuestion({ inputId: input.id });
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-2 flex min-h-9 items-center gap-2 rounded-md px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowUpIcon aria-hidden="true" className="size-4 shrink-0" />
            {unseenQuestions.length}{" "}
            {unseenQuestions.length === 1 ? "question needs" : "questions need"}{" "}
            your input
          </button>
        ) : null}
        <SetupComposer checkout={checkout} />
      </div>
    </section>
  );
}
