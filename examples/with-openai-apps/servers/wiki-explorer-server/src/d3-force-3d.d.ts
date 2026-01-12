declare module "d3-force-3d" {
  interface Force {
    (alpha: number): void;
    initialize?: (nodes: unknown[], ...args: unknown[]) => void;
  }

  interface ManyBodyForce extends Force {
    strength(value: number): ManyBodyForce;
  }

  interface LinkForce extends Force {
    distance(value: number): LinkForce;
  }

  interface CollideForce extends Force {
    radius(value: number): CollideForce;
  }

  interface CenterForce extends Force {
    x(value: number): CenterForce;
    y(value: number): CenterForce;
  }

  export function forceManyBody(): ManyBodyForce;
  export function forceLink(): LinkForce;
  export function forceCollide(radius?: number): CollideForce;
  export function forceCenter(x?: number, y?: number): CenterForce;
}
