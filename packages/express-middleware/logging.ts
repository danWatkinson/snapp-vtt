/**
 * Shared logging utilities for consistent request/response logging across services.
 */

const RESET_CODE = "\x1b[0m";
const SUCCESS_COLOR = "\x1b[32m"; // green
const ERROR_COLOR = "\x1b[31m"; // red

/**
 * Service color codes for terminal output
 */
export const SERVICE_COLORS: Record<string, string> = {
  auth: "\x1b[36m", // cyan
  world: "\x1b[33m", // yellow
  campaign: "\x1b[35m", // magenta
  assets: "\x1b[35m", // magenta
  web: "\x1b[34m" // blue
};

export interface LogRequest {
  method: string;
  url: string;
  statusCode: number;
  startTime: bigint;
}

/**
 * Logs a request/response with consistent formatting.
 * 
 * @param serviceName - Name of the service (used for coloring and identification)
 * @param method - HTTP method
 * @param url - Request URL
 * @param statusCode - Response status code
 * @param startTime - Start time (from process.hrtime.bigint())
 */
export function logRequest(
  serviceName: string,
  method: string,
  url: string,
  statusCode: number,
  startTime: bigint
): void {
  const serviceColor = SERVICE_COLORS[serviceName.toLowerCase()] ?? RESET_CODE;
  const endTime = process.hrtime.bigint();
  const responseTimeMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
  const responseColor =
    statusCode >= 200 && statusCode < 300 ? SUCCESS_COLOR : ERROR_COLOR;

  // eslint-disable-next-line no-console
  console.log(
    `${serviceColor}${serviceName}${RESET_CODE} [${method}] ${responseColor}${statusCode}${RESET_CODE} [${url}] [${responseTimeMs.toFixed(2)}ms]`
  );
}
