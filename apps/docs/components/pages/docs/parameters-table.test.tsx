// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { ParametersTable } from "./parameters-table";

it("wraps top-level and nested parameter type names", () => {
  const typeName = "ComposerPrimitiveUnstable_TriggerPopoverCategoryItemProps";
  const { container } = render(
    <ParametersTable
      type={typeName}
      parameters={[
        {
          name: "nested",
          description: "",
          children: [{ type: typeName, parameters: [] }],
        },
      ]}
    />,
  );

  const headers = container.querySelectorAll(".font-mono.text-xs.font-medium");
  expect(headers).toHaveLength(2);
  expect(
    [...headers].every((header) =>
      header.classList.contains("[overflow-wrap:anywhere]"),
    ),
  ).toBe(true);
});
