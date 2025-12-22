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
 * Generate a unique campaign name per worker to avoid conflicts when tests run in parallel.
 * Uses TEST_PARALLEL_INDEX to ensure each worker gets a unique name.
 */
export function getUniqueCampaignName(baseName: string): string {
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  if (workerIndex !== undefined) {
    return `${baseName} [Worker ${workerIndex}]`;
  }
  // When running sequentially (no worker index), use timestamp to ensure uniqueness
  // This prevents test isolation issues when tests run one after another
  return `${baseName}-${Date.now()}`;
}

/**
 * Generate a unique username per worker to avoid conflicts when tests run in parallel.
 * Uses TEST_PARALLEL_INDEX to ensure each worker gets a unique username.
 */
export function getUniqueUsername(baseName: string): string {
  const workerIndex = process.env.TEST_PARALLEL_INDEX;
  if (workerIndex !== undefined) {
    return `${baseName}-${workerIndex}`;
  }
  // If no worker index, use timestamp to ensure uniqueness
  return `${baseName}-${Date.now()}`;
}
