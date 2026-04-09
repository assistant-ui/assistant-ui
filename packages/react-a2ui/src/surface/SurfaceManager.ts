import type { A2uiSurface } from "../types";
import type { CreateSurface, UpdateComponents, DeleteSurface } from "./types";

export class SurfaceManager {
  private surfaces = new Map<string, A2uiSurface>();
  private listeners = new Set<() => void>();
  private surfacesArray: A2uiSurface[] = [];

  createSurface(msg: CreateSurface): void {
    this.surfaces.set(msg.surfaceId, {
      surfaceId: msg.surfaceId,
      components: [],
      ...(msg.metadata ? { metadata: msg.metadata } : {}),
    });
    this.notify();
  }

  updateComponents(msg: UpdateComponents): void {
    const surface = this.surfaces.get(msg.surfaceId);
    if (!surface) return;
    this.surfaces.set(msg.surfaceId, {
      ...surface,
      components: msg.components,
    });
    this.notify();
  }

  deleteSurface(msg: DeleteSurface): void {
    if (!this.surfaces.has(msg.surfaceId)) return;
    this.surfaces.delete(msg.surfaceId);
    this.notify();
  }

  getSurfaces = (): A2uiSurface[] => {
    return this.surfacesArray;
  };

  getSurface = (surfaceId: string): A2uiSurface | undefined => {
    return this.surfaces.get(surfaceId);
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.surfacesArray = Array.from(this.surfaces.values());
    for (const listener of this.listeners) {
      listener();
    }
  }
}
