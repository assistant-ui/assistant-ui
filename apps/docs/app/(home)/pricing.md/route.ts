import { unstable_cache } from "@farm.js/core/cache";
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-docs-directive";
import { createMarkdownResponse } from "@/lib/markdown-response";
import {
  cloudHighlights,
  faqs,
  libraryHighlights,
  pricingPlans,
} from "../pricing/pricing-data";

const formatPlan = (plan: (typeof pricingPlans)[number]) => {
  const price = plan.period ? `${plan.price}${plan.period}` : plan.price;

  return [
    `## ${plan.name}`,
    "",
    `Price: ${price}`,
    `Description: ${plan.description}`,
    "",
    "Included:",
    ...plan.features.map((feature) => `- ${feature}`),
    "",
    `CTA: ${plan.cta}`,
    `URL: ${plan.href}`,
  ].join("\n");
};

const getMarkdown = unstable_cache(
  async function getMarkdown() {
  const markdown = [
    "# assistant-ui pricing",
    "",
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    "",
    "assistant-ui is a free, MIT-licensed TypeScript/React library for AI chat. The commercial pricing below is for assistant-cloud, an optional hosted backend for thread persistence, history, and auth.",
    "",
    "## The library",
    "",
    ...libraryHighlights.flatMap((item) => [
      `### ${item.title}`,
      "",
      item.description,
      "",
    ]),
    "## assistant-cloud",
    "",
    "MAU means Monthly Active Users who send at least one message.",
    "B2C pricing is available by contacting b2c-pricing@assistant.dev.",
    "",
    ...pricingPlans.map(formatPlan),
    "",
    "## What Cloud includes",
    "",
    ...cloudHighlights.flatMap((item) => [
      `### ${item.title}`,
      "",
      item.description,
      "",
    ]),
    "## Questions",
    "",
    ...faqs.flatMap((faq) => [`### ${faq.question}`, "", faq.answer, ""]),
  ].join("\n");

  return `${markdown}\n`;
},
  ["app/(home)/pricing.md/route.ts#getMarkdown"],
  { revalidate: false },
);

export async function GET() {
  return createMarkdownResponse(await getMarkdown());
}
