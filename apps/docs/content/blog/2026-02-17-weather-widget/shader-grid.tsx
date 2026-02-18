import { Cloud, CloudRain, Layers, Snowflake, Sun } from "lucide-react";

const shaders = [
  {
    name: "Celestial",
    gradient: "from-indigo-900 to-amber-300",
    icon: Sun,
    description:
      "Sky gradients, star fields, sun with prismatic rays, and a phase-accurate textured moon. Handles dawn-to-midnight transitions.",
  },
  {
    name: "Clouds",
    gradient: "from-slate-500 to-white",
    icon: Cloud,
    description:
      "Fractal Brownian motion with domain warping. Per-layer aerial perspective and celestial backlighting with silver lining edge effects.",
  },
  {
    name: "Rain",
    gradient: "from-slate-600 to-cyan-400",
    icon: CloudRain,
    description:
      "Glass-surface drops (the Big Hero 6 technique) plus atmospheric falling rain at multiple depth layers with parallax.",
  },
  {
    name: "Snow",
    gradient: "from-white to-sky-200",
    icon: Snowflake,
    description:
      "Multi-layer flakes with hexagonal crystal shapes, per-flake flutter and drift, depth-based wind shear, and probability-based sparkle.",
  },
  {
    name: "Composite",
    gradient: "from-amber-400 to-purple-500",
    icon: Layers,
    description:
      "Post-processing pipeline: haze, bloom, god rays, and lightning exposure response with flash envelope and tonemapping recovery.",
  },
];

export function ShaderGrid() {
  return (
    <div className="not-prose my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shaders.map((shader) => (
        <div
          key={shader.name}
          className="flex flex-col gap-3 rounded-lg bg-fd-muted/50 p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${shader.gradient}`}
            >
              <shader.icon className="size-5 text-white/80" />
            </div>
            <span className="font-medium text-sm">{shader.name}</span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {shader.description}
          </p>
        </div>
      ))}
    </div>
  );
}
