type Listener = (...args: unknown[]) => void;

class MiniEmitter {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, fn: Listener) {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return this;
  }

  off(event: string, fn: Listener) {
    this.listeners.get(event)?.delete(fn);
    return this;
  }

  addListener(event: string, fn: Listener) {
    return this.on(event, fn);
  }

  removeListener(event: string, fn: Listener) {
    return this.off(event, fn);
  }

  emit(event: string, ...args: unknown[]) {
    const set = this.listeners.get(event);
    if (!set) return false;
    for (const fn of [...set]) fn(...args);
    return set.size > 0;
  }
}

export type InkStreams = {
  stdout: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
  pushInput: (data: string) => void;
  setSize: (cols: number, rows: number) => void;
};

// Fake streams implementing the subset of the Node stream API that ink 6
// touches (see ink's Ink/App classes). The writer receives ink's ANSI output
// with bare \n rewritten to \r\n (wterm does not emulate ONLCR). Ink's
// clear-terminal sequence passes through: its 3J resets wterm's scrollback on
// every overflow repaint, leaving only the final frame's overflow scrollable.
export function createInkStreams(
  writeToTerminal: (data: string) => void,
): InkStreams {
  const stdoutBase = new MiniEmitter() as MiniEmitter & Record<string, unknown>;
  Object.assign(stdoutBase, {
    columns: 80,
    rows: 24,
    isTTY: true,
    writable: true,
    setDefaultEncoding: () => stdoutBase,
    cork: () => {},
    uncork: () => {},
    write: (chunk: unknown, encoding?: unknown, cb?: () => void) => {
      const str = typeof chunk === "string" ? chunk : String(chunk);
      if (str.length > 0) {
        writeToTerminal(str.replace(/\r?\n/g, "\r\n"));
      }
      if (typeof encoding === "function") (encoding as () => void)();
      else cb?.();
      return true;
    },
  });

  const inputBuffer: string[] = [];
  const stdinBase = new MiniEmitter() as MiniEmitter & Record<string, unknown>;
  Object.assign(stdinBase, {
    columns: 80,
    rows: 24,
    isTTY: true,
    readable: true,
    setEncoding: () => stdinBase,
    setRawMode: () => stdinBase,
    resume: () => stdinBase,
    pause: () => stdinBase,
    ref: () => stdinBase,
    unref: () => stdinBase,
    read: () => (inputBuffer.length > 0 ? inputBuffer.shift()! : null),
  });

  return {
    stdout: stdoutBase as unknown as NodeJS.WriteStream,
    stdin: stdinBase as unknown as NodeJS.ReadStream,
    pushInput: (data: string) => {
      inputBuffer.push(data);
      stdinBase.emit("readable");
    },
    setSize: (cols: number, rows: number) => {
      const changed =
        stdoutBase["columns"] !== cols || stdoutBase["rows"] !== rows;
      stdoutBase["columns"] = cols;
      stdoutBase["rows"] = rows;
      stdinBase["columns"] = cols;
      stdinBase["rows"] = rows;
      if (changed) stdoutBase.emit("resize");
    },
  };
}
