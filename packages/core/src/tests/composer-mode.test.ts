import { describe, it, expect, vi } from "vitest";
import { BaseComposerRuntimeCore } from "../runtime/base/base-composer-runtime-core";
import type { AppendMessage } from "../types/message";

class TestComposerCore extends BaseComposerRuntimeCore {
  public sent: Array<Omit<AppendMessage, "parentId" | "sourceId">> = [];
  protected getAttachmentAdapter() {
    return undefined;
  }
  protected getDictationAdapter() {
    return undefined;
  }
  get canCancel() {
    return false;
  }
  get canSend() {
    return !this.isEmpty;
  }
  protected handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">) {
    this.sent.push(message);
  }
  protected handleCancel() {}
}

describe("composer mode", () => {
  it("defaults to undefined and updates via setMode with notification", () => {
    const composer = new TestComposerCore();
    expect(composer.mode).toBeUndefined();
    const listener = vi.fn();
    composer.subscribe(listener);
    composer.setMode("plan");
    expect(composer.mode).toBe("plan");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the mode is unchanged", () => {
    const composer = new TestComposerCore();
    composer.setMode("plan");
    const listener = vi.fn();
    composer.subscribe(listener);
    composer.setMode("plan");
    expect(listener).not.toHaveBeenCalled();
  });

  it("survives reset()", async () => {
    const composer = new TestComposerCore();
    composer.setMode("plan");
    composer.setText("hello");
    await composer.reset();
    expect(composer.text).toBe("");
    expect(composer.mode).toBe("plan");
  });

  it("injects runConfig.custom.mode on send when a mode is set", async () => {
    const composer = new TestComposerCore();
    composer.setText("hello");
    composer.setMode("debug");
    await composer.send();
    expect(composer.sent).toHaveLength(1);
    expect(composer.sent[0]!.runConfig).toEqual({ custom: { mode: "debug" } });
  });

  it("leaves runConfig untouched on send when no mode is set", async () => {
    const composer = new TestComposerCore();
    composer.setText("hello");
    composer.setRunConfig({ custom: { foo: "bar" } });
    await composer.send();
    expect(composer.sent[0]!.runConfig).toEqual({ custom: { foo: "bar" } });
  });

  it("merges mode with existing runConfig.custom keys", async () => {
    const composer = new TestComposerCore();
    composer.setText("hello");
    composer.setRunConfig({ custom: { foo: "bar" } });
    composer.setMode("plan");
    await composer.send();
    expect(composer.sent[0]!.runConfig).toEqual({
      custom: { foo: "bar", mode: "plan" },
    });
  });

  it("clears the mode and notifies when setMode(undefined) is called", () => {
    const composer = new TestComposerCore();
    composer.setMode("plan");
    const listener = vi.fn();
    composer.subscribe(listener);
    composer.setMode(undefined);
    expect(composer.mode).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stays set across multiple sends", async () => {
    const composer = new TestComposerCore();
    composer.setMode("plan");
    composer.setText("first");
    await composer.send();
    composer.setText("second");
    await composer.send();
    expect(composer.mode).toBe("plan");
    expect(composer.sent).toHaveLength(2);
    expect(composer.sent[0]!.runConfig).toEqual({ custom: { mode: "plan" } });
    expect(composer.sent[1]!.runConfig).toEqual({ custom: { mode: "plan" } });
  });

  it("reset() is a no-op that preserves mode when no other state is dirty", async () => {
    const composer = new TestComposerCore();
    composer.setMode("plan");
    const listener = vi.fn();
    composer.subscribe(listener);
    await composer.reset();
    expect(listener).not.toHaveBeenCalled();
    expect(composer.mode).toBe("plan");
  });
});
