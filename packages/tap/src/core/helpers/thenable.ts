type TrackedThenable<T> = PromiseLike<T> & {
  status?: "pending" | "fulfilled" | "rejected";
  value?: T;
  reason?: unknown;
};

export const trackThenable = <T>(thenable: PromiseLike<T>): T => {
  const tracked = thenable as TrackedThenable<T>;
  switch (tracked.status) {
    case "fulfilled":
      return tracked.value as T;
    case "rejected":
      throw tracked.reason;
    case "pending":
      throw thenable;
    default:
      tracked.status = "pending";
      thenable.then(
        (value) => {
          if (tracked.status === "pending") {
            tracked.status = "fulfilled";
            tracked.value = value;
          }
        },
        (reason) => {
          if (tracked.status === "pending") {
            tracked.status = "rejected";
            tracked.reason = reason;
          }
        },
      );
      throw thenable;
  }
};
