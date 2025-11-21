import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../../src/lib/utils/logger";

describe("logger utilities", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should log info messages in blue", () => {
    logger.info("Test info message");

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const message = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("Test info message");
  });

  it("should log success messages in green with checkmark", () => {
    logger.success("Test success message");

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const message = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("✓");
    expect(message).toContain("Test success message");
  });

  it("should log error messages in red with cross", () => {
    logger.error("Test error message");

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const message = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("✗");
    expect(message).toContain("Test error message");
  });

  it("should log warning messages in yellow with warning icon", () => {
    logger.warn("Test warning message");

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const message = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("⚠");
    expect(message).toContain("Test warning message");
  });

  it("should log step messages in cyan with arrow", () => {
    logger.step("Test step message");

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const message = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("→");
    expect(message).toContain("Test step message");
  });

  it("should log empty line for break", () => {
    logger.break();

    expect(consoleLogSpy).toHaveBeenCalledWith("");
  });
});
