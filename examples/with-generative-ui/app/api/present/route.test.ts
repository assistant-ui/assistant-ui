import { vi } from "vitest";
import { describeRequestContext } from "../request-context.testUtils";
import { POST } from "./route";

const { toolkit } = vi.hoisted(() => ({ toolkit: {} }));
vi.mock("../../present-toolkit", () => ({ default: toolkit }));

describeRequestContext("present route", POST);
