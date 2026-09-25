import { describe, expect, it } from "vitest";
import { createEveCloudSessions } from "./eveCloudSessions";

describe("createEveCloudSessions", () => {
  it("hands a waiting thread the session its first turn creates", async () => {
    const sessions = createEveCloudSessions();
    const waiting = sessions.wait("thread-1");

    sessions.resolve("thread-1", "session-1");
    sessions.resolve("thread-1", "session-2");

    await expect(waiting).resolves.toBe("session-1");
    await expect(sessions.wait("thread-1")).resolves.toBe("session-1");
  });

  it("keeps a session resolved before the thread list asks for it", async () => {
    const sessions = createEveCloudSessions();

    sessions.resolve("thread-1", "session-1");

    await expect(sessions.wait("thread-1")).resolves.toBe("session-1");
  });

  it("rejects the wait when the first turn fails, then waits for the next session", async () => {
    const sessions = createEveCloudSessions();
    const first = sessions.wait("thread-1");

    sessions.reject("thread-1", new Error("no session"));
    await expect(first).rejects.toThrow("no session");

    const second = sessions.wait("thread-1");
    sessions.resolve("thread-1", "session-2");
    await expect(second).resolves.toBe("session-2");
  });

  it("ignores a rejection once the thread has a session", async () => {
    const sessions = createEveCloudSessions();

    sessions.resolve("thread-1", "session-1");
    sessions.reject("thread-1", new Error("staged"));

    await expect(sessions.wait("thread-1")).resolves.toBe("session-1");
  });

  it("does not surface a rejection nobody waits for", async () => {
    const sessions = createEveCloudSessions();
    void sessions.wait("thread-1");

    sessions.reject("thread-1", new Error("no session"));
    sessions.reject("thread-2", new Error("no session"));
    sessions.resolve("thread-1", "session-1");

    await expect(sessions.wait("thread-1")).resolves.toBe("session-1");
  });

  it("rejects a pending wait when the thread's runtime unmounts", async () => {
    const sessions = createEveCloudSessions();
    const waiting = sessions.wait("thread-1");

    sessions.release("thread-1");

    await expect(waiting).rejects.toThrow(
      "The thread's eve runtime unmounted before its first turn created a session.",
    );
  });

  it("keeps threads apart", async () => {
    const sessions = createEveCloudSessions();
    const first = sessions.wait("thread-1");
    const second = sessions.wait("thread-2");

    sessions.resolve("thread-2", "session-2");
    sessions.resolve("thread-1", "session-1");

    await expect(first).resolves.toBe("session-1");
    await expect(second).resolves.toBe("session-2");
  });
});
