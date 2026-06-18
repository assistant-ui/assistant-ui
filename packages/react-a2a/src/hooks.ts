"use client";

import { a2aExtras } from "./a2aExtras";

/** The current A2A task, if a run is in progress. */
export const useA2ATask = () => a2aExtras.use((e) => e.task);

/** The artifacts accumulated for the current A2A run. */
export const useA2AArtifacts = () => a2aExtras.use((e) => e.artifacts);

/** The discovered A2A agent card. */
export const useA2AAgentCard = () => a2aExtras.use((e) => e.agentCard);
