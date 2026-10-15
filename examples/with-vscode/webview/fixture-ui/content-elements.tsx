import type {
  DataMessagePartComponent,
  ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { Chart } from "@assistant-ui/ui/components/assistant-ui/elements/chart.tsx";
import { CodeDiff } from "@assistant-ui/ui/components/assistant-ui/elements/code-diff.tsx";
import {
  DataTable,
  type DataTableColumn,
} from "@assistant-ui/ui/components/assistant-ui/elements/data-table.tsx";
import { RetrievalChunks } from "@assistant-ui/ui/components/assistant-ui/elements/retrieval-chunks.tsx";
import { TerminalBlock } from "@assistant-ui/ui/components/assistant-ui/elements/terminal-block.tsx";
import { WebSearch } from "@assistant-ui/ui/components/assistant-ui/elements/web-search.tsx";
import {
  CHART_DATA,
  DIFF_DATA,
  RETRIEVE_TOOL,
  RUN_TESTS_TOOL,
  TABLE_DATA,
  WEB_SEARCH_TOOL,
  type ChartData,
  type DiffData,
  type RetrieveArgs,
  type RetrieveResult,
  type RunTestsArgs,
  type RunTestsResult,
  type TableData,
  type WebSearchArgs,
  type WebSearchResult,
} from "../../src/fixtures/rich/content-elements";
import { defineFixtureUI } from "../define-fixture-ui";

const COLUMNS = [
  { key: "name", label: "Model", priority: "primary" },
  {
    key: "context",
    label: "Context",
    format: { kind: "number", compact: true },
  },
  {
    key: "input",
    label: "Input",
    format: { kind: "currency", currency: "USD", decimals: 2 },
  },
  { key: "latency", label: "Latency", format: { kind: "number", unit: "ms" } },
] as const satisfies readonly DataTableColumn[];

const Table: DataMessagePartComponent<TableData> = ({ data }) => (
  <DataTable
    className="my-2"
    columns={COLUMNS}
    rows={data.rows}
    rowKey="name"
    caption={data.caption}
  />
);

const ChartPart: DataMessagePartComponent<ChartData> = ({ data }) => (
  <Chart
    className="my-2"
    label={data.label}
    value={data.value}
    delta={data.delta}
    points={data.points}
    visibleCount={data.points.length}
    variant="area"
  />
);

const count = (data: DiffData, kind: DiffData["lines"][number]["kind"]) =>
  data.lines.filter((line) => line.kind === kind).length;

const Diff: DataMessagePartComponent<DiffData> = ({ data }) => (
  <CodeDiff
    className="my-2"
    filename={data.filename}
    additions={count(data, "added")}
    deletions={count(data, "removed")}
    lines={data.lines}
    cycle={0}
  />
);

const Search: ToolCallMessagePartComponent<WebSearchArgs, WebSearchResult> = ({
  args,
  result,
}) => (
  <WebSearch
    className="my-2"
    query={args.query ?? ""}
    results={result?.results ?? []}
    visibleResults={result?.results.length ?? 0}
    searching={result === undefined}
    cycle={0}
  />
);

const Retrieve: ToolCallMessagePartComponent<RetrieveArgs, RetrieveResult> = ({
  args,
  result,
}) => (
  <RetrievalChunks
    className="my-2"
    query={args.query ?? ""}
    chunks={result?.chunks ?? []}
    visibleCount={result?.chunks.length ?? 0}
    searching={result === undefined}
  />
);

const RunTests: ToolCallMessagePartComponent<RunTestsArgs, RunTestsResult> = ({
  args,
  result,
}) => (
  <TerminalBlock
    className="my-2"
    command={args.command ?? ""}
    lines={result?.lines ?? []}
    visibleCount={result?.lines.length ?? 0}
    done={result !== undefined}
    {...(result && {
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    })}
  />
);

export default defineFixtureUI({
  tools: {
    [WEB_SEARCH_TOOL]: {
      type: "backend",
      display: "standalone",
      render: Search,
    },
    [RETRIEVE_TOOL]: {
      type: "backend",
      display: "standalone",
      render: Retrieve,
    },
    [RUN_TESTS_TOOL]: {
      type: "backend",
      display: "standalone",
      render: RunTests,
    },
  },
  dataUIs: [
    { name: TABLE_DATA, render: Table },
    { name: CHART_DATA, render: ChartPart },
    { name: DIFF_DATA, render: Diff },
  ],
});
