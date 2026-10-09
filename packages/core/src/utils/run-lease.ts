export type RunLease = {
  isCurrent(): boolean;
};

/**
 * Tells late async work whether the run it belongs to is still current.
 * `begin()` starts a run and supersedes every earlier lease, `current()` joins
 * the run in progress, and `invalidate()` ends it without starting another.
 */
export class RunLeases {
  private _generation = 0;

  public begin(): RunLease {
    this._generation++;
    return this.current();
  }

  public current(): RunLease {
    const generation = this._generation;
    return { isCurrent: () => generation === this._generation };
  }

  public invalidate(): void {
    this._generation++;
  }
}
