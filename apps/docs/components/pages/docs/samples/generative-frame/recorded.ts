/* A show_widget call as a model wrote it, replayed by the demo without a
   model call. Light travel times use mean orbital distances in AU times
   8.317 light-minutes per AU. */

const PLANETS = [
  ["Mercury", 0.387],
  ["Venus", 0.723],
  ["Earth", 1],
  ["Mars", 1.524],
  ["Jupiter", 5.203],
  ["Saturn", 9.537],
  ["Uranus", 19.19],
  ["Neptune", 30.07],
] as const;

const LIGHT_MINUTES_PER_AU = 8.317;
const MAX_MINUTES = 30.07 * LIGHT_MINUTES_PER_AU;

const formatMinutes = (minutes: number) =>
  minutes < 60
    ? `${minutes.toFixed(1)} min`
    : `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;

const rows = PLANETS.map(([name, au]) => {
  const minutes = au * LIGHT_MINUTES_PER_AU;
  const width = Math.max(1, (minutes / MAX_MINUTES) * 100).toFixed(1);
  return `<div class="row"><span>${name}</span><span class="track"><span class="fill" style="width:${width}%"></span></span><span class="num">${formatMinutes(minutes)}</span></div>`;
}).join("\n");

export const RECORDED_TITLE = "sunlight_travel_time";

export const RECORDED_WIDGET = `<style>
.head{margin:0 0 2px;font-size:16px;font-weight:600;color:var(--color-text)}
.sub{margin:0 0 14px;font-size:13px;color:var(--color-text-muted)}
.row{display:grid;grid-template-columns:68px 1fr 88px;align-items:center;gap:10px;margin:7px 0;font-size:13px;color:var(--color-text)}
.track{height:8px;border-radius:var(--radius-sm);background:var(--color-surface-muted);overflow:hidden}
.fill{display:block;height:100%;border-radius:inherit;background:var(--chart-1)}
.num{text-align:right;font-variant-numeric:tabular-nums;color:var(--color-text-muted)}
.calc{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:16px;padding:12px;border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:13px;color:var(--color-text)}
.calc input{flex:1;min-width:120px;accent-color:var(--color-text)}
.calc output{min-width:132px;font-variant-numeric:tabular-nums}
button{font:inherit;font-size:13px;padding:6px 10px;border-radius:var(--radius-md);border:1px solid var(--color-border-strong);background:var(--color-surface);color:var(--color-text);cursor:pointer}
button:hover{background:var(--color-surface-muted)}
</style>
<h3 class="head">How long sunlight takes to reach each planet</h3>
<p class="sub">At each planet's mean distance from the Sun</p>
${rows}
<div class="calc">
<label for="au">Distance</label>
<input id="au" type="range" min="0.3" max="40" step="0.1" value="1">
<output id="out" for="au">1.0 AU, 8.3 min</output>
<button id="ask" type="button">Ask about Voyager 1</button>
</div>
<script>
const range = document.getElementById("au");
const out = document.getElementById("out");
const format = (m) => m < 60 ? m.toFixed(1) + " min" : Math.floor(m / 60) + " h " + Math.round(m % 60) + " min";
const update = () => {
  const au = Number(range.value);
  out.textContent = au.toFixed(1) + " AU, " + format(au * ${LIGHT_MINUTES_PER_AU});
};
range.addEventListener("input", update);
update();
document.getElementById("ask").addEventListener("click", () =>
  sendPrompt("How long does a radio signal take to reach Voyager 1?"),
);
</script>`;

/** Splits text into token-sized pieces, the same way on every replay. */
export function tokenize(text: string): string[] {
  const chunks: string[] = [];
  let seed = 7;
  for (let i = 0; i < text.length;) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const size = 2 + (seed % 9);
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  return chunks;
}
