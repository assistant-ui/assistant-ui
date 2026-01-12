# Example: Budget Allocator App

An interactive budget allocation tool demonstrating real-time data visualization with MCP Apps.

<table>
  <tr>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/budget-allocator-server/01-initial.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/budget-allocator-server/01-initial.png" alt="Initial" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/budget-allocator-server/02-over-budget.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/budget-allocator-server/02-over-budget.png" alt="Over budget" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/budget-allocator-server/03-tech-heavy.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/budget-allocator-server/03-tech-heavy.png" alt="Tech-heavy" width="100%"></a></td>
  </tr>
</table>

## Features

- **Interactive Sliders**: Adjust budget allocation across 5 categories (Marketing, Engineering, Operations, Sales, R&D)
- **Donut Chart**: Real-time visualization of allocation distribution using Chart.js
- **Sparkline Trends**: 24-month historical allocation data per category
- **Percentile Badges**: Compare your allocation vs. industry benchmarks
- **Stage Selector**: Switch between Seed, Series A, Series B, and Growth benchmarks
- **Budget Presets**: Quick selection of $50K, $100K, $250K, or $500K totals

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

## Architecture

### Server (`server.ts`)

Exposes a single `get-budget-data` tool that returns:

- Category definitions with colors and default allocations
- Historical data (~120 data points) - 24 months of allocation history per category
- Industry benchmarks (~60 data points) - Aggregated percentile data by company stage

The tool is linked to a UI resource via `_meta.ui.resourceUri`.

### App (`src/mcp-app.ts`)

- Uses Chart.js for the donut chart visualization
- Renders sparkline trends using inline SVG
- Computes percentile rankings client-side from benchmark data
- Updates all UI elements reactively on slider changes
