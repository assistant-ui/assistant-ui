import { ThreadMetadataRuntimeCore } from "../core/ThreadRuntimeCore";

export class LocalThreadMetadataRuntimeCore
  implements ThreadMetadataRuntimeCore
{
  private _state: "regular" | "archived" | "deleted" | "new" = "new";
  private _title: string | undefined;
  private _subscribers = new Set<() => void>();

  constructor(private _threadId: string) {}

  public get threadId() {
    return this._threadId;
  }

  public get state() {
    return this._state;
  }

  public get title() {
    return this._title;
  }

  public rename(newTitle: string) {
    this._title = newTitle;
    this._notifySubscribers();

    return Promise.resolve();
  }

  public archive() {
    if (this._state === "new") throw new Error("Thread not created");
    if (this._state === "archived") throw new Error("Thread already archived");
    if (this._state === "deleted") throw new Error("Thread deleted");

    this._state = "archived";
    this._notifySubscribers();

    return Promise.resolve();
  }

  public unarchive() {
    if (this._state !== "archived") throw new Error("Thread not archived");

    this._state = "regular";
    this._notifySubscribers();

    return Promise.resolve();
  }

  public delete() {
    if (this._state === "new") throw new Error("Thread not created");
    if (this._state === "deleted") throw new Error("Thread already deleted");

    this._state = "deleted";
    this._notifySubscribers();

    return Promise.resolve();
  }

  public create(title?: string) {
    if (this.state !== "new") throw new Error("Thread not new");

    this._state = "regular";
    this._title = title ?? this._title;
    this._notifySubscribers();

    return Promise.resolve();
  }

  public subscribe(callback: () => void) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  private _notifySubscribers() {
    for (const callback of this._subscribers) callback();
  }
}
