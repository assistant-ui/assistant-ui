export const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value !== null &&
  typeof value === "object" &&
  typeof (value as PromiseLike<unknown>).then === "function";

type TrackedThenable<T> = PromiseLike<T> & {
  status?: "pending" | "fulfilled" | "rejected";
  value?: T;
  reason?: unknown;
};

const noop = () => {};

export const trackThenable = <T>(thenable: PromiseLike<T>): T => {
  const tracked = thenable as TrackedThenable<T>;
  if (typeof tracked.status !== "string") {
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
  } else if (tracked.status !== "fulfilled" && tracked.status !== "rejected") {
    // A thenable that arrived pre-stamped pending was never given handlers;
    // without one its rejection is unhandled
    thenable.then(noop, noop);
  }

  switch (tracked.status) {
    case "fulfilled":
      return tracked.value as T;
    case "rejected":
      throw tracked.reason;
    default:
      throw thenable;
  }
};
