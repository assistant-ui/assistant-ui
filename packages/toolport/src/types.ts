export type JsonSchema = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  items?: JsonSchema;
  enum?: readonly unknown[];
  default?: unknown;
  [key: string]: unknown;
};

export type ToolContext = {
  readonly toolkit: string;
  readonly tool: string;
  readonly signal: AbortSignal;
};

export type Tool<Args = unknown, Result = unknown> = {
  readonly description: string;
  readonly parameters: JsonSchema;
  execute(args: Args, ctx: ToolContext): Result | Promise<Result>;
};

export type Toolkit<Tools extends Record<string, Tool> = Record<string, Tool>> =
  {
    readonly name: string;
    readonly version?: string;
    readonly description?: string;
    readonly tools: Tools;
  };

export type ToolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
};
