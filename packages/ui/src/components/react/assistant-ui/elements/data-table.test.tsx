import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from "./data-table";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const COLUMNS = [
  { key: "name", label: "Name", priority: "primary" },
  { key: "score", label: "Score", format: { kind: "number" } },
] as const satisfies readonly DataTableColumn[];

const tableRows = (container: HTMLElement) =>
  [...container.querySelectorAll("tbody tr")].map((row) => row.textContent);

describe("DataTable", () => {
  it("formats every value kind", () => {
    const columns = [
      { key: "text", label: "Text", format: { kind: "text" } },
      {
        key: "number",
        label: "Number",
        format: { kind: "number", decimals: 1 },
      },
      {
        key: "money",
        label: "Money",
        format: { kind: "currency", currency: "USD", decimals: 2 },
      },
      {
        key: "percent",
        label: "Percent",
        format: { kind: "percent", decimals: 1 },
      },
      {
        key: "unitPercent",
        label: "Unit percent",
        format: { kind: "percent", basis: "unit" },
      },
      {
        key: "delta",
        label: "Delta",
        format: { kind: "delta", decimals: 1, unit: "ms" },
      },
      {
        key: "date",
        label: "Date",
        format: { kind: "date", style: "relative" },
      },
      {
        key: "enabled",
        label: "Enabled",
        format: { kind: "boolean", trueLabel: "Enabled" },
      },
      { key: "link", label: "Link", format: { kind: "link", hrefKey: "url" } },
      {
        key: "status",
        label: "Status",
        format: { kind: "badge", tones: { ready: "success" } },
      },
      { key: "tags", label: "Tags", format: { kind: "list", max: 2 } },
    ] as const satisfies readonly DataTableColumn[];
    const rows = [
      {
        text: "alpha",
        number: 1200.4,
        money: 12.5,
        percent: 0.125,
        unitPercent: 12,
        delta: -2.4,
        date: "2024-01-02T00:00:00.000Z",
        enabled: true,
        link: "Read more",
        url: "https://example.com/report",
        status: "ready",
        tags: ["one", "two", "three"],
      },
    ] as const satisfies readonly DataTableRow[];

    render(
      <DataTable
        columns={columns}
        rows={rows}
        relativeTo={Date.parse("2024-01-05T00:00:00.000Z")}
      />,
    );

    expect(screen.getAllByText("alpha")).toHaveLength(2);
    expect(screen.getAllByText("1,200.4")).toHaveLength(2);
    expect(screen.getAllByText("$12.50")).toHaveLength(2);
    expect(screen.getAllByText("12.5%")).toHaveLength(2);
    expect(screen.getAllByText("12%")).toHaveLength(2);
    expect(screen.getAllByText(/↓ 2\.4 ms/)).toHaveLength(2);
    expect(screen.getAllByText("3 days ago")).toHaveLength(2);
    expect(screen.getAllByText("Enabled")).toHaveLength(4);
    expect(
      screen.getAllByRole("link", { name: /Read more.*opens in a new tab/ }),
    ).toHaveLength(2);
    expect(
      screen
        .getAllByRole("link", { name: /Read more.*opens in a new tab/ })
        .every((link) => link.getAttribute("rel") === "noopener noreferrer"),
    ).toBe(true);
    expect(screen.getAllByText("ready")).toHaveLength(2);
    expect(screen.getAllByText("+1")).toHaveLength(2);
  });

  it("cycles sort direction and announces the current order", () => {
    const { container } = render(
      <DataTable
        columns={COLUMNS}
        rows={[
          { name: "Charlie", score: 3 },
          { name: "Alpha", score: 1 },
          { name: "Bravo", score: 2 },
        ]}
      />,
    );
    const button = screen.getByRole("button", { name: "Sort by Name" });
    const header = screen.getByRole("columnheader", { name: "Name" });

    expect(header.getAttribute("aria-sort")).toBeNull();
    expect(
      screen
        .getByRole("columnheader", { name: "Score" })
        .getAttribute("aria-sort"),
    ).toBeNull();
    fireEvent.click(button);
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(
      screen
        .getByRole("columnheader", { name: "Score" })
        .getAttribute("aria-sort"),
    ).toBeNull();
    expect(button.textContent).toBe("Name↑");
    expect(tableRows(container)).toEqual(["Alpha1", "Bravo2", "Charlie3"]);
    expect(screen.getByText("Sorted by Name, ascending")).toBeTruthy();

    fireEvent.click(button);
    expect(header.getAttribute("aria-sort")).toBe("descending");
    expect(button.textContent).toBe("Name↓");
    expect(tableRows(container)).toEqual(["Charlie3", "Bravo2", "Alpha1"]);

    fireEvent.click(button);
    expect(header.getAttribute("aria-sort")).toBeNull();
    expect(button.textContent).toBe("Name");
    expect(tableRows(container)).toEqual(["Charlie3", "Alpha1", "Bravo2"]);
  });

  it("reports a sort change without changing controlled state", () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={[{ name: "Alpha", score: 1 }]}
        sort={{ key: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort by Name" }));

    expect(onSortChange).toHaveBeenCalledWith({
      key: "name",
      direction: "desc",
    });
    expect(
      screen
        .getByRole("columnheader", { name: "Name" })
        .getAttribute("aria-sort"),
    ).toBe("ascending");
  });

  it("keeps empty values at the end in descending order", () => {
    const { container } = render(
      <DataTable
        columns={COLUMNS}
        rows={[
          { name: "None", score: null },
          { name: "One", score: 1 },
          { name: "Two", score: 2 },
        ]}
        defaultSort={{ key: "score", direction: "desc" }}
      />,
    );

    expect(tableRows(container)).toEqual(["Two2", "One1", "Nonenone"]);
  });

  it("leaves an unsafe link as text", () => {
    render(
      <DataTable
        columns={[{ key: "link", label: "Link", format: { kind: "link" } }]}
        rows={[{ link: "javascript:alert(1)" }]}
      />,
    );

    expect(screen.getAllByText("javascript:alert(1)")).toHaveLength(2);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders an empty status across both layouts", () => {
    render(
      <DataTable columns={COLUMNS} rows={[]} emptyMessage="Nothing found" />,
    );

    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(screen.getAllByText("Nothing found")).toHaveLength(2);
    expect(screen.getByRole("cell", { name: "Nothing found" })).toBeTruthy();
  });

  it("renders the caption and compact card markup", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={[{ name: "Alpha", score: 1 }]}
        caption="Scores"
      />,
    );

    expect(screen.getByText("Scores").tagName).toBe("CAPTION");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("list").querySelector("dt")?.textContent).toBe(
      "Score",
    );
  });

  it("falls back to the raw value when Intl rejects a model's format", () => {
    render(
      <DataTable
        columns={[
          {
            key: "price",
            label: "Price",
            format: { kind: "currency", currency: "not-a-code" },
          },
          {
            key: "share",
            label: "Share",
            format: { kind: "percent", decimals: 99 },
          },
        ]}
        rows={[{ price: 12, share: 0.5 }]}
        locale="en-US"
      />,
    );

    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("50.00000000000000000000%").length,
    ).toBeGreaterThan(0);
  });

  it("keeps a date-only value on its calendar day west of UTC", () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      function (locales, options) {
        return new DateTimeFormat(locales, {
          timeZone: "America/Los_Angeles",
          ...options,
        });
      },
    );

    render(
      <DataTable
        columns={[{ key: "due", label: "Due", format: { kind: "date" } }]}
        rows={[{ due: "2026-09-26" }]}
        locale="en-US"
      />,
    );

    expect(screen.getAllByText("Sep 26, 2026").length).toBeGreaterThan(0);
  });

  it("keeps impossible ISO calendar dates as raw text", () => {
    render(
      <DataTable
        columns={[
          { key: "impossible", label: "Impossible", format: { kind: "date" } },
          { key: "leapDay", label: "Leap day", format: { kind: "date" } },
        ]}
        rows={[{ impossible: "2024-02-30", leapDay: "2024-02-29" }]}
        locale="en-US"
      />,
    );

    expect(screen.getAllByText("2024-02-30")).toHaveLength(2);
    expect(screen.getAllByText("Feb 29, 2024")).toHaveLength(2);
  });

  it("suppresses relative-date hydration warnings without a reference time", async () => {
    const container = document.createElement("div");
    let root: Root | undefined;
    const onRecoverableError = vi.fn();
    const now = vi.spyOn(Date, "now");
    const date = "2024-01-02T00:00:00.000Z";
    document.body.appendChild(container);

    try {
      now.mockReturnValue(Date.parse("2024-01-02T00:00:00.000Z"));
      container.innerHTML = renderToString(
        <DataTable
          columns={[
            {
              key: "updated",
              label: "Updated",
              format: { kind: "date", style: "relative" },
            },
          ]}
          rows={[{ updated: date }]}
        />,
      );

      now.mockReturnValue(Date.parse("2024-01-05T00:00:00.000Z"));
      await act(async () => {
        root = hydrateRoot(
          container,
          <DataTable
            columns={[
              {
                key: "updated",
                label: "Updated",
                format: { kind: "date", style: "relative" },
              },
            ]}
            rows={[{ updated: date }]}
          />,
          { onRecoverableError },
        );
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
    }
  });

  it("announces a sort only after the user sorts", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={[{ name: "Alpha", score: 1 }]} />,
    );
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /Sort by Score/ }));
    expect(live?.textContent).toBe("Sorted by Score, ascending");
  });
});
