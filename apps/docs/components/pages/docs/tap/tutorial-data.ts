export type TapTutorialStep = {
  title: string;
  filename: string;
  language: string;
  code: string;
  /** Hard-cut into this step instead of animating from the previous one. */
  cut?: boolean;
  /** Footer explanation for the step. */
  prose: string;
};

const useCounterFull = `const useCounter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount((value) => value + 1);
  const decrement = () => setCount((value) => value - 1);
  return { count, increment, decrement };
};`;

export const tapTutorialSteps: TapTutorialStep[] = [
  {
    title: "Write a Hook",
    filename: "counter.jsx",
    language: "jsx",
    prose:
      "Start with a Hook you'd write anyway: a count and the method that updates it.",
    code: `import { useState } from "react";

${useCounterFull}`,
  },
  {
    title: "Turn it into a Resource",
    filename: "counter.jsx",
    language: "jsx",
    prose:
      "resource() packages the Hook into Counter — a reusable building block for state.",
    code: `import { useState } from "react";
import { resource } from "@assistant-ui/tap";

${useCounterFull}

// !tooltip[/resource/] Wraps a hook into a resource element factory.
export const Counter = resource(useCounter);`,
  },
  {
    title: "Render it in React",
    filename: "counter.jsx",
    language: "jsx",
    prose: "useResource(Counter()) renders the Resource and returns its value.",
    code: `import { useState } from "react";
import { resource, useResource } from "@assistant-ui/tap";

// !collapse(1:6) collapsed
${useCounterFull}

export const Counter = resource(useCounter);

function CounterButton() {
  // !tooltip[/useResource/] Renders the resource and returns its value.
  const { count, increment, decrement } = useResource(Counter());

  return (
    <>
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </>
  );
}`,
  },
  {
    title: "Run it without React",
    filename: "main.js",
    language: "js",
    cut: true,
    prose:
      "The exact same Counter, no React tree. createTapRoot hosts it; subscribe and call its methods directly.",
    code: `import { createTapRoot, useResource } from "@assistant-ui/tap";
import { Counter } from "./counter";

const root = createTapRoot(function CounterRoot() {
  return useResource(Counter());
});

root.subscribe(() => {
  console.log(root.getValue().count);
});

root.getValue().increment();

root.unmount();`,
  },
];
