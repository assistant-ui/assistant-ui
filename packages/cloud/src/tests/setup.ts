// This file contains setup code for tests
import { vi } from "vitest";

// Set up globalThis mocks if needed
// Using a fixed date to avoid recursive calls
const OriginalDate = globalThis.Date;
const fixedDate = new OriginalDate("2023-01-01");
globalThis.Date = vi.fn(() => fixedDate) as any;
globalThis.Date.now = vi.fn(() => fixedDate.getTime());

// Add any other globalThis setup needed for tests
