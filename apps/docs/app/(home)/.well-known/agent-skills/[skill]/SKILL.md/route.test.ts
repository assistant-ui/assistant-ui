import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { buildAgentSkillsIndex, sha256 } from "@/lib/agent-discovery";
import { API_CATALOG_LINK_HEADER } from "@/lib/agent-discovery-routes";
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

    expect(Object.fromEntries(response.headers)).toEqual({
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "ETag, Link",
      "cache-control": "no-cache, must-revalidate",
      "content-type": "text/markdown; charset=utf-8",
      etag: `"${entry?.digest.replace(":", "-")}"`,
      link: API_CATALOG_LINK_HEADER,
    });
    expect(`sha256:${sha256(body)}`).toBe(entry?.digest);
    expect(body).toMatch(/^---\nname: tools\ndescription: "/);
    expect(body).toContain('\nlicense: "MIT"\n---\n\n# assistant-ui Tools');
  });

  it("serves the digested bytes for every indexed repo skill", async () => {
    for (const entry of buildAgentSkillsIndex().skills.slice(2)) {
      const response = await GET(request, context(entry.name));
      expect(`sha256:${sha256(await response.text())}`, entry.name).toBe(
        entry.digest,
      );
    }
  });

  it("answers HEAD without a body and the same ETag", async () => {
    const [get, head] = await Promise.all([
      GET(request, context("setup")),
      HEAD(request, context("setup")),
    ]);
    expect(await head.text()).toBe("");
    expect(Object.fromEntries(head.headers)).toEqual(
      Object.fromEntries(get.headers),
    );
  });

  it("returns not found for an unknown skill", async () => {
    await expect(GET(request, context("nope"))).rejects.toThrow();
  });

  it("prerenders every indexed repo skill", () => {
    expect(generateStaticParams().map((params) => params.skill)).toEqual(
      buildAgentSkillsIndex()
        .skills.slice(2)
        .map((skill) => skill.name),
    );
  });
});
