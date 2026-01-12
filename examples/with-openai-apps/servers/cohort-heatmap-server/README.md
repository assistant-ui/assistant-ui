# Example: Cohort Heatmap App

A demo MCP App that displays cohort retention data as an interactive heatmap, showing customer retention over time by signup month.

<table>
  <tr>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/cohort-heatmap-server/01-initial-view.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/cohort-heatmap-server/01-initial-view.png" alt="Initial view" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/cohort-heatmap-server/02-hover-state.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/cohort-heatmap-server/02-hover-state.png" alt="Hover state" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/cohort-heatmap-server/03-low-retention-hover.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/cohort-heatmap-server/03-low-retention-hover.png" alt="Low retention hover" width="100%"></a></td>
  </tr>
</table>

## Features

- **Cohort Retention Heatmap**: Color-coded grid showing retention percentages across cohorts and time periods
- **Multiple Metrics**: Switch between Retention %, Revenue Retention, and Active Users
- **Period Types**: View data by monthly or weekly intervals
- **Interactive Exploration**: Hover cells for detailed tooltips, click to highlight rows/columns
- **Color Scale**: Green (high retention) through yellow to red (low retention)
- **Theme Support**: Adapts to light/dark mode preferences

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

Exposes a single `get-cohort-data` tool that returns:

- Cohort rows with signup month, original user count, and retention cells
- Period headers and labels
- Configurable parameters: metric type, period type, cohort count, max periods

The tool generates synthetic cohort data using an exponential decay model with configurable retention curves per metric type.

### App (`src/mcp-app.tsx`)

- Uses React for the heatmap visualization
- Fetches data on mount and when filters change
- Displays retention percentages in a grid with HSL color interpolation
- Shows detailed tooltips on hover with user counts and exact retention values
- Supports row/column highlighting on cell click
