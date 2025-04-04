type ToolResponseOptions<TResult> = {
  result: TResult;
  artifact: unknown;
};

export class ToolResponse<TResult> {
  constructor(public readonly options: ToolResponseOptions<TResult>) {}
}
