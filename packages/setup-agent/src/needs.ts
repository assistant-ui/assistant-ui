import type { CheckoutClient } from "./client";
import {
  classifyChoiceAnswer,
  currentPlan,
  finishProposed,
  isClosed,
  isValidEntryPointAnswer,
  isValidModelAnswer,
  parseModelAnswer,
  openInputs,
  parseMultipleAnswer,
} from "./protocol";
import type { Checkout } from "./protocol";
import { bundledGuide, renderText } from "./guide";
import type { Guide, GuideTextKey } from "./guide";

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
export const pendingNeeds = (state: Checkout.State): SetupNeed[] => {
  if (state.createdAt === null || isClosed(state)) return [];
  const needs: SetupNeed[] = openInputs(state).map((input) => ({
    id: input.id,
    kind: "input",
    input,
  }));
  const plan = currentPlan(state);
  if (plan?.status === "proposed")
    needs.push({ id: "plan", kind: "plan", plan });
  // Any message after the proposal, acknowledged or not, means more work first.
  if (
    finishProposed(state) &&
    !state.log.some(
      (entry) =>
        entry.role === "user" && entry.at > state.completion!.proposedAt,
    )
  )
    needs.push({ id: "finish", kind: "finish", completion: state.completion! });
  return needs;
};

/** Tells one need from a later one with the same id, such as a new plan revision. */
export const needKey = (need: SetupNeed) =>
  need.kind === "input"
    ? `input:${need.input.id}:${need.input.createdAt}`
    : need.kind === "plan"
      ? `plan:${need.plan.revision}:${need.plan.submittedAt}`
      : `finish:${need.completion.proposedAt}`;

type NeedOption = { id: string; label: string; description?: string };

/** A need as a question the agent can put to the user in its own conversation. */
export type TerminalQuestion = {
  question: string;
  options?: NeedOption[];
  multiple?: true;
  /** The shape of the answer, as the `answer` command takes it. */
  answerFormat: string;
};

