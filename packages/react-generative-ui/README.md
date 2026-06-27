# @assistant-ui/react-generative-ui

> **Experimental.** This package is experimental. The API surface
> (`JSONGenerativeUI`, `defaultGenerativeUILibrary`, `ActionRegistry`, the
> `./ir` subpath, the closed vocabulary) may change between minor versions
> without a major bump while it stabilizes. Pin the version if you depend on
> it in production.

Generative UI tools for assistant-ui. The model emits a JSON tree of
components; the `present` tool renders it against a library you provide.

## Installation

```bash
npm install @assistant-ui/react-generative-ui
```

## Quick start with the default vocabulary

The package ships `defaultGenerativeUILibrary`, a closed set of 20 unstyled
structural components (`Card`, `Text`, `Button`, `Alert`, `Table`, `Chart`,
...). Pass it as the library and the model can compose any of them:

```tsx
import {
  JSONGenerativeUI,
  defaultGenerativeUILibrary,
} from "@assistant-ui/react-generative-ui";
import { Thread, Tools } from "@assistant-ui/react";

const generativeUI = new JSONGenerativeUI({
  library: defaultGenerativeUILibrary,
});

function App() {
  return (
    <Thread>
      <Tools toolkit={{ present: generativeUI.present() }} />
    </Thread>
  );
}
```

The default components render unstyled semantic HTML with `data-aui`
attributes for you to style. Override individual types with your own
`render` to bring your own style:

```tsx
import { defaultGenerativeUILibrary } from "@assistant-ui/react-generative-ui";

const myLibrary = {
  ...defaultGenerativeUILibrary,
  Card: {
    ...defaultGenerativeUILibrary.Card!,
    render: ({ title, children }) => (
      <div className="rounded-xl border p-4">
        {title && <h3 className="font-semibold">{title}</h3>}
        {children}
      </div>
    ),
  },
};
```

## Custom library

Author your own components instead of or alongside the defaults. Each entry
has a `description` (shown to the model), a zod `properties` schema (drives
the tool parameters), and a `render` function:

```tsx
import { JSONGenerativeUI } from "@assistant-ui/react-generative-ui";
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

const toolkit = { present: generativeUI.present() };
```

The model emits a `{ $type, ...props }` tree (`$type` names the component,
so a real `type` prop never collides); the tool renders it against the
library. A node's `children` prop is rendered recursively:

```json
{
  "$type": "Card",
  "title": "Hello",
  "children": [{ "$type": "Text", "tone": "muted", "children": "Nested text" }]
}
```

## Actions and dispatch

Interactive components (`Button`, `Select`, `Input`, `DatePicker`) carry a
`$action` prop, a serializable payload describing what should happen when the
user interacts. Wire an `ActionRegistry` to resolve `$action.type` to a
handler:

```tsx
import {
  JSONGenerativeUI,
  defaultGenerativeUILibrary,
  createActionRegistry,
} from "@assistant-ui/react-generative-ui";

const actions = createActionRegistry({
  purchase: ({ payload }) => {
    console.log("Purchase:", payload.itemId);
  },
  rsvp: ({ payload }) => {
    console.log("RSVP:", payload.$input);
  },
});

const generativeUI = new JSONGenerativeUI({
  library: defaultGenerativeUILibrary,
  actions,
});
```

The renderer injects a `$dispatch` prop into interactive components'
`render`. When the user clicks a button or selects an option, `$dispatch`
fires the matching handler with the action payload. For `Select`, `Input`,
and `DatePicker`, the user's runtime value (selected option, entered text,
picked date) is merged into the payload under the reserved `$input` key so
a model-supplied `value` field is never clobbered.

Omit `actions` for a read-only render: `$dispatch` is left un-injected, so
interactive clicks stay silent (no handler call, no warning). An unknown
action type degrades to a no-op with a dev warning rather than throwing.

## Streaming props

By default a component renders only once its props have fully arrived, so
`render` always sees complete props. Opt into rendering from partial props
with `streamProperties`. When you do, `render` receives an injected `$status`
prop that discriminates the props: while `"streaming"` they are `Partial`,
and once `"done"` they are complete.

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

## The `./ir` subpath

The IR types (`UINode`, `UIElement`, `Action`, `NormalizedUINode`,
`normalizeUINode`) live behind a React-free subpath
(`@assistant-ui/react-generative-ui/ir`) so converters and non-web runtimes
can consume the types without pulling React. Cross-boundary consumers should
use `import type {}` so the runtime graph stays React-free.

## License

MIT
