import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SpecRenderer, useSpecStream } from "../src/spec/react";
import {
  createStateStore,
  validateSpec,
  type SpecStateStore,
} from "../src/spec";
import { catalog, components, DASHBOARD_REPLY, DATA } from "./catalog";
import { applyDemoTheme, demoState, save, sleep } from "./shared";

function App() {
  const { spec, text, errors, push, end, reset } = useSpecStream({
    mode: "inline",
  });
  const [store] = useState<SpecStateStore>(() => createStateStore());
  const [log, setLog] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const started = useRef(false);
  const append = (line: string) => {
    demoState.log.push(line);
    setLog((previous) => [...previous, line]);
  };

  useEffect(() => {
    store.seed(spec.state ?? {});
  }, [store, spec.state]);

  const stream = async () => {
    reset();
    setStreaming(true);
    for (let i = 0; i < DASHBOARD_REPLY.length; i += 24) {
      push(DASHBOARD_REPLY.slice(i, i + 24));
      await sleep(12);
    }
    end();
    setStreaming(false);
    demoState.steps.push("streamed");
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      await stream();
      if (!demoState.auto) return;
      await sleep(200);
      demoState.report["afterStream"] = { ...store.getState() };
      (
        document.querySelector('[data-spec-id="refresh"]') as HTMLButtonElement
      ).click();
      await sleep(100);
      const select = document.querySelector(
        '[data-spec-id="range"]',
      ) as HTMLSelectElement;
      select.value = "30d";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(300);
      (
        document.querySelector('[data-spec-id="ask"]') as HTMLButtonElement
      ).click();
      await sleep(100);
      demoState.report["afterActions"] = { ...store.getState() };
      demoState.report["dom"] = document.querySelector("main")!.innerText;
      await save(
        `spec-report${demoState.dark ? "-dark" : ""}.json`,
        JSON.stringify(demoState.report, null, 2),
      );
      demoState.done = true;
    })();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validation = validateSpec(spec, catalog, { partial: streaming });
  demoState.report["validation"] = validation;
  demoState.report["streamErrors"] = errors;

  return (
    <main>
      <h1>Spec mode</h1>
      <p className="lead">
        A recorded inline reply streams JSONL patches into trusted components.
      </p>
      <div className="controls">
        <button type="button" onClick={() => void stream()}>
          Stream again
        </button>
        <button
          type="button"
          onClick={() => {
            document.documentElement.classList.toggle("dark");
          }}
        >
          Toggle theme
        </button>
      </div>
      <div className="bubble">
        <p className="prose">{text}</p>
        <SpecRenderer
          spec={spec}
          catalog={catalog}
          components={components}
          state={store}
          streaming={streaming}
          handlers={{
            refresh: ({ range }, { state }) => {
              const data = DATA[String(range)] ?? DATA["7d"]!;
              state.set("/metrics", {
                revenue: data.revenue,
                delta: data.delta,
                orders: data.orders,
              });
              state.set("/regions", data.regions);
              state.set("/updated", new Date().toISOString().slice(11, 19));
              append(`refresh(${String(range)})`);
            },
            ask: ({ question }) => {
              demoState.prompts.push(String(question));
              append(`ask → ${String(question)}`);
            },
          }}
        />
      </div>
      <p className="lead">
        {validation.ok
          ? "Spec is valid."
          : `${validation.issues.length} issue(s)`}{" "}
        · {Object.keys(spec.elements).length} elements
      </p>
      <div id="log">{log.join("\n")}</div>
    </main>
  );
}

applyDemoTheme();
createRoot(document.getElementById("root")!).render(<App />);
