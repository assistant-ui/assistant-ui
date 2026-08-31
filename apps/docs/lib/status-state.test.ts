import { normalizeStatusState } from "./status-state";

describe("normalizeStatusState", () => {
  it("maps the documented operational state", () => {
    expect(normalizeStatusState("operational")).toBe("operational");
  });

  it("maps the states the status page renders", () => {
    expect(normalizeStatusState("degraded")).toBe("degraded");
    expect(normalizeStatusState("downtime")).toBe("downtime");
    expect(normalizeStatusState("maintenance")).toBe("maintenance");
  });

  it("maps longer provider spellings of the same states", () => {
    expect(normalizeStatusState("under_maintenance")).toBe("maintenance");
    expect(normalizeStatusState("degraded_performance")).toBe("degraded");
    expect(normalizeStatusState("partial_outage")).toBe("degraded");
    expect(normalizeStatusState("major_outage")).toBe("downtime");
    expect(normalizeStatusState("MAJOR_OUTAGE")).toBe("downtime");
  });

  it("returns null for states that carry no incident signal", () => {
    expect(normalizeStatusState("not_monitored")).toBeNull();
    expect(normalizeStatusState("")).toBeNull();
  });

  it("returns null for a missing or non-string field", () => {
    expect(normalizeStatusState(undefined)).toBeNull();
    expect(normalizeStatusState(null)).toBeNull();
    expect(normalizeStatusState(3)).toBeNull();
    expect(normalizeStatusState({ aggregate_state: "operational" })).toBeNull();
  });
});
