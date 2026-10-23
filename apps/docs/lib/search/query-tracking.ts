export const SEARCH_QUERY_SETTLE_MS = 1000;

const MIN_QUERY_LENGTH = 2;

type Pending = { query: string; resultCount: number };

export function createSettledQueryTracker(
  onSettled: (query: string, resultCount: number) => void,
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
    onSettled(settled.query, settled.resultCount);
  };

  return {
    update(query: string, resultCount: number, resultsReady: boolean) {
      cancel();
      if (!resultsReady || query.length < MIN_QUERY_LENGTH) return;
      if (query === lastTracked) return;
      pending = { query, resultCount };
      timer = setTimeout(flush, delay);
    },
    flush,
  };
}
