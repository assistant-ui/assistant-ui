import { describe, expect, it } from "vitest";
import { RunLeases } from "./run-lease";

describe("RunLeases", () => {
  it("keeps a lease current until a later run begins", () => {
    const leases = new RunLeases();
    const first = leases.begin();
    expect(first.isCurrent()).toBe(true);

    const second = leases.begin();
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
  });

  it("joins the run in progress without superseding it", () => {
    const leases = new RunLeases();
    const started = leases.begin();
    const joined = leases.current();

    expect(started.isCurrent()).toBe(true);
    expect(joined.isCurrent()).toBe(true);

    leases.begin();
    expect(joined.isCurrent()).toBe(false);
  });

  it("ends every lease on invalidate without starting a run", () => {
    const leases = new RunLeases();
    const before = leases.current();
    const started = leases.begin();

    leases.invalidate();
    expect(before.isCurrent()).toBe(false);
    expect(started.isCurrent()).toBe(false);
    expect(leases.current().isCurrent()).toBe(true);
  });
});
