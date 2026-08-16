"use client";

import {
  ConnectionState,
  type ConnectionPhase,
} from "@/components/elements/connection-state";
import { useStoryPhases } from "./use-demo";

const PHASES = [1600, 2400, 0] as const;
const SEQUENCE: readonly ConnectionPhase[] = [
  "dropped",
  "reconnecting",
  "resumed",
];

export function ConnectionStateDemo() {
  const { phase } = useStoryPhases(PHASES);
  const current = SEQUENCE[Math.min(phase, SEQUENCE.length - 1)]!;

  return <ConnectionState phase={current} attempt={2} resumedTokens={184} />;
}