/** Options as the ids an answer names: `<option>:<variant>` for an option with variants. */
const optionList = (input: Checkout.Input): NeedOption[] =>
  (input.options ?? []).flatMap((option) => {
    const where = option.entryPoint
      ? ` (${option.entryPoint.formFactor}; ${option.entryPoint.placement}; ${option.entryPoint.trigger})`
      : "";
    const description = `${option.description ?? ""}${where}`.trim();
    const entry = (id: string, label: string) => ({
      id,
      label,
      ...(description && { description }),
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

const ANSWER_FORMATS = {
  text: "need.format.text",
  product: "need.format.product",
  model: "need.format.model",
  "entry-point": "need.format.entry-point",
  choice: "need.format.choice",
} as const satisfies Record<Checkout.InputKind, GuideTextKey>;

/** A need as a question for the agent's own conversation, worded by `guide`. */
export const terminalQuestion = (
  need: SetupNeed,
  guide: Pick<Guide, "texts"> = bundledGuide(),
): TerminalQuestion => {
  const text = (key: GuideTextKey, values?: Record<string, string>) =>
    renderText(guide, key, values);
  if (need.kind === "plan")
    return {
      question: text("need.plan.question"),
      options: [
        { id: "approve", label: text("need.plan.approve") },
        { id: "revise", label: text("need.plan.revise") },
      ],
      answerFormat: text("need.plan.format"),
    };
  if (need.kind === "finish")
    return {
      question: need.completion.preview
        ? text("need.finish.question-preview", {
            preview: need.completion.preview,
          })
        : text("need.finish.question"),
      options: [{ id: "close", label: text("need.finish.close") }],
      answerFormat: text("need.finish.format"),
    };
  const { input } = need;
  const options =
    input.kind === "product"
      ? [
          {
            id: "add",
            label: text("need.product.add", {
              product: input.product ?? "the product",
            }),
          },
          { id: "decline", label: text("need.product.decline") },
        ]
      : input.kind === "text"
        ? undefined
        : optionList(input);
  return {
    question: `${input.prompt.trim() || text("need.input.empty-prompt")}${input.optional ? text("need.input.optional") : ""}${input.kind === "model" ? text("need.input.model") : ""}`,
    ...(options && { options }),
    ...(input.multiple && { multiple: true as const }),
    answerFormat: text(
      input.multiple ? "need.format.multiple" : ANSWER_FORMATS[input.kind],
    ),
  };
};

/** The question as one line: the prompt, then its options. */
export const formatTerminalQuestion = ({
  question,
  options,
  multiple,
}: TerminalQuestion) =>
  options
    ? `${question} Options${multiple ? ", any number" : ""}: ${options
        .map(
          (option) =>
            `${option.id} (${option.label}${option.description ? `: ${option.description}` : ""})`,
        )
        .join(", ")}.`
    : question;

const ids = (input: Checkout.Input) =>
  optionList(input)
    .map((option) => option.id)
    .join(", ");

/** `value` as the wire answer `input` takes, or an error naming the shape it needs. */
const wireAnswer = (input: Checkout.Input, value: string) => {
  const trimmed = value.trim();
  if (input.kind === "model") {
    const at = trimmed.indexOf(":");
    const json = trimmed.startsWith("{")
      ? trimmed
      : JSON.stringify({
          provider: trimmed.slice(0, at),
          model: trimmed.slice(at + 1),
        });
    if (at <= 0 && !trimmed.startsWith("{"))
      throw new Error(
        `a model answer is "<provider>:<model>", such as openai:gpt-5`,
      );
    if (!isValidModelAnswer(input, json))
      throw new Error(
        `a model answer names one of the providers: ${ids(input)}`,
      );
    // Only the documented fields; anything else (a key, say) never reaches the setup.
    return JSON.stringify(parseModelAnswer(json));
  }
  if (input.kind === "entry-point") {
    if (!isValidEntryPointAnswer(input, trimmed))
      throw new Error(`an entry-point answer is one of: ${ids(input)}`);
    return trimmed;
  }
  if (input.kind === "choice") {
    const answer =
      input.multiple && parseMultipleAnswer(trimmed) === undefined
        ? JSON.stringify(
            trimmed
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
          )
        : trimmed;
    if (classifyChoiceAnswer(input, answer) === "invalid")
      throw new Error(
        `"${value}" names an option without a valid variant; pick from: ${ids(input)}`,
      );
    return answer;
  }
  if (trimmed === "") throw new Error("an answer cannot be empty");
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
  options: { note?: string; feedback?: string; dismiss?: boolean } = {},
) => {
  const state = client.state;
  if (state === undefined) throw new Error("the setup has no state");
  const { commands } = client;
  if (id === "plan") {
    const plan = currentPlan(state);
    if (plan === undefined) throw new Error("no plan has been proposed");
    const feedback = options.feedback?.trim();
    if (value !== "approve" && (value !== "revise" || !feedback))
      throw new Error(
        'answer the plan with approve, or revise --feedback "<what to change>"',
      );
    await commands["checkout/plan"]({
      ...(state.id !== null && { id: state.id }),
      revision: plan.revision,
      ...(value === "approve"
        ? { decision: "approve" as const }
        : { decision: "revise" as const, feedback: feedback! }),
    });
    return { ok: true, id, decision: value };
  }
  if (id === "finish") {
    if (!pendingNeeds(state).some((need) => need.id === "finish"))
      throw new Error(
        "no proposal to close is waiting; finish the user's follow-up and run done again",
      );
    if (value !== "close")
      throw new Error(
        "answer finish with close; if the user wants more, do it and run done again",
      );
    await commands["checkout/finish"]();
    return { ok: true, id, status: "done" };
  }
  const input = state.inputs.find((candidate) => candidate.id === id);
  if (input === undefined) throw new Error(`no input "${id}"`);
  if (input.status !== "open")
    throw new Error(`input "${id}" is already ${input.status}`);
  if (options.dismiss && !input.optional)
    throw new Error(`input "${id}" is required; answer it instead`);
  if (options.dismiss || (input.kind === "product" && value === "decline")) {
    await commands["checkout/dismiss"]({ inputId: id });
    return { ok: true, id, status: "dismissed" };
  }
  if (value === undefined) throw new Error(`usage: answer ${id} <answer>`);
  if (input.kind === "product") {
    if (value !== "add")
      throw new Error("answer a product with add or decline");
    const slug = input.product ?? "";
    await commands["checkout/add-product"]({
      inputId: id,
      product: { slug, name: slug },
    });
  } else {
    const note = options.note?.trim();
    await commands["checkout/answer"]({
      inputId: id,
      answer: wireAnswer(input, value),
      ...(note && { note }),
    });
  }
  return { ok: true, id, status: "answered" };
};
