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

## License

MIT
