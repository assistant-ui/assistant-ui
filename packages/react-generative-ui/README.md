# @assistant-ui/react-generative-ui

Generative UI tools for assistant-ui.

## Installation

```bash
npm install @assistant-ui/react-generative-ui
```

## Usage

Declare the components the model is allowed to render in a library, then expose
them through the `present` tool. The model emits a `{ $type, ...props }` tree
(`$type` names the component, so a real `type` prop never collides); the tool
renders it against the library.

```tsx
import { JSONGenerativeUI } from "@assistant-ui/react-generative-ui";
import { Thread, Tools } from "@assistant-ui/react";
import { z } from "zod";

const generativeUI = new JSONGenerativeUI({
  library: {
    Card: {
      description: "A card container with a title.",
      properties: z.object({ title: z.string() }),
      render: ({ title, children }) => (
        <section className="card">
          <h3>{title}</h3>
          {children}
        </section>
      ),
    },
    Text: {
      description: "A run of text.",
      properties: z.object({ tone: z.enum(["muted", "normal"]).optional() }),
      render: ({ tone, children }) => <p data-tone={tone}>{children}</p>,
    },
  },
});

const toolkit = {
  present: generativeUI.present(),
};

function App() {
  return (
    <Thread>
      <Tools toolkit={toolkit} />
      {/* MessageList, Composer, ... */}
    </Thread>
  );
}
```

A node's `children` prop is rendered recursively, so components can be nested:

```json
{
  "$type": "Card",
  "title": "Hello",
  "children": [{ "$type": "Text", "tone": "muted", "children": "Nested text" }]
}
```

## Streaming props

By default a component renders only once its props have fully arrived, so
`render` always sees complete props. Opt into rendering from partial props with
`streamProperties`. When you do, `render` receives an injected `$status` prop
that discriminates the props: while `"streaming"` they are `Partial`, and once
`"done"` they are complete.

```tsx
const generativeUI = new JSONGenerativeUI({
  library: {
    Weather: {
      description: "A live weather card.",
      properties: z.object({ city: z.string(), temp: z.number() }),
      streamProperties: true,
      render: (props) => {
        if (props.$status === "done") {
          return <Card>{`${props.city}: ${props.temp}°`}</Card>; // complete props
        }
        return <Card>{props.city ?? "Loading…"}</Card>; // partial props
      },
    },
  },
});
```

`render` is a function of `props`, not a React component — but it runs on its
own fiber, so you can call hooks inside it as usual.

## `"use generative"` authoring

The examples above wire the library up by hand on the client. With the
`"use generative"` compiler (`@assistant-ui/next` or `@assistant-ui/vite`) you
can instead colocate a component's `properties` schema with its `render` and
expose the library as tools, and the build splits each half to the right target:
the schema goes to the server (so the model sees the tool), the `render` stays on
the client.

```tsx
"use generative";

import { z } from "zod";
import { Weather } from "@/components/weather";
import { defineToolkit } from "@assistant-ui/react";
import {
  JSONGenerativeUI,
  defineGenerativeComponents,
} from "@assistant-ui/react-generative-ui";

const generative = new JSONGenerativeUI({
  library: defineGenerativeComponents({
    Weather: {
      description: "Show a weather card.",
      properties: z.object({ city: z.string() }),
      render: (props) => <Weather {...props} />,
    },
  }),
});

export default defineToolkit({
  // `present` displays a component; `prompt_user` is a human-in-the-loop prompt.
  present: generative.present(),
  prompt_user: generative.promptUser(),
});
```

The model calls `present` with a node like `{ "$type": "Weather", "city": "SF" }`.
Pass `present({ display: "standalone" })` to render the component on its own
surface instead of inline. See the
[`"use generative"` docs](https://www.assistant-ui.com/docs) for the build setup.

## License

MIT
