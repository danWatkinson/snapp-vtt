import ListItem from "../ui/ListItem";
import EntityRelationshipDisplay from "./EntityRelationshipDisplay";
import type { WorldEntity } from "../../../lib/clients/worldClient";
import type { DigitalAsset } from "../../../lib/clients/assetsClient";

interface EntityListItemProps {
  entity: WorldEntity;
  allEntities: WorldEntity[];
  showTypeLabel?: boolean;
  onLocationClick?: (location: WorldEntity) => void;
  assets?: DigitalAsset[];
}

/**
 * Component for rendering a single entity in a list.
 * Displays entity name, summary, and relationships.
 */
export default function EntityListItem({
  entity,
  allEntities,
  showTypeLabel = false,
  onLocationClick,
  assets = []
}: EntityListItemProps) {
  const entityImage = entity.type === "location" && entity.imageAssetId
    ? assets.find((asset) => asset.id === entity.imageAssetId && asset.mediaType === "image")
    : null;
  
  return (
    <ListItem
      key={entity.id}
      onClick={onLocationClick ? () => onLocationClick(entity) : undefined}
      className={onLocationClick ? "cursor-pointer hover:bg-slate-50/60" : ""}
    >
      <div className="flex items-start gap-3">
        {entity.type === "location" && (
          <div className="h-16 w-24 overflow-hidden rounded border border-dashed snapp-border bg-slate-50/60 flex items-center justify-center flex-shrink-0">
            {entityImage ? (
              <img
                src={entityImage.storageUrl}
                alt={entityImage.name || entityImage.originalFileName || entity.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-xs text-slate-500 text-center">
                No image
              </span>
            )}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {showTypeLabel && (
              <span className="rounded px-2 py-0.5 text-xs capitalize snapp-pill">
                {entity.type}
              </span>
            )}
            <div className="font-semibold">{entity.name}</div>
          </div>
          {entity.summary && (
            <p className="text-xs mt-1" style={{ color: "#5a4232" }}>
              {entity.summary}
            </p>
          )}
          <EntityRelationshipDisplay entity={entity} allEntities={allEntities} />
        </div>
      </div>
    </ListItem>
  );
}
