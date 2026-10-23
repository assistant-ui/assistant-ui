import { afterEach, expect, it, vi } from "vitest";
import { sendOSCNotification } from "./notification-channels";

afterEach(() => {
  vi.restoreAllMocks();
});

it("completes successive OSC 99 notifications without replacing earlier ones", () => {
  const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

  sendOSCNotification("AI task complete", undefined, "osc99");
  sendOSCNotification("AI needs input", "Approve the tool", "osc99");

  expect(write).toHaveBeenCalledTimes(2);
  const messages = write.mock.calls.map(([sequence]) => {
    const frame = String(sequence);
    expect(frame.startsWith("\x1b]99;")).toBe(true);
    expect(frame.endsWith("\x1b\\")).toBe(true);
    const content = frame.slice(5, -2);
    const separator = content.indexOf(";");
    expect(separator).toBeGreaterThanOrEqual(0);
    const metadata = content.slice(0, separator);
    expect(metadata).not.toMatch(/(?:^|:)d=0(?:$|:)/u);
    expect(metadata).not.toMatch(/(?:^|:)i=/u);
    return content.slice(separator + 1);
  });

  expect(messages).toEqual(["AI task complete", "Approve the tool"]);
});

it("removes terminal controls and field separators from OSC 777 fields", () => {
  const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

  sendOSCNotification(
    "safe;\x1b]52;c;YWJj\x07title",
    "body;\x1b[2Jdone",
    "osc777",
  );

  expect(write).toHaveBeenCalledWith(
    "\x1b]777;notify;safe title;body done\x07",
  );
});
