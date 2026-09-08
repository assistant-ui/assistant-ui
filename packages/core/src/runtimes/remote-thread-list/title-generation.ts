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
};

export type ThreadTitleState = {
  generations: Set<ThreadTitleGeneration>;
  pendingClaim: ThreadTitleClaim | null;
  manualTitle: string | undefined;
  latestExplicitOrder: number;
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
      latestExplicitOrder: 0,
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
    !generation.superseded && state.latestExplicitOrder <= generation.order
  );
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

  const generation: ThreadTitleGeneration = {
    automatic,
    order: ++state.nextOrder,
    claim: automatic ? state.pendingClaim : null,
    beforeGenerationClaim: automatic ? null : state.pendingClaim,
    superseded: false,
  };
  if (!automatic) {
    state.pendingClaim = null;
    state.manualTitle = undefined;
    state.latestExplicitOrder = generation.order;
    for (const active of state.generations) {
      if (active.automatic) active.superseded = true;
    }
  }
  state.generations.add(generation);
  return generation;
}

/**
 * Runs one title generation under the per-thread rename claims, so a rename
 * that lands while the generation is in flight stays the persisted title.
 *
 * A generated run persists the title itself, and the adapter exposes no
 * compare-and-set, so a winning claim is reasserted through `rename` only after
 * `generate` has resolved. Reasserting mid-stream would race the run's own
 * write and lose the manual title on the server.
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

  try {
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
      if (!isCurrentGeneration(state, generation)) return;
      await rename(claim.title);
      if (generation.claim !== claim) continue;
      if (!isCurrentGeneration(state, generation)) return;
      await applyTitle(claim.title);
      generation.superseded = true;
      return;
    }
  } finally {
    state.generations.delete(generation);
    pruneThreadTitleState(states, threadId, state);
  }
}
