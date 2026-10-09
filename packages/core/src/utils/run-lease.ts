export type RunLease = {
  isCurrent(): boolean;
};

/**
 * Generation fence for late async work. `begin()` advances the generation and
 * returns a lease for the new run, `current()` captures the generation as it
 * is, and `invalidate()` advances it without starting a run. A lease stays
 * current until the next `begin()` or `invalidate()`.
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
