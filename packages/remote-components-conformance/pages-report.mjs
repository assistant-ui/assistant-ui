// Summarises conformance/.out/pages/<project>/*.json (tests/pages.spec.ts).
//   node conformance/pages-report.mjs [conformance/.out/pages] [--detail]
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir =
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : new URL("./.out/pages", import.meta.url).pathname;
const detail = process.argv.includes("--detail");
const rows = [];
for (const project of readdirSync(dir)) {
  for (const f of readdirSync(path.join(dir, project)))
    rows.push(JSON.parse(readFileSync(path.join(dir, project, f), "utf8")));
}

const group = (r) => {
  const [v, set, file] = r.name.split("/");
  const style = file?.split("-")[0];
  const sub = set === "corpus" ? `corpus:${style}` : set;
  return `${r.project.padEnd(9)} ${v.padEnd(5)} ${sub.padEnd(16)} ${r.layout}`;
};
const med = (xs) =>
  xs.length === 0
    ? "-"
    : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const groups = new Map();
for (const r of rows) {
  const k = group(r);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
console.log(
  "group                                     n  shown  growing  clipped>1px  wasted>40px  clippedX  median ms",
);
for (const [k, rs] of [...groups].sort()) {
  const shown = rs.filter((r) => r.revealed);
  const c = (fn) => shown.filter(fn).length;
  console.log(
    `${k.padEnd(40)} ${String(rs.length).padStart(2)}  ${String(shown.length).padStart(5)}  ${String(c((r) => (r.growth ?? 0) > 1)).padStart(7)}  ${String(c((r) => r.clippedY > 1)).padStart(11)}  ${String(c((r) => r.wastedY > 40)).padStart(11)}  ${String(c((r) => r.clippedX > 1)).padStart(8)}  ${String(med(shown.map((r) => r.revealMs).filter((x) => x !== undefined))).padStart(9)}`,
  );
}
if (detail) {
  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(
      `${r.project.padEnd(9)} ${r.name.padEnd(36)} ${r.layout.padEnd(5)} ${r.revealed ? "" : "NOT SHOWN " + (r.error ?? "")} h=${r.slotH?.toFixed?.(1)} w=${r.slotW?.toFixed?.(1)} grow=${r.growth?.toFixed?.(1)} bottom=${r.bottom?.toFixed?.(1)} clipY=${r.clippedY?.toFixed?.(1)} waste=${r.wastedY?.toFixed?.(1)} clipX=${r.clippedX?.toFixed?.(1)} fixed=${r.fixed}`,
    );
  }
}
