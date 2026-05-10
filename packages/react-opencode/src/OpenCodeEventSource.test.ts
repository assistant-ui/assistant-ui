import { OpenCodeEventSource } from "./OpenCodeEventSource";

describe("OpenCodeEventSource", () => {
  it("continues notifying listeners when one throws", () => {
    const source = new OpenCodeEventSource({} as never) as any;
    const listener = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    source.listeners.add(() => {
      throw new Error("boom");
    });
    source.listeners.add(listener);

    source.emit({
      type: "session.updated",
      sessionId: "ses_1",
      properties: {},
      raw: {},
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
