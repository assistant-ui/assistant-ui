import { clearWidgetStorage, createWidget } from "../src/index";
import { demoState, save } from "./shared";

const container = document.getElementById("widget")!;
const result = document.getElementById("result")!;

/** Renders a widget with `id`, runs `script` in it, and returns the state it reports. */
const run = async (id: string, script: string) => {
  let resolveState!: (state: unknown) => void;
  const state = new Promise((resolve) => {
    resolveState = resolve;
  });
  const widget = createWidget({
    container,
    id,
    product: "generative-frame-demo",
    onWidgetState: (value) => resolveState(value),
  });
  widget.write(`<p>Widget ${id}</p><script>${script}</script>`);
  await widget.end();
  const value = await state;
  const origin = widget.iframe ? new URL(widget.iframe.src).origin : "";
  widget.dispose();
  return { value, origin };
};

const read = `genframe.setState({ k: localStorage.getItem("k") });`;

async function scenario() {
  const steps: Record<string, unknown> = {};
  steps.writeA = await run("a", `localStorage.setItem("k", "v1"); ${read}`);
  steps.readA = await run("a", read);
  steps.readB = await run("b", read);
  steps.clear = await clearWidgetStorage("a", {
    product: "generative-frame-demo",
  });
  steps.readAfterClear = await run("a", read);
  const report = {
    persisted: (steps.readA as { value: { k: unknown } }).value.k === "v1",
    sameOrigin:
      (steps.writeA as { origin: string }).origin ===
      (steps.readA as { origin: string }).origin,
    isolated: (steps.readB as { value: { k: unknown } }).value.k === null,
    cleared:
      (steps.readAfterClear as { value: { k: unknown } }).value.k === null,
    steps,
  };
  result.textContent = JSON.stringify(report, null, 2);
  demoState.report = report;
  await save("storage-report.json", JSON.stringify(report, null, 2));
  demoState.done = true;
}

document
  .getElementById("run")!
  .addEventListener("click", () => void scenario());
if (demoState.auto) void scenario();
