import Ajv2020 from "ajv/dist/2020";

import type { Injection, Transcript as TranscriptType, Turn } from "./types";
import { transcriptSchema } from "./schema";

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validate = ajv.compile(transcriptSchema);

function ensureSchema(input: unknown): asserts input is TranscriptType {
  if (typeof input !== "object" || input === null) {
    throw new Error("Transcript.fromJSON: input must be an object");
  }

  if (!validate(input)) {
    throw new Error(`Transcript.fromJSON: ${ajv.errorsText(validate.errors)}`);
  }
}

function ensureTurnSemantics(turns: Turn[]): void {
  const openToolCalls = new Set<string>();

  turns.forEach((turn, index) => {
    if (turn.kind === "assistantStream" && turn.chunks.join("") !== turn.text) {
      throw new Error(
        `Transcript.fromJSON: turns[${index}] chunks must concatenate to text`,
      );
    }

    if (turn.kind === "assistantToolCall") {
      openToolCalls.add(turn.toolCallId);
      return;
    }

    if (turn.kind === "toolResult") {
      if (!openToolCalls.has(turn.toolCallId)) {
        throw new Error(
          `Transcript.fromJSON: turns[${index}] toolResult references unknown toolCallId ${turn.toolCallId}`,
        );
      }
      openToolCalls.delete(turn.toolCallId);
    }
  });
}

function ensureInjectionSemantics(
  turns: Turn[],
  injections: Injection[],
): void {
  injections.forEach((injection, index) => {
    const target = turns[injection.at.turnIndex];
    if (!target) {
      throw new Error(
        `Transcript.fromJSON: injections[${index}] turnIndex out of range`,
      );
    }

    if (injection.kind !== "disconnect") return;

    if (target.kind !== "assistantStream") {
      throw new Error(
        `Transcript.fromJSON: injections[${index}] disconnect target must be assistantStream`,
      );
    }

    const afterChunk = injection.at.afterChunk;
    if (
      afterChunk === undefined ||
      afterChunk < 0 ||
      afterChunk >= target.chunks.length
    ) {
      throw new Error(
        `Transcript.fromJSON: injections[${index}] afterChunk out of range`,
      );
    }
  });
}

export const Transcript = {
  fromJSON(input: unknown): TranscriptType {
    ensureSchema(input);
    ensureTurnSemantics(input.turns);
    ensureInjectionSemantics(input.turns, input.injections);
    return input;
  },
};
