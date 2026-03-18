/** @internal */
export class InvalidDerivedScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDerivedScopeError";
  }
}
