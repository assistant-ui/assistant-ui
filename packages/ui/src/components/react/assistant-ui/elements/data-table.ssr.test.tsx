import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const columns = [
  {
    key: "updated",
    label: "Updated",
    format: { kind: "date", style: "relative" },
  },
] as const;
const rows = [{ updated: "2024-01-02T00:00:00.000Z" }];

it("prerenders uncontrolled relative dates as absolute dates, then shows relative time", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const table = <DataTable columns={columns} rows={rows} />;

  vi.setSystemTime(new Date("2024-01-05T00:00:00.000Z"));
  const first = renderToString(table);
  vi.setSystemTime(new Date("2024-01-07T00:00:00.000Z"));
  const second = renderToString(table);

  expect(first).toBe(second);
  expect(first).toContain("Jan 2, 2024");
  expect(first).not.toContain("ago");

  render(table);
  expect(screen.getAllByText("5 days ago")).toHaveLength(2);
});

it("keeps explicit relativeTo output in the server HTML", () => {
  const html = renderToString(
    <DataTable
      columns={columns}
      rows={rows}
      relativeTo={Date.parse("2024-01-05T00:00:00.000Z")}
    />,
  );
  expect(html).toContain("3 days ago");
});
