import { describe, expect, it } from "vitest";
import { asksForCloudProject } from "./cloud-project-input-card";
import { ENTRIES } from "./component-viewer-entries";

const entry = (id: string) => {
  const found = ENTRIES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no entry ${id}`);
  return found;
};

describe("component viewer entries", () => {
  it("puts the agent's sample lines under the install steps only while the toggle is on", () => {
    const install = entry("install");
    const on = install.scene({ ...install.defaults, activity: true }).state!;
    const stepIds = new Set(on.steps.map((step) => step.id));
    expect(on.log.length).toBeGreaterThan(0);
    for (const line of on.log) {
      expect(line.role).toBe("agent");
      expect(stepIds.has(line.stepId ?? "")).toBe(true);
    }
    const off = install.scene({ ...install.defaults, activity: false }).state!;
    expect(off.log).toEqual([]);
  });

  it("asks the cloud project question the way the card recognises it", () => {
    const scene = entry("cloud-project");
    const input = scene.scene(scene.defaults).state!.inputs[0]!;
    expect(input.kind).toBe("text");
    expect(asksForCloudProject(input)).toBe(true);
  });

  it("offers text, choice and model answers in the answer scene", () => {
    expect(
      entry("answer").controls.find((control) => control.key === "kind"),
    ).toMatchObject({ options: ["text", "choice", "model"] });
  });
});
