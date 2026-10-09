import { nullProtoRecord } from "@assistant-ui/core/internal";
import type {
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
  Part,
} from "./types";
import type { reduceOpenCodeThreadStateInternal } from "./openCodeThreadState";
import { getOpenCodeTaskSessionId } from "./openCodeTaskSession";

type ChildController = Pick<
  OpenCodeThreadControllerLike,
  "getState" | "subscribe" | "load"
>;

type ChildControllerEntry<TController extends ChildController> = {
  controller: TController;
  discard: () => void;
  unsubscribe: (() => void) | null;
};

type ChildSessionsOptions<TController extends ChildController> = {
  getState: () => OpenCodeThreadState;
  setState: (state: OpenCodeThreadState) => void;
  notifyListeners: () => void;
  hasListeners: () => boolean;
  createController: (
    sessionId: string,
    ancestorSessionIds: ReadonlySet<string>,
  ) => Pick<ChildControllerEntry<TController>, "controller" | "discard">;
};

export class OpenCodeChildSessions<TController extends ChildController> {
  private readonly childControllersById = new Map<
    string,
    ChildControllerEntry<TController>
  >();
  private readonly childSessionIdByPartId = new Map<string, string>();
  private readonly options: ChildSessionsOptions<TController>;
  ancestorSessionIds: ReadonlySet<string>;
  isChildSession = false;

  constructor(options: ChildSessionsOptions<TController>, sessionId: string) {
    this.options = options;
    this.ancestorSessionIds = new Set([sessionId]);
  }

  *controllers(): IterableIterator<TController> {
    for (const entry of this.childControllersById.values()) {
      yield entry.controller;
    }
  }

  private updateSnapshot(sessionId: string, childState: OpenCodeThreadState) {
    const state = this.options.getState();
    if (state.childSessionsById[sessionId] === childState) return;

    const childSessionsById = nullProtoRecord(state.childSessionsById);
    childSessionsById[sessionId] = childState;
    this.options.setState({ ...state, childSessionsById });
    this.options.notifyListeners();
  }

  private attach(sessionId: string, entry: ChildControllerEntry<TController>) {
    if (entry.unsubscribe) return;

    entry.unsubscribe = entry.controller.subscribe(() => {
      this.updateSnapshot(sessionId, entry.controller.getState());
    });
    this.updateSnapshot(sessionId, entry.controller.getState());
    if (entry.controller.getState().loadState.type !== "ready") {
      void entry.controller.load().catch(() => undefined);
    }
  }

  attachAll() {
    for (const [sessionId, entry] of this.childControllersById) {
      this.attach(sessionId, entry);
    }
  }

  detachAll() {
    for (const entry of this.childControllersById.values()) {
      entry.unsubscribe?.();
      entry.unsubscribe = null;
    }
  }

  discard() {
    for (const entry of this.childControllersById.values()) {
      entry.unsubscribe?.();
      entry.discard();
    }
    this.childControllersById.clear();
    this.childSessionIdByPartId.clear();
  }

  private rebuildIndex() {
    this.childSessionIdByPartId.clear();
    for (const message of Object.values(this.options.getState().messagesById)) {
      for (const part of message.parts) {
        const sessionId = getOpenCodeTaskSessionId(part);
        if (sessionId) {
          this.childSessionIdByPartId.set(part.id, sessionId);
        }
      }
    }
    this.syncControllers();
  }

  private updateIndex(part: Part) {
    const previousSessionId = this.childSessionIdByPartId.get(part.id);
    const sessionId = getOpenCodeTaskSessionId(part);
    if (sessionId === previousSessionId) return;

    if (sessionId) {
      this.childSessionIdByPartId.set(part.id, sessionId);
    } else {
      this.childSessionIdByPartId.delete(part.id);
    }
    this.syncControllers();
  }

  private removeFromIndex(partId: string) {
    if (!this.childSessionIdByPartId.delete(partId)) return;
    this.syncControllers();
  }

  private syncControllers() {
    const sessionIds = new Set(this.childSessionIdByPartId.values());
    for (const sessionId of this.ancestorSessionIds) {
      sessionIds.delete(sessionId);
    }

    const state = this.options.getState();
    let childSessionsById = state.childSessionsById;
    for (const [sessionId, entry] of this.childControllersById) {
      if (sessionIds.has(sessionId)) continue;

      entry.unsubscribe?.();
      entry.discard();
      this.childControllersById.delete(sessionId);
      const remaining = nullProtoRecord(childSessionsById);
      delete remaining[sessionId];
      childSessionsById = remaining;
    }

    const added: [string, ChildControllerEntry<TController>][] = [];
    for (const sessionId of sessionIds) {
      if (this.childControllersById.has(sessionId)) continue;

      const created = this.options.createController(
        sessionId,
        this.ancestorSessionIds,
      );
      const entry = { ...created, unsubscribe: null };
      this.childControllersById.set(sessionId, entry);
      const nextChildSessionsById = nullProtoRecord(childSessionsById);
      nextChildSessionsById[sessionId] = entry.controller.getState();
      childSessionsById = nextChildSessionsById;
      added.push([sessionId, entry]);
    }

    if (childSessionsById !== state.childSessionsById) {
      this.options.setState({ ...this.options.getState(), childSessionsById });
    }

    for (const [sessionId, entry] of added) {
      if (!this.options.hasListeners()) break;
      this.attach(sessionId, entry);
    }
  }

  syncIndex(event: Parameters<typeof reduceOpenCodeThreadStateInternal>[1]) {
    switch (event.type) {
      case "history.loaded":
      case "message.removed":
        this.rebuildIndex();
        break;
      case "part.updated":
        this.updateIndex(event.part);
        break;
      case "part.removed":
        this.removeFromIndex(event.partId);
        break;
      default:
        break;
    }
  }
}
