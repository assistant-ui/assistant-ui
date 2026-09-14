import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { buildAgentSkillsIndex } from "@/lib/agent-discovery";
import { listSkills } from "@/lib/agent-skills";
import { GET, HEAD, generateStaticParams } from "./route";

const request = {} as NextRequest;
const context = (skill: string) => ({ params: Promise.resolve({ skill }) });

describe("repo skill route", () => {
  it("serves the bytes the index digests, with the frontmatter", async () => {
    const response = await GET(request, context("tools"));
    const body = await response.text();
    const entry = buildAgentSkillsIndex().skills.find(
      (skill) => skill.name === "tools",
    );

    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(body).toMatch(/^---\nname: tools\ndescription: "/);
    expect(body).toContain("\n---\n\n# assistant-ui Tools");
    expect(response.headers.get("ETag")).toBe(
      `"${entry?.digest.replace(":", "-")}"`,
    );
  });

  it("answers HEAD without a body and the same ETag", async () => {
    const [get, head] = await Promise.all([
      GET(request, context("setup")),
      HEAD(request, context("setup")),
    ]);
    expect(await head.text()).toBe("");
    expect(head.headers.get("ETag")).toBe(get.headers.get("ETag"));
  });

  it("returns not found for an unknown skill", async () => {
    await expect(GET(request, context("nope"))).rejects.toThrow();
  });

  it("prerenders every skill", () => {
    expect(generateStaticParams()).toEqual(
      listSkills().map((skill) => ({ skill: skill.name })),
    );
    expect(generateStaticParams().length).toBeGreaterThanOrEqual(17);
  });
});
