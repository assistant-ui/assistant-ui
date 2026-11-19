import { vi } from "vitest";
import { describeRequestContext } from "../request-context.testUtils";
import { POST } from "./route";

const { toolkit } = vi.hoisted(() => ({ toolkit: {} }));
vi.mock("../../toolkit", () => ({ default: toolkit }));

describeRequestContext("chat route", POST);
