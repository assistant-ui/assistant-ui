// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ToolsState = {};

export type ToolsApi = {
  getState(): ToolsState;
};

export type ToolsMeta = {
  source: "root";
  query: Record<string, never>;
};
