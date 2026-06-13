export const liveRef = <T>(get: () => T): { readonly current: T } => ({
  get current() {
    return get();
  },
});
