import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable } from "./data-table";

afterEach(() => {
  cleanup();
});

const rows = [
  { name: "Sonnet 4.5", context: "200k", cost: "$3.00" },
  { name: "GPT-5", context: "400k", cost: "$5.00" },
] as const;

describe("DataTable", () => {
  it("exposes the comparison as a named table with related headers and cells", () => {
    render(<DataTable rows={rows} cycle={0} />);

    const table = screen.getByRole("table", { name: "Model usage" });
    const headers = within(table).getAllByRole("columnheader");

    expect(headers.map((header) => header.textContent)).toEqual([
      "Model",
      "Context",
      "Cost",
    ]);
    expect(
      headers.every((header) => header.getAttribute("scope") === "col"),
    ).toBe(true);

    const tableRows = within(table).getAllByRole("row");
    expect(tableRows).toHaveLength(3);
    const firstDataRow = within(tableRows[1]!);
    expect(firstDataRow.getByRole("cell", { name: "Sonnet 4.5" })).toBeTruthy();
    expect(firstDataRow.getAllByRole("cell")[1]!.textContent).toBe("200k");
    expect(firstDataRow.getAllByRole("cell")[2]!.textContent).toBe("$3.00");

    const secondDataRow = within(tableRows[2]!);
    expect(secondDataRow.getByRole("cell", { name: "GPT-5" })).toBeTruthy();
    expect(secondDataRow.getAllByRole("cell")[1]!.textContent).toBe("400k");
    expect(secondDataRow.getAllByRole("cell")[2]!.textContent).toBe("$5.00");
  });

  it("keeps the table header when there are no rows", () => {
    render(<DataTable rows={[]} cycle={0} />);

    const table = screen.getByRole("table", { name: "Model usage" });

    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(within(table).getAllByRole("row")).toHaveLength(1);
    expect(within(table).queryAllByRole("cell")).toHaveLength(0);
  });
});
