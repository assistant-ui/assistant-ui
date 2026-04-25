type Timer = {
  id: number;
  due: number;
  fire: () => void;
};

export class VirtualClock {
  private current = 0;
  private nextId = 1;
  private timers: Timer[] = [];

  now(): number {
    return this.current;
  }

  setTimeout(fire: () => void, delayMs: number): number {
    const id = this.nextId++;
    this.timers.push({ id, due: this.current + Math.max(0, delayMs), fire });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers = this.timers.filter((timer) => timer.id !== id);
  }

  advance(ms: number): void {
    if (ms < 0) throw new Error("VirtualClock.advance: ms must be >= 0");

    const target = this.current + ms;
    for (;;) {
      const due = this.timers
        .filter((timer) => timer.due <= target)
        .sort((a, b) => a.due - b.due || a.id - b.id);
      const next = due[0];
      if (!next) break;

      this.current = next.due;
      this.timers = this.timers.filter((timer) => timer.id !== next.id);
      next.fire();
    }
    this.current = target;
  }
}
