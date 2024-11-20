import Image from "next/image";

import { Card } from "@/components/ui/card";

export default function Component() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-28 mt-12 text-center">
          <div className="text-muted-foreground text-sm uppercase tracking-wider">
            COMMUNITY SHOWCASE
          </div>
          <h1 className="mt-4 text-5xl font-bold">
            Built with
            <br />
            assistant-ui
          </h1>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          <ShowcaseCard
            title="Closing.wtf"
            image="/screenshot/closing-wtf.png"
            tag="AI Assistant"
            link="https://closing.wtf/"
            description="Helps homebuyers get the best deal and avoid getting screwed on their mortgage"
          />
          <ShowcaseCard
            title="Entelligence"
            image="/screenshot/entelligence.png"
            tag="Developer Tools"
            link="https://entelligence.ai/"
            description="AI-powered software engineering assistant"
          />
          <ShowcaseCard
            title="Helicone"
            image="/screenshot/helicone.png"
            tag="Developer Tools"
            link="https://www.helicone.ai/"
            description="Open-source LLM observability for developers"
          />
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({
  title,
  image,
  tag,
  secondaryTag,
  link,
  description,
}: {
  title: string;
  image: string;
  tag: string;
  secondaryTag?: string;
  link: string;
  description?: string;
}) {
  return (
    <a href={link} target="_blank">
      <Card className="group relative overflow-hidden rounded-lg border-zinc-800 bg-zinc-950">
        <div className="aspect-[5/3] overflow-hidden">
          <Image
            src={image}
            alt={title}
            width={600}
            height={400}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col gap-1 p-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex gap-2">
              <span className="rounded bg-purple-900/50 px-2 py-1 text-xs">
                {tag}
              </span>
              {secondaryTag && (
                <span className="rounded bg-zinc-800 px-2 py-1 text-xs">
                  {secondaryTag}
                </span>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </Card>
    </a>
  );
}
