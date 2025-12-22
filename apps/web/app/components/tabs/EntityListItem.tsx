import ListItem from "../ui/ListItem";
import EntityRelationshipDisplay from "./EntityRelationshipDisplay";
import type { WorldEntity } from "../../../lib/clients/worldClient";

interface EntityListItemProps {
  entity: WorldEntity;
  allEntities: WorldEntity[];
  showTypeLabel?: boolean;
}

/**
 * Component for rendering a single entity in a list.
 * Displays entity name, summary, and relationships.
 */
export default function EntityListItem({
  entity,
  allEntities,
  showTypeLabel = false
}: EntityListItemProps) {
  return (
    <ListItem key={entity.id}>
      <div className="flex items-start gap-2">
        {showTypeLabel && (
          <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
            {entity.type}
          </span>
        )}
        <div className="flex-1">
          <div className="font-semibold">{entity.name}</div>
          {entity.summary && (
            <p className="text-xs" style={{ color: "#5a4232" }}>
              {entity.summary}
            </p>
          )}
          <EntityRelationshipDisplay entity={entity} allEntities={allEntities} />
        </div>
      </div>
    </ListItem>
  );
}
