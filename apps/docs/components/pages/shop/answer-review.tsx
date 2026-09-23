import { getCatalogItem } from "@/lib/catalog";
import {
  classifyChoiceAnswer,
  parseChoiceAnswer,
  parseModelAnswer,
  type Checkout,
  inputPrompt,
} from "@/lib/checkout/protocol";

/** The answer a closed input holds, worded the way the user chose it; `undefined` when they skipped it. */
export const describeAnswer = (input: Checkout.Input): string | undefined => {
  if (input.status !== "answered") return undefined;
  const answer = input.answer ?? "";
  switch (input.kind) {
    case "choice": {
      if (classifyChoiceAnswer(input, answer) !== "option") return answer;
      const { option, variant } = parseChoiceAnswer(answer);
      const match = input.options?.find((entry) => entry.id === option);
      const picked = match?.variants?.find((entry) => entry.id === variant);
      return [match?.label ?? option, picked?.label]
        .filter((part) => part !== undefined)
        .join(" · ");
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
      <p className="text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
        {inputPrompt(input)}
      </p>
      <div className="border-foreground/10 bg-foreground/[0.03] rounded-lg border px-4 py-3">
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
