import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { vi } from "vitest";

// Testing Library has no global setting for its 50ms poll. A bare `vi.mock` would resolve from this file, where Testing Library is not installed, and silently miss each package's copy.
const TESTING_LIBRARY = "@testing-library/react";
const SHARED_POLL_MS = 5;

/**
 * The copy of Testing Library the package under test installed: the nearest one walking up from the
 * directory Vitest runs in. Vitest runs from the package, so this is normally its own `node_modules`;
 * walking up keeps the setup working from a directory above it. A run where no copy is reachable would
 * otherwise apply nothing and leave every poll at 50ms, so it fails here instead.
 */
function testingLibraryDir() {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", TESTING_LIBRARY);
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) {
      throw new Error(
        `vitest-waitfor-interval.mjs: no ${TESTING_LIBRARY} under ${process.cwd()} or any directory above it, so the ${SHARED_POLL_MS}ms poll would not apply`,
      );
    }
  }
}

vi.doMock(testingLibraryDir(), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // `interval: undefined` reaches Testing Library as "not set" and puts the poll back to 50ms, so the
    // default is applied after the spread rather than before it.
    waitFor: (callback, options) =>
      actual.waitFor(callback, {
        ...options,
        interval: options?.interval ?? SHARED_POLL_MS,
      }),
  };
});
