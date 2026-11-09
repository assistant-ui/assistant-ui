import { describe, expect, it, vi } from "vitest";
import { withPromiseOrValue } from "./withPromiseOrValue";

describe("withPromiseOrValue", () => {
  it("passes a synchronous value to the then handler", () => {
    const thenHandler = vi.fn();
    const catchHandler = vi.fn();

    withPromiseOrValue(() => 42, thenHandler, catchHandler);

    expect(thenHandler).toHaveBeenCalledWith(42);
    expect(catchHandler).not.toHaveBeenCalled();
  });

  it("passes an asynchronous value to the then handler", async () => {
    const thenHandler = vi.fn();
    const catchHandler = vi.fn();

    await withPromiseOrValue(async () => 42, thenHandler, catchHandler);

    expect(thenHandler).toHaveBeenCalledWith(42);
    expect(catchHandler).not.toHaveBeenCalled();
  });

  it("routes a thrown callback to the catch handler", () => {
    const error = new Error("callback failed");
    const catchHandler = vi.fn();

    withPromiseOrValue(
      () => {
        throw error;
      },
      () => {},
      catchHandler,
    );

    expect(catchHandler).toHaveBeenCalledWith(error);
  });

  it("routes a rejected callback to the catch handler", async () => {
    const error = new Error("callback rejected");
    const catchHandler = vi.fn();

    await withPromiseOrValue(
      async () => {
        throw error;
      },
      () => {},
      catchHandler,
    );

    expect(catchHandler).toHaveBeenCalledWith(error);
  });

  it("routes a throwing thenable to the catch handler", () => {
    const error = new Error("then getter failed");
    const catchHandler = vi.fn();
    const thenable = {
      get then(): never {
        throw error;
      },
    };

    withPromiseOrValue(
      () => thenable as unknown as PromiseLike<number>,
      () => {},
      catchHandler,
    );

    expect(catchHandler).toHaveBeenCalledWith(error);
  });

  it("does not report a synchronous then-handler error as a callback failure", () => {
    const error = new Error("then handler failed");
    const catchHandler = vi.fn();

    expect(() =>
      withPromiseOrValue(
        () => 42,
        () => {
          throw error;
        },
        catchHandler,
      ),
    ).toThrow(error);
    expect(catchHandler).not.toHaveBeenCalled();
  });

  it("does not report an asynchronous then-handler error as a callback failure", async () => {
    const error = new Error("then handler failed");
    const catchHandler = vi.fn();

    const result = withPromiseOrValue(
      async () => 42,
      () => {
        throw error;
      },
      catchHandler,
    );
    await expect(Promise.resolve(result)).rejects.toBe(error);
    expect(catchHandler).not.toHaveBeenCalled();
  });
});
