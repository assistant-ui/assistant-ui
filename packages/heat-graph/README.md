# `heat-graph`

[![npm version](https://img.shields.io/npm/v/heat-graph)](https://www.npmjs.com/package/heat-graph)
[![npm downloads](https://img.shields.io/npm/dm/heat-graph)](https://www.npmjs.com/package/heat-graph)
[![bundle size](https://img.shields.io/bundlephobia/minzip/heat-graph)](https://bundlephobia.com/package/heat-graph)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Headless, Radix-style React components for rendering GitHub-style activity heatmaps. Ships only the layout, date math, and tooltip wiring; you bring colors, sizing, and labels so the heatmap matches your design system.

## Installation

```bash
npm install heat-graph
```

## Usage

```tsx
import * as HeatGraph from "heat-graph";

const COLORS = ["#ebedf0", "#c6d7f9", "#8fb0f3", "#5888e8", "#2563eb"];

export function ActivityGraph({ data }: { data: HeatGraph.DataPoint[] }) {
  return (
    <HeatGraph.Root data={data} weekStart="monday" colorScale={COLORS}>
      <HeatGraph.Grid>
        {() => <HeatGraph.Cell />}
      </HeatGraph.Grid>
    </HeatGraph.Root>
  );
}
```

Compose `MonthLabels`, `DayLabels`, `Legend` / `LegendLevel`, and `Tooltip` (Radix Popper-backed) inside `Root` for the full GitHub-contributions look.

## Components

| Component                | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `Root`                   | Holds the data, week-start, and color-scale context.                    |
| `Grid` / `Cell`          | The week-by-day grid and one cell per day.                              |
| `MonthLabels`            | Render-prop component yielding month labels with column index.          |
| `DayLabels`              | Render-prop component yielding weekday labels with row index.           |
| `Legend` / `LegendLevel` | Color-scale legend bar.                                                 |
| `Tooltip`                | Tooltip that follows the hovered cell.                                  |

`autoLevels`, `MONTH_SHORT`, `DAY_SHORT`, plus `DataPoint`, `CellData`, and other types are exported for layout work.

## Documentation

Live demo and full reference at [assistant-ui.com/heat-graph](https://www.assistant-ui.com/heat-graph).
