import { OpenCodeThreadController } from "./OpenCodeThreadController";
import type { OpenCodeServerEvent } from "./types";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createEventSource = () => {
  let listener: ((event: OpenCodeServerEvent) => void) | undefined;
  const unsubscribe = vi.fn();

  return {
    emit(event: OpenCodeServerEvent) {
      listener?.(event);
    },
    subscribe: vi.fn((nextListener: (event: OpenCodeServerEvent) => void) => {
      listener = nextListener;
      return unsubscribe;
    }),
    unsubscribe,
  };
};

describe("OpenCodeThreadController", () => {
  it("re-subscribes through the provider after dispose", () => {
    let eventSource = createEventSource();
    const getEventSource = vi.fn(() => eventSource);
    const controller = new OpenCodeThreadController(
      {} as never,
      getEventSource as never,
      "ses_1",
    );

    const firstListener = vi.fn();
    controller.subscribe(firstListener);

    expect(getEventSource).toHaveBeenCalledTimes(1);
    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);

    controller.dispose();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);

    eventSource = createEventSource();
    const secondListener = vi.fn();
    controller.subscribe(secondListener);

    eventSource.emit({
      type: "session.updated",
      sessionId: "ses_1",
      properties: {
        info: {
          id: "ses_1",
          title: "Recovered session",
          time: {},
        },
      },
      raw: {},
    });

    expect(getEventSource).toHaveBeenCalledTimes(2);
    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(controller.getState().session).toMatchObject({
      id: "ses_1",
      title: "Recovered session",
    });
  });

  it("detaches from OpenCode events when the last state listener unsubscribes", () => {
    const eventSource = createEventSource();
    const controller = new OpenCodeThreadController(
      {} as never,
      eventSource as never,
      "ses_1",
    );

    const unsubscribeFirstState = controller.subscribe(vi.fn());
    const secondListener = vi.fn();
    const unsubscribeSecondState = controller.subscribe(secondListener);

    expect(eventSource.subscribe).toHaveBeenCalledTimes(1);

    unsubscribeFirstState();

    expect(eventSource.unsubscribe).not.toHaveBeenCalled();

    eventSource.emit({
      type: "session.updated",
      sessionId: "ses_1",
      properties: {
        info: {
          id: "ses_1",
          title: "Still attached",
          time: {},
        },
      },
      raw: {},
    });

    expect(secondListener).toHaveBeenCalledTimes(1);

    unsubscribeSecondState();

    expect(eventSource.unsubscribe).toHaveBeenCalledTimes(1);
  });

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

  it("replies to questions and stores answered state", async () => {
    const client = {
      session: {
        get: vi.fn(),
        messages: vi.fn(),
      },
      question: {
        reply: vi.fn().mockResolvedValue({}),
        reject: vi.fn().mockResolvedValue({}),
      },
    };

    const controller = new OpenCodeThreadController(
      client as never,
      { subscribe: () => () => {} } as never,
      "ses_1",
    );

    (controller as unknown as { dispatch: (event: unknown) => void }).dispatch({
      type: "question.asked",
      request: {
        id: "question_1",
        sessionID: "ses_1",
        questions: [],
        askedAt: 1000,
        tool: {
          messageID: "msg_1",
          callID: "call_1",
        },
      },
    });

    await controller.replyToQuestion("question_1", [["Yes"]]);

    expect(client.question.reply).toHaveBeenCalledWith({
      requestID: "question_1",
      answers: [["Yes"]],
    });
    expect(
      controller.getState().interactions.questions.answered.question_1,
    ).toMatchObject({
      answers: [["Yes"]],
    });
    expect(
      controller.getState().interactions.questions.pending.question_1,
    ).toBeUndefined();
  });

  it("rejects questions and stores rejected state", async () => {
    const client = {
      session: {
        get: vi.fn(),
        messages: vi.fn(),
      },
      question: {
        reply: vi.fn().mockResolvedValue({}),
        reject: vi.fn().mockResolvedValue({}),
      },
    };

    const controller = new OpenCodeThreadController(
      client as never,
      { subscribe: () => () => {} } as never,
      "ses_1",
    );

    (controller as unknown as { dispatch: (event: unknown) => void }).dispatch({
      type: "question.asked",
      request: {
        id: "question_1",
        sessionID: "ses_1",
        questions: [],
        askedAt: 1000,
        tool: {
          messageID: "msg_1",
          callID: "call_1",
        },
      },
    });

    await controller.rejectQuestion("question_1");

    expect(client.question.reject).toHaveBeenCalledWith({
      requestID: "question_1",
    });
    expect(
      controller.getState().interactions.questions.rejected.question_1,
    ).toBeDefined();
    expect(
      controller.getState().interactions.questions.pending.question_1,
    ).toBeUndefined();
  });
});
