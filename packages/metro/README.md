# @assistant-ui/metro

Metro / Expo integration for [assistant-ui](https://www.assistant-ui.com): the
`"use generative"` directive compiler for React Native. It lets you author tools
with the **same** [`defineToolkit`](https://www.assistant-ui.com/docs/tools/defining-tools)
API as on the web: one file colocating a tool's schema, its `execute`, and its
`render`, then compiles them for the device (and any Expo Router server route).

Works with **Expo** and **bare React Native** (both bundle with Metro).

## Install

```sh
npm install --save-dev @assistant-ui/metro
```

## Setup

Wrap your Metro config with `withAui`:

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withAui } = require("@assistant-ui/metro");

const config = getDefaultConfig(__dirname);

module.exports = withAui(config);
```

Bare React Native (without Expo):

```js
// metro.config.js
const { getDefaultConfig } = require("@react-native/metro-config");
const { withAui } = require("@assistant-ui/metro");

module.exports = withAui(getDefaultConfig(__dirname));
```

## Usage

Author a `"use generative"` toolkit exactly like on the web, importing
`defineToolkit` from `@assistant-ui/react-native`:

```tsx
// toolkit.tsx
"use generative";

import { defineToolkit } from "@assistant-ui/react-native";
import { z } from "zod";
import { WeatherCard } from "./WeatherCard";

export default defineToolkit({
  get_weather: {
    description: "Get the weather for a city.",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => {
      "use client";
      return fetchWeather(city);
    },
    render: ({ args, result }) => <WeatherCard city={args.city} weather={result} />,
  },
});
```

Register it with `Tools({ toolkit })`, the same as on the web:

```tsx
import { Tools, useAui } from "@assistant-ui/react-native";
import toolkit from "./toolkit";

const aui = useAui({ tools: Tools({ toolkit }) });
```

## How it works

`withAui` points Metro's `babelTransformerPath` at this package's transformer,
which runs the `"use generative"` compiler and then delegates to your project's
existing transformer (Expo's or React Native's).

The build target follows Metro's environment: the device app gets the **client**
build (schema + `render` + frontend `execute`), while an Expo Router `+api`
route (bundled for a server environment) gets the **server** build (schema +
backend `execute`). This mirrors [`@assistant-ui/next`](https://www.assistant-ui.com/docs/tools/defining-tools)
and `@assistant-ui/vite`.

See the [Tools docs](https://www.assistant-ui.com/docs/tools/defining-tools) for
the full authoring API.
