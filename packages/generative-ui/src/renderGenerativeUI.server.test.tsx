import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { renderGenerativeUI } from "./renderGenerativeUI";
import type { GenerativeUILibrary } from "./types";

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal()),
  Component: undefined,
  createContext: undefined,
  useContext: undefined,
}));

describe("renderGenerativeUI without React client APIs", () => {
  it("passes rendered elements through when React.Component is unavailable", () => {
    const library: GenerativeUILibrary = {
      Text: {
        description: "A text element.",
        properties: z.object({ value: z.string() }),
        render: ({ value }) => <span>{value}</span>,
      },
    };

    expect(
      renderToStaticMarkup(
        <>{renderGenerativeUI({ $type: "Text", value: "server" }, library)}</>,
      ),
    ).toBe("<span>server</span>");
  });
});
