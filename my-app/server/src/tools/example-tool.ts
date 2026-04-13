import type { ToolHandler } from "./types.js";

export const exampleToolHandler: ToolHandler = async (args) => {
  const query = (args.query as string) || "";

  // TODO: Implement your tool logic here
  // This is where you'd call your API, database, etc.

  return {
    structuredContent: {
      query,
      results: [
        { id: "1", title: "Example Result 1" },
        { id: "2", title: "Example Result 2" },
      ],
    },
    content: [
      {
        type: "text" as const,
        text: `Found 2 results for "${query}"`,
      },
    ],
  };
};
