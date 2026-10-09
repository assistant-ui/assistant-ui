// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import {
  DeprecatedNotice,
  getParameterAnnotations,
} from "./parameter-annotations";

it("renders deprecated and unstable annotations in both table layouts", () => {
  const parameter = {
    name: "unstable_example",
    deprecated: "Use replacement instead.",
  };

  const { container, rerender } = render(
    <>
      {getParameterAnnotations(parameter, "term")}
      <DeprecatedNotice deprecated={parameter.deprecated} />
    </>,
  );

  expect(screen.getByText("deprecated")).toBeTruthy();
  expect(screen.getByText("unstable")).toBeTruthy();
  expect(screen.getByText("Deprecated: Use replacement instead.")).toBeTruthy();
  expect(container.querySelector(".mr-1")).toBeNull();

  rerender(<>{getParameterAnnotations(parameter, "description")}</>);

  expect(screen.getByText("deprecated").classList.contains("mr-1")).toBe(true);
  expect(screen.getByText("unstable").classList.contains("mr-1")).toBe(true);
  expect(screen.getByText("Use replacement instead.")).toBeTruthy();
  expect(screen.queryByText("Deprecated: Use replacement instead.")).toBeNull();
});
