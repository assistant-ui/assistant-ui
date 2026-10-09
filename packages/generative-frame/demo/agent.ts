import { createWidgetAgent, type WidgetAgentEvent } from "../src/agent";
import { createWidget, readThemeTokens } from "../src/index";
import { applyDemoTheme, demoState, save, sleep } from "./shared";
import { RECORDED_STEPS, replayModel } from "./recorded";

applyDemoTheme();
const log = (line: string) => {
  demoState.log.push(line);
  const el = document.getElementById("log")!;
  el.textContent += `${line}\n`;
};

async function run() {
  const container = document.getElementById("widget")!;
  container.replaceChildren();
  const widget = createWidget({
    container,
    product: "generative-frame-demo",
    tokens: readThemeTokens(),
    onPrompt: (text) => {
      demoState.prompts.push(text);
      log(`sendPrompt → ${text}`);
    },
  });
  const agent = createWidgetAgent({
    model: replayModel(RECORDED_STEPS),
    settleMs: 400,
    onEvent: (event: WidgetAgentEvent) => {
      if (event.type === "code-delta") return;
      if (event.type === "status")
        document.getElementById("status")!.textContent = event.text;
      log(
        event.type === "feedback"
          ? `feedback round ${event.round}: ${event.ok ? "ok" : event.text.split("\n").slice(0, 3).join(" | ")}`
          : event.type === "code"
            ? `code (${event.code.length} chars)`
            : event.type === "done"
              ? "done"
              : `${event.type}${"text" in event ? `: ${event.text}` : ""}`,
      );
    },
  });
  // The main agent would call agent.tool.execute(input); the sink here is the live widget.
  const result = await agent.generate(
    {
      brief: "Signups by plan for the last 30 days, as a bar chart",
      title: "signups_by_plan",
      data: { Free: 1840, Pro: 620, Team: 210 },
    },
    { sink: widget },
  );
  const { code: _code, ...shown } = result;
  document.getElementById("result")!.textContent = JSON.stringify(
    shown,
    null,
    2,
  );
  document.getElementById("status")!.textContent = result.summary;
  demoState.report["result"] = shown;
  return widget;
}

document.getElementById("run")!.addEventListener("click", () => void run());

void (async () => {
  const widget = await run();
  if (!demoState.auto) return;
  await sleep(500);
  const shot = await widget.screenshot();
  await save(`agent-widget${demoState.dark ? "-dark" : ""}.png`, shot.dataUrl);
  demoState.report["inspection"] = {
    ...(await widget.inspect()),
    code: undefined,
  };
  await save(
    `agent-report${demoState.dark ? "-dark" : ""}.json`,
    JSON.stringify(demoState.report, null, 2),
  );
  demoState.done = true;
})();
