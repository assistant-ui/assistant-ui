import type { ThreadMessage } from "../../types/message";

export type ThreadTitleClaim = {
  readonly title: string;
  readonly order: number;
  readonly settled: Promise<boolean>;
  readonly settle: (renamed: boolean) => void;
  renamed: boolean | undefined;
};

type ThreadTitleGeneration = {
  readonly automatic: boolean;
  readonly order: number;
  claim: ThreadTitleClaim | null;
  readonly claims: ThreadTitleClaim[];
  beforeGenerationClaims: readonly ThreadTitleClaim[];
  outranked: ThreadTitleGeneration | null;
  hiddenManual: ThreadTitleClaim | null;
  superseded: boolean;
  readonly persisted: Promise<string | undefined>;
  readonly settlePersisted: (title: string | undefined) => void;
};

export type ThreadTitleState = {
  generations: Set<ThreadTitleGeneration>;
  pendingClaim: ThreadTitleClaim | null;
  inFlightClaims: Set<ThreadTitleClaim>;
  manualClaim: ThreadTitleClaim | null;
  latestGeneration: ThreadTitleGeneration | null;
  nextOrder: number;
};

const waitingAutomatics = new WeakMap<ThreadTitleState, number>();
const automaticTitleHistory = new WeakMap<
  Map<string, ThreadTitleState>,
  Map<
    string,
    {
      runEnded: boolean;
      renamed: boolean;
      messages: readonly ThreadMessage[] | undefined;
    }
  >
>();

function getAutomaticTitleHistory(
  states: Map<string, ThreadTitleState>,
  threadId: string,
) {
  let history = automaticTitleHistory.get(states);
  if (history === undefined) {
    history = new Map();
    automaticTitleHistory.set(states, history);
  }
  let thread = history.get(threadId);
  if (thread === undefined) {
    thread = { runEnded: false, renamed: false, messages: undefined };
    history.set(threadId, thread);
  }
  return thread;
}

const successorObservers = new WeakMap<
  ThreadTitleState,
  Set<(settled: Promise<boolean>) => void>
>();

function notifySuccessor(
  state: ThreadTitleState,
  settled: Promise<boolean>,
): void {
  for (const observe of successorObservers.get(state) ?? []) observe(settled);
}

export type ThreadTitleGenerationRun = {
  states: Map<string, ThreadTitleState>;
  threadId: string;
  automatic: boolean;
  messages?: readonly ThreadMessage[];
  afterRun?: (() => string | undefined) | undefined;
  generate: (
    onTitle: (title: string | undefined) => Promise<void>,
  ) => Promise<void>;
  rename: (title: string) => Promise<void>;
  readTitle: () => Promise<string | undefined>;
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
      inFlightClaims: new Set(),
      manualClaim: null,
      latestGeneration: null,
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
    !waitingAutomatics.has(state) &&
    state.pendingClaim === null &&
    state.inFlightClaims.size === 0 &&
    state.manualClaim === null &&
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
    (state.latestGeneration?.order ?? 0) <= generation.order
  );
}

function latestExplicitGeneration(
  state: ThreadTitleState,
): ThreadTitleGeneration | null {
  let generation = state.latestGeneration;
  while (generation !== null && generation.automatic) {
    generation = generation.outranked;
  }
  return generation;
}

function isCurrentClaim(
  state: ThreadTitleState,
  claim: ThreadTitleClaim,
): boolean {
  return (latestExplicitGeneration(state)?.order ?? 0) < claim.order;
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
    renamed: undefined,
  };
  state.pendingClaim = claim;
  state.inFlightClaims.add(claim);
  notifySuccessor(state, settled);
  for (const generation of state.generations) {
    if (generation.order < claim.order) {
      generation.claim = claim;
      generation.claims.push(claim);
    }
  }
  return claim;
}

export function finishThreadTitleRename(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  claim: ThreadTitleClaim,
  renamed: boolean,
): void {
  claim.renamed = renamed;
  claim.settle(renamed);
  const state = states.get(threadId);
  if (state === undefined) return;
  if (renamed) getAutomaticTitleHistory(states, threadId).renamed = true;
  state.inFlightClaims.delete(claim);
  if (
    renamed &&
    isCurrentClaim(state, claim) &&
    (state.manualClaim?.order ?? 0) < claim.order
  ) {
    state.manualClaim = claim;
  }
  if (state.pendingClaim === claim) {
    state.pendingClaim = renamed
      ? null
      : newestClaim(state, state.inFlightClaims);
  }
  pruneThreadTitleState(states, threadId, state);
}

