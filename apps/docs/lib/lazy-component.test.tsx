// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, expect, it } from "vitest";
import { lazyComponent } from "./lazy-component";

afterEach(cleanup);

it("renders the loaded component with its props", async () => {
  const Greeting = lazyComponent(async () => ({ name }: { name: string }) => (
    <p>hello {name}</p>
  ));
  const { findByText } = render(
    <Suspense fallback={null}>
      <Greeting name="docs" />
    </Suspense>,
  );
  expect(await findByText("hello docs")).not.toBeNull();
});

it("exports a function component rather than a lazy object", () => {
  // A client reference resolves through a lazy on the client; React rejects
  // a lazy that resolves to another lazy.
  const Component = lazyComponent(async () => () => null);
  expect(typeof Component).toBe("function");
});
