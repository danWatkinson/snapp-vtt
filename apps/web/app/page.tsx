 "use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT, OPEN_LOGIN_EVENT } from "../lib/authEvents";
import { AUTH_USERNAME_KEY } from "../lib/authStorage";
import LoginDialog from "./components/LoginDialog";
import DomainTabs from "./components/DomainTabs";
import {
  assignRoles,
  login,
  type LoginResponse,
  listUsers,
  revokeRole,
  deleteUser,
  createUser,
  type User
} from "../lib/authClient";
import {
  fetchWorlds,
  createWorld,
  fetchWorldEntities,
  createWorldEntity,
  type World,
  type WorldEntity
} from "../lib/worldClient";
import {
  fetchCampaigns,
  createCampaign,
  fetchCampaignSessions,
  createSession,
  fetchSessionScenes,
  createScene,
  fetchCampaignPlayers,
  addPlayerToCampaign,
  fetchStoryArcs,
  createStoryArc,
  fetchStoryArcEvents,
  addEventToStoryArc,
  fetchTimeline,
  advanceTimeline,
  type Campaign,
  type Session,
  type Scene,
  type StoryArc,
  type Timeline
} from "../lib/campaignClient";
import WorldTab from "./components/WorldTab";
import CampaignsTab from "./components/CampaignsTab";
import SessionsTab from "./components/SessionsTab";
import UsersTab from "./components/UsersTab";

