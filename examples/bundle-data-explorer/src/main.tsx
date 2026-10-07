import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { PreviewChat } from "../../bundle-shared/chat";
import {
  answerQuery,
  filterSales,
  money,
  regions,
  summarize,
  type Grouping,
  type RegionFilter,
} from "./data";
import "./styles.css";

function RevenueChart({ rows }: { rows: ReturnType<typeof summarize> }) {
  const maximum =
    Math.ceil(Math.max(...rows.map((row) => row.revenue)) / 20000) * 20000;
  const column = 520 / rows.length;
  return (
    <div className="explorer-chart-wrap">
      <div className="explorer-chart-axis" aria-hidden="true">
        <span>${maximum / 1000}k</span>
        <span>${maximum / 2000}k</span>
        <span>$0</span>
      </div>
      <div className="explorer-chart-plot">
        <svg
          className="explorer-chart"
          viewBox="0 0 520 160"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby="revenue-title revenue-description"
        >
          <title id="revenue-title">Revenue in US dollars</title>
          <desc id="revenue-description">
            {rows
              .map((row) => `${row.label}: ${money(row.revenue)}`)
              .join(". ")}
            . The same values are available in the chart data table.
          </desc>
          {[10, 85, 160].map((y) => (
            <line
              key={y}
              x1={0}
              y1={y}
              x2={520}
              y2={y}
              className="explorer-chart-grid"
            />
          ))}
          {rows.map((row, index) => {
            const height = (row.revenue / maximum) * 150;
            return (
              <rect
                key={row.label}
                x={index * column + column * 0.175}
                y={160 - height}
                width={column * 0.65}
                height={height}
                rx={3}
                className="explorer-bar"
              >
                <title>
                  {row.label}: {money(row.revenue)}, {row.orders} orders
                </title>
              </rect>
            );
          })}
        </svg>
        <div
          className="explorer-chart-labels"
          style={{
            gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
          }}
          aria-hidden="true"
        >
          {rows.map((row) => (
            <span key={row.label}>{row.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [filter, setFilter] = useState<RegionFilter>("All regions");
  const [grouping, setGrouping] = useState<Grouping>("month");
  const [update, setUpdate] = useState("Showing every sample record.");
  const rows = filterSales(filter);
  const chartRows = summarize(rows, grouping);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  const handlePrompt = useCallback((text: string, signal: AbortSignal) => {
    if (signal.aborted) return "The request was stopped.";
    const result = answerQuery(text);
    if (result.filter) setFilter(result.filter);
    if (result.grouping) setGrouping(result.grouping);
    if (result.filter || result.grouping) {
      setUpdate(
        `View updated: ${result.filter ?? "current region"}, grouped by ${result.grouping ?? "current grouping"}.`,
      );
    }
    return result.text;
  }, []);

  return (
    <main className="explorer">
      <header className="explorer-header">
        <div>
          <p className="explorer-eyebrow">Sample workspace</p>
          <h1>Explore the numbers.</h1>
          <p className="explorer-deck">
            Ask a question. Watch the view respond.
          </p>
        </div>
        <span className="explorer-mode">Deterministic local demo</span>
      </header>
      <div className="explorer-layout">
        <section
          className="explorer-workspace"
          aria-label="Sales data workspace"
        >
          <div className="explorer-dataset-heading">
            <div>
              <h2>Studio sales</h2>
              <p>January–June · Fictional sample dataset</p>
            </div>
            <span className="explorer-count">18 records</span>
          </div>
          <dl className="explorer-metrics">
            <div>
              <dt>Revenue</dt>
              <dd>{money(revenue)}</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd>{orders.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Visible records</dt>
              <dd>
                {rows.length}
                <span> / 18</span>
              </dd>
            </div>
          </dl>
          <div className="explorer-controls">
            <div className="flex flex-col gap-2">
              <span id="region-label" className="text-muted-foreground text-xs">
                Region
              </span>
              <Select<RegionFilter>
                value={filter}
                onValueChange={(value) => {
                  if (value === null) return;
                  setFilter(value);
                  setUpdate(`Showing ${value}.`);
                }}
              >
                <SelectTrigger aria-labelledby="region-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All regions">All regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className="explorer-grouping"
              role="group"
              aria-label="Group chart by"
            >
              <Button
                variant="outline"
                className="aria-pressed:bg-foreground aria-pressed:text-background"
                type="button"
                aria-pressed={grouping === "month"}
                onClick={() => {
                  setGrouping("month");
                  setUpdate("Chart grouped by month.");
                }}
              >
                By month
              </Button>
              <Button
                variant="outline"
                className="aria-pressed:bg-foreground aria-pressed:text-background"
                type="button"
                aria-pressed={grouping === "region"}
                onClick={() => {
                  setGrouping("region");
                  setUpdate("Chart grouped by region.");
                }}
              >
                By region
              </Button>
            </div>
          </div>
          <figure className="explorer-figure">
            <figcaption>
              <span>Revenue by {grouping}</span>
              <span>USD</span>
            </figcaption>
            <RevenueChart rows={chartRows} />
          </figure>
          <p className="explorer-update" role="status" aria-live="polite">
            {update}
          </p>
          <details className="explorer-table-section">
            <summary>
              Inspect chart data <span>{chartRows.length} groups</span>
            </summary>
            <div className="explorer-table-scroll">
              <table>
                <caption>
                  Revenue and orders grouped by {grouping};{" "}
                  {filter.toLowerCase()}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">
                      {grouping === "month" ? "Month" : "Region"}
                    </th>
                    <th scope="col">Revenue</th>
                    <th scope="col">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{money(row.revenue)}</td>
                      <td>{row.orders.toLocaleString("en-US")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>{money(revenue)}</td>
                    <td>{orders.toLocaleString("en-US")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
          <details className="explorer-table-section">
            <summary>
              Inspect source records <span>{rows.length} rows</span>
            </summary>
            <div className="explorer-table-scroll">
              <table>
                <caption>
                  Fictional source records; {filter.toLowerCase()}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Region</th>
                    <th scope="col">Revenue</th>
                    <th scope="col">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.month}-${row.region}`}>
                      <th scope="row">{row.month}</th>
                      <td>{row.region}</td>
                      <td>{money(row.revenue)}</td>
                      <td>{row.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <aside className="explorer-assistant" aria-label="Data assistant">
          <PreviewChat
            title="Ask about this dataset"
            intro="Find a pattern in the data."
            suggestions={[
              "Which region has the most revenue?",
              "Focus on Europe",
              "How did revenue grow?",
            ]}
            onPrompt={handlePrompt}
          />
          <p className="explorer-footnote">
            No model or server is connected. This demo recognizes the supported
            questions; it does not infer business causes.
          </p>
        </aside>
      </div>
    </main>
  );
}
