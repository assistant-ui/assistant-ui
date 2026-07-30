import type { CodeSlideshowStep } from "@/components/docs/code-slideshow";

const useCounterFull = `const useCounter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount((value) => value + 1);
  return { count, increment };
};`;

const useCounterCollapsed = `// !collapse(1:5) collapsed
${useCounterFull}`;

export const tapTutorialSteps: CodeSlideshowStep[] = [
  {
    title: "Write a Hook",
    filename: "counter.jsx",
    language: "jsx",
    code: `import { useState } from "react";

${useCounterFull}`,
  },
  {
    title: "Create a Resource",
    filename: "counter.jsx",
    language: "jsx",
    code: `import { useState } from "react";
import { resource } from "@assistant-ui/tap";

${useCounterFull}

// !tooltip[/resource/] Wraps a hook into a resource element factory.
// !tooltip[/Counter/] () => ({ hook: useCounter, args: [] })
const Counter = resource(useCounter);`,
  },
  {
    title: "Use it in React",
    filename: "counter.jsx",
    language: "jsx",
    code: `import { useState } from "react";
import { resource, useResource } from "@assistant-ui/tap";

${useCounterCollapsed}

const Counter = resource(useCounter);

function CounterButton() {
  // !tooltip[/useResource/] Renders the resource as a child and returns its value.
  // !tooltip[/Counter\\(\\)/] This returns a ResourceElement
  const { count, increment } = useResource(Counter());

  return <button onClick={increment}>{count}</button>;
}`,
  },
  {
    title: "Swap the implementation",
    filename: "counter.jsx",
    language: "jsx",
    code: `import { useState } from "react";
import { resource, useResource } from "@assistant-ui/tap";
import { PersistentCounter } from "./persistent-counter";

${useCounterCollapsed}

const Counter = resource(useCounter);

function CounterButton({ id }) {
  const { count, increment } = useResource(
    id ? PersistentCounter(id) : Counter(),
  );

  return <button onClick={increment}>{count}</button>;
}`,
  },
  {
    title: "Accept an implementation",
    filename: "counter.jsx",
    language: "jsx",
    code: `import { useState } from "react";
import { resource, useResource } from "@assistant-ui/tap";
import { PersistentCounter } from "./persistent-counter";

${useCounterCollapsed}

const Counter = resource(useCounter);

function CounterButton({ counter = Counter() }) {
  const { count, increment } = useResource(counter);

  return <button onClick={increment}>{count}</button>;
}

function App() {
  return <CounterButton counter={PersistentCounter("main")} />;
}`,
  },
  {
    title: "Render a dynamic collection",
    filename: "counter-list.jsx",
    language: "jsx",
    cut: true,
    code: `// !mark(1:2)
import { useResources, withKey } from "@assistant-ui/tap";
import { Counter } from "./counter";

function CounterList({ ids }) {
  // !mark(1:3)
  const counters = useResources(
    ids.map((id) => withKey(id, Counter())),
  );

  // !mark(1:9)
  return ids.map((id, index) => {
    const { count, increment } = counters[index];

    return (
      <button key={id} onClick={increment}>
        {id}: {count}
      </button>
    );
  });
}`,
  },
  {
    title: "Run hooks outside React",
    filename: "counter-root.js",
    language: "js",
    cut: true,
    code: `import { createTapRoot, flushTapSync } from "@assistant-ui/tap";
import { useCounter } from "./counter";

const root = createTapRoot(function CounterRoot() {
  return useCounter();
});

const unsubscribe = root.subscribe(() => {
  console.log(root.getValue().count); // 1
});

flushTapSync(() => root.getValue().increment());

unsubscribe();
root.unmount();`,
  },
];
