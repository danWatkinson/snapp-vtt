import { Page, expect } from "@playwright/test";
import { waitForModalOpen, waitForModalClose, closeModalIfOpen } from "./modals";
import { waitForEntityCreated, waitForWorldCreated, waitForCampaignCreated } from "./entities";
import { handleAlreadyExistsError } from "./errors";
import { isVisibleSafely, safeWait } from "./utils";
import { VISIBILITY_TIMEOUT_SHORT, VISIBILITY_TIMEOUT_MEDIUM, STABILITY_WAIT_SHORT } from "./constants";
import { entityExistsInList, verifyEntityInList } from "./verification";

/**
 * Configuration for entity creation
 */
export interface EntityCreationConfig {
  /** Entity type identifier (used for modal type, event names, etc.) */
  entityType: "world" | "campaign" | "location" | "event" | "faction" | "creature" | "session" | "storyArc" | "player" | "scene";
  /** Button text to open creation modal (e.g., "Add location", "Create world") */
  addButtonText: string;
  /** Modal dialog name pattern (e.g., "Add location", "Create world") */
  modalName: string | RegExp;
  /** Save button text (e.g., "Save location", "Save world") */
  saveButtonText: string;
  /** Event name to wait for after creation (optional, will use default if not provided) */
  createdEventName?: string;
  /** Function to check if entity already exists */
  checkExists?: (page: Page, entityName: string) => Promise<boolean>;
  /** Function to fill the creation form */
  fillForm: (page: Page, fields: Record<string, string>) => Promise<void>;
  /** Function to verify entity was created (optional, for custom verification) */
  verifyCreated?: (page: Page, entityName: string) => Promise<void>;
}

/**
 * Generic helper to create an entity via UI.
 * Handles the common pattern: check exists → open modal → fill form → submit → wait for creation.
 * 
 * @param page - Playwright page object
 * @param entityName - Name of the entity to create
 * @param fields - Form fields to fill (e.g., { name: "...", description: "..." })
 * @param config - Entity creation configuration
 * @returns Promise that resolves when entity is created
 */
