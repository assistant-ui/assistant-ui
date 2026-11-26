// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExampleFrame } from "./example-frame";

// The Code tab suspends on its chunk and source; let React settle each click.
const open = (name: "Code" | "Preview") =>
  act(async () => {
    fireEvent.click(screen.getByRole("tab", { name }));
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const respond = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("ExampleFrame", () => {
  it("loads the source only when the reader opens the Code tab", async () => {
    const fetch = vi.fn(() =>
      respond({
        code: "export default 1;",
        html: '<pre class="shiki"><code>export default 1;</code></pre>',
      }),
    );
    vi.stubGlobal("fetch", fetch);

    render(<ExampleFrame preview={<p>chart</p>} file="line/first" />);
    expect(screen.getByText("chart")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();

    await open("Code");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/diagrammatic/examples/line/first",
      ),
    );
    await waitFor(() =>
      expect(document.querySelector("pre.shiki")?.textContent).toBe(
        "export default 1;",
      ),
    );
    expect(screen.getByText("line/first.tsx")).toBeTruthy();
    expect(screen.queryByText("Loading source…")).toBeNull();

    await open("Preview");
    await open("Code");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("says so when the source fails to load, and the next open retries", async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => respond({ error: "Unavailable" }, 503))
      .mockImplementation(() =>
        respond({
          code: "export default 2;",
          html: '<pre class="shiki"><code>export default 2;</code></pre>',
        }),
      );
    vi.stubGlobal("fetch", fetch);

    render(<ExampleFrame preview={<p>chart</p>} file="line/second" />);
    await open("Code");
    await screen.findByText(/Couldn't load the source/);
    expect(fetch).toHaveBeenCalledTimes(1);

    await open("Preview");
    await open("Code");
    await waitFor(() =>
      expect(document.querySelector("pre.shiki")?.textContent).toBe(
        "export default 2;",
      ),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Couldn't load the source/)).toBeNull();
  });

  it("does not fetch the source on hover or focus", async () => {
    const fetch = vi.fn(() => respond({ code: "", html: "" }));
    vi.stubGlobal("fetch", fetch);

    render(<ExampleFrame preview={<p>chart</p>} file="line/third" />);
    await act(async () => {
      fireEvent.pointerEnter(screen.getByRole("tab", { name: "Code" }));
      fireEvent.focus(screen.getByRole("tab", { name: "Code" }));
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
