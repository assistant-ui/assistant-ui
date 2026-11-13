import { defineRoutes } from "@farm.js/core";
import * as catalogMd from "./app/(catalog)/catalog.md/route";
import * as installMd from "./app/(catalog)/install.md/route";
import * as playgroundInit from "./app/(demos)/playground/init/route";
import * as agentSkill from "./app/(home)/.well-known/agent-skills/[skill]/SKILL.md/route";
import * as siteSkillWellKnown from "./app/(home)/.well-known/agent-skills/assistant-ui-docs/SKILL.md/route";
import * as agentSkillsIndex from "./app/(home)/.well-known/agent-skills/index.json/route";
import * as apiCatalog from "./app/(home)/.well-known/api-catalog/route";
import * as agentsMd from "./app/(home)/AGENTS.md/route";
import * as blogMarkdown from "./app/(home)/blog/llms.md/[slug]/route";
import * as designMd from "./app/(home)/design.md/route";
import * as llmsFullTxt from "./app/(home)/llms-full.txt/route";
import * as docsMarkdown from "./app/(home)/llms.mdx/[[...slug]]/route";
import * as designMarkdown from "./app/(home)/llms.mdx/design/[[...slug]]/route";
import * as elementsMarkdown from "./app/(home)/llms.mdx/elements/[[...slug]]/route";
import * as examplesMarkdown from "./app/(home)/llms.mdx/examples/[[...slug]]/route";
import * as llmsTxt from "./app/(home)/llms.txt/route";
import * as ossJson from "./app/(home)/oss.json/route";
import * as platformMarkdown from "./app/(home)/platform-llms.mdx/[platform]/[flavor]/[[...slug]]/route";
import * as pricingMd from "./app/(home)/pricing.md/route";
import * as radixDesignMarkdown from "./app/(home)/radix-llms.mdx/design/[[...slug]]/route";
import * as siteMarkdown from "./app/(home)/site-llms.mdx/[site]/[[...slug]]/route";
import * as sitemapMd from "./app/(home)/sitemap.md/route";
import * as skillMd from "./app/(home)/skill.md/route";
import * as staticJson from "./app/static.json/route";
import * as tractionDarkPng from "./app/traction-dark.png/route";
import * as tractionPng from "./app/traction.png/route";
import * as umamiSend from "./lib/umami-send";

const METHODS = ["GET", "HEAD", "POST"] as const;
type Handler = (
  request: Request,
  context: never,
) => Response | Promise<Response>;

const methods = (module: Partial<Record<(typeof METHODS)[number], unknown>>) =>
  Object.fromEntries(
    METHODS.filter((method) => module[method]).map((method) => [
      method,
      module[method] as Handler,
    ]),
  );

// Farm discovers route handlers only under app/api, so the ones that answer
// at the site root are registered here.
export default defineRoutes(({ api }) => [
  api("/catalog.md", methods(catalogMd)),
  api("/install.md", methods(installMd)),
  api("/playground/init", methods(playgroundInit)),
  api("/.well-known/agent-skills/index.json", methods(agentSkillsIndex)),
  api(
    "/.well-known/agent-skills/assistant-ui-docs/SKILL.md",
    methods(siteSkillWellKnown),
  ),
  api("/.well-known/agent-skills/[skill]/SKILL.md", methods(agentSkill)),
  api("/.well-known/api-catalog", methods(apiCatalog)),
  api("/AGENTS.md", methods(agentsMd)),
  api("/blog/llms.md/[slug]", methods(blogMarkdown)),
  api("/design.md", methods(designMd)),
  api("/llms-full.txt", methods(llmsFullTxt)),
  api("/llms.mdx/design/[[...slug]]", methods(designMarkdown)),
  api("/llms.mdx/elements/[[...slug]]", methods(elementsMarkdown)),
  api("/llms.mdx/examples/[[...slug]]", methods(examplesMarkdown)),
  api("/llms.mdx/[[...slug]]", methods(docsMarkdown)),
  api("/llms.txt", methods(llmsTxt)),
  api("/oss.json", methods(ossJson)),
  api(
    "/platform-llms.mdx/[platform]/[flavor]/[[...slug]]",
    methods(platformMarkdown),
  ),
  api("/pricing.md", methods(pricingMd)),
  api("/radix-llms.mdx/design/[[...slug]]", methods(radixDesignMarkdown)),
  api("/site-llms.mdx/[site]/[[...slug]]", methods(siteMarkdown)),
  api("/sitemap.md", methods(sitemapMd)),
  api("/skill.md", methods(skillMd)),
  api("/static.json", methods(staticJson)),
  api("/traction-dark.png", methods(tractionDarkPng)),
  api("/traction.png", methods(tractionPng)),
  api("/umami/api/send", methods(umamiSend)),
]);
