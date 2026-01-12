# Example: System Monitor App

A demo MCP App that displays real-time OS metrics with a stacked area chart for per-core CPU usage and a bar gauge for memory.

<table>
  <tr>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/system-monitor-server/01-initial-state.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/system-monitor-server/01-initial-state.png" alt="Initial state" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/system-monitor-server/02-cpu-data-accumulated.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/system-monitor-server/02-cpu-data-accumulated.png" alt="CPU data accumulated" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/system-monitor-server/03-extended-cpu-history.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/system-monitor-server/03-extended-cpu-history.png" alt="Extended CPU history" width="100%"></a></td>
  </tr>
</table>

## Features

- **Per-Core CPU Monitoring**: Stacked area chart showing individual CPU core utilization over a 1-minute sliding window
- **Memory Usage**: Horizontal bar gauge with color-coded thresholds (green/yellow/red)
- **System Info**: Hostname, platform, and uptime display
- **Auto-Polling**: Automatically starts monitoring on load with 2-second refresh interval
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

Exposes a single `get-system-stats` tool that returns:

- Raw per-core CPU timing data (idle/total counters)
- Memory usage (used/total/percentage)
- System info (hostname, platform, uptime)

The tool is linked to a UI resource via `_meta.ui.resourceUri`.

### App (`src/mcp-app.ts`)

- Uses Chart.js for the stacked area chart visualization
- Polls the server tool every 2 seconds
- Computes CPU usage percentages client-side from timing deltas
- Maintains a 30-point history (1 minute at 2s intervals)
- Updates all UI elements on each poll
