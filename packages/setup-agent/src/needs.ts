import type { CheckoutClient } from "./client";
import {
  classifyChoiceAnswer,
  currentPlan,
  finishProposed,
  followedUpSinceProposal,
  isClosed,
  isValidEntryPointAnswer,
  isValidModelAnswer,
  openInputs,
  parseMultipleAnswer,
} from "./protocol";
import type { Checkout } from "./protocol";

/**
 * Something the setup waits on the user for: an open question, a proposed
 * plan, or the agent's proposal to close. `id` is what `answer` takes: the
 * input id, `plan` or `finish`.
 */
export type SetupNeed =
  | { id: string; kind: "input"; input: Checkout.Input }
  | { id: "plan"; kind: "plan"; plan: Checkout.Plan }
  | { id: "finish"; kind: "finish"; completion: Checkout.Completion };

/** What the setup waits on the user for right now, oldest first. */
export const pendingNeeds = (
  state: Checkout.State | undefined,
): SetupNeed[] => {
  if (state === undefined || state.createdAt === null || isClosed(state))
    return [];
  const needs: SetupNeed[] = openInputs(state).map((input) => ({
    id: input.id,
    kind: "input",
    input,
  }));
  const plan = currentPlan(state);
  if (plan?.status === "proposed")
    needs.push({ id: "plan", kind: "plan", plan });
  if (
    finishProposed(state) &&
    !followedUpSinceProposal(state) &&
    state.completion !== undefined
  )
    needs.push({ id: "finish", kind: "finish", completion: state.completion });
  return needs;
};

/** Tells one need from a later one with the same id, such as a new plan revision. */
export const needKey = (need: SetupNeed) =>
  need.kind === "input"
    ? `input:${need.input.id}:${need.input.createdAt}`
    : need.kind === "plan"
      ? `plan:${need.plan.revision}`
      : `finish:${need.completion.proposedAt}`;

export type NeedOption = { id: string; label: string; description?: string };

/** A need as a question the agent can put to the user in its own conversation. */
export type TerminalQuestion = {
  question: string;
  options?: NeedOption[];
  /** True when the user may pick several options. */
  multiple?: true;
  /** The shape of the answer, as the `answer` command takes it. */
  answerFormat: string;
};

const optionList = (input: Checkout.Input): NeedOption[] =>
  (input.options ?? []).flatMap((option) => {
    const description =
      option.entryPoint !== undefined
        ? `${option.description ?? ""} (${option.entryPoint.formFactor}; ${option.entryPoint.placement}; ${option.entryPoint.trigger})`.trim()
        : option.description;
    const entry = (id: string, label: string) => ({
      id,
      label,
      ...(description !== undefined && description !== "" && { description }),
    });
    return option.variants?.length
      ? option.variants.map((variant) =>
          entry(
            `${option.id}:${variant.id}`,
            `${option.label} (${variant.label})`,
          ),
        )
      : [entry(option.id, option.label)];
  });

/** The question behind a need and how to answer it, for an agent that asks in its own UI. */
export const terminalQuestion = (need: SetupNeed): TerminalQuestion => {
  if (need.kind === "plan")
    return {
      question:
        "Approve the setup plan? Show the user the plan you proposed and ask whether to go ahead or what to change.",
      options: [
        { id: "approve", label: "Approve the plan" },
        { id: "revise", label: "Ask for changes (pass --feedback)" },
      ],
      answerFormat: 'approve, or revise --feedback "<what to change>"',
    };
  if (need.kind === "finish")
    return {
      question: `Everything is installed${need.completion.preview ? ` and running at ${need.completion.preview}` : ""}. Close the setup, or keep going?`,
      options: [{ id: "close", label: "Close the setup" }],
      answerFormat:
        "close; if the user wants more, do it and run done again instead",
    };
  const { input } = need;
  const prompt = input.prompt.trim() || "Your agent needs an answer.";
  const optional = input.optional ? " (optional; --dismiss skips it)" : "";
  switch (input.kind) {
    case "text":
      return {
        question: `${prompt}${optional}`,
        answerFormat: "the user's text, as one shell word",
      };
    case "product":
      return {
        question: `${prompt}${optional}`,
        options: [
          { id: "add", label: `Add ${input.product ?? "the product"}` },
          { id: "decline", label: "Leave it out" },
        ],
        answerFormat: "add or decline",
      };
    case "model":
      return {
        question: `${prompt}${optional} The API key is not typed here: the user adds it to the project's env file themselves.`,
        options: optionList(input),
        answerFormat: "<provider>:<model>, such as openai:gpt-5",
      };
    case "entry-point":
      return {
        question: `${prompt}${optional}`,
        options: optionList(input),
        answerFormat: "one option id",
      };
    case "choice":
      return {
        question: `${prompt}${optional}`,
        options: optionList(input),
        ...(input.multiple && { multiple: true as const }),
        answerFormat: input.multiple
          ? "option ids separated by commas, or the user's own text"
          : "one option id, or the user's own text",
      };
  }
};

