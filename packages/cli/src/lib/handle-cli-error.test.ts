import { afterEach, describe, expect, it, vi } from "vitest";

import { handleCliError } from "./handle-cli-error";
import { SpawnExitError, SpawnSignalError } from "./run-spawn";

describe("handleCliError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("exits by the forwarded signal's status and re-raises it", () => {
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);

    handleCliError(new SpawnSignalError("SIGINT", true));

    expect(process.exitCode).toBe(130);
    expect(kill).toHaveBeenCalledWith(process.pid, "SIGINT");
  });

  it("maps SIGTERM to 143", () => {
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);

    handleCliError(new SpawnSignalError("SIGTERM", true));

    expect(process.exitCode).toBe(143);
    expect(kill).toHaveBeenCalledWith(process.pid, "SIGTERM");
  });

  it("does not re-raise a signal the child raised on itself", () => {
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);

    handleCliError(new SpawnSignalError("SIGSEGV", false));

    expect(process.exitCode).toBe(139);
    expect(kill).not.toHaveBeenCalled();
  });

  it("reports any other failure as exit 1", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    const error = new SpawnExitError(7);

    handleCliError(error);

    expect(process.exitCode).toBe(1);
    expect(kill).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(error);
  });
});
