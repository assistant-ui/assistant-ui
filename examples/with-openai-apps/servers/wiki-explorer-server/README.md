# Example: Wiki Explorer

Visualizes Wikipedia link graphs using a force-directed layout. Explore how Wikipedia pages are connected by expanding nodes to reveal first-degree links.

<table>
  <tr>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/wiki-explorer-server/01-zoomed.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/wiki-explorer-server/01-zoomed.png" alt="Zoomed" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/wiki-explorer-server/02-pop-up.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/wiki-explorer-server/02-pop-up.png" alt="Pop-up" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/wiki-explorer-server/03-expanded-graph.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/wiki-explorer-server/03-expanded-graph.png" alt="Expanded graph" width="100%"></a></td>
  </tr>
</table>

## Features

- **Force-directed graph visualization**: Interactive graph powered by [`force-graph`](https://github.com/vasturiano/force-graph)
- **Node expansion**: Click any node to expand and see all pages it links to
- **Visual state tracking**: Nodes change color based on state (blue = default, green = expanded, red = error)
- **Direct page access**: Open any Wikipedia page in your browser

## Running

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build and start the server:

   ```bash
   npm run start:http  # for Streamable HTTP transport
   # OR
   npm run start:stdio  # for stdio transport
   ```

3. View using the [`basic-host`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) example or another MCP Apps-compatible host.

### Tool Input

To test the example, call the `get-first-degree-links` tool with a Wikipedia URL:

```json
{
  "url": "https://en.wikipedia.org/wiki/Graph_theory"
}
```

Click nodes in the graph to **Open** (view in browser) or **Expand** (visualize linked pages).

## Architecture

### Server (`server.ts`)

MCP server that fetches Wikipedia pages and extracts internal links.

Exposes one tool:

- `get-first-degree-links` - Returns links to other Wikipedia pages from a given page

### App (`src/mcp-app.ts`)

Vanilla TypeScript app using force-graph for visualization that:

- Receives tool inputs via the MCP App SDK
- Renders an interactive force-directed graph
- Supports node expansion to explore link relationships