/** The question as one line of text: the prompt, then its options. */
export const formatTerminalQuestion = (question: TerminalQuestion) => {
  const options = question.options
    ?.map(
      (option) =>
        `${option.id} (${option.label}${option.description ? `: ${option.description}` : ""})`,
    )
    .join(", ");
  return `${question.question}${options ? ` Options${question.multiple ? ", any number" : ""}: ${options}.` : ""}`;
};

export type AnswerOptions = {
  note?: string;
  feedback?: string;
  dismiss?: boolean;
};

export type AnswerResult =
  | { ok: true; id: string; status: "answered" | "dismissed" }
  | { ok: true; id: "plan"; decision: "approve" | "revise" }
  | { ok: true; id: "finish"; status: "done" };

const answerError = (message: string) => new Error(message);

/** `value` as the wire answer `input` takes, or an error naming the shape it needs. */
export const wireAnswer = (input: Checkout.Input, value: string) => {
  const trimmed = value.trim();
  if (input.kind === "model") {
    const json = trimmed.startsWith("{")
      ? trimmed
      : (() => {
          const at = trimmed.indexOf(":");
          if (at <= 0 || at === trimmed.length - 1)
            throw answerError(
              'a model answer is "<provider>:<model>", such as openai:gpt-5',
            );
          return JSON.stringify({
            provider: trimmed.slice(0, at),
            model: trimmed.slice(at + 1),
          });
        })();
    if (!isValidModelAnswer(input, json))
      throw answerError(
        `a model answer names one of the providers: ${(input.options ?? []).map((option) => option.id).join(", ")}`,
      );
    return json;
  }
  if (input.kind === "entry-point") {
    if (!isValidEntryPointAnswer(input, trimmed))
      throw answerError(
        `an entry-point answer is one of: ${(input.options ?? []).map((option) => option.id).join(", ")}`,
      );
    return trimmed;
  }
  if (input.kind === "choice") {
    const answer = input.multiple
      ? parseMultipleAnswer(trimmed) !== undefined
        ? trimmed
        : JSON.stringify(
            trimmed
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
          )
      : trimmed;
    if (classifyChoiceAnswer(input, answer) === "invalid")
      throw answerError(
        `"${value}" names an option without a valid variant; pick from: ${optionList(
          input,
        )
          .map((option) => option.id)
          .join(", ")}`,
      );
    return answer;
  }
  if (trimmed === "") throw answerError("an answer cannot be empty");
  return value;
};

/**
 * Answers a need from the agent's side, with what the user said in the
 * agent's own conversation: an input, the plan (`approve` or `revise` with
 * feedback) or the proposal to close (`close`).
 */
export const answerNeed = async (
  client: Pick<CheckoutClient, "state" | "commands">,
  id: string,
  value: string | undefined,
  options: AnswerOptions = {},
): Promise<AnswerResult> => {
  const state = client.state;
  if (state === undefined) throw answerError("the setup has no state");
  const commands = client.commands;
  if (id === "plan") {
    const plan = currentPlan(state);
    if (plan === undefined) throw answerError("no plan has been proposed");
    if (value === "approve") {
      await commands["checkout/plan"]({
        ...(state.id !== null && { id: state.id }),
        revision: plan.revision,
        decision: "approve",
      });
      return { ok: true, id: "plan", decision: "approve" };
    }
    if (value === "revise") {
      const feedback = options.feedback?.trim();
      if (!feedback)
        throw answerError('revise needs --feedback "<what to change>"');
      await commands["checkout/plan"]({
        ...(state.id !== null && { id: state.id }),
        revision: plan.revision,
        decision: "revise",
        feedback,
      });
      return { ok: true, id: "plan", decision: "revise" };
    }
    throw answerError(
      'answer the plan with approve, or revise --feedback "..."',
    );
  }
  if (id === "finish") {
    if (value !== "close")
      throw answerError(
        "answer finish with close; if the user wants more, do it and run done again",
      );
    await commands["checkout/finish"]();
    return { ok: true, id: "finish", status: "done" };
  }
  const input = state.inputs.find((candidate) => candidate.id === id);
  if (input === undefined) throw answerError(`no input "${id}"`);
  if (input.status !== "open")
    throw answerError(`input "${id}" is already ${input.status}`);
  if (options.dismiss || (input.kind === "product" && value === "decline")) {
    await commands["checkout/dismiss"]({ inputId: id });
    return { ok: true, id, status: "dismissed" };
  }
  if (value === undefined) throw answerError(`usage: answer ${id} <answer>`);
  if (input.kind === "product") {
    if (value !== "add")
      throw answerError("answer a product with add or decline");
    const slug = input.product ?? "";
    await commands["checkout/add-product"]({
      inputId: id,
      product: { slug, name: slug },
    });
    return { ok: true, id, status: "answered" };
  }
  const note = options.note?.trim();
  await commands["checkout/answer"]({
    inputId: id,
    answer: wireAnswer(input, value),
    ...(note ? { note } : {}),
  });
  return { ok: true, id, status: "answered" };
};
