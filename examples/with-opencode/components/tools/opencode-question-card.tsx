"use client";

import { useMemo, useState } from "react";
import {
  type OpenCodeQuestionRequest,
  type QuestionAnswer,
  useOpenCodeRuntimeExtras,
} from "@assistant-ui/react-opencode";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleHelpIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PendingQuestionState = {
  selectedLabels: string[];
  customAnswer: string;
};

const buildEmptyQuestionState = (
  request: OpenCodeQuestionRequest,
): PendingQuestionState[] =>
  request.questions.map(() => ({
    selectedLabels: [],
    customAnswer: "",
  }));

const encodeQuestionAnswers = (
  request: OpenCodeQuestionRequest,
  formState: PendingQuestionState[],
): QuestionAnswer[] =>
  request.questions.map((question, index) => {
    const current = formState[index];
    if (!current) return [];

    const answers = [...current.selectedLabels];
    const customValue = current.customAnswer.trim();
    const customAllowed = question.custom !== false;

    if (customAllowed && customValue) {
      answers.push(`Other: ${customValue}`);
    }

    return answers;
  });

export const getQuestionSummary = (request?: OpenCodeQuestionRequest) => {
  if (!request || request.questions.length === 0) return "Waiting for input";
  if (request.questions.length === 1) {
    return request.questions[0]?.header || "1 question";
  }
  return `${request.questions.length} questions`;
};

export const OpenCodeQuestionCard = ({
  request,
  state,
  answers,
}: {
  request: OpenCodeQuestionRequest;
  state: "pending" | "answered" | "rejected";
  answers?: readonly QuestionAnswer[];
}) => {
  const { replyToQuestion, rejectQuestion } = useOpenCodeRuntimeExtras();
  const [formState, setFormState] = useState(() =>
    buildEmptyQuestionState(request),
  );
  const [submissionState, setSubmissionState] = useState<
    "reply" | "reject" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const isPending = state === "pending";

  const encodedAnswers = useMemo(
    () => encodeQuestionAnswers(request, formState),
    [formState, request],
  );

  const canSubmit =
    isPending && encodedAnswers.every((answer) => answer.length > 0);

  const updateQuestionState = (
    index: number,
    updater: (current: PendingQuestionState) => PendingQuestionState,
  ) => {
    setFormState((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? updater(item) : item,
      ),
    );
  };

  const submitAnswers = async () => {
    if (!canSubmit) return;
    setSubmissionState("reply");
    setError(null);

    try {
      await replyToQuestion(request.id, encodedAnswers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit answers.",
      );
      setSubmissionState(null);
    }
  };

  const rejectRequest = async () => {
    setSubmissionState("reject");
    setError(null);

    try {
      await rejectQuestion(request.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject request.",
      );
      setSubmissionState(null);
    }
  };

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-md p-2",
              isPending
                ? "bg-sky-500/10 text-sky-700"
                : state === "rejected"
                  ? "bg-muted text-muted-foreground"
                  : "bg-emerald-500/10 text-emerald-700",
            )}
          >
            {isPending ? (
              <CircleHelpIcon className="size-4" />
            ) : state === "rejected" ? (
              <XCircleIcon className="size-4" />
            ) : (
              <CheckCircle2Icon className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">
              {isPending
                ? "Answer required"
                : state === "rejected"
                  ? "Question dismissed"
                  : "Answers submitted"}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {getQuestionSummary(request)}
            </CardDescription>
          </div>
          <Badge variant={isPending ? "secondary" : "outline"}>
            {request.questions.length === 1
              ? "1 prompt"
              : `${request.questions.length} prompts`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4">
        {request.questions.map((question, index) => {
          const current = formState[index] ?? {
            selectedLabels: [],
            customAnswer: "",
          };
          const answeredValues = answers?.[index] ?? [];
          const customAllowed = question.custom !== false;

          return (
            <section key={`${request.id}-${index}`} className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium text-sm">{question.header}</p>
                <p className="text-muted-foreground text-xs">
                  {question.question}
                </p>
              </div>

              {isPending ? (
                <>
                  {question.options.length > 0 ? (
                    question.multiple ? (
                      <div className="space-y-2">
                        {question.options.map((option) => {
                          const checked = current.selectedLabels.includes(
                            option.label,
                          );
                          const optionId = `${request.id}-${index}-${option.label}`;

                          return (
                            <div
                              key={option.label}
                              className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                            >
                              <Checkbox
                                id={optionId}
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  updateQuestionState(index, (item) => ({
                                    ...item,
                                    selectedLabels:
                                      nextChecked === true
                                        ? [...item.selectedLabels, option.label]
                                        : item.selectedLabels.filter(
                                            (label) => label !== option.label,
                                          ),
                                  }));
                                }}
                              />
                              <div className="space-y-1">
                                <Label
                                  htmlFor={optionId}
                                  className="font-medium text-sm"
                                >
                                  {option.label}
                                </Label>
                                <p className="text-muted-foreground text-xs">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option) => {
                          const selected = current.selectedLabels.includes(
                            option.label,
                          );

                          return (
                            <Button
                              key={option.label}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              onClick={() => {
                                updateQuestionState(index, (item) => ({
                                  ...item,
                                  selectedLabels: [option.label],
                                  customAnswer: "",
                                }));
                              }}
                            >
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>
                    )
                  ) : null}

                  {customAllowed ? (
                    <div className="space-y-2">
                      <Label htmlFor={`${request.id}-${index}-custom`}>
                        Other
                      </Label>
                      <Textarea
                        id={`${request.id}-${index}-custom`}
                        value={current.customAnswer}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          updateQuestionState(index, (item) => ({
                            ...item,
                            customAnswer: nextValue,
                            selectedLabels:
                              question.multiple || nextValue.trim().length === 0
                                ? item.selectedLabels
                                : [],
                          }));
                        }}
                        placeholder="Add your answer"
                        rows={3}
                      />
                    </div>
                  ) : null}
                </>
              ) : state === "rejected" ? (
                <p className="text-muted-foreground text-xs">
                  No answer was submitted.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {answeredValues.map((answer) => (
                    <Badge key={answer} variant="outline">
                      {answer}
                    </Badge>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </CardContent>

      {isPending ? (
        <CardFooter className="flex flex-wrap gap-2 px-4">
          <Button
            size="sm"
            onClick={submitAnswers}
            disabled={!canSubmit || submissionState !== null}
          >
            {submissionState === "reply" && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            Submit answers
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={rejectRequest}
            disabled={submissionState !== null}
          >
            {submissionState === "reject" && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            Dismiss
          </Button>
          {error ? (
            <div className="flex w-full items-center gap-2 text-destructive text-xs">
              <AlertCircleIcon className="size-3.5" />
              <span>{error}</span>
            </div>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
};
