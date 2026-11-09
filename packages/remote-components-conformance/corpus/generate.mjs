// Generates the LLM corpus for research/HTML-FIRST.md §5.
//   nomos secret run ANTHROPIC_API_KEY -- node corpus/generate.mjs
// Writes corpus/<style>-<task>.html. Committed, so the measurements are
// reproducible without a key.
import Anthropic from "@anthropic-ai/sdk";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();

const TASKS = {
  weather:
    "a weather card for Berlin with today's temperature and a 5-day forecast",
  pricing:
    "a pricing table with three plans (Free, Pro, Team) and a monthly/yearly toggle",
  todo: "a small to-do list where you can add, check off and delete items",
  chart:
    "a bar chart of monthly sales for the last six months, with a title and axis labels",
  login:
    "a sign-in form with email, password, a 'remember me' checkbox and a submit button",
  flight:
    "a flight itinerary card: SFO to JFK, departure and arrival times, seat, gate and a boarding-pass style layout",
  stock:
    "a stock quote widget for ACME with price, daily change and a small sparkline",
  recipe:
    "a recipe card for pancakes with an ingredient list, steps and a servings stepper",
  quiz: "a three-question multiple-choice quiz that shows the score at the end",
  calendar: "a month calendar view for March 2026 with two highlighted events",
  kanban:
    "a kanban board with three columns (To do, Doing, Done) and a few cards",
  settings:
    "a settings panel with three toggle switches, a select for language and a save button",
};

const STYLES = {
  // What a model does with no guidance at all.
  plain: {
    system: undefined,
    user: (t) =>
      `Make ${t}. Reply with a single self-contained HTML file and nothing else.`,
  },
  // Variation A: a full page, with a short contract.
  page: {
    system: `You write widgets that are shown inline in a chat app. Reply with one complete, self-contained HTML document and nothing else.
The document is the widget: <html> is its box. The host sets the width (about 400-700px); the height follows your content.
- Do not use vh/dvh units, height: 100% on html/body, or position: fixed. Do not centre the widget in the window.
- Leave the page background transparent; put backgrounds on your own elements. Text colour and font are inherited from the host.
- Theme variables you can use: --color-text, --color-text-muted, --color-surface, --color-border, --color-accent, --radius-md, --font-sans.`,
    user: (t) => `Make ${t}.`,
  },
  // Variation B: a fragment for our shell (generative-frame's rules).
  fragment: {
    system: `You write widgets that are shown inline in a chat app. Reply with an HTML fragment only: no <!doctype>, <html>, <head> or <body>. <style> and <script> tags are fine.
The fragment is placed in a container about 400-700px wide that grows to the height of your content. Never set a fixed height or 100vh on the outermost element, and do not use position: fixed or sticky at the top level.
Theme variables you can use: --color-text, --color-text-muted, --color-surface, --color-border, --color-accent, --radius-md, --font-sans.`,
    user: (t) => `Make ${t}.`,
  },
};

const jobs = [];
for (const [style, s] of Object.entries(STYLES))
  for (const [task, t] of Object.entries(TASKS))
    jobs.push({ style, task, s, t });

const strip = (text) =>
  text
    .replace(/^\s*```(?:html)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim() + "\n";

async function run(job) {
  const file = path.join(here, `${job.style}-${job.task}.html`);
  if (existsSync(file)) return;
  const res = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" },
    ...(job.s.system ? { system: job.s.system } : {}),
    messages: [{ role: "user", content: job.s.user(job.t) }],
  });
  if (res.stop_reason === "refusal")
    throw new Error(`refusal for ${job.style}-${job.task}`);
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  writeFileSync(file, strip(text));
  console.log(job.style, job.task, res.usage.output_tokens, "output tokens");
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length > 0) {
      const job = queue.shift();
      try {
        await run(job);
      } catch (e) {
        console.error(job.style, job.task, String(e));
      }
    }
  }),
);
