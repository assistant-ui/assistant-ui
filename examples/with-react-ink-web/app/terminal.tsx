"use client";

import { useCallback, useEffect, useRef } from "react";
import { Terminal, useTerminal, type WTerm } from "@wterm/react";
import { render, type Instance } from "ink";
import { waitForYogaInit } from "ink-web";
import { createInkStreams, type InkStreams } from "./ink-streams";
import { InkApp } from "./ink-app";
import "@wterm/dom/src/terminal.css";

const inkApp = <InkApp />;

export default function InkTerminal() {
  const { ref, write } = useTerminal();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const streamsRef = useRef<InkStreams | null>(null);
  const instanceRef = useRef<Instance | null>(null);
  const startedRef = useRef(false);
  const disposedRef = useRef(false);
  const colsRef = useRef(0);

  // wterm does not auto-scroll on new output (vercel-labs/wterm#61); follow
  // the tail after its coalesced write -> setTimeout(0) -> rAF render pass.
  const scheduleScroll = useCallback(() => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        const el = wrapperRef.current?.querySelector(".wterm");
        if (el) el.scrollTop = el.scrollHeight;
      });
    }, 0);
  }, []);

  const getStreams = useCallback(() => {
    streamsRef.current ??= createInkStreams((data) => {
      write(data);
      scheduleScroll();
    });
    return streamsRef.current;
  }, [write, scheduleScroll]);

  const handleReady = useCallback(
    (wt: WTerm) => {
      const streams = getStreams();
      colsRef.current = wt.cols;
      streams.setSize(wt.cols, wt.rows);
      // ink components draw their own cursor; the bundled ink's cli-cursor
      // shim is a no-op, so hide wterm's grid cursor here.
      wt.write("\x1b[?25l");

      if (!startedRef.current) {
        startedRef.current = true;
        void waitForYogaInit().then(() => {
          if (disposedRef.current) return;
          instanceRef.current = render(inkApp, {
            stdout: streams.stdout,
            stderr: streams.stdout,
            stdin: streams.stdin,
            patchConsole: false,
            exitOnCtrlC: false,
          });
        });
      } else if (instanceRef.current) {
        instanceRef.current.clear();
        instanceRef.current.rerender(inkApp);
      }
    },
    [getStreams],
  );

  // wterm encodes the Backspace key as \x7f, which the bundled ink 6 parses
  // as key.delete (forward delete); rewrite to \x08, which it parses as
  // backspace. \x03 (Ctrl+C) is dropped so it stays free for copy.
  const handleData = useCallback(
    (data: string) => {
      const mapped = data.replaceAll("\x7f", "\x08").replaceAll("\x03", "");
      if (mapped.length === 0) return;
      getStreams().pushInput(mapped);
    },
    [getStreams],
  );

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      if (cols < colsRef.current && instanceRef.current) {
        instanceRef.current.clear();
        write("\x1b[2J\x1b[3J\x1b[H");
      }
      colsRef.current = cols;
      getStreams().setSize(cols, rows);
    },
    [getStreams, write],
  );

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      instanceRef.current?.unmount();
      instanceRef.current = null;
      startedRef.current = false;
    };
  }, []);

  return (
    <div className="terminal-center">
      <div ref={wrapperRef} className="terminal-host">
        <Terminal
          ref={ref}
          autoResize
          onReady={handleReady}
          onData={handleData}
          onResize={handleResize}
        />
      </div>
    </div>
  );
}
