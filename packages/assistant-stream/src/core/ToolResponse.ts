type ToolResponseOptions<TResult> = {
  result: TResult;
  artifact?: unknown;
  isError?: boolean;
};

export class ToolResponse<TResult> {
  readonly artifact?: unknown;
  readonly result: TResult;
  readonly isError: boolean;

  constructor(options: ToolResponseOptions<TResult>) {
    this.artifact = options.artifact;
    this.result = options.result;
    this.isError = options.isError ?? false;
  }
}