function newestClaim(
  state: ThreadTitleState,
  claims: Iterable<ThreadTitleClaim>,
): ThreadTitleClaim | null {
  let newest: ThreadTitleClaim | null = null;
  for (const claim of claims) {
    if (claim.renamed === false || !isCurrentClaim(state, claim)) continue;
    if (newest === null || claim.order > newest.order) newest = claim;
  }
  return newest;
}

function takeManualTitle(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  state: ThreadTitleState,
): string | undefined {
  const retained = state.manualClaim;
  if (retained === null) return undefined;
  state.manualClaim = null;
  pruneThreadTitleState(states, threadId, state);
  return retained.title;
}

function retractGeneration(
  state: ThreadTitleState,
  generation: ThreadTitleGeneration,
): void {
  if (state.latestGeneration === generation) {
    state.latestGeneration = generation.outranked;
  }
  const hidden = [
    ...(generation.hiddenManual === null ? [] : [generation.hiddenManual]),
    ...generation.beforeGenerationClaims,
  ].reduce<ThreadTitleClaim | null>(
    (newest, claim) =>
      claim.renamed === true && (newest?.order ?? 0) < claim.order
        ? claim
        : newest,
    null,
  );
  for (
    let active = state.latestGeneration;
    active !== null;
    active = active.outranked
  ) {
    if (active.outranked === generation) {
      active.outranked = generation.outranked;
    }
  }
  for (const active of state.generations) {
    if (
      hidden !== null &&
      !active.automatic &&
      active.order > generation.order &&
      (active.hiddenManual?.order ?? 0) < hidden.order
    ) {
      active.hiddenManual = hidden;
    }
  }
  if (
    hidden !== null &&
    isCurrentClaim(state, hidden) &&
    (state.manualClaim?.order ?? 0) < hidden.order
  ) {
    state.manualClaim = hidden;
  }
  for (const active of state.generations) {
    if (active === generation || !active.automatic || active.claim !== null)
      continue;
    active.claim = newestClaim(state, [
      ...active.claims,
      ...state.inFlightClaims,
      ...(state.manualClaim === null ? [] : [state.manualClaim]),
    ]);
  }
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
    claims:
      automatic && state.pendingClaim !== null ? [state.pendingClaim] : [],
    beforeGenerationClaims: automatic ? [] : [...state.inFlightClaims],
    outranked: state.latestGeneration,
    hiddenManual: automatic ? null : state.manualClaim,
    superseded: false,
    persisted,
    settlePersisted,
  };
  if (!automatic) {
    state.pendingClaim = null;
    state.manualClaim = null;
  }
  state.latestGeneration = generation;
  state.generations.add(generation);
  if (successorObservers.has(state)) {
    notifySuccessor(
      state,
      persisted.then((title) => title !== undefined),
    );
  }
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
export async function runThreadTitleGeneration(
  run: ThreadTitleGenerationRun,
): Promise<void> {
  const { states, threadId, automatic, afterRun } = run;
  const state = getThreadTitleState(states, threadId);
  const history = getAutomaticTitleHistory(states, threadId);
  if (afterRun) {
    if (history.runEnded || history.renamed) {
      pruneThreadTitleState(states, threadId, state);
      return;
    }
    history.runEnded = true;
    const coalesced =
      history.messages !== undefined &&
      history.messages.some((message) => message.role === "assistant") &&
      history.messages.length === run.messages?.length &&
      history.messages.every(
        (message, index) => message === run.messages![index],
      );
    history.messages = undefined;
    if (coalesced) {
      pruneThreadTitleState(states, threadId, state);
      return;
    }
    waitingAutomatics.set(state, (waitingAutomatics.get(state) ?? 0) + 1);
    let proceed = false;
    try {
      while (state.generations.size > 0 || state.inFlightClaims.size > 0) {
        await Promise.all([
          ...[...state.generations].map((generation) => generation.persisted),
          ...[...state.inFlightClaims].map((claim) => claim.settled),
        ]);
        if (states.get(threadId) !== state) return;
      }
      if (history.renamed || afterRun()) return;
      proceed = true;
    } finally {
      const remaining = waitingAutomatics.get(state)! - 1;
      if (remaining === 0) waitingAutomatics.delete(state);
      else waitingAutomatics.set(state, remaining);
      if (!proceed) pruneThreadTitleState(states, threadId, state);
    }
  } else if (automatic && !history.runEnded) {
    history.messages = run.messages;
  }
  const explicitAtStart = automatic
    ? [...state.generations].filter((generation) => !generation.automatic)
    : [];
  const waitingForExplicit = explicitAtStart.length > 0;
  const waitStartOrder = state.nextOrder;
  if (waitingForExplicit) {
    waitingAutomatics.set(state, (waitingAutomatics.get(state) ?? 0) + 1);
  }
  let generation: ThreadTitleGeneration | null;
  try {
    if (waitingForExplicit) {
      const waited = new Set(explicitAtStart);
      const collectExplicit = () => {
        let added = false;
        for (const candidate of state.generations) {
          if (candidate.automatic || waited.has(candidate)) continue;
          waited.add(candidate);
          added = true;
        }
        for (
          let candidate = state.latestGeneration;
          candidate !== null;
          candidate = candidate.outranked
        ) {
          if (
            candidate.automatic ||
            candidate.order <= waitStartOrder ||
            waited.has(candidate)
          )
            continue;
          waited.add(candidate);
          added = true;
        }
        return added;
      };
      while (true) {
        collectExplicit();
        const titles = await Promise.all(
          [...waited].map((candidate) => candidate.persisted),
        );
        if (states.get(threadId) !== state) return;
        if (
          collectExplicit() ||
          [...state.generations].some((candidate) => !candidate.automatic)
        )
          continue;
        if (titles.some((title) => title !== undefined)) return;
        break;
      }
    }
    generation = startThreadTitleGeneration(states, threadId, automatic);
  } finally {
    if (waitingForExplicit) {
      const remaining = waitingAutomatics.get(state)! - 1;
      if (remaining === 0) waitingAutomatics.delete(state);
      else waitingAutomatics.set(state, remaining);
      pruneThreadTitleState(states, threadId, state);
    }
  }
  if (generation === null) return;

  // `clearThreadTitleState` ends the runs on the cleared state, so a thread
  // listed again under the same id does not receive a deleted thread's title.
  const isLive = () => states.get(threadId) === state;
  const generate: ThreadTitleGenerationRun["generate"] = async (onTitle) => {
    if (isLive()) await run.generate(onTitle);
  };
  const rename = async (title: string) => {
    if (isLive()) await run.rename(title);
  };
  let appliedTitle: string | undefined;
  const applyTitle = async (title: string | undefined) => {
    if (isLive()) {
      await run.applyTitle(title);
      appliedTitle = title;
    }
  };

  let persistedTitle: string | undefined;
  let persistedOrder = generation.order;
  let sawTitle = false;
  let lastTitle: string | undefined;

  const writeBack = async (title: string, ownsTitle: () => boolean) => {
    const order = state.nextOrder;
    const successors: Promise<boolean>[] = [];
    const observe = (settled: Promise<boolean>) => successors.push(settled);
    let observers = successorObservers.get(state);
    if (observers === undefined) {
      observers = new Set();
      successorObservers.set(state, observers);
    }
    observers.add(observe);
    try {
      await rename(title);
      persistedTitle = title;
    } catch (error) {
      try {
        while (isLive()) {
          const count = successors.length;
          const results = await Promise.all(successors);
          if (successors.length !== count) continue;
          if (results.some(Boolean)) break;
          if (count === 0 && (state.nextOrder !== order || !ownsTitle())) break;
          const readOrder = state.nextOrder;
          const serverTitle = await run.readTitle();
          if (!isLive()) break;
          if (state.nextOrder !== readOrder || successors.length !== count)
            continue;
          if (count === 0 && !ownsTitle()) break;
          persistedTitle = serverTitle;
          await applyTitle(serverTitle);
          break;
        }
      } catch {}
      throw error;
    } finally {
      observers.delete(observe);
      if (observers.size === 0) successorObservers.delete(state);
    }
  };

  const settleClaim = async (claim: ThreadTitleClaim) => {
    const renamed = await claim.settled;
    if (generation.claim !== claim) return undefined;
    if (!renamed) {
      if (state.pendingClaim === claim) state.pendingClaim = null;
      // An earlier rename may still stand, and the run may already have
      // persisted over it, so it is reasserted like any other claim.
      const fallback = newestClaim(
        state,
        automatic
          ? [
              ...generation.claims,
              ...state.inFlightClaims,
              ...(state.manualClaim === null ? [] : [state.manualClaim]),
            ]
          : generation.claims,
      );
      generation.claim = fallback;
      if (fallback !== null) return undefined;
    }
    return renamed;
  };

  const retainManualTitle = () =>
    automatic && takeManualTitle(states, threadId, state) !== undefined;

  const awaitOutrankingGeneration = async () => {
    while (!generation.superseded) {
      const winner = state.latestGeneration;
      if (winner === null || winner.order <= generation.order) return;
      await winner.persisted;
      if (state.latestGeneration === winner) return;
    }
  };

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
        isCurrentClaim(state, claim) &&
        (claim.order > persistedOrder ||
          (claim.renamed === true && claim.title !== persistedTitle))
      ) {
        const renamed = await settleClaim(claim);
        if (renamed === true) {
          await writeBack(
            claim.title,
            () => generation.claim === claim && isCurrentClaim(state, claim),
          );
          persistedOrder = claim.order;
        }
        continue;
      }
      const winner = state.latestGeneration;
      if (
        winner === null ||
        winner === generation ||
        winner.order <= persistedOrder
      )
        return;
      const title = await winner.persisted;
      if (state.latestGeneration !== winner) continue;
      if (title === undefined || title === persistedTitle) return;
      await writeBack(
        title,
        () =>
          state.latestGeneration === winner &&
          (generation.claim?.order ?? 0) <= winner.order,
      );
      persistedOrder = winner.order;
    }
  };

  const runGeneration = async () => {
    // An explicit generation waits for every earlier rename because any of
    // those server writes may settle last.
    if (generation.beforeGenerationClaims.length > 0) {
      await Promise.all(
        generation.beforeGenerationClaims.map((claim) => claim.settled),
      );
    }
    while (true) {
      while (generation.claim !== null) {
        const renamed = await settleClaim(generation.claim);
        if (renamed === undefined) continue;
        if (renamed) {
          generation.superseded = true;
          return;
        }
        if (retainManualTitle()) return;
        break;
      }
      if (automatic && !isCurrentGeneration(state, generation)) {
        await awaitOutrankingGeneration();
        if (!isCurrentGeneration(state, generation)) return;
        continue;
      }
      if (!isCurrentGeneration(state, generation)) return;
      break;
    }

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
      if (
        persistedTitle !== undefined &&
        isCurrentGeneration(state, generation)
      ) {
        await applyTitle(lastTitle);
      }
    });

    while (true) {
      const claim = generation.claim;
      if (claim === null) return;
      const renamed = await settleClaim(claim);
      if (renamed === undefined) continue;
      if (renamed === false) {
        if (retainManualTitle()) return;
        if (
          sawTitle &&
          persistedTitle !== undefined &&
          isCurrentGeneration(state, generation)
        ) {
          await applyTitle(lastTitle);
        }
        return;
      }
      if (!isCurrentClaim(state, claim)) {
        await awaitOutrankingGeneration();
        if (!isCurrentClaim(state, claim)) return;
        if (generation.claim !== claim) continue;
      }
      await writeBack(
        claim.title,
        () =>
          generation.claim === claim && isCurrentGeneration(state, generation),
      );
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
    if (persistedTitle !== undefined) await awaitOutrankingGeneration();
    await repairLostRace();
    if (
      persistedTitle !== undefined &&
      isCurrentGeneration(state, generation)
    ) {
      const claim = generation.claim;
      if (
        claim !== null &&
        claim.renamed === true &&
        isCurrentClaim(state, claim)
      ) {
        if (appliedTitle !== claim.title) await applyTitle(claim.title);
      } else if (claim === null && sawTitle && appliedTitle !== lastTitle) {
        await applyTitle(lastTitle);
      }
    }
  } finally {
    if (persistedTitle === undefined) retractGeneration(state, generation);
    generation.settlePersisted(persistedTitle);
    state.generations.delete(generation);
    pruneThreadTitleState(states, threadId, state);
  }
}
