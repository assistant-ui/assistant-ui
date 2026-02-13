import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "../FormattedCloudPersistence";

type TestMessage = { id: string; text: string };
type TestStorageFormat = { encoded: true; text: string };

const makeAdapter = (): MessageFormatAdapter<
  TestMessage,
  TestStorageFormat
> => ({
  format: "test/v1",
  encode: vi.fn((item: { parentId: string | null; message: TestMessage }) => ({
    encoded: true as const,
    text: item.message.text,
  })),
  decode: vi.fn(
    (stored: {
      id: string;
      parent_id: string | null;
      format: string;
      content: TestStorageFormat;
    }) => ({
      parentId: stored.parent_id,
      message: { id: stored.id, text: stored.content.text },
    }),
  ),
  getId: vi.fn((msg: TestMessage) => msg.id),
});

const makePersistence = () => ({
  append: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  isPersisted: vi.fn().mockReturnValue(false),
  update: vi.fn().mockResolvedValue(undefined),
});

describe("createFormattedPersistence", () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let persistence: ReturnType<typeof makePersistence>;

  beforeEach(() => {
    vi.restoreAllMocks();
    adapter = makeAdapter();
    persistence = makePersistence();
  });

  it("append encodes the message and delegates to persistence with format", async () => {
    const formatted = createFormattedPersistence(persistence, adapter);

    const message: TestMessage = { id: "msg-1", text: "hello" };
    await formatted.append("thread-1", { parentId: "parent-1", message });

    expect(adapter.getId).toHaveBeenCalledWith(message);
    expect(adapter.encode).toHaveBeenCalledWith({
      parentId: "parent-1",
      message,
    });
    expect(persistence.append).toHaveBeenCalledWith(
      "thread-1",
      "msg-1",
      "parent-1",
      "test/v1",
      { encoded: true, text: "hello" },
    );
  });

  it("load filters by format, decodes messages, and reverses order", async () => {
    persistence.load.mockResolvedValue([
      {
        id: "m1",
        parent_id: null,
        format: "test/v1",
        content: { encoded: true, text: "first" },
      },
      {
        id: "m2",
        parent_id: "m1",
        format: "other/v1",
        content: { encoded: true, text: "skip me" },
      },
      {
        id: "m3",
        parent_id: "m1",
        format: "test/v1",
        content: { encoded: true, text: "second" },
      },
    ]);

    const formatted = createFormattedPersistence(persistence, adapter);
    const result = await formatted.load("thread-1");

    expect(persistence.load).toHaveBeenCalledWith("thread-1", "test/v1");
    expect(adapter.decode).toHaveBeenCalledTimes(2);

    // reversed: m3 first, then m1
    expect(result.messages).toEqual([
      { parentId: "m1", message: { id: "m3", text: "second" } },
      { parentId: null, message: { id: "m1", text: "first" } },
    ]);
  });

  it("isPersisted delegates to persistence", () => {
    persistence.isPersisted.mockReturnValue(true);
    const formatted = createFormattedPersistence(persistence, adapter);

    expect(formatted.isPersisted("msg-1")).toBe(true);
    expect(persistence.isPersisted).toHaveBeenCalledWith("msg-1");
  });

  it("update encodes and delegates to persistence.update", async () => {
    const formatted = createFormattedPersistence(persistence, adapter);

    const message: TestMessage = { id: "msg-1", text: "updated" };
    await formatted.update!("thread-1", { parentId: null, message }, "msg-1");

    expect(adapter.encode).toHaveBeenCalledWith({ parentId: null, message });
    expect(persistence.update).toHaveBeenCalledWith(
      "thread-1",
      "msg-1",
      "test/v1",
      { encoded: true, text: "updated" },
    );
  });

  it("update is undefined when persistence has no update method", () => {
    const { update: _, ...noUpdatePersistence } = persistence;
    const formatted = createFormattedPersistence(noUpdatePersistence, adapter);

    expect(formatted.update).toBeUndefined();
  });
});
