"use client";

import { type World, type WorldEntity } from "../../lib/worldClient";

interface WorldTabProps {
  worlds: World[];
  selectedWorldId: string | null;
  selectedEntityType: "all" | "location" | "creature" | "faction" | "event";
  entities: WorldEntity[];
  worldModalOpen: boolean;
  entityModalOpen: boolean;
  worldName: string;
  worldDescription: string;
  entityName: string;
  entitySummary: string;
  entityBeginningTimestamp: string;
  entityEndingTimestamp: string;
  onCreateWorld: (e: React.FormEvent) => void;
  onCreateEntity: (e: React.FormEvent) => void;
  setWorldModalOpen: (open: boolean) => void;
  setEntityModalOpen: (open: boolean) => void;
  setSelectedWorldId: (id: string | null) => void;
  setSelectedEntityType: (type: "all" | "location" | "creature" | "faction" | "event") => void;
  setEntitiesLoadedFor: (key: string | null) => void;
  setWorldName: (name: string) => void;
  setWorldDescription: (description: string) => void;
  setEntityName: (name: string) => void;
  setEntitySummary: (summary: string) => void;
  setEntityBeginningTimestamp: (timestamp: string) => void;
  setEntityEndingTimestamp: (timestamp: string) => void;
}

export default function WorldTab({
  worlds,
  selectedWorldId,
  selectedEntityType,
  entities,
  worldModalOpen,
  entityModalOpen,
  worldName,
  worldDescription,
  entityName,
  entitySummary,
  entityBeginningTimestamp,
  entityEndingTimestamp,
  onCreateWorld,
  onCreateEntity,
  setWorldModalOpen,
  setEntityModalOpen,
  setSelectedWorldId,
  setSelectedEntityType,
  setEntitiesLoadedFor,
  setWorldName,
  setWorldDescription,
  setEntityName,
  setEntitySummary,
  setEntityBeginningTimestamp,
  setEntityEndingTimestamp,
}: WorldTabProps) {
  return (
    <section data-component="WorldTab" className="space-y-4">
      <p className="text-sm snapp-muted">
        World domain – manage locations, maps, and lore.
      </p>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>
          Worlds
        </h2>
        <button
          type="button"
          className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 snapp-primary-btn"
          onClick={() => setWorldModalOpen(true)}
        >
          Create world
        </button>
      </div>

      {worlds.length > 0 && (
        <nav
          role="tablist"
          aria-label="Worlds"
          className="inline-flex gap-2 rounded-full p-1 text-xs snapp-tabs"
        >
          {worlds.map((world) => {
            const isActive = selectedWorldId === world.id;
            return (
              <button
                key={world.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                className={
                  "rounded-full px-3 py-1 transition-colors " +
                  (isActive ? "text-white" : "bg-transparent hover:opacity-80")
                }
                style={
                  isActive
                    ? { backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }
                    : { color: '#3d2817' }
                }
                onClick={() => {
                  setSelectedWorldId(world.id);
                  setSelectedEntityType("all");
                  setEntitiesLoadedFor(null);
                }}
              >
                {world.name}
              </button>
            );
          })}
        </nav>
      )}

      {worlds.length === 0 && (
        <p className="text-sm snapp-muted">
          No worlds have been created yet.
        </p>
      )}

      {selectedWorldId && (
        <section
          className="space-y-3 rounded-lg border p-4 snapp-panel"
        >
          <nav
            role="tablist"
            aria-label="Entity types"
            className="inline-flex gap-2 rounded-full p-1 text-xs snapp-tabs"
          >
            {(["all", "location", "creature", "faction", "event"] as const).map((type) => {
              const isActive = selectedEntityType === type;
              return (
                <button
                  key={type}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  className={
                    "rounded-full px-3 py-1 transition-colors capitalize " +
                    (isActive
                      ? "text-white"
                      : "bg-transparent hover:opacity-80")
                  }
                  style={isActive
                    ? { backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }
                    : { color: '#3d2817' }
                  }
                  onClick={() => {
                    setSelectedEntityType(type);
                    setEntitiesLoadedFor(null);
                  }}
                >
                  {type === "all" ? "All" : type === "location" ? "Locations" : type === "creature" ? "Creatures" : type === "faction" ? "Factions" : "Events"}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>
              Entities for{" "}
              {worlds.find((w) => w.id === selectedWorldId)?.name ?? "selected world"}
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium snapp-heading">
              {selectedEntityType === "all" ? "All Entities" : selectedEntityType === "location" ? "Locations" : selectedEntityType === "creature" ? "Creatures" : selectedEntityType === "faction" ? "Factions" : "Events"}
            </h4>
            {selectedEntityType !== "all" && (
              <button
                type="button"
                className="rounded px-3 py-1 text-xs font-semibold hover:opacity-90 snapp-primary-btn"
                onClick={() => setEntityModalOpen(true)}
              >
                Add {selectedEntityType}
              </button>
            )}
          </div>

          {entities.length === 0 ? (
            <p className="text-sm snapp-muted">
              {selectedEntityType === "all"
                ? "No entities have been added to this world yet."
                : `No ${selectedEntityType}s have been added to this world yet.`}
            </p>
          ) : (
            <ul className="space-y-2">
              {entities.map((entity) => (
                <li
                  key={entity.id}
                  role="listitem"
                  className="rounded border p-3 text-sm snapp-panel"
                >
                  <div className="flex items-start gap-2">
                    {selectedEntityType === "all" && (
                      <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
                        {entity.type}
                      </span>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{entity.name}</div>
                      {entity.summary && (
                        <p className="text-xs" style={{ color: '#5a4232' }}>{entity.summary}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {worldModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create world"
                className="w-full max-w-md rounded-lg border p-4 shadow-lg snapp-panel"
          >
            <h2 className="text-lg font-medium mb-3 snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>Create world</h2>
            <form onSubmit={onCreateWorld} className="space-y-3">
              <label className="block text-sm">
                World name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Description
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-sm snapp-input"
                  rows={3}
                  value={worldDescription}
                  onChange={(e) => setWorldDescription(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80 snapp-muted"
                  onClick={() => setWorldModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 snapp-primary-btn"
                >
                  Save world
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {entityModalOpen && selectedWorldId && selectedEntityType !== "all" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Add ${selectedEntityType}`}
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', boxShadow: '0 10px 25px rgba(107, 84, 56, 0.3)' }}
          >
            <h2 className="text-lg font-medium mb-3 capitalize" style={{ fontFamily: "'Cinzel', serif", color: '#3d2817' }}>
              Add {selectedEntityType}
            </h2>
            <form onSubmit={onCreateEntity} className="space-y-3">
              <label className="block text-sm capitalize">
                {selectedEntityType} name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Summary
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                  rows={3}
                  value={entitySummary}
                  onChange={(e) => setEntitySummary(e.target.value)}
                />
              </label>
              {selectedEntityType === "event" && (
                <>
                  <label className="block text-sm">
                    Beginning timestamp
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                      value={entityBeginningTimestamp}
                      onChange={(e) =>
                        setEntityBeginningTimestamp(e.target.value)
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Ending timestamp
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      style={{ borderColor: '#8b6f47', backgroundColor: '#faf8f3', color: '#2c1810' }}
                      value={entityEndingTimestamp}
                      onChange={(e) =>
                        setEntityEndingTimestamp(e.target.value)
                      }
                    />
                  </label>
                </>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded px-3 py-1 text-sm hover:opacity-80"
                  style={{ color: '#5a4232' }}
                  onClick={() => setEntityModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
                >
                  Save {selectedEntityType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

