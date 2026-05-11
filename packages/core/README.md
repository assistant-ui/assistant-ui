# `@assistant-ui/core`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/core)](https://www.npmjs.com/package/@assistant-ui/core)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

The framework-agnostic core of assistant-ui. Defines the shared types, runtime interfaces, adapter contracts, and React bindings that the distribution packages re-export.

Most users do not install `@assistant-ui/core` directly. Reach for the distribution that matches your target:

| Distribution                  | Use this for          |
| ----------------------------- | --------------------- |
| `@assistant-ui/react`         | Web applications.     |
| `@assistant-ui/react-native`  | React Native apps.    |
| `@assistant-ui/react-ink`     | Terminal/Ink apps.    |

`core` is published so that integration libraries (for example `@assistant-ui/react-ag-ui`) can depend on the runtime types without pulling in DOM or native primitives.

## Installation

```bash
npm install @assistant-ui/core
```

## Usage

```ts
import { tool, ModelContextRegistry } from "@assistant-ui/core";
import { z } from "zod";

const registry = new ModelContextRegistry();

registry.registerTool({
  name: "getWeather",
  ...tool({
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => fetchWeather(city),
  }),
});
```

## Sub-paths

`@assistant-ui/core` exposes `.`, `./react`, `./store`, and `./internal` sub-paths. The `./react` sub-path holds the React hooks and providers consumed by `@assistant-ui/react` and `@assistant-ui/react-native`.

Full reference for message types, runtime interfaces, and adapter contracts at [assistant-ui.com/docs/architecture](https://www.assistant-ui.com/docs/architecture).
