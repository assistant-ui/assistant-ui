"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { cn } from "@/lib/utils";
import { OptionList, type OptionListOption } from "./option-list";
import { ghostButton, mono, paper } from "./surfaces";

export interface QuestionFlowStep {
  id: string;
  question: string;
  description?: string | undefined;
  options: readonly OptionListOption[];
  selectionMode?: "single" | "multiple" | undefined;
  minSelections?: number | undefined;
  maxSelections?: number | undefined;
}

export interface QuestionFlowProps extends Omit<
  ComponentProps<"div">,
  "children" | "defaultValue" | "onSubmit"
> {
  steps: readonly QuestionFlowStep[];
  defaultValue?: Readonly<Record<string, readonly string[]>> | undefined;
  onComplete?:
    | ((answers: Record<string, string[]>) => void | Promise<void>)
    | undefined;
  completeLabel?: string | undefined;
  choice?: Readonly<Record<string, readonly string[]>> | undefined;
}

export function QuestionFlow({
  steps,
  defaultValue,
  onComplete,
  completeLabel = "Submit",
  choice,
  className,
  ...props
}: QuestionFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const [id, value] of Object.entries(defaultValue ?? {})) {
      initial[id] = [...value];
    }
    return initial;
  });
  const questionPrefix = useId();
  const optionListRef = useRef<HTMLDivElement>(null);
  const currentIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[currentIndex];
  const previousStepId = useRef(currentStep?.id);

  useLayoutEffect(() => {
    if (previousStepId.current === currentStep?.id) return;
    previousStepId.current = currentStep?.id;
    optionListRef.current
      ?.querySelector<HTMLButtonElement>(
        'button:not([disabled]):not([aria-disabled="true"])',
      )
      ?.focus();
  }, [currentStep?.id]);

  const root = cn(
    paper,
    "flex w-full max-w-sm flex-col rounded-2xl p-2",
    className,
  );

  if (choice !== undefined) {
    return (
      <div
        {...props}
        data-slot="question-flow"
        data-state="receipt"
        className={cn(root, "gap-3")}
      >
        {steps.flatMap((step) => {
          const selected = choice[step.id];
          if (!selected?.length) return [];
          const labels = step.options
            .filter((option) => selected.includes(option.id))
            .map((option) => option.label)
            .join(", ");
          return (
            <div key={step.id} className="flex flex-col gap-0.5 px-2 py-1">
              <span className="text-foreground/45 text-xs leading-4">
                {step.question}
              </span>
              <span className="text-foreground/80 text-[13.5px] leading-5 break-words">
                {labels}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (!onComplete) {
    return (
      <div
        {...props}
        data-slot="question-flow"
        data-state="open"
        className={cn(root, "gap-5")}
      >
        {steps.map((step) => {
          const questionId = `${questionPrefix}-${step.id}`;
          return (
            <div key={step.id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5 px-2 pt-1">
                <p
                  id={questionId}
                  className="text-[13.5px] leading-5 font-medium"
                >
                  {step.question}
                </p>
                {step.description ? (
                  <p className="text-foreground/45 text-xs leading-4">
                    {step.description}
                  </p>
                ) : null}
              </div>
              <OptionList
                aria-labelledby={questionId}
                options={step.options}
                className="max-w-none border-0 bg-transparent p-0 dark:bg-transparent"
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div
        {...props}
        data-slot="question-flow"
        data-state="open"
        className={root}
      />
    );
  }

  const questionId = `${questionPrefix}-${currentStep.id}`;
  const currentAnswer = answers[currentStep.id];
  const finalStep = currentIndex === steps.length - 1;

  const confirm = (ids: string[]) => {
    const nextAnswers = { ...answers, [currentStep.id]: ids };
    if (!finalStep) {
      setAnswers(nextAnswers);
      setStepIndex(currentIndex + 1);
      return;
    }
    return Promise.resolve(onComplete(nextAnswers)).then(() => {
      setAnswers(nextAnswers);
    });
  };

  return (
    <div
      {...props}
      data-slot="question-flow"
      data-state="open"
      className={cn(root, "gap-3")}
    >
      <div className="flex items-center justify-between gap-3 px-2 pt-1">
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {currentIndex + 1} of {steps.length}
        </span>
        {currentIndex > 0 ? (
          <button
            type="button"
            onClick={() => setStepIndex(currentIndex - 1)}
            className={cn(ghostButton, "h-7 px-2.5 text-xs font-medium")}
          >
            Back
          </button>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuetext={`Question ${currentIndex + 1} of ${steps.length}`}
        className="bg-foreground/[0.08] mx-2 h-[3px] overflow-hidden rounded-full"
      >
        <div
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          className="bg-foreground/80 h-full transition-[width] duration-200 motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        <p id={questionId} className="text-[13.5px] leading-5 font-medium">
          {currentStep.question}
        </p>
        {currentStep.description ? (
          <p className="text-foreground/45 text-xs leading-4">
            {currentStep.description}
          </p>
        ) : null}
      </div>
      <div ref={optionListRef}>
        <OptionList
          key={currentStep.id}
          aria-labelledby={questionId}
          options={currentStep.options}
          selectionMode={currentStep.selectionMode}
          defaultValue={currentAnswer}
          minSelections={currentStep.minSelections}
          maxSelections={currentStep.maxSelections}
          onConfirm={confirm}
          confirmLabel={finalStep ? completeLabel : "Next"}
          className="max-w-none border-0 bg-transparent p-0 dark:bg-transparent"
        />
      </div>
    </div>
  );
}
