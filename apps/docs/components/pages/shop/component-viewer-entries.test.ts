import { describe, expect, it } from "vitest";
import { stepActivity } from "../../../lib/checkout/protocol";
import { ENTRIES } from "./component-viewer-entries";

const entry = (id: string) => {
  const found = ENTRIES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no entry ${id}`);
  return found;
};

const installState = (activity: boolean) => {
  const install = entry("install");
  const state = install.scene({ ...install.defaults, activity }).state;
  if (!state) throw new Error("the install scene has no checkout state");
  return state;
};

describe("component viewer entries", () => {
  it("shows sample activity under the install steps only while enabled", () => {
    const active = installState(true);
    expect(stepActivity(active, "s0").map((line) => line.text)).toEqual([
      "Checked the package manager: pnpm, from pnpm-lock.yaml.",
      "Ran pnpm add @assistant-ui/react ai @ai-sdk/react.",
    ]);
    expect(stepActivity(active, "s1")).toHaveLength(2);

    const inactive = installState(false);
    expect(inactive.log).toEqual([]);
  });

  it("uses the cloud project question scene without a product proposal scene", () => {
    const cloud = entry("cloud-project");
    const cloudQuestion = cloud.scene(cloud.defaults).state;
    expect(cloudQuestion?.inputs[0]).toMatchObject({
      kind: "text",
      prompt: "Which Assistant Cloud project should this app use?",
    });
    expect(ENTRIES.some((candidate) => candidate.id === "product")).toBe(false);
  });
});
