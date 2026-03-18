/** @internal */
export class LookupBoundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LookupBoundsError";
  }
}
