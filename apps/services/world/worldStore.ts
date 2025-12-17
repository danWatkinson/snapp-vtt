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

export class InMemoryWorldStore {
  private worlds: World[] = [];

  listWorlds(): World[] {
    return [...this.worlds];
  }

  createWorld(name: string, description: string): World {
    if (!name.trim()) {
      throw new Error("World name is required");
    }
    const existing = this.worlds.find(
      (w) => w.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      throw new Error(`World '${name}' already exists`);
    }
    const world: World = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      description
    };
    this.worlds.push(world);
    return world;
  }

  updateWorld(id: string, patch: Partial<Omit<World, "id">>): World {
    const index = this.worlds.findIndex((w) => w.id === id);
    if (index === -1) {
      throw new Error(`World with id '${id}' not found`);
    }
    const updated: World = { ...this.worlds[index], ...patch };
    this.worlds[index] = updated;
    return updated;
  }
}


