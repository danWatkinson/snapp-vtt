/**
 * Check if an event name matches a search name using flexible matching.
 * Supports exact match, forward match (event contains search), and reverse match (search contains event).
 * 
 * @param eventName - The name from the event (e.g., from customEvent.detail.entityName)
 * @param searchName - The name being searched for
 * @returns True if the names match using any of the matching strategies
 */
export function matchesName(eventName: string, searchName: string): boolean {
  const event = (eventName || "").trim().toLowerCase();
  const search = (searchName || "").trim().toLowerCase();
  
  if (!event || !search) {
    return false;
  }
  
  // Exact match
  if (event === search) {
    return true;
  }
  
  // Forward match: event contains search
  if (event.includes(search)) {
    return true;
  }
  
  // Reverse match: search contains event
  if (search.includes(event)) {
    return true;
  }
  
  return false;
}

/**
 * Generate a unique entity name per worker and test run to avoid conflicts.
 * This is a generic function that can be used for any entity type (campaigns, worlds, locations, events, etc.).
 * Uses TEST_PARALLEL_INDEX for parallel workers and TEST_RUN_ID for test run isolation.
 * 
 * @param baseName - The base name for the entity
 * @param options - Optional configuration
 * @param options.format - Format style: "brackets" (default) for "[Worker X] [run-id]" or "dash" for "-X-run-id"
 * @returns A unique name that's unique both within a test run (across workers) and across test runs
 */
export function getUniqueEntityName(
  baseName: string,
  options?: { format?: "brackets" | "dash" }
): string {
  const runId = process.env.TEST_RUN_ID;
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  const format = options?.format ?? "brackets";
  
  if (workerIndex !== undefined) {
    // Parallel execution: include both run ID and worker index
    if (format === "dash") {
      const runSuffix = runId ? `-${runId}` : '';
      return `${baseName}-${workerIndex}${runSuffix}`;
    } else {
      // brackets format (default)
      const runSuffix = runId ? ` [${runId}]` : '';
      return `${baseName} [Worker ${workerIndex}]${runSuffix}`;
    }
  }
  
  // Sequential execution: include run ID if available, otherwise use timestamp
  if (runId) {
    if (format === "dash") {
      return `${baseName}-${runId}`;
    } else {
      return `${baseName} [${runId}]`;
    }
  }
  
  // Fallback to timestamp for backward compatibility
  return `${baseName}-${Date.now()}`;
}

/**
 * Generate a unique campaign name per worker and test run to avoid conflicts.
 * Uses TEST_PARALLEL_INDEX for parallel workers and TEST_RUN_ID for test run isolation.
 * This ensures names are unique both within a test run (across workers) and across test runs.
 * 
 * @deprecated Use getUniqueEntityName() instead for consistency
 */
export function getUniqueCampaignName(baseName: string): string {
  return getUniqueEntityName(baseName, { format: "brackets" });
}

/**
 * Generate a unique world name per worker and test run to avoid conflicts.
 * Uses TEST_PARALLEL_INDEX for parallel workers and TEST_RUN_ID for test run isolation.
 * This ensures names are unique both within a test run (across workers) and across test runs.
 */
export function getUniqueWorldName(baseName: string): string {
  return getUniqueEntityName(baseName, { format: "brackets" });
}

/**
 * Generate a unique username per worker and test run to avoid conflicts.
 * Uses TEST_PARALLEL_INDEX for parallel workers and TEST_RUN_ID for test run isolation.
 * This ensures usernames are unique both within a test run (across workers) and across test runs.
 * Uses dash format for usernames (e.g., "alice-0-run-123") as it's more appropriate for usernames.
 */
export function getUniqueUsername(baseName: string): string {
  return getUniqueEntityName(baseName, { format: "dash" });
}

/**
 * Generate a unique name for world entities (locations, events, factions, creatures).
 * Uses the same logic as other entities but with a consistent format.
 */
export function getUniqueWorldEntityName(baseName: string): string {
  return getUniqueEntityName(baseName, { format: "brackets" });
}
