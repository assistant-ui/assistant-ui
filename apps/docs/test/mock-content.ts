import { vi } from "vitest";

vi.mock("../.source/content", () => {
  const emptyCollection = { files: [] };
  return {
    blog: emptyCollection,
    careers: emptyCollection,
    design: emptyCollection,
    docs: emptyCollection,
    docsSites: emptyCollection,
    elements: emptyCollection,
    examples: emptyCollection,
  };
});
