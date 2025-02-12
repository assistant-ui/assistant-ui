import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/magicui/shine-border";
import { cn } from "@/lib/utils";
import Link from "next/link";

const pricingOptions = [
  {
    title: "Free",
    price: "Up to 200 MAU",
    features: ["200 MAU", "Chat History", "Thread Management"],
    button: "Sign up",
    buttonLink: "https://dash.assistant-ui.com/",
  },
  {
    title: "Pro",
    price: "$50/mo",
    features: [
      "500 MAU + $0.10 per additional",
      "Chat History",
      "Thread Management",
      "Early Access To New Features",
    ],
    button: "Sign up",
    buttonLink: "https://dash.assistant-ui.com/",
  },
  {
    title: "Enterprise",
    price: "Custom Pricing",
    features: [
      "Integration with your own backend",
      "Replicate data to your own database",
      "Dedicated Support",
      "99.99% Uptime SLA",
      "On-premises Deployment",
      "Security & Privacy Compliance",
    ],
    button: "Contact us",
    buttonLink: "https://cal.com/simon-farshid/assistant-ui",
  },
];

export default function PricingSection() {
  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {pricingOptions.map((option) => {
          const isPro = option.title === "Pro";
          const Wrapper = isPro ? ShineBorder : "div";
          return (
            <Wrapper
              key={option.title}
              className={cn(
                "relative flex flex-col border-0 p-6",
                !isPro && "rounded-lg border-2",
              )}
              {...({
                borderRadius: 8,
                color: isPro ? ["#A07CFE", "#FE8FB5", "#FFBE7B"] : undefined,
              } as any)}
            >
              <div className="flex-grow">
                <h3 className="mb-2 text-2xl font-semibold">{option.title}</h3>
                <p className="text-md mb-4">{option.price}</p>
                <ul className="mb-6 space-y-2 text-sm">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                className="mt-auto w-full"
                variant={isPro ? "default" : "outline"}
                asChild
              >
                <Link href={option.buttonLink}>{option.button}</Link>
              </Button>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
