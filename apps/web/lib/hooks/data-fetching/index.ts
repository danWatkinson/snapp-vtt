/**
 * Data fetching hooks - organized by domain
 *
 * This module re-exports all data fetching hooks from their domain-specific modules
 * to maintain backward compatibility. The original monolithic file (385 lines) has been
 * broken down into:
 *
 * - campaign/: Campaign, sessions, players, story arcs, timeline
 * - world/: Worlds, entities, events
 * - session/: Scenes
 * - user/: Users
 */

// Campaign domain hooks
export { useCampaigns } from "./campaign/useCampaigns";
export { useCampaignSessions } from "./campaign/useCampaignSessions";
export { useCampaignPlayers } from "./campaign/useCampaignPlayers";
export { useStoryArcs } from "./campaign/useStoryArcs";
export { useStoryArcEvents } from "./campaign/useStoryArcEvents";
export { useTimeline } from "./campaign/useTimeline";

// World domain hooks
export { useWorlds } from "./world/useWorlds";
export { useWorldEntities } from "./world/useWorldEntities";
export { useAllWorldEvents } from "./world/useAllWorldEvents";

// Session domain hooks
export { useSessionScenes } from "./session/useSessionScenes";

// User domain hooks
export { useUsers } from "./user/useUsers";
