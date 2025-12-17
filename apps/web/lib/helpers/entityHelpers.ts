/**
 * Helper functions for entity lookups and operations
 */

interface EntityWithId {
  id: string;
}

interface EntityWithName extends EntityWithId {
  name: string;
}

/**
 * Finds an entity by ID in an array
 */
export function findById<T extends EntityWithId>(
  entities: T[],
  id: string | null | undefined
): T | undefined {
  if (!id) return undefined;
  return entities.find((e) => e.id === id);
}

/**
 * Gets the name of an entity by ID, with a fallback
 */
export function getNameById(
  entities: EntityWithName[],
  id: string | null | undefined,
  fallback: string
): string {
  const entity = findById(entities, id);
  return entity?.name ?? fallback;
}

/**
 * Gets entity type label (All/Locations/Creatures/Factions/Events)
 */
export function getEntityTypeLabel(
  type: "all" | "location" | "creature" | "faction" | "event"
): string {
  switch (type) {
    case "all":
      return "All";
    case "location":
      return "Locations";
    case "creature":
      return "Creatures";
    case "faction":
      return "Factions";
    case "event":
      return "Events";
    /* c8 ignore start */ // default is unreachable in TS but exists in compiled JS
    default:
      return "All";
    /* c8 ignore stop */
  }
}
