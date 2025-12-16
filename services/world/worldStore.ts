export interface World {
  id: string;
  name: string;
  description: string;
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
}


