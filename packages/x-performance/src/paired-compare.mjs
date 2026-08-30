// Aggregation for interleaved cross-ref runs. Each side's displayed mean is
// the average over its per-run means: with the alternating C R / R C order the
// two sides occupy time slots with equal sums, so a linear drift term cancels
// from the difference of the averages, and the table's delta is exactly the
// delta of the printed columns. The spread between per-pair deltas estimates
// between-process variance, which per-run rme cannot see; renderCompare adds
// it to the noise floor.

export const meanRows = (runsList) => {
  const grouped = new Map();
  for (const run of runsList) {
    for (const [id, row] of run) {
      const bucket = grouped.get(id);
      if (bucket) bucket.push(row);
      else grouped.set(id, [row]);
    }
  }
  const out = new Map();
  for (const [id, rows] of grouped) {
    const avg = (pick) =>
      rows.reduce((sum, r) => sum + pick(r), 0) / rows.length;
    out.set(id, {
      ...rows[0],
      mean: avg((r) => r.mean),
      hz: avg((r) => r.hz),
      rme: Math.max(...rows.map((r) => r.rme ?? 0)),
      p99: Math.max(...rows.map((r) => r.p99 ?? 0)),
      samples: rows.reduce((sum, r) => sum + (r.samples ?? 0), 0),
    });
  }
  return out;
};

export const pairSpreads = (refRuns, curRuns) => {
  const ids = new Set();
  for (const run of refRuns) for (const id of run.keys()) ids.add(id);
  const out = new Map();
  for (const id of ids) {
    const deltas = [];
    for (let i = 0; i < refRuns.length; i++) {
      const r = refRuns[i]?.get(id);
      const c = curRuns[i]?.get(id);
      if (r && c) deltas.push(((c.mean - r.mean) / r.mean) * 100);
    }
    if (deltas.length >= 2) {
      out.set(id, Math.max(...deltas) - Math.min(...deltas));
    }
  }
  return out;
};

export const rowVerdict = (aRow, bRow, spread = 0) => {
  const delta = ((bRow.mean - aRow.mean) / aRow.mean) * 100;
  const noise = Math.max(2 * Math.max(aRow.rme ?? 0, bRow.rme ?? 0), 3, spread);
  const verdict =
    Math.abs(delta) <= noise ? "~same" : delta > 0 ? "SLOWER" : "FASTER";
  return { delta, noise, verdict };
};