type CurrentUser = LoginResponse | null;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<
    "World" | "Campaigns" | "Sessions" | "Users"
  >("Users");
  const [loginName, setLoginName] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authServiceUnavailable, setAuthServiceUnavailable] = useState(false);

  const [targetUsername, setTargetUsername] = useState("alice");
  const [targetRole, setTargetRole] = useState("gm");

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRoles, setNewUserRoles] = useState<string[]>([]);

  const [worlds, setWorlds] = useState<World[]>([]);
  const [worldsLoaded, setWorldsLoaded] = useState(false);
  const [worldModalOpen, setWorldModalOpen] = useState(false);
  const [worldName, setWorldName] = useState("");
  const [worldDescription, setWorldDescription] = useState("");

  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<
    "all" | "location" | "creature" | "faction" | "event"
  >("all");
  const [entities, setEntities] = useState<WorldEntity[]>([]);
  const [entitiesLoadedFor, setEntitiesLoadedFor] = useState<string | null>(
    null
  );
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [entitySummary, setEntitySummary] = useState("");
  const [entityBeginningTimestamp, setEntityBeginningTimestamp] = useState("");
  const [entityEndingTimestamp, setEntityEndingTimestamp] = useState("");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSummary, setCampaignSummary] = useState("");

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignView, setCampaignView] = useState<"sessions" | "players" | "story-arcs" | "timeline" | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoadedFor, setSessionsLoadedFor] = useState<string | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");

  const [players, setPlayers] = useState<string[]>([]);
  const [playersLoadedFor, setPlayersLoadedFor] = useState<string | null>(null);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerUsername, setPlayerUsername] = useState("");

  const [storyArcs, setStoryArcs] = useState<StoryArc[]>([]);
  const [storyArcsLoadedFor, setStoryArcsLoadedFor] = useState<string | null>(null);
  const [storyArcModalOpen, setStoryArcModalOpen] = useState(false);
  const [storyArcName, setStoryArcName] = useState("");
  const [storyArcSummary, setStoryArcSummary] = useState("");

  const [selectedStoryArcId, setSelectedStoryArcId] = useState<string | null>(null);
  const [storyArcEvents, setStoryArcEvents] = useState<string[]>([]);
  const [storyArcEventsLoadedFor, setStoryArcEventsLoadedFor] = useState<string | null>(null);
  const [storyArcEventModalOpen, setStoryArcEventModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [allEvents, setAllEvents] = useState<WorldEntity[]>([]);

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineLoadedFor, setTimelineLoadedFor] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scenesLoadedFor, setScenesLoadedFor] = useState<string | null>(null);
  const [sceneModalOpen, setSceneModalOpen] = useState(false);
  const [sceneName, setSceneName] = useState("");
  const [sceneSummary, setSceneSummary] = useState("");
  const [sceneWorldId, setSceneWorldId] = useState("");

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setStatus("Logging in…");
    setError(null);
    setAuthServiceUnavailable(false);
    try {
      const result = await login(loginName, loginPassword);
      setCurrentUser(result);
      setLoginPassword(""); // Clear password on success
      setStatus(`Logged in as ${result.user.username}`);
      // Auto-dismiss success after 3 seconds
      setTimeout(() => setStatus(null), 3000);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_USERNAME_KEY, result.user.username);
        window.dispatchEvent(
          new CustomEvent(AUTH_EVENT, {
            detail: { username: result.user.username }
          })
        );
      }
      setAuthServiceUnavailable(false);
      setLoginModalOpen(false);
    } catch (err) {
      const error = err as Error;
      // Check if it's a network/connection error (service unavailable)
      // The authClient.login function sets isNetworkError flag for actual network failures
      const isNetworkError = (error as any).isNetworkError || 
        (error.name === "TypeError" && error.message.includes("Failed to fetch"));
      
      if (isNetworkError) {
        setAuthServiceUnavailable(true);
        // Log the actual error for debugging (browser console)
        // eslint-disable-next-line no-console
        console.error("Auth service connection error:", error);
        setError("Unable to connect to the authentication service. Please check your connection. If using self-signed certificates, you may need to accept the certificate in your browser.");
      } else {
        setAuthServiceUnavailable(false);
        setError(error.message);
      }
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "Users" || !currentUser) {
      setUsersLoaded(false);
      return;
    }
    if (!currentUser.user.roles.includes("admin")) {
      setUsersLoaded(false);
      return;
    }
    if (usersLoaded) return;
    (async () => {
      try {
        const loaded = await listUsers(currentUser.token);
        setUsers(loaded);
        setUsersLoaded(true);
      } catch (err) {
        setError((err as Error).message);
        setUsersLoaded(false);
      }
    })();
  }, [activeTab, currentUser, usersLoaded]);

  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      setError("You must log in as an admin first");
      return;
    }
    setIsLoading(true);
    setStatus("Assigning role…");
    setError(null);
    try {
      const updated = await assignRoles(
        currentUser.token,
        targetUsername,
        [targetRole]
      );
      setStatus(
        `User ${updated.user.username} now has roles: ${updated.user.roles.join(
          ", "
        )}`
      );
      setTimeout(() => setStatus(null), 3000);
      // Refresh users list
      setUsersLoaded(false);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevokeRole(username: string, role: string) {
    if (!currentUser) return;
    setIsLoading(true);
    setStatus(`Revoking ${role} from ${username}…`);
    setError(null);
    try {
      await revokeRole(currentUser.token, username, role);
      setStatus(`Role '${role}' revoked from ${username}`);
      setTimeout(() => setStatus(null), 3000);
      // Refresh users list
      setUsersLoaded(false);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteUser(username: string) {
    if (!currentUser) return;
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) {
      return;
    }
    setIsLoading(true);
    setStatus(`Deleting user ${username}…`);
    setError(null);
    try {
      await deleteUser(currentUser.token, username);
      setStatus(`User '${username}' deleted`);
      setTimeout(() => setStatus(null), 3000);
      // Refresh users list
      setUsersLoaded(false);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    setStatus("Creating user…");
    setError(null);
    try {
      await createUser(currentUser.token, newUsername, newUserPassword, newUserRoles);
      setStatus(`User '${newUsername}' created`);
      setTimeout(() => setStatus(null), 3000);
      setNewUsername("");
      setNewUserPassword("");
      setNewUserRoles([]);
      setCreateUserModalOpen(false);
      // Refresh users list
      setUsersLoaded(false);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if ((activeTab !== "World" && activeTab !== "Campaigns") || worldsLoaded) return;
    (async () => {
      try {
        const existing = await fetchWorlds();
        setWorlds(existing);
        setWorldsLoaded(true);
      } catch (err) {
        // Surface via generic error area
        setError((err as Error).message);
      }
    })();
  }, [activeTab, worldsLoaded]);

  async function handleCreateWorld(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setStatus("Creating world…");
    setError(null);
    try {
      const world = await createWorld(worldName, worldDescription, currentUser?.token);
      setWorlds((prev) => [...prev, world]);
      setWorldName("");
      setWorldDescription("");
      setWorldModalOpen(false);
      setStatus(`World '${world.name}' created`);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setStatus(null);
      // If world already exists, reload worlds list to ensure it's visible
      if (errorMessage.includes("already exists")) {
        try {
          const existing = await fetchWorlds();
          setWorlds(existing);
        } catch (reloadErr) {
          // Ignore reload errors
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedWorldId) return;
    const cacheKey = `${selectedWorldId}-${selectedEntityType}`;
    if (entitiesLoadedFor === cacheKey) return;
    (async () => {
      try {
        // If "all", fetch without type filter; otherwise filter by type
        const loaded = selectedEntityType === "all"
          ? await fetchWorldEntities(selectedWorldId)
          : await fetchWorldEntities(selectedWorldId, selectedEntityType);
        setEntities(loaded);
        setEntitiesLoadedFor(cacheKey);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedWorldId, selectedEntityType, entitiesLoadedFor]);

  async function handleCreateEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorldId || selectedEntityType === "all") return;
    setIsLoading(true);
    setStatus(`Creating ${selectedEntityType}…`);
    setError(null);
    try {
      const beginningTimestamp =
        selectedEntityType === "event" && entityBeginningTimestamp
          ? new Date(entityBeginningTimestamp).getTime()
          : undefined;
      const endingTimestamp =
        selectedEntityType === "event" && entityEndingTimestamp
          ? new Date(entityEndingTimestamp).getTime()
          : undefined;
      const entity = await createWorldEntity(
        selectedWorldId,
        selectedEntityType,
        entityName,
        entitySummary,
        beginningTimestamp,
        endingTimestamp,
        currentUser?.token
      );
      setEntities((prev) => [...prev, entity]);
      setEntityName("");
      setEntitySummary("");
      setEntityBeginningTimestamp("");
      setEntityEndingTimestamp("");
      setEntityModalOpen(false);
      setStatus(`${selectedEntityType.charAt(0).toUpperCase() + selectedEntityType.slice(1)} '${entity.name}' created`);
      setTimeout(() => setStatus(null), 3000);
      // Invalidate cache so next load refreshes
      setEntitiesLoadedFor(null);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "Campaigns" || campaignsLoaded) return;
    (async () => {
      try {
        const existing = await fetchCampaigns();
        setCampaigns(existing);
        setCampaignsLoaded(true);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [activeTab, campaignsLoaded]);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setStatus("Creating campaign…");
    setError(null);
    try {
      const camp = await createCampaign(campaignName, campaignSummary, currentUser?.token);
      setCampaigns((prev) => [...prev, camp]);
      setCampaignName("");
      setCampaignSummary("");
      setCampaignModalOpen(false);
      setStatus(`Campaign '${camp.name}' created`);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCampaignId) return;
    if (sessionsLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchCampaignSessions(selectedCampaignId);
        setSessions(loaded);
        setSessionsLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, sessionsLoadedFor]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    if (playersLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchCampaignPlayers(selectedCampaignId);
        setPlayers(loaded);
        setPlayersLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, playersLoadedFor]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    if (storyArcsLoadedFor === selectedCampaignId) return;
    (async () => {
      try {
        const loaded = await fetchStoryArcs(selectedCampaignId);
        setStoryArcs(loaded);
        setStoryArcsLoadedFor(selectedCampaignId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, storyArcsLoadedFor]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    if (timelineLoadedFor === selectedCampaignId) return;
    if (campaignView !== "timeline") return;
    (async () => {
      try {
        const loaded = await fetchTimeline(selectedCampaignId);
        setTimeline(loaded);
        setTimelineLoadedFor(selectedCampaignId);
        // Also load story arcs and their events for timeline display
        const arcs = await fetchStoryArcs(selectedCampaignId);
        setStoryArcs(arcs);
        // Load all events from all story arcs
        const allEventIds = new Set<string>();
        for (const arc of arcs) {
          const eventIds = await fetchStoryArcEvents(arc.id);
          eventIds.forEach((id) => allEventIds.add(id));
        }
        // Load event details from all worlds
        const allWorldsEvents: WorldEntity[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        // Filter to only events in story arcs
        const timelineEvents = allWorldsEvents.filter((e) =>
          allEventIds.has(e.id)
        );
        setAllEvents(timelineEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedCampaignId, timelineLoadedFor, campaignView, worlds]);

  useEffect(() => {
    if (!selectedStoryArcId) return;
    if (storyArcEventsLoadedFor === selectedStoryArcId) return;
    (async () => {
      try {
        const loaded = await fetchStoryArcEvents(selectedStoryArcId);
        setStoryArcEvents(loaded);
        setStoryArcEventsLoadedFor(selectedStoryArcId);
        // Load event details for display
        const allWorldsEvents: WorldEntity[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        setAllEvents(allWorldsEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedStoryArcId, storyArcEventsLoadedFor, worlds]);

  useEffect(() => {
    if (!storyArcEventModalOpen) return;
    // Load all events from all worlds when opening the modal
    (async () => {
      try {
        const allWorldsEvents: WorldEntity[] = [];
        for (const world of worlds) {
          const events = await fetchWorldEntities(world.id, "event");
          allWorldsEvents.push(...events);
        }
        setAllEvents(allWorldsEvents);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [storyArcEventModalOpen, worlds]);

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setIsLoading(true);
    setStatus("Creating session…");
    setError(null);
    try {
      const session = await createSession(selectedCampaignId, sessionName, currentUser?.token);
      setSessions((prev) => [...prev, session]);
      setSessionName("");
      setSessionModalOpen(false);
      setStatus(`Session '${session.name}' created`);
      setTimeout(() => setStatus(null), 3000);
      // Invalidate cache so next load refreshes
      setSessionsLoadedFor(null);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setIsLoading(true);
    setStatus("Adding player…");
    setError(null);
    try {
      const username = playerUsername;
      await addPlayerToCampaign(selectedCampaignId, username, currentUser?.token);
      setPlayers((prev) => [...prev, username]);
      setPlayerUsername("");
      setPlayerModalOpen(false);
      setStatus(`Player '${username}' added`);
      setTimeout(() => setStatus(null), 3000);
      // Invalidate cache so next load refreshes
      setPlayersLoadedFor(null);
      // Also invalidate story arcs cache since a new arc was automatically created
      setStoryArcsLoadedFor(null);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateStoryArc(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setIsLoading(true);
    setStatus("Creating story arc…");
    setError(null);
    try {
      const storyArc = await createStoryArc(
        selectedCampaignId,
        storyArcName,
        storyArcSummary,
        currentUser?.token
      );
      setStoryArcs((prev) => [...prev, storyArc]);
      setStoryArcName("");
      setStoryArcSummary("");
      setStoryArcModalOpen(false);
      setStatus(`Story arc '${storyArc.name}' created`);
      setTimeout(() => setStatus(null), 3000);
      // Invalidate cache so next load refreshes
      setStoryArcsLoadedFor(null);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddEventToStoryArc(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStoryArcId || !selectedEventId) return;
    setIsLoading(true);
    setStatus("Adding event to story arc…");
    setError(null);
    try {
      await addEventToStoryArc(selectedStoryArcId, selectedEventId, currentUser?.token);
      setStoryArcEvents((prev) => [...prev, selectedEventId]);
      setSelectedEventId("");
      setStoryArcEventModalOpen(false);
      setStatus("Event added to story arc");
      setTimeout(() => setStatus(null), 3000);
      // Invalidate cache so next load refreshes
      setStoryArcEventsLoadedFor(null);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdvanceTimeline(
    amount: number,
    unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  ) {
    if (!selectedCampaignId) return;
    setIsLoading(true);
    setStatus(`Advancing timeline by ${amount} ${unit}…`);
    setError(null);
    try {
      const updated = await advanceTimeline(selectedCampaignId, amount, unit, currentUser?.token);
      setTimeline(updated);
      setStatus(`Timeline advanced by ${amount} ${unit}`);
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedSessionId) return;
    if (scenesLoadedFor === selectedSessionId) return;
    (async () => {
      try {
        const loaded = await fetchSessionScenes(selectedSessionId);
        setScenes(loaded);
        setScenesLoadedFor(selectedSessionId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedSessionId, scenesLoadedFor]);

  async function handleCreateScene(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSessionId || !sceneWorldId) {
      setError("Session and World are required");
      return;
    }
    setIsLoading(true);
    setStatus("Creating scene…");
    setError(null);
    try {
      const scene = await createScene(
        selectedSessionId,
        sceneName,
        sceneSummary,
        sceneWorldId,
        [],
        currentUser?.token
      );
      setScenes((prev) => [...prev, scene]);
      setSceneName("");
      setSceneSummary("");
      setSceneWorldId("");
      setSceneModalOpen(false);
      setStatus(`Scene '${scene.name}' created`);
      setTimeout(() => setStatus(null), 3000);
      // Invalidate cache so next load refreshes
      setScenesLoadedFor(null);
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setLoginName("admin");
    setLoginPassword("");
    setActiveTab("Users");
    setStatus(null);
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_USERNAME_KEY);
      window.dispatchEvent(
        new CustomEvent(AUTH_EVENT, { detail: { username: null } })
      );
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setLoginModalOpen(true);
    window.addEventListener(OPEN_LOGIN_EVENT, handler);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, handler);
  }, []);

  // If not authenticated, show only login form
  if (!currentUser) {
    return (
      <section className="space-y-6">
        <div
          className={
            "relative aspect-[16/9] w-full overflow-hidden rounded-lg border" +
            (loginModalOpen ? " pointer-events-none" : "")
          }
          style={{
            borderColor: "#8b6f47",
            backgroundImage:
              "linear-gradient(45deg, #facc15 25%, transparent 25%, transparent 50%, #facc15 50%, #facc15 75%, transparent 75%, transparent)",
            backgroundSize: "40px 40px",
            backgroundColor: "#fefce8"
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "rotate(-15deg)" }}
          >
            <span
              className="text-6xl sm:text-7xl font-extrabold uppercase tracking-widest"
              style={{ fontFamily: "'Cinzel', serif", color: "#3d2817", textShadow: "2px 2px 0 #fefce8" }}
            >
              Snapp
            </span>
          </div>
        </div>

        <LoginDialog
          open={loginModalOpen}
          loginName={loginName}
          loginPassword={loginPassword}
          isLoading={isLoading}
          error={error}
          authServiceUnavailable={authServiceUnavailable}
          onChangeName={setLoginName}
          onChangePassword={setLoginPassword}
          onClose={() => setLoginModalOpen(false)}
          onSubmit={handleLogin}
        />
      </section>
    );
  }

  // Authenticated users see the full application
  return (
    <section className="space-y-6">
      <DomainTabs
        tabs={["World", "Campaigns", "Sessions", "Users"]}
        activeTab={activeTab}
        onChange={(tab) =>
          setActiveTab(tab as "World" | "Campaigns" | "Sessions" | "Users")
        }
      />

      {activeTab === "World" && (
        <WorldTab
          worlds={worlds}
          selectedWorldId={selectedWorldId}
          selectedEntityType={selectedEntityType}
          entities={entities}
          worldModalOpen={worldModalOpen}
          entityModalOpen={entityModalOpen}
          worldName={worldName}
          worldDescription={worldDescription}
          entityName={entityName}
          entitySummary={entitySummary}
          entityBeginningTimestamp={entityBeginningTimestamp}
          entityEndingTimestamp={entityEndingTimestamp}
          onCreateWorld={handleCreateWorld}
          onCreateEntity={handleCreateEntity}
          setWorldModalOpen={setWorldModalOpen}
          setEntityModalOpen={setEntityModalOpen}
          setSelectedWorldId={setSelectedWorldId}
          setSelectedEntityType={setSelectedEntityType}
          setEntitiesLoadedFor={setEntitiesLoadedFor}
          setWorldName={setWorldName}
          setWorldDescription={setWorldDescription}
          setEntityName={setEntityName}
          setEntitySummary={setEntitySummary}
          setEntityBeginningTimestamp={setEntityBeginningTimestamp}
          setEntityEndingTimestamp={setEntityEndingTimestamp}
        />
      )}


      {activeTab === "Campaigns" && (
        <CampaignsTab
          campaigns={campaigns}
          worlds={worlds}
          selectedCampaignId={selectedCampaignId}
          campaignView={campaignView}
          sessions={sessions}
          players={players}
          storyArcs={storyArcs}
          selectedStoryArcId={selectedStoryArcId}
          storyArcEvents={storyArcEvents}
          allEvents={allEvents}
          timeline={timeline}
          selectedSessionId={selectedSessionId}
          scenes={scenes}
          campaignModalOpen={campaignModalOpen}
          sessionModalOpen={sessionModalOpen}
          playerModalOpen={playerModalOpen}
          storyArcModalOpen={storyArcModalOpen}
          storyArcEventModalOpen={storyArcEventModalOpen}
          sceneModalOpen={sceneModalOpen}
          campaignName={campaignName}
          campaignSummary={campaignSummary}
          sessionName={sessionName}
          playerUsername={playerUsername}
          storyArcName={storyArcName}
          storyArcSummary={storyArcSummary}
          selectedEventId={selectedEventId}
          sceneName={sceneName}
          sceneSummary={sceneSummary}
          sceneWorldId={sceneWorldId}
          onCreateCampaign={handleCreateCampaign}
          onCreateSession={handleCreateSession}
          onAddPlayer={handleAddPlayer}
          onCreateStoryArc={handleCreateStoryArc}
          onAddEventToStoryArc={handleAddEventToStoryArc}
          onAdvanceTimeline={handleAdvanceTimeline}
          onCreateScene={handleCreateScene}
          setSelectedCampaignId={setSelectedCampaignId}
          setCampaignView={setCampaignView}
          setSelectedStoryArcId={setSelectedStoryArcId}
          setSelectedSessionId={setSelectedSessionId}
          setCampaignModalOpen={setCampaignModalOpen}
          setSessionModalOpen={setSessionModalOpen}
          setPlayerModalOpen={setPlayerModalOpen}
          setStoryArcModalOpen={setStoryArcModalOpen}
          setStoryArcEventModalOpen={setStoryArcEventModalOpen}
          setSceneModalOpen={setSceneModalOpen}
          setSessionsLoadedFor={setSessionsLoadedFor}
          setPlayersLoadedFor={setPlayersLoadedFor}
          setStoryArcsLoadedFor={setStoryArcsLoadedFor}
          setStoryArcEventsLoadedFor={setStoryArcEventsLoadedFor}
          setScenesLoadedFor={setScenesLoadedFor}
          setCampaignName={setCampaignName}
          setCampaignSummary={setCampaignSummary}
          setSessionName={setSessionName}
          setPlayerUsername={setPlayerUsername}
          setStoryArcName={setStoryArcName}
          setStoryArcSummary={setStoryArcSummary}
          setSelectedEventId={setSelectedEventId}
          setSceneName={setSceneName}
          setSceneSummary={setSceneSummary}
          setSceneWorldId={setSceneWorldId}
        />
      )}

      {activeTab === "Sessions" && <SessionsTab />}

      {activeTab === "Users" && currentUser && (
        <UsersTab
          currentUser={currentUser}
          users={users}
          usersLoaded={usersLoaded}
          createUserModalOpen={createUserModalOpen}
          newUsername={newUsername}
          newUserPassword={newUserPassword}
          newUserRoles={newUserRoles}
          targetUsername={targetUsername}
          targetRole={targetRole}
          isLoading={isLoading}
          onAssignRole={handleAssignRole}
          onRevokeRole={handleRevokeRole}
          onDeleteUser={handleDeleteUser}
          onCreateUser={handleCreateUser}
          setCreateUserModalOpen={setCreateUserModalOpen}
          setNewUsername={setNewUsername}
          setNewUserPassword={setNewUserPassword}
          setNewUserRoles={setNewUserRoles}
          setTargetUsername={setTargetUsername}
          setTargetRole={setTargetRole}
        />
      )}

      {/* Toast-style feedback notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {status && (
          <div
            className="rounded-lg border p-3 shadow-lg animate-in slide-in-from-bottom-2"
            style={{
              borderColor: '#6b5438',
              backgroundColor: '#faf8f3',
              boxShadow: '0 4px 12px rgba(107, 84, 56, 0.3)'
            }}
            data-testid="status-message"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <p className="text-sm font-medium" style={{ color: '#3d2817' }}>
                {status}
              </p>
            </div>
          </div>
        )}
        {error && (
          <div
            className="rounded-lg border p-3 shadow-lg animate-in slide-in-from-bottom-2"
            style={{
              borderColor: '#8b4a3a',
              backgroundColor: '#fef5f3',
              boxShadow: '0 4px 12px rgba(139, 74, 58, 0.3)'
            }}
            data-testid="error-message"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✗</span>
              <p className="text-sm font-medium" style={{ color: '#8b4a3a' }}>
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-lg hover:opacity-70"
                style={{ color: '#8b4a3a' }}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}
        {isLoading && (
          <div
            className="rounded-lg border p-3 shadow-lg"
            style={{
              borderColor: '#8b6f47',
              backgroundColor: 'rgba(244, 232, 208, 0.9)',
              boxShadow: '0 4px 12px rgba(139, 115, 85, 0.2)'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="animate-spin text-lg">⟳</span>
              <p className="text-sm" style={{ color: '#5a4232' }}>
                {status || "Processing…"}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
