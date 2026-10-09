const BUGGY = `<style>
.bars{display:grid;gap:8px}
.bar{display:grid;grid-template-columns:72px 1fr 56px;gap:8px;align-items:center;font-size:14px}
.fill{height:12px;border-radius:999px;background:var(--chart-1)}
</style>
<h3 style="margin:0 0 4px">Signups by plan</h3>
<p style="margin:0 0 12px;color:var(--color-text-muted);font-size:14px">Last 30 days</p>
<div class="bars" id="bars"></div>
<p style="margin:12px 0 0"><button id="ask">Which plan converts best?</button></p>
<script>
const data = [["Free", 1840], ["Pro", 620], ["Team", 210]];
const max = Math.max(...data.map(([, v]) => v));
document.getElementById("bars").innerHTML = data.map(([label, value], i) =>
  \`<div class="bar"><span>\${label}</span><span class="fill" style="width:\${(value / max) * 100}%;background:var(--chart-\${i + 1})"></span><span>\${formatCount(value)}</span></div>\`).join("");
document.getElementById("ask").addEventListener("click", () => sendPrompt("Which plan converts best?"));
</script>`;

const FIX = {
  old_string: "const data = [",
  new_string:
    'const formatCount = (n) => n.toLocaleString("en-US");\nconst data = [',
};

/** The widget a recorded sub-agent produced: buggy code, then one edit. */
export const SIGNUPS_CODE = BUGGY.replace(FIX.old_string, FIX.new_string);
