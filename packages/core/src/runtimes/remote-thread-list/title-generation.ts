export type ThreadTitleClaim = {
  readonly title: string;
  readonly order: number;
  readonly settled: Promise<boolean>;
  readonly settle: (renamed: boolean) => void;
};

export type ThreadTitleGeneration = {
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

export function getThreadTitleState(
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

export function startThreadTitleGeneration(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  automatic: boolean,
): { generation: ThreadTitleGeneration | null; retainedTitle?: string } {
  const state = getThreadTitleState(states, threadId);
  if (
    automatic &&
    state.pendingClaim === null &&
    state.manualTitle !== undefined
  ) {
    const retainedTitle = state.manualTitle;
    state.manualTitle = undefined;
    pruneThreadTitleState(states, threadId, state);
    return { generation: null, retainedTitle };
  }

  const beforeGenerationClaim = automatic ? null : state.pendingClaim;
  const generation: ThreadTitleGeneration = {
    automatic,
    order: ++state.nextOrder,
    claim: automatic ? state.pendingClaim : null,
    beforeGenerationClaim,
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
  return { generation };
}

export function isCurrentThreadTitleGeneration(
  state: ThreadTitleState,
  generation: ThreadTitleGeneration,
): boolean {
  return (
    !generation.superseded && state.latestExplicitOrder <= generation.order
  );
}

export function finishThreadTitleGeneration(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  generation: ThreadTitleGeneration,
): void {
  const state = states.get(threadId);
  if (state === undefined) return;
  state.generations.delete(generation);
  pruneThreadTitleState(states, threadId, state);
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
