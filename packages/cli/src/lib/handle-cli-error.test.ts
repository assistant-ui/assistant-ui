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

  it("reports a signal the child raised on itself without re-raising it", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);

    handleCliError(new SpawnSignalError("SIGKILL", false));

    expect(process.exitCode).toBe(137);
    expect(kill).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("Process terminated by SIGKILL");
  });

  it("stays silent on a signal the user sent", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.spyOn(process, "kill").mockReturnValue(true);

    handleCliError(new SpawnSignalError("SIGINT", true));

    expect(consoleError).not.toHaveBeenCalled();
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
