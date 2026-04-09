import { OpenCodeThreadController } from "./OpenCodeThreadController";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("OpenCodeThreadController", () => {
  it("keeps forced reloads authoritative while earlier loads finish", async () => {
    const firstSession = createDeferred<{ data: unknown }>();
    const firstMessages = createDeferred<{ data: unknown[] }>();
    const secondSession = createDeferred<{ data: unknown }>();
    const secondMessages = createDeferred<{ data: unknown[] }>();

    const client = {
      session: {
        get: vi
          .fn()
          .mockReturnValueOnce(firstSession.promise)
          .mockReturnValueOnce(secondSession.promise),
        messages: vi
          .fn()
          .mockReturnValueOnce(firstMessages.promise)
          .mockReturnValueOnce(secondMessages.promise),
      },
    };

    const controller = new OpenCodeThreadController(
      client as never,
      { subscribe: () => () => {} } as never,
      "ses_1",
    );

    const firstLoad = controller.load();
    const secondLoad = controller.load(true);

    firstSession.resolve({
      data: {
        id: "stale_session",
        time: {},
      },
    });
    firstMessages.resolve({
      data: [
        {
          info: {
            id: "stale_message",
            role: "user",
            sessionID: "ses_1",
            time: { created: 1 },
          },
          parts: [],
        },
      ],
    });

    await firstLoad;

    expect(controller.getState().loadState.type).toBe("loading");

    const thirdLoad = controller.load();
    expect(client.session.get).toHaveBeenCalledTimes(2);
    expect(client.session.messages).toHaveBeenCalledTimes(2);

    secondSession.resolve({
      data: {
        id: "fresh_session",
        time: {},
      },
    });
    secondMessages.resolve({
      data: [
        {
          info: {
            id: "fresh_message",
            role: "user",
            sessionID: "ses_1",
            time: { created: 2 },
          },
          parts: [],
        },
      ],
    });

    await Promise.all([secondLoad, thirdLoad]);

    expect(controller.getState().loadState.type).toBe("ready");
    expect(controller.getState().session).toMatchObject({
      id: "fresh_session",
    });
    expect(controller.getState().messageOrder).toEqual(["fresh_message"]);
  });
});
