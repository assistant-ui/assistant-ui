import { vi } from "vitest";

vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
