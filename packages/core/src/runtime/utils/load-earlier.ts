export class LoadEarlier {
  private pending: Promise<void> | undefined;

  get isLoading() {
    return this.pending !== undefined;
  }

  load(
    callback: (() => void | Promise<void>) | undefined,
    onError: (error: unknown) => void,
    onChange: (loading: boolean) => void,
  ): Promise<void> {
    if (this.pending) return this.pending;
    if (!callback) return Promise.resolve();
    const loading = Promise.resolve()
      .then(() => callback())
      .catch(onError)
      .finally(() => {
        this.pending = undefined;
        onChange(false);
      });
    this.pending = loading;
    onChange(true);
    return loading;
  }
}
