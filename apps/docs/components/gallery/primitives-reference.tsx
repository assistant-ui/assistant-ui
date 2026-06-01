"use client";

import { JsonUI } from "./json-ui/render";
import { DEFAULT_REGISTRY } from "./json-ui/primitives";
import {
  PRIMITIVES,
  PRIMITIVE_CATEGORIES,
  type PrimitiveDoc,
} from "./json-ui/catalog";
import { CodeBlock } from "./code-block";
import { PropsTable } from "./props-table";

const anchor = (name: string) => name.toLowerCase();

export function PrimitivesReference() {
  return (
    <div className="grid gap-12 lg:grid-cols-[160px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-6">
          {PRIMITIVE_CATEGORIES.map((category) => (
            <div key={category}>
              <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                {category}
              </h2>
              <ul className="space-y-1.5">
                {PRIMITIVES.filter((p) => p.category === category).map((p) => (
                  <li key={p.name}>
                    <a
                      href={`#${anchor(p.name)}`}
                      className="text-muted-foreground hover:text-foreground font-mono text-sm transition-colors"
                    >
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-16">
        {PRIMITIVES.map((primitive) => (
          <PrimitiveSection key={primitive.name} primitive={primitive} />
        ))}
      </div>
    </div>
  );
}

function PrimitiveSection({ primitive }: { primitive: PrimitiveDoc }) {
  const { name, category, description, example, props } = primitive;
  return (
    <section id={anchor(name)} className="scroll-mt-24">
      <div className="mb-1 flex items-baseline gap-2">
        <h2 className="font-mono text-lg font-medium tracking-tight">{name}</h2>
        <span className="text-muted-foreground text-xs">{category}</span>
      </div>
      <p className="text-muted-foreground mb-4 text-sm">{description}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border-border/60 bg-muted/30 flex min-h-[120px] items-center justify-center rounded-xl border p-6">
          <div className="w-full max-w-[280px]">
            <JsonUI node={example} registry={DEFAULT_REGISTRY} />
          </div>
        </div>
        <CodeBlock code={JSON.stringify(example, null, 2)} language="json" />
      </div>

      {props.length > 0 && (
        <div className="mt-4">
          <PropsTable props={props} />
        </div>
      )}
    </section>
  );
}
