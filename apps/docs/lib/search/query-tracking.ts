export const SEARCH_QUERY_SETTLE_MS = 1000;

const MIN_QUERY_LENGTH = 2;

type Pending = { query: string; resultCount: number; suggestedCount: number };

export function createSettledQueryTracker(
  onSettled: (
    query: string,
    resultCount: number,
    suggestedCount: number,
  ) => void,
  delay = SEARCH_QUERY_SETTLE_MS,
) {
  let pending: Pending | null = null;
  let lastTracked = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  const flush = () => {
    const settled = pending;
    cancel();
    if (!settled || settled.query === lastTracked) return;
    lastTracked = settled.query;
    onSettled(settled.query, settled.resultCount, settled.suggestedCount);
  };

  return {
    /** `suggestedCount` is the part of `resultCount` the server suggested. */
    update(
      query: string,
      resultCount: number,
      resultsReady: boolean,
      suggestedCount = 0,
    ) {
      cancel();
      if (!resultsReady || query.length < MIN_QUERY_LENGTH) return;
      if (query === lastTracked) return;
      pending = { query, resultCount, suggestedCount };
      timer = setTimeout(flush, delay);
    },
    flush,
  };
}
