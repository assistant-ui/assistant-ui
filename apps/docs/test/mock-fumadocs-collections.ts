import { vi } from "vitest";

vi.mock("fumadocs-mdx:collections/server", () => {
  const emptyCollection = { toFumadocsSource: () => ({ files: [] }) };
  return {
    blog: [],
    careers: [],
    design: [],
    docs: emptyCollection,
    elements: [],
    examples: [],
  };
});
