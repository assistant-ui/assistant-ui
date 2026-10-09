import type { AgentModelEvent, WidgetAgentModel } from "../src/agent";

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

const toolCall = (
  id: string,
  name: string,
  args: unknown,
  size = 24,
): AgentModelEvent[] => {
  const text = JSON.stringify(args);
  const events: AgentModelEvent[] = [];
  for (let i = 0; i < text.length; i += size) {
    events.push({
      type: "tool-call-delta",
      id,
      ...(i === 0 ? { name } : {}),
      argsTextDelta: text.slice(i, i + size),
    });
  }
  events.push({ type: "tool-call", id, name, args }, { type: "finish" });
  return events;
};

/** What a sub-agent sent for one brief, recorded as model stream events per call. */
export const RECORDED_STEPS: AgentModelEvent[][] = [
  toolCall("call_1", "read_me", { modules: ["chart"] }),
  toolCall("call_2", "show_widget", {
    title: "signups_by_plan",
    loading_messages: ["Counting signups"],
    widget_code: BUGGY,
  }),
  toolCall("call_3", "edit_widget", { title: "signups_by_plan", edits: [FIX] }),
  [
    ...[
      "Bar chart of ",
      "30-day signups by plan, ",
      "with Free far ahead.",
    ].map((text) => ({ type: "text-delta" as const, text })),
    { type: "finish" },
  ],
];

/** Replays recorded steps with a delay per event, ignoring what it is sent. */
export const replayModel = (
  steps: AgentModelEvent[][],
  delayMs = 15,
): WidgetAgentModel => {
  let call = 0;
  return async function* replay() {
    const events = steps[call++] ?? [{ type: "text-delta", text: "Done." }];
    for (const event of events) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      yield event;
    }
  };
};
