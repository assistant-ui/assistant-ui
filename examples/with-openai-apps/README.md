# MCP Apps Demo

This demo shows multiple independent MCP servers working with a single chat client using the remote Tool UI loading pattern.

## Quick Start

### Node-only (minimal setup)

```bash
pnpm install
pnpm build:assets
pnpm dev:node-only
```

This starts:
- Chat client at http://localhost:3005
- Assets server at http://localhost:4444
- Pizzaz Node server at http://localhost:8001
- Kitchen Sink Node server at http://localhost:8000

### Full Setup (Node + Python servers)

```bash
pnpm install
pnpm setup:python
pnpm build:assets
pnpm dev:all
```

This starts all servers:

| Server | Port | Type |
|--------|------|------|
| Chat client | 3005 | Next.js |
| Assets server | 4444 | Static |
| Kitchen Sink (Node) | 8000 | MCP |
| Pizzaz (Node) | 8001 | MCP |
| Pizzaz (Python) | 8002 | MCP |
| Kitchen Sink (Python) | 8003 | MCP |
| Solar System (Python) | 8004 | MCP |
| Shopping Cart (Python) | 8006 | MCP |

## Architecture

```
├── client/                          # Next.js chat app
├── servers/
│   ├── assets/                      # Built UI components (11 widgets)
│   ├── src/                         # UI source code
│   ├── setup-python.sh              # Python venv setup script
│   ├── pizzaz_server_node/          # Node MCP server
│   ├── pizzaz_server_python/        # Python MCP server
│   ├── kitchen_sink_server_node/    # Node MCP server
│   ├── kitchen_sink_server_python/  # Python MCP server
│   ├── solar-system_server_python/  # Python MCP server (3D solar system)
│   └── shopping_cart_python/        # Python MCP server (cart state demo)
└── package.json
```

## UI Widgets

The following widgets are built from `servers/src/`:

- **todo** - Task list with date picker
- **solar-system** - 3D solar system viewer (Three.js)
- **pizzaz** - Pizza map view
- **pizzaz-carousel** - Pizza carousel
- **pizzaz-list** - Pizza list view
- **pizzaz-albums** - Pizza album view
- **pizzaz-shop** - Interactive pizza shop with checkout
- **mixed-auth-search** - Search with optional auth
- **mixed-auth-past-orders** - Past orders (requires auth)
- **kitchen-sink-lite** - Demo of all widget APIs
- **shopping-cart** - Stateful shopping cart

## Testing

Open http://localhost:3005 and try:
- "Show me pizza places" (pizzaz servers)
- "Launch the kitchen sink demo" (kitchen sink servers)
- "Show the solar system" (solar system server)
- "Add items to my cart" (shopping cart server)

Each server runs independently and can be developed/deployed separately.

## Tool Namespacing

When multiple servers are enabled, tools are namespaced using the pattern `serverId__toolName` to prevent collisions. For example:

- `pizzaz-node__pizza-map`
- `pizzaz-python__pizza-map`
- `kitchen-sink-node__todo_list`

This format is required for OpenAI compatibility (function names must match `^[a-zA-Z0-9_-]{1,64}$`).

The LLM sees and uses these full namespaced names. When you ask "show me pizza places", the model will call the appropriate namespaced tool based on which servers are enabled.

## Production Deployment

This example uses hardcoded `localhost:4444` for the assets server. For production:

1. Set `ASSETS_BASE_URL` environment variable to your assets server URL
2. Restrict CORS to your actual client origin (currently uses `*` for development)
3. Deploy widget assets to a CDN or static hosting service