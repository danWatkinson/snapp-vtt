import type { WorldEntity, LocationRelationshipType } from "../../../lib/clients/worldClient";

interface EntityFormFieldsProps {
  entityType: "location" | "creature" | "faction" | "event";
  entities: WorldEntity[];
  // Location fields
  relationshipTargetId: string;
  relationshipType: string;
  onRelationshipTargetChange: (value: string) => void;
  onRelationshipTypeChange: (value: string) => void;
  // Event fields
  locationId: string;
  onLocationIdChange: (value: string) => void;
  beginningTimestamp: string;
  endingTimestamp: string;
  onBeginningTimestampChange: (value: string) => void;
  onEndingTimestampChange: (value: string) => void;
}

const STYLED_INPUT_STYLE = {
  borderColor: "#8b6f47",
  backgroundColor: "#faf8f3",
  color: "#2c1810"
};

/**
 * Component that renders entity-specific form fields based on entity type.
 */
export default function EntityFormFields({
  entityType,
  entities,
  relationshipTargetId,
  relationshipType,
  onRelationshipTargetChange,
  onRelationshipTypeChange,
  locationId,
  onLocationIdChange,
  beginningTimestamp,
  endingTimestamp,
  onBeginningTimestampChange,
  onEndingTimestampChange
}: EntityFormFieldsProps) {
  // Location-specific fields
  if (entityType === "location") {
    const locations = entities.filter((e) => e.type === "location");
    const locationRelationshipTypes: LocationRelationshipType[] = [
      "contains",
      "is contained by",
      "borders against",
      "is near",
      "is connected to"
    ];
    
    return (
      <>
        <label className="block text-sm">
          Link to Location (optional)
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={STYLED_INPUT_STYLE}
            value={relationshipTargetId || ""}
            onChange={(e) => {
              const newValue = e.target.value;
              onRelationshipTargetChange(newValue);
              if (!newValue) {
                onRelationshipTypeChange("");
              }
            }}
          >
            <option value="">None</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        {relationshipTargetId && (
          <label className="block text-sm">
            Relationship Type
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={STYLED_INPUT_STYLE}
              value={relationshipType || ""}
              onChange={(e) => onRelationshipTypeChange(e.target.value)}
            >
              <option value="">Select relationship type</option>
              {locationRelationshipTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "is contained by" ? "Is Contained By" : 
                   type === "borders against" ? "Borders Against" :
                   type === "is near" ? "Is Near" :
                   type === "is connected to" ? "Is Connected To" :
                   "Contains"}
                </option>
              ))}
            </select>
          </label>
        )}
      </>
    );
  }

  // Event-specific fields
  if (entityType === "event") {
    const allEvents = entities.filter((e) => e.type === "event");
    const allLocations = entities.filter((e) => e.type === "location");
    
    return (
      <>
        <label className="block text-sm">
          Location (optional)
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={STYLED_INPUT_STYLE}
            value={locationId || ""}
            onChange={(e) => onLocationIdChange(e.target.value)}
          >
            <option value="">None</option>
            {allLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Link to Event (optional)
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={STYLED_INPUT_STYLE}
            value={relationshipTargetId || ""}
            onChange={(e) => onRelationshipTargetChange(e.target.value)}
          >
            <option value="">None</option>
            {allEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        {relationshipTargetId && (
          <label className="block text-sm">
            Relationship Type
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={STYLED_INPUT_STYLE}
              value={relationshipType || ""}
              onChange={(e) => onRelationshipTypeChange(e.target.value)}
            >
              <option value="">Select relationship type</option>
              <option value="is contained by">Is Part Of (sub-event)</option>
            </select>
          </label>
        )}
        <label className="block text-sm">
          Beginning timestamp
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={STYLED_INPUT_STYLE}
            value={beginningTimestamp}
            onChange={(e) => onBeginningTimestampChange(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Ending timestamp
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={STYLED_INPUT_STYLE}
            value={endingTimestamp}
            onChange={(e) => onEndingTimestampChange(e.target.value)}
          />
        </label>
      </>
    );
  }

  // Faction-specific fields
  if (entityType === "faction") {
    const allFactions = entities.filter((e) => e.type === "faction");
    
    return (
      <>
        <label className="block text-sm">
          Link to Faction (optional)
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            style={STYLED_INPUT_STYLE}
            value={relationshipTargetId || ""}
            onChange={(e) => onRelationshipTargetChange(e.target.value)}
          >
            <option value="">None</option>
            {allFactions.map((faction) => (
              <option key={faction.id} value={faction.id}>
                {faction.name}
              </option>
            ))}
          </select>
        </label>
        {relationshipTargetId && (
          <label className="block text-sm">
            Relationship Type
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              style={STYLED_INPUT_STYLE}
              value={relationshipType || ""}
              onChange={(e) => onRelationshipTypeChange(e.target.value)}
            >
              <option value="">Select relationship type</option>
              <option value="is contained by">Is Part Of (sub-faction)</option>
            </select>
          </label>
        )}
      </>
    );
  }

  // Creature has no additional fields
  return null;
}