export async function createEntityViaUI(
  page: Page,
  entityName: string,
  fields: Record<string, string>,
  config: EntityCreationConfig
): Promise<void> {
  // Check if entity already exists
  if (config.checkExists) {
    const exists = await config.checkExists(page, entityName);
    if (exists) {
      return; // Entity already exists, skip creation
    }
  }

  // Open creation modal
  const addButton = page.getByRole("button", { name: config.addButtonText });
  await expect(addButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  await addButton.click();

  // Wait for modal to open
  await waitForModalOpen(page, config.entityType, 5000);

  // Fill the form
  await config.fillForm(page, fields);

  // Set up event listener BEFORE clicking submit
  let creationPromise: Promise<void>;
  if (config.entityType === "world") {
    creationPromise = waitForWorldCreated(page, entityName, 5000);
  } else if (config.entityType === "campaign") {
    creationPromise = waitForCampaignCreated(page, entityName, 5000);
  } else if (config.entityType === "session" || config.entityType === "storyArc" || config.entityType === "player" || config.entityType === "scene") {
    // Campaign entities don't have creation events - just wait for modal to close and verify creation
    creationPromise = (async () => {
      await waitForModalClose(page, config.entityType, 5000);
      if (config.verifyCreated) {
        await config.verifyCreated(page, entityName);
      }
    })();
  } else {
    creationPromise = waitForEntityCreated(
      page,
      config.entityType as "creature" | "faction" | "location" | "event",
      entityName,
      5000
    );
  }

  // Submit the form
  const saveButton = page.getByRole("button", { name: config.saveButtonText });
  await expect(saveButton).toBeEnabled({ timeout: VISIBILITY_TIMEOUT_SHORT });
  await saveButton.click();

  // Wait for creation to complete
  try {
    await creationPromise;
    // Entity was created successfully
    await closeModalIfOpen(page, config.entityType, config.modalName);
  } catch (error) {
    // For campaign entities (session, storyArc, etc.), they don't have events
    // Just check if modal closed and verify creation
    if (config.entityType === "session" || config.entityType === "storyArc" || config.entityType === "player" || config.entityType === "scene") {
      // Check if modal is closed
      const dialog = page.getByRole("dialog", { name: config.modalName });
      const isModalClosed = await isVisibleSafely(dialog, 2000).then(visible => !visible).catch(() => true);
      
      if (isModalClosed && config.verifyCreated) {
        // Modal closed - verify entity was created
        try {
          await config.verifyCreated(page, entityName);
          return; // Success
        } catch {
          // Verification failed - might be an error
        }
      }
      
      // Check for errors
      const errorMessage = page.getByTestId("error-message");
      const hasError = await isVisibleSafely(errorMessage);
      if (hasError) {
        const errorText = await errorMessage.textContent().catch(() => "") ?? "";
        await handleAlreadyExistsError(page, errorText, config.entityType, config.modalName);
        return; // Entity already exists, that's fine
      }
      
      // If we get here, try verification one more time
      if (config.verifyCreated) {
        await config.verifyCreated(page, entityName);
        return;
      }
    }
    
    // For other entities, check for errors
    const errorMessage = page.getByTestId("error-message");
    const hasError = await isVisibleSafely(errorMessage);
    if (hasError) {
      const errorText = await errorMessage.textContent().catch(() => "") ?? "";
      // Handle "already exists" errors gracefully
      await handleAlreadyExistsError(page, errorText, config.entityType, config.modalName);
      return; // Entity already exists, that's fine
    }
    
    // No error but event didn't fire - verify creation if custom verification provided
    if (config.verifyCreated) {
      try {
        await config.verifyCreated(page, entityName);
        // Verification passed - entity was created
        await closeModalIfOpen(page, config.entityType, config.modalName);
        return;
      } catch {
        // Verification failed - rethrow original error
      }
    }
    
    // No error, no verification, and event didn't fire - rethrow original error
    throw error;
  }
}

/**
 * Helper to create a location entity.
 * 
 * @param page - Playwright page object
 * @param locationName - Name of the location
 * @param summary - Summary/description of the location
 */
export async function createLocation(
  page: Page,
  locationName: string,
  summary: string = "An ancient forest filled with secret paths and spirits."
): Promise<void> {
  // Ensure we're on the locations tab
  const addLocationButton = page.getByRole("button", { name: "Add location" });
  const isOnLocationsTab = await isVisibleSafely(addLocationButton, 1000);
  
  if (!isOnLocationsTab) {
    await page.getByRole("tab", { name: "Locations" }).click();
    await expect(addLocationButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  }

  // Check if location already exists
  const hasLocation = await isVisibleSafely(
    page.getByRole("listitem").filter({ hasText: locationName }).first(),
    1000
  );

  if (hasLocation) {
    return; // Location already exists
  }

  await createEntityViaUI(
    page,
    locationName,
    { name: locationName, summary },
    {
      entityType: "location",
      addButtonText: "Add location",
      modalName: "Add location",
      saveButtonText: "Save location",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add location" });
        await dialog.getByLabel("Location name").fill(fields.name);
        await dialog.getByLabel("Summary").fill(fields.summary);
      },
      verifyCreated: async (page, name) => {
        await expect(
          page.getByRole("listitem").filter({ hasText: name }).first()
        ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
      }
    }
  );
}

/**
 * Helper to create an event entity.
 * 
 * @param page - Playwright page object
 * @param eventName - Name of the event
 * @param summary - Summary/description of the event
 * @param locationName - Optional location name to associate with the event
 */
export async function createEvent(
  page: Page,
  eventName: string,
  summary: string = "A significant event in the world's history.",
  locationName?: string
): Promise<void> {
  // Ensure we're on the events tab
  const addEventButton = page.getByRole("button", { name: "Add event" });
  const isOnEventsTab = await isVisibleSafely(addEventButton, 1000);
  
  if (!isOnEventsTab) {
    await page.getByRole("tab", { name: "Events" }).click();
    await expect(addEventButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  }

  // Check if event already exists
  const hasEvent = await isVisibleSafely(
    page.getByRole("listitem").filter({ hasText: eventName }).first(),
    1000
  );

  if (hasEvent) {
    return; // Event already exists
  }

  await createEntityViaUI(
    page,
    eventName,
    { name: eventName, summary, ...(locationName ? { location: locationName } : {}) },
    {
      entityType: "event",
      addButtonText: "Add event",
      modalName: "Add event",
      saveButtonText: "Save event",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add event" });
        await dialog.getByLabel("Event name").fill(fields.name);
        await dialog.getByLabel("Summary").fill(fields.summary);
        if (fields.location) {
          // If location is provided, select it from dropdown
          const locationSelect = dialog.getByLabel("Location");
          if (await isVisibleSafely(locationSelect, 1000)) {
            await locationSelect.click();
            await page.getByRole("option", { name: fields.location }).click();
          }
        }
      },
      verifyCreated: async (page, name) => {
        await expect(
          page.getByRole("listitem").filter({ hasText: name }).first()
        ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
      }
    }
  );
}

/**
 * Helper to create a faction entity.
 * 
 * @param page - Playwright page object
 * @param factionName - Name of the faction
 * @param summary - Summary/description of the faction
 */
export async function createFaction(
  page: Page,
  factionName: string,
  summary: string = "A powerful organization with its own goals."
): Promise<void> {
  // Ensure we're on the factions tab
  const addFactionButton = page.getByRole("button", { name: "Add faction" });
  const isOnFactionsTab = await isVisibleSafely(addFactionButton, 1000);
  
  if (!isOnFactionsTab) {
    await page.getByRole("tab", { name: "Factions" }).click();
    await expect(addFactionButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  }

  // Check if faction already exists
  const hasFaction = await isVisibleSafely(
    page.getByRole("listitem").filter({ hasText: factionName }).first(),
    1000
  );

  if (hasFaction) {
    return; // Faction already exists
  }

  await createEntityViaUI(
    page,
    factionName,
    { name: factionName, summary },
    {
      entityType: "faction",
      addButtonText: "Add faction",
      modalName: "Add faction",
      saveButtonText: "Save faction",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add faction" });
        await dialog.getByLabel("Faction name").fill(fields.name);
        await dialog.getByLabel("Summary").fill(fields.summary);
      },
      verifyCreated: async (page, name) => {
        await expect(
          page.getByRole("listitem").filter({ hasText: name }).first()
        ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
      }
    }
  );
}

/**
 * Helper to create a creature entity.
 * 
 * @param page - Playwright page object
 * @param creatureName - Name of the creature
 * @param summary - Summary/description of the creature
 */
export async function createCreature(
  page: Page,
  creatureName: string,
  summary: string = "A mysterious creature from the world."
): Promise<void> {
  // Ensure we're on the creatures tab
  const addCreatureButton = page.getByRole("button", { name: "Add creature" });
  const isOnCreaturesTab = await isVisibleSafely(addCreatureButton, 1000);
  
  if (!isOnCreaturesTab) {
    await page.getByRole("tab", { name: "Creatures" }).click();
    await expect(addCreatureButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
  }

  // Check if creature already exists
  const hasCreature = await isVisibleSafely(
    page.getByRole("listitem").filter({ hasText: creatureName }).first(),
    1000
  );

  if (hasCreature) {
    return; // Creature already exists
  }

  await createEntityViaUI(
    page,
    creatureName,
    { name: creatureName, summary },
    {
      entityType: "creature",
      addButtonText: "Add creature",
      modalName: "Add creature",
      saveButtonText: "Save creature",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add creature" });
        await dialog.getByLabel("Creature name").fill(fields.name);
        await dialog.getByLabel("Summary").fill(fields.summary);
      },
      verifyCreated: async (page, name) => {
        await expect(
          page.getByRole("listitem").filter({ hasText: name }).first()
        ).toBeVisible({ timeout: VISIBILITY_TIMEOUT_MEDIUM });
      }
    }
  );
}

/**
 * Helper to create a session entity within a campaign.
 * 
 * @param page - Playwright page object
 * @param sessionName - Name of the session
 */
export async function createSession(
  page: Page,
  sessionName: string
): Promise<void> {
  // Check if session already exists
  const hasSession = await entityExistsInList(page, sessionName);

  if (hasSession) {
    return; // Session already exists
  }

  await createEntityViaUI(
    page,
    sessionName,
    { name: sessionName },
    {
      entityType: "session",
      addButtonText: "Add session",
      modalName: "Add session",
      saveButtonText: "Save session",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add session" });
        await dialog.getByLabel("Session name").fill(fields.name);
      },
      verifyCreated: async (page, name) => {
        await verifyEntityInList(page, name);
      }
    }
  );
}

/**
 * Helper to create a story arc entity within a campaign.
 * 
 * @param page - Playwright page object
 * @param storyArcName - Name of the story arc
 * @param summary - Optional summary for the story arc
 */
export async function createStoryArc(
  page: Page,
  storyArcName: string,
  summary?: string
): Promise<void> {
  // Check if story arc already exists
  const hasStoryArc = await entityExistsInList(page, storyArcName);
  
  if (hasStoryArc) {
    return; // Story arc already exists
  }
  
  await createEntityViaUI(
    page,
    storyArcName,
    { name: storyArcName, summary: summary || "" },
    {
      entityType: "storyArc",
      addButtonText: "Add story arc",
      modalName: "Add story arc",
      saveButtonText: "Save story arc",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add story arc" });
        await dialog.getByLabel("Story arc name").fill(fields.name);
        if (fields.summary) {
          await dialog.getByLabel("Summary").fill(fields.summary);
        }
      },
      verifyCreated: async (page, name) => {
        await verifyEntityInList(page, name);
      }
    }
  );
}

/**
 * Helper to create a player entity within a campaign.
 * 
 * @param page - Playwright page object
 * @param playerUsername - Username of the player
 */
export async function createPlayer(
  page: Page,
  playerUsername: string
): Promise<void> {
  // Check if player already exists
  const hasPlayer = await entityExistsInList(page, playerUsername);
  
  if (hasPlayer) {
    return; // Player already exists
  }
  
  await createEntityViaUI(
    page,
    playerUsername,
    { username: playerUsername },
    {
      entityType: "player",
      addButtonText: "Add player",
      modalName: "Add player",
      saveButtonText: "Save player",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add player" });
        await dialog.getByLabel("Player username").fill(fields.username);
      },
      verifyCreated: async (page, name) => {
        await verifyEntityInList(page, name);
      }
    }
  );
}

/**
 * Helper to create a scene entity within a session.
 * 
 * @param page - Playwright page object
 * @param sceneName - Name of the scene
 */
export async function createScene(
  page: Page,
  sceneName: string
): Promise<void> {
  // Check if scene already exists
  const hasScene = await entityExistsInList(page, sceneName);
  
  if (hasScene) {
    return; // Scene already exists
  }
  
  await createEntityViaUI(
    page,
    sceneName,
    { name: sceneName },
    {
      entityType: "scene",
      addButtonText: "Add scene",
      modalName: "Add scene",
      saveButtonText: "Save scene",
      fillForm: async (page, fields) => {
        const dialog = page.getByRole("dialog", { name: "Add scene" });
        await dialog.getByLabel("Scene name").fill(fields.name);
      },
      verifyCreated: async (page, name) => {
        await verifyEntityInList(page, name);
      }
    }
  );
}
