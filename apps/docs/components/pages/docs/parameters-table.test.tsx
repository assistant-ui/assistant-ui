// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { ParametersTable } from "./parameters-table";

it("renders inline markdown in descriptions as elements, never as HTML", () => {
  const { container } = render(
    <ParametersTable
      parameters={[
        {
          name: "tools",
          description:
            "Pass `{ render }` with ``a `b` c``, see [the `Tools` guide](/docs/tools) or [x](javascript:alert). **Not** _always_ *safe*: <img src=x onerror=alert(1)> stays text, as does snake_case_name.",
        },
      ]}
    />,
  );

  const description = container.querySelector("dd > p")!;
  expect(
    [...description.querySelectorAll("code")].map((code) => code.textContent),
  ).toEqual(["{ render }", "a `b` c", "Tools"]);
  const links = description.querySelectorAll("a");
  expect([...links].map((link) => link.getAttribute("href"))).toEqual([
    "/docs/tools",
  ]);
  expect(links[0]!.textContent).toBe("the Tools guide");
  expect(description.querySelector("strong")?.textContent).toBe("Not");
  expect(
    [...description.querySelectorAll("em")].map((em) => em.textContent),
  ).toEqual(["always", "safe"]);
  expect(description.querySelector("img")).toBeNull();
  expect(description.textContent).toContain(
    "<img src=x onerror=alert(1)> stays text, as does snake_case_name.",
  );
  expect(description.textContent).toContain("or x.");
});

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
