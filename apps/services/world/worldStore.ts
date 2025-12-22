export interface World {
  id: string;
  name: string;
  description: string;
  /**
   * Optional reference to a DigitalAsset (image) used as the world's splash image.
   * This is an ID in the assets service, not a URL.
   */
  splashImageAssetId?: string;
}

import { generateId, requireNonEmpty, alreadyExistsError, findIndexOrThrow, notFoundError } from "../../../packages/store-utils";

export class InMemoryWorldStore {
  private worlds: World[] = [];

  listWorlds(): World[] {
    return [...this.worlds];
  }

  createWorld(name: string, description: string): World {
    requireNonEmpty(name, "World name");
    const existing = this.worlds.find(
      (w) => w.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      throw new Error(alreadyExistsError("World", name));
    }
    const world: World = {
      id: generateId(),
      name,
      description
    };
    this.worlds.push(world);
    return world;
  }

  updateWorld(id: string, patch: Partial<Omit<World, "id">>): World {
    const index = findIndexOrThrow(
      this.worlds,
      (w) => w.id === id,
      notFoundError("World", id)
    );
    const updated: World = { ...this.worlds[index], ...patch };
    this.worlds[index] = updated;
    return updated;
  }
}


