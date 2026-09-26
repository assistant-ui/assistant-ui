import { getCatalogItem } from "@/lib/catalog";
import {
  parseChoiceAnswer,
  parseModelAnswer,
  parseMultipleAnswer,
  type Checkout,
  inputPrompt,
} from "@/lib/checkout/protocol";

const describeChoiceEntry = (input: Checkout.Input, entry: string) => {
  const { option, variant } = parseChoiceAnswer(entry);
  const match = input.options?.find((candidate) => candidate.id === option);
  if (!match) return entry;
  const picked = match.variants?.find((candidate) => candidate.id === variant);
  return [match.label, picked?.label]
    .filter((part) => part !== undefined)
    .join(" · ");
};

/** The answer a closed input holds, worded the way the user chose it; `undefined` when they skipped it. */
export const describeAnswer = (input: Checkout.Input): string | undefined => {
  if (input.status !== "answered") return undefined;
  const answer = input.answer ?? "";
  switch (input.kind) {
    case "choice": {
      const entries = (input.multiple && parseMultipleAnswer(answer)) || [
        answer,
      ];
      return entries
        .map((entry) => describeChoiceEntry(input, entry))
        .join(", ");
    }
    case "model": {
      const parsed = parseModelAnswer(answer);
      if (!parsed) return answer;
      const provider =
        input.options?.find((entry) => entry.id === parsed.provider)?.label ??
        parsed.provider;
      return [provider, parsed.model, parsed.reasoningEffort]
        .filter((part) => part !== undefined)
        .join(" · ");
    }
    case "product": {
      const name = getCatalogItem(input.product ?? "")?.name ?? input.product;
      return name ? `Added ${name} to this setup` : "Added to this setup";
    }
    default:
      return answer;
  }
};

export function AnswerReview({
  input,
  agentName,
}: {
  input: Checkout.Input;
  agentName: string;
}) {
  const answer = describeAnswer(input);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium [overflow-wrap:anywhere]">
        {inputPrompt(input)}
      </p>
      <div className="bg-muted rounded-lg p-4">
        <p className="text-sm [overflow-wrap:anywhere]">
          {answer ??
            (input.kind === "product"
              ? "You declined to add it."
              : "You skipped this question.")}
        </p>
        {input.note ? (
          <p className="text-muted-foreground mt-2 text-sm [overflow-wrap:anywhere]">
            Note: {input.note}
          </p>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        {answer === undefined
          ? `${agentName} was told to go on without it.`
          : `Sent to ${agentName}.`}
      </p>
    </div>
  );
}
