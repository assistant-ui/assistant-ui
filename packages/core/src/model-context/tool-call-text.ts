type ToolCallTextValue = string | undefined | null;

type ToolCallRunningText<TArgs extends Record<string, unknown>> =
  | ToolCallTextValue
  | ((options: { args: TArgs }) => ToolCallTextValue);

type ToolCallCompleteText<TArgs extends Record<string, unknown>, TResult> =
  | ToolCallTextValue
  | ((options: {
      args: TArgs;
      result: TResult | undefined;
    }) => ToolCallTextValue);

export type ToolCallText<TArgs extends Record<string, unknown>, TResult> =
  | {
      running: ToolCallRunningText<TArgs>;
      complete?: ToolCallCompleteText<TArgs, TResult> | undefined;
    }
  | {
      running?: ToolCallRunningText<TArgs> | undefined;
      complete: ToolCallCompleteText<TArgs, TResult>;
    };

type ToolCallTextPart<TArgs extends Record<string, unknown>, TResult> = {
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly status?: { readonly type?: string | undefined } | undefined;
};

export const resolveToolCallText = <
  TArgs extends Record<string, unknown>,
  TResult,
>(
  text: ToolCallText<TArgs, TResult>,
  part: ToolCallTextPart<TArgs, TResult>,
): ToolCallTextValue => {
  const isRunning =
    part.status?.type === "running" || part.status?.type === "requires-action";

  if (!isRunning) {
    const value = text.complete;
    if (typeof value !== "function") return value ?? null;
    return value({ args: part.args, result: part.result });
  }

  const value = text.running;
  if (typeof value !== "function") return value ?? null;
  return value({ args: part.args });
};
