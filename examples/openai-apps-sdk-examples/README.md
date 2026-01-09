# Apps SDK Examples Gallery

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This repository showcases example UI components to be used with the [Apps SDK](https://developers.openai.com/apps-sdk), as well as example MCP servers that expose a collection of components as tools.
It is meant to be used as a starting point and source of inspiration to build your own apps for ChatGPT.

---

## Running on MCP AUI (assistant-ui)

These examples work **without modification** on the MCP AUI standard implementation thanks to full OpenAI namespace compatibility.

### How It Works

The `@assistant-ui/tool-ui-server` bridge provides:

1. **`window.openai`** - Alias to `window.aui`, providing full API compatibility
2. **`openai:set_globals`** - Event dispatched alongside `aui:set_globals`  
3. **`OPENAI_*` message normalization** - Incoming messages normalized to `AUI_*`

This means widgets built with `window.openai` just work on MCP AUI.

### Quick Start

1. **Build the examples**:
   ```bash
   cd examples/openai-apps-sdk-examples
   pnpm install
   pnpm build
   ```

2. **Start the asset server**:
   ```bash
   pnpm serve  # Serves assets at http://localhost:4444
   ```

3. **Start the MCP AUI render server** (in another terminal):
   ```bash
   cd examples/mcp-server-with-ui
   pnpm build && pnpm build:ui && pnpm dev:ui  # http://localhost:3001
   ```

4. **Load a widget through the bridge**:
   ```
   http://localhost:3001/render?bundleUrl=http://localhost:4444/todo-2d2b.js&cssUrl=http://localhost:4444/todo-2d2b.css&rootId=todo-root
   ```

### Available Widgets

| Widget | URL Parameters |
|--------|----------------|
| Todo | `bundleUrl=http://localhost:4444/todo-2d2b.js&cssUrl=http://localhost:4444/todo-2d2b.css&rootId=todo-root` |
| Shopping Cart | `bundleUrl=http://localhost:4444/shopping-cart-2d2b.js&cssUrl=http://localhost:4444/shopping-cart-2d2b.css&rootId=shopping-cart-root` |
| Kitchen Sink | `bundleUrl=http://localhost:4444/kitchen-sink-lite-2d2b.js&cssUrl=http://localhost:4444/kitchen-sink-lite-2d2b.css&rootId=kitchen-sink-lite-root` |
| Solar System | `bundleUrl=http://localhost:4444/solar-system-2d2b.js&cssUrl=http://localhost:4444/solar-system-2d2b.css&rootId=solar-system-root` |
| Pizzaz Map | `bundleUrl=http://localhost:4444/pizzaz-2d2b.js&cssUrl=http://localhost:4444/pizzaz-2d2b.css&rootId=pizzaz-root` |
| Pizzaz List | `bundleUrl=http://localhost:4444/pizzaz-list-2d2b.js&cssUrl=http://localhost:4444/pizzaz-list-2d2b.css&rootId=pizzaz-list-root` |
| Pizzaz Carousel | `bundleUrl=http://localhost:4444/pizzaz-carousel-2d2b.js&cssUrl=http://localhost:4444/pizzaz-carousel-2d2b.css&rootId=pizzaz-carousel-root` |
| Pizzaz Shop | `bundleUrl=http://localhost:4444/pizzaz-shop-2d2b.js&cssUrl=http://localhost:4444/pizzaz-shop-2d2b.css&rootId=pizzaz-shop-root` |

### Compatibility

The bridge provides these OpenAI Apps SDK APIs:

| API | Status |
|-----|--------|
| `window.openai.theme` | ✅ Working |
| `window.openai.displayMode` | ✅ Working |
| `window.openai.toolInput` | ✅ Working |
| `window.openai.toolOutput` | ✅ Working |
| `window.openai.widgetState` | ✅ Working |
| `window.openai.setWidgetState()` | ✅ Working |
| `window.openai.callTool()` | ✅ Working |
| `window.openai.sendFollowUpMessage()` | ✅ Working |
| `window.openai.requestDisplayMode()` | ✅ Working |
| `window.openai.requestModal()` | ✅ Working |
| `window.openai.requestClose()` | ✅ Working |
| `window.openai.openExternal()` | ✅ Working |
| `openai:set_globals` event | ✅ Working |

---

Note: If you are on Chrome and have recently updated to version 142, you will need to disable the [`local-network-access` flag](https://developer.chrome.com/release-notes/142#local_network_access_restrictions) to see the widget UI.

How to disable it:

1. Go to chrome://flags/
2. Find #local-network-access-check
3. Set it to Disabled

⚠️ **Note 🚨 Make sure to restart Chrome after changing this flag for the update to take effect.**

## MCP + Apps SDK overview

The Model Context Protocol (MCP) is an open specification for connecting large language model clients to external tools, data, and user interfaces. An MCP server exposes tools that a model can call during a conversation and returns results according to the tool contracts. Those results can include extra metadata—such as inline HTML—that the Apps SDK uses to render rich UI components (widgets) alongside assistant messages.

Within the Apps SDK, MCP keeps the server, model, and UI in sync. By standardizing the wire format, authentication, and metadata, it lets ChatGPT reason about your connector the same way it reasons about built-in tools. A minimal MCP integration for Apps SDK implements three capabilities:

1. **List tools** – Your server advertises the tools it supports, including their JSON Schema input/output contracts and optional annotations (for example, `readOnlyHint`).
2. **Call tools** – When a model selects a tool, it issues a `call_tool` request with arguments that match the user intent. Your server executes the action and returns structured content the model can parse.
3. **Return widgets** – Alongside structured content, return embedded resources in the response metadata so the Apps SDK can render the interface inline in the Apps SDK client (ChatGPT).

Because the protocol is transport agnostic, you can host the server over Server-Sent Events or streaming HTTP—Apps SDK supports both.

The MCP servers in this demo highlight how each tool can light up widgets by combining structured payloads with `_meta.openai/outputTemplate` metadata returned from the MCP servers.

## Repository structure

- `src/` – Source for each widget example.
- `assets/` – Generated HTML, JS, and CSS bundles after running the build step.
- `shopping_cart_python/` – Python MCP server that demonstrates how `_meta["widgetSessionId"]` keeps `widgetState` in sync across turns for a shopping-cart widget.
- `pizzaz_server_node/` – MCP server implemented with the official TypeScript SDK.
- `pizzaz_server_python/` – Python MCP server that returns the Pizzaz widgets.
- `solar-system_server_python/` – Python MCP server for the 3D solar system widget.
- `kitchen_sink_server_node/` – Node MCP server for the kitchen-sink-lite widget.
- `kitchen_sink_server_python/` – Python MCP server for the kitchen-sink-lite widget.
- `authenticated_server_python/` – Python MCP server that demonstrates authenticated tool calls.
- `build-all.mts` – Vite build orchestrator that produces hashed bundles for every widget entrypoint.

### Pizzaz overview

This example contains multiple components showing multiple types of views and interactions: a list view, a carousel view, a map view. It also contains a "pizzaz shop" showing interactive flows and a checkout page.

This example uses the [Apps SDK UI library](https://github.com/openai/apps-sdk-ui) for simple components such as images, buttons, and badges.

### Kitchen sink lite overview

The kitchen sink lite sample shows the full `window.openai` surface working together:

- Reads host state (`toolInput`, `toolOutput`, `displayMode`, `theme`, `widgetState`).
- Writes host state with `setWidgetState`.
- Calls another MCP tool from the widget with `callTool`.
- Uses host helpers like `requestDisplayMode`, `openExternal`, and `sendFollowUpMessage`.

Use it as a reference for how to wire UI to MCP tool responses and host APIs with the Apps SDK UI components.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn
- Python 3.10+ (for the Python MCP server)
- pre-commit for formatting

## Install dependencies

Clone the repository and install the workspace dependencies:

```bash
pnpm install
pre-commit install
```

> Using npm or yarn? Install the root dependencies with your preferred client and adjust the commands below accordingly.

## Build the components gallery

The components are bundled into standalone assets that the MCP servers serve as reusable UI resources.

```bash
pnpm run build
```

This command runs `build-all.mts`, producing versioned `.html`, `.js`, and `.css` files inside `assets/`. Each widget is wrapped with the CSS it needs so you can host the bundles directly or ship them with your own server.

To iterate on your components locally, you can also launch the Vite dev server:

```bash
pnpm run dev
```

## Serve the static assets

All of the MCP servers expect the bundled HTML, JS, and CSS to be served from the local static file server. After every build, start the server before launching any MCP processes:

```bash
pnpm run serve
```

The assets are exposed at [`http://localhost:4444`](http://localhost:4444) with CORS enabled so that local tooling (including MCP inspectors) can fetch them.

> **Note:** The Python Pizzaz server caches widget HTML with `functools.lru_cache`. If you rebuild or manually edit files in `assets/`, restart the MCP server so it picks up the updated markup.

## Run the MCP servers

The repository ships several demo MCP servers that highlight different widget bundles:

- **Pizzaz (Node & Python)** – pizza-inspired collection of tools and components
- **Solar system (Python)** – 3D solar system viewer
- **Authenticated (Python)** – set of tools that require different levels of OAuth
- **Kitchen sink lite (Node & Python)** – minimal widget + server pairing that demonstrates tool output, widget state, `callTool`, and host helpers
- **Shopping cart (Python)** – simple shopping cart widget that demonstrates how to use `widgetSessionId` to keep state between tool calls

### Pizzaz Node server

```bash
cd pizzaz_server_node
pnpm start
```

### Pizzaz Python server

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r pizzaz_server_python/requirements.txt
uvicorn pizzaz_server_python.main:app --port 8000
```

### Authenticated Python server

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r authenticated_server_python/requirements.txt
uvicorn authenticated_python_server.main:app --port 8000
```

### Solar system Python server

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r solar-system_server_python/requirements.txt
uvicorn solar-system_server_python.main:app --port 8000
```

### Kitchen sink lite Node server

```bash
pnpm --filter kitchen-sink-mcp-node start
```

### Kitchen sink lite Python server

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r kitchen_sink_server_python/requirements.txt
uvicorn kitchen_sink_server_python.main:app --port 8000
```

### Shopping cart Python server

Use this example to learn how `_meta["widgetSessionId"]` can carry `widgetState` between tool calls so the model and widget share the same shopping cart. The widget merges tool responses with prior `widgetState`, and UI actions (like incrementing quantities) feed back into that shared state so the assistant always sees the latest cart.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r shopping_cart_python/requirements.txt
uvicorn shopping_cart_python.main:app --port 8000
```

> [!NOTE]
> In production you should persist the cart server-side (see [shopping_cart_python/README.md](shopping_cart_python/README.md)), but this demo shows the mechanics of keeping state through `widgetSessionId`.

---

You can reuse the same virtual environment for all Python servers—install the dependencies once and run whichever entry point you need.

## Testing in ChatGPT

To add these apps to ChatGPT, enable [developer mode](https://platform.openai.com/docs/guides/developer-mode), and add your apps in Settings > Connectors.

To add your local server without deploying it, you can use a tool like [ngrok](https://ngrok.com/) to expose your local server to the internet.

For example, once your mcp servers are running, you can run:

```bash
ngrok http 8000
```

You will get a public URL that you can use to add your local server to ChatGPT in Settings > Connectors.

For example: `https://<custom_endpoint>.ngrok-free.app/mcp`

> [!IMPORTANT]
> The Python MCP SDK enforces DNS rebinding protection. When tunneling (for example via ngrok), allow your tunnel host before starting any Python server:
>
> ```bash
> export MCP_ALLOWED_HOSTS="<custom_endpoint>.ngrok-free.app"
> export MCP_ALLOWED_ORIGINS="https://<custom_endpoint>.ngrok-free.app"
> ```

Once you add a connector, you can use it in ChatGPT conversations.

You can add your app to the conversation context by selecting it in the "More" options.

![more-chatgpt](https://github.com/user-attachments/assets/26852b36-7f9e-4f48-a515-aebd87173399)

You can then invoke tools by asking something related. For example, for the Pizzaz app, you can ask "What are the best pizzas in town?".

## Next steps

- Customize the widget data: edit the handlers in `pizzaz_server_node/src`, `pizzaz_server_python/main.py`, or the solar system server to fetch data from your systems.
- Create your own components and add them to the gallery: drop new entries into `src/` and they will be picked up automatically by the build script.

### Deploy your MCP server

You can use the cloud environment of your choice to deploy your MCP server.

Include this in the environment variables:

```
BASE_URL=https://your-server.com
```

This will be used to generate the HTML for the widgets so that they can serve static assets from this hosted url.

## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
