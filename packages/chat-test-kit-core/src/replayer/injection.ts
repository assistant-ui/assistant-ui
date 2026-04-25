import type { Injection, Transcript } from "../transcript/types";

export function findInjectionsAtTurn(
  transcript: Transcript,
  turnIndex: number,
): Injection[] {
  return transcript.injections.filter(
    (injection) =>
      injection.at.turnIndex === turnIndex &&
      injection.at.afterChunk === undefined,
  );
}

export function findInjectionAtChunk(
  transcript: Transcript,
  turnIndex: number,
  chunkIndex: number,
): Injection | undefined {
  return transcript.injections.find(
    (injection) =>
      injection.at.turnIndex === turnIndex &&
      injection.at.afterChunk === chunkIndex,
  );
}
