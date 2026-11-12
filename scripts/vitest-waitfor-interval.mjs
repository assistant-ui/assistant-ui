import { join } from "node:path";
import { vi } from "vitest";

// Testing Library has no global setting for its 50ms poll. A bare `vi.mock` would resolve from this file, where Testing Library is not installed, and silently miss each package's copy.
vi.doMock(
  join(process.cwd(), "node_modules/@testing-library/react"),
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      waitFor: (callback, options) =>
        actual.waitFor(callback, { interval: 5, ...options }),
    };
  },
);
