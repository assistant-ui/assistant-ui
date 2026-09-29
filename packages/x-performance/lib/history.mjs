import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fmt, shortId } from "./report.mjs";

const stamp = (date) =>
  `${date.toISOString().slice(0, 10)}T${date
    .toISOString()
    .slice(11, 19)
    .replaceAll(":", "")}Z`;

const pointTime = (point) => new Date(point.date).getTime();

const percent = (latest, previous) => {
  if (previous === 0) return "";
  const delta = ((latest - previous) / previous) * 100;
  return `${delta >= 0 ? "+" : "-"}${Math.abs(delta).toFixed(1)}%`;
};

const rowFor = (point, id) => point.rows.find((row) => row.id === id);

const nearestRow = (points, cutoff, id) => {
  for (let i = points.length - 1; i >= 0; i--) {
    if (pointTime(points[i]) > cutoff) continue;
    const row = rowFor(points[i], id);
    if (row) return row;
  }
  return undefined;
};

const table = (rows) =>
  [
    "| bench | latest | Δ7d | Δ30d | min | max | points |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

export const appendHistory = ({ dir, recording, now = new Date() }) => {
  mkdirSync(dir, { recursive: true });
  const { env } = recording;
  const point = {
    schema: "aui-perf/history@1",
    date: now.toISOString(),
    sha: env.sha,
    env: {
      cpu: env.cpu,
      cores: env.cores,
      arch: env.arch,
      platform: env.platform,
      node: env.node,
      runs: env.runs,
      estimator: env.estimator,
    },
    rows: recording.benchmarks
      .map(({ id, mean, rme }) => ({ id, mean, rme }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  const path = join(dir, `${stamp(now)}-${env.sha}.json`);
  writeFileSync(path, `${JSON.stringify(point, null, 2)}\n`);
  return path;
};

export const readHistory = (dir) => {
  let files;
  try {
    files = readdirSync(dir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")))
    .sort((a, b) => pointTime(a) - pointTime(b));
};

export const renderHistory = ({ dir, now = new Date(), window = 30 }) => {
  const nowTime = now.getTime();
  const points = readHistory(dir).filter(
    (point) => pointTime(point) <= nowTime,
  );
  const latest = points.at(-1);
  const windowStart = nowTime - window * 24 * 60 * 60 * 1000;
  const windowPoints = points.filter((point) => {
    const time = pointTime(point);
    return time >= windowStart && time <= nowTime;
  });
  const ids = new Set([
    ...windowPoints.flatMap((point) => point.rows.map((row) => row.id)),
    ...(latest?.rows.map((row) => row.id) ?? []),
  ]);
  const rows = [...ids]
    .sort((a, b) => a.localeCompare(b))
    .map((id) => {
      const latestRow = latest && rowFor(latest, id);
      const values = windowPoints
        .map((point) => rowFor(point, id)?.mean)
        .filter((mean) => mean !== undefined);
      const usable = (row) => (row && row.mean > 0 ? row : undefined);
      const sevenDayRow = usable(
        latestRow
          ? nearestRow(points, nowTime - 7 * 24 * 60 * 60 * 1000, id)
          : undefined,
      );
      const thirtyDayRow = usable(
        latestRow
          ? nearestRow(points, nowTime - 30 * 24 * 60 * 60 * 1000, id)
          : undefined,
      );
      const sevenDay =
        latestRow && sevenDayRow
          ? percent(latestRow.mean, sevenDayRow.mean)
          : "";
      const thirtyDay =
        latestRow && thirtyDayRow
          ? percent(latestRow.mean, thirtyDayRow.mean)
          : "";
      const thirtyDayDelta =
        latestRow && thirtyDayRow
          ? ((latestRow.mean - thirtyDayRow.mean) / thirtyDayRow.mean) * 100
          : undefined;
      return [
        shortId(id),
        latestRow ? fmt(latestRow.mean) : "",
        sevenDay,
        thirtyDayDelta !== undefined && Math.abs(thirtyDayDelta) > 10
          ? `${thirtyDay} ⚠︎`
          : thirtyDay,
        values.length ? fmt(Math.min(...values)) : "",
        values.length ? fmt(Math.max(...values)) : "",
        String(values.length),
      ];
    });
  const provenance = latest
    ? `_${points.length} points · ${points[0].date} to ${latest.date} · latest runner: ${latest.env.cpu} · Node ${latest.env.node}_`
    : "_0 points · no nightly recordings yet_";
  return [
    "## aui-perf nightly record",
    "",
    provenance,
    "",
    table(rows),
    "",
    "informational; points come from different runners of the same class, so read trends, not single deltas.",
    "",
  ].join("\n");
};
