import { Card, Cards } from "fumadocs-ui/components/card";
import { ExampleItem } from "@/lib/examples";

interface ExamplesGridProps {
  examples: ExampleItem[];
  title?: string;
}

export function ExamplesGrid({ examples, title }: ExamplesGridProps) {
  return (
    <>
      {title && <h2 className="mt-20 mb-8 text-3xl font-bold">{title}</h2>}
      <Cards>
        {examples.map((example) => (
          <Card
            key={example.title}
            title={example.title}
            description={example.description}
            href={example.link}
          />
        ))}
      </Cards>
    </>
  );
}
