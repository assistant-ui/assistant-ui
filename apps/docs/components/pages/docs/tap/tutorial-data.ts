export type TapTutorialStep = {
  title: string;
  filename: string;
  language: string;
  code: string;
  /** Hard-cut into this step instead of animating from the previous one. */
  cut?: boolean;
  /** Footer explanation for the step. */
  prose: string;
  /** What drives the (unchanging) counter preview on this step. */
  poweredBy: string;
};

const useCounterFull = `const useCounter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount((value) => value + 1);
  return { count, increment };
};`;

export const tapTutorialSteps: TapTutorialStep[] = [
  {
    title: "Write a Hook",
    filename: "counter.jsx",
    language: "jsx",
    prose:
      "Start with a Hook you'd write anyway: a count and the method that updates it.",
    poweredBy: "useCounter — a plain React Hook",
    code: `import { useState } from "react";

${useCounterFull}`,
  },
  {
    title: "Turn it into a Resource",
    filename: "counter.jsx",
    language: "jsx",
    prose:
      "resource() packages the Hook into Counter — a reusable building block for state.",
    poweredBy: "the same Hook, packaged as the Counter Resource",
    code: `import { useState } from "react";
import { resource } from "@assistant-ui/tap";

${useCounterFull}

// !tooltip[/resource/] Wraps a hook into a resource element factory.
const Counter = resource(useCounter);`,
  },
  {
    title: "Render it in React",
    filename: "counter.jsx",
    language: "jsx",
    prose:
      "useResource(Counter()) renders the Resource and returns its value. This preview is that component.",
    poweredBy: "<CounterButton /> via useResource(Counter())",
    code: `import { useState } from "react";
import { resource, useResource } from "@assistant-ui/tap";

// !collapse(1:5) collapsed
${useCounterFull}

const Counter = resource(useCounter);

function CounterButton() {
  // !tooltip[/useResource/] Renders the resource and returns its value.
  const { count, increment } = useResource(Counter());

  return <button onClick={increment}>{count}</button>;
}`,
  },
  {
    title: "Run it without React",
    filename: "main.js",
    language: "js",
    cut: true,
    prose:
      "The exact same Counter, no React tree. createTapRoot hosts it; subscribe and call its methods directly.",
    poweredBy: "a tap root — no React involved",
    code: `import { createTapRoot, useResource } from "@assistant-ui/tap";
import { Counter } from "./counter";

const root = createTapRoot(function CounterRoot() {
  return useResource(Counter());
});

root.subscribe(() => {
  console.log(root.getValue().count);
});

root.getValue().increment();`,
  },
];
