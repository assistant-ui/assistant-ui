import { pricingPlans } from "../pricing/pricing-data";

export const revalidate = false;

const AGENT_MARKDOWN_DIRECTIVE =
  "> For AI agents: a documentation index is available at [llms.txt](/llms.txt). Use `.md` for canonical markdown pages; `.mdx` is kept as a backwards-compatible alias on supported URL paths.";

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

export function GET() {
  const markdown = [
    "# assistant-ui pricing",
    "",
    AGENT_MARKDOWN_DIRECTIVE,
    "",
    "assistant-ui is a free, MIT-licensed TypeScript/React library for AI chat. The commercial pricing below is for assistant-cloud, the fully managed backend for AI chat applications.",
    "",
    "MAU means Monthly Active Users who send at least one message.",
    "B2C pricing is available by contacting b2c-pricing@assistant.dev.",
    "",
    ...pricingPlans.map(formatPlan),
  ].join("\n\n");

  return new Response(`${markdown}\n`, {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
