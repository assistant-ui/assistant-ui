export type ThreadTitleClaim = {
  readonly title: string;
  readonly order: number;
  readonly settled: Promise<boolean>;
  readonly settle: (renamed: boolean) => void;
};

type ThreadTitleGeneration = {
  readonly automatic: boolean;
  readonly order: number;
  claim: ThreadTitleClaim | null;
  beforeGenerationClaim: ThreadTitleClaim | null;
  superseded: boolean;
  readonly persisted: Promise<string | undefined>;
  readonly settlePersisted: (title: string | undefined) => void;
};

export type ThreadTitleState = {
  generations: Set<ThreadTitleGeneration>;
  pendingClaim: ThreadTitleClaim | null;
  manualTitle: string | undefined;
  latestExplicit: ThreadTitleGeneration | null;
  nextOrder: number;
};

export type ThreadTitleGenerationRun = {
  states: Map<string, ThreadTitleState>;
  threadId: string;
  automatic: boolean;
  generate: (
    onTitle: (title: string | undefined) => Promise<void>,
  ) => Promise<void>;
  rename: (title: string) => Promise<void>;
  applyTitle: (title: string | undefined) => Promise<void>;
};

function getThreadTitleState(
  states: Map<string, ThreadTitleState>,
  threadId: string,
): ThreadTitleState {
  let state = states.get(threadId);
  if (state === undefined) {
    state = {
      generations: new Set(),
      pendingClaim: null,
      manualTitle: undefined,
      latestExplicit: null,
      nextOrder: 0,
    };
    states.set(threadId, state);
  }
  return state;
}

function pruneThreadTitleState(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  state: ThreadTitleState,
): void {
  if (
    state.generations.size === 0 &&
    state.pendingClaim === null &&
    state.manualTitle === undefined &&
    states.get(threadId) === state
  ) {
    states.delete(threadId);
  }
}

function isCurrentGeneration(
  state: ThreadTitleState,
  generation: ThreadTitleGeneration,
): boolean {
  return (
    !generation.superseded &&
    (state.latestExplicit?.order ?? 0) <= generation.order
  );
}

function isCurrentClaim(
  state: ThreadTitleState,
  claim: ThreadTitleClaim,
): boolean {
  return (state.latestExplicit?.order ?? 0) < claim.order;
}

export function startThreadTitleRename(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  title: string,
): ThreadTitleClaim {
  const state = getThreadTitleState(states, threadId);
  let settle!: (renamed: boolean) => void;
  const settled = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  const claim: ThreadTitleClaim = {
    title,
    order: ++state.nextOrder,
    settled,
    settle,
  };
  state.pendingClaim = claim;
  for (const generation of state.generations) {
    if (generation.order < claim.order) generation.claim = claim;
  }
  return claim;
}

export function finishThreadTitleRename(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  claim: ThreadTitleClaim,
  renamed: boolean,
): void {
  claim.settle(renamed);
  const state = states.get(threadId);
  if (state === undefined) return;
  if (state.pendingClaim === claim) {
    state.pendingClaim = null;
    if (renamed) {
      state.manualTitle = claim.title;
    }
  }
  pruneThreadTitleState(states, threadId, state);
}

function takeManualTitle(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  state: ThreadTitleState,
): string | undefined {
  const retained = state.manualTitle;
  if (retained === undefined) return undefined;
  state.manualTitle = undefined;
  pruneThreadTitleState(states, threadId, state);
  return retained;
}

export function clearThreadTitleState(
  states: Map<string, ThreadTitleState>,
  threadId: string,
): void {
  states.delete(threadId);
}

function startThreadTitleGeneration(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  automatic: boolean,
): ThreadTitleGeneration | null {
  const state = getThreadTitleState(states, threadId);
  if (
    automatic &&
    state.pendingClaim === null &&
    takeManualTitle(states, threadId, state) !== undefined
  ) {
    return null;
  }

  let settlePersisted!: (title: string | undefined) => void;
  const persisted = new Promise<string | undefined>((resolve) => {
    settlePersisted = resolve;
  });
  const generation: ThreadTitleGeneration = {
    automatic,
    order: ++state.nextOrder,
    claim: automatic ? state.pendingClaim : null,
    beforeGenerationClaim: automatic ? null : state.pendingClaim,
    superseded: false,
    persisted,
    settlePersisted,
  };
  if (!automatic) {
    state.pendingClaim = null;
    state.manualTitle = undefined;
    state.latestExplicit = generation;
    for (const active of state.generations) {
      if (active.automatic) active.superseded = true;
    }
  }
  state.generations.add(generation);
  return generation;
}

