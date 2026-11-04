import { useEffect, useState } from "react";

function attempt(fn: () => unknown): string {
  try {
    return `ok:${String(fn())}`;
  } catch (e) {
    return `blocked:${(e as Error).name}`;
  }
}

export default function Security() {
  const [r, setR] = useState<Record<string, string>>({});
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- the probes must run in the frame after mount, not during render
    setR({
      parentDoc: attempt(() => window.parent.document.title),
      topLocation: attempt(() => window.top!.location.href),
      cookie: attempt(() => document.cookie),
      storage: attempt(() => {
        localStorage.setItem("rc-test", "1");
        return localStorage.getItem("rc-test");
      }),
      origin: self.origin,
    });
  }, []);
  return <pre data-probe="security">{JSON.stringify(r)}</pre>;
}