/**
 * Runs one title generation under the per-thread rename claims and generation
 * ordering, so the title that wins locally is also the title left on the
 * server.
 *
 * A generated run persists the title itself, and the adapter exposes no
 * compare-and-set, so the run that loses reasserts the winner through `rename`
 * only after `generate` has resolved. Reasserting mid-stream would race the
 * run's own write and lose the winning title on the server.
 */
export async function runThreadTitleGeneration({
  states,
  threadId,
  automatic,
  generate,
  rename,
  applyTitle,
}: ThreadTitleGenerationRun): Promise<void> {
  const state = getThreadTitleState(states, threadId);
  const generation = startThreadTitleGeneration(states, threadId, automatic);
  if (generation === null) return;

  let persistedTitle: string | undefined;
  let persistedOrder = generation.order;

  const settleClaim = async (claim: ThreadTitleClaim) => {
    const renamed = await claim.settled;
    if (generation.claim !== claim) return undefined;
    if (!renamed) {
      generation.claim = null;
      if (state.pendingClaim === claim) state.pendingClaim = null;
    }
    return renamed;
  };

  const retainManualTitle = () =>
    automatic && takeManualTitle(states, threadId, state) !== undefined;

  // `generate` resolves only once the run has persisted its title, so a run
  // that lost the ordering race while it streamed has already overwritten the
  // winner. It waits for the winning generation to persist its own title and
  // writes that title back.
  const repairLostRace = async () => {
    if (persistedTitle === undefined) return;
    while (true) {
      const claim = generation.claim;
      if (
        claim !== null &&
        claim.order > persistedOrder &&
        isCurrentClaim(state, claim)
      ) {
        const renamed = await settleClaim(claim);
        if (renamed === true) {
          persistedTitle = claim.title;
          persistedOrder = claim.order;
          await rename(claim.title);
        }
        continue;
      }
      const winner = state.latestExplicit;
      if (winner === null || winner.order <= persistedOrder) return;
      const title = await winner.persisted;
      if (state.latestExplicit !== winner) continue;
      persistedOrder = winner.order;
      if (title === undefined || title === persistedTitle) return;
      persistedTitle = title;
      await rename(title);
    }
  };

  const runGeneration = async () => {
    if (generation.beforeGenerationClaim !== null) {
      await generation.beforeGenerationClaim.settled;
    }
    if (generation.claim !== null) {
      const renamed = await settleClaim(generation.claim);
      if (renamed === true) {
        generation.superseded = true;
        return;
      }
      if (renamed === false && retainManualTitle()) return;
    }
    if (!isCurrentGeneration(state, generation)) return;

    let sawTitle = false;
    let lastTitle: string | undefined;
    await generate(async (title) => {
      sawTitle = true;
      lastTitle = title;
      if (title !== undefined) persistedTitle = title;
      const claim = generation.claim;
      if (claim !== null) {
        const renamed = await settleClaim(claim);
        if (renamed !== false) return;
        if (retainManualTitle()) {
          generation.superseded = true;
          return;
        }
      }
      if (isCurrentGeneration(state, generation)) await applyTitle(lastTitle);
    });

    while (true) {
      const claim = generation.claim;
      if (claim === null) return;
      const renamed = await settleClaim(claim);
      if (renamed === undefined) continue;
      if (renamed === false) {
        if (retainManualTitle()) return;
        if (sawTitle && isCurrentGeneration(state, generation)) {
          await applyTitle(lastTitle);
        }
        return;
      }
      if (!isCurrentClaim(state, claim)) return;
      await rename(claim.title);
      persistedTitle = claim.title;
      persistedOrder = claim.order;
      if (generation.claim !== claim) continue;
      if (!isCurrentGeneration(state, generation)) return;
      await applyTitle(claim.title);
      generation.superseded = true;
      return;
    }
  };

  try {
    await runGeneration();
    await repairLostRace();
  } finally {
    generation.settlePersisted(persistedTitle);
    state.generations.delete(generation);
    pruneThreadTitleState(states, threadId, state);
  }
}
