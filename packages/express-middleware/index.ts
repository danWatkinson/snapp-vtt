import { Request, Response, NextFunction } from "express";

/**
 * Service color codes for terminal output
 */
const SERVICE_COLORS: Record<string, string> = {
  auth: "\x1b[36m", // cyan
  world: "\x1b[33m", // yellow
  campaign: "\x1b[35m", // magenta
  assets: "\x1b[35m" // magenta
};

const RESET_CODE = "\x1b[0m";
const SUCCESS_COLOR = "\x1b[32m"; // green
const ERROR_COLOR = "\x1b[31m"; // red

/**
 * Creates response logging middleware for Express apps.
 * 
 * Logs each response with:
 * - Service name (colored)
 * - HTTP method
 * - Response status code (colored: green for 2xx, red for others)
 * - Request URL
 * - Response time in milliseconds
 * 
 * @param serviceName - Name of the service (used for coloring and identification)
 * @returns Express middleware function
 */
export function createResponseLoggingMiddleware(serviceName: string) {
  const serviceColor = SERVICE_COLORS[serviceName.toLowerCase()] ?? RESET_CODE;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const originalSend = res.send;
    const originalJson = res.json;

    const logResponse = () => {
      const operation = req.method;
      const responseCode = res.statusCode;
      const requestedUrl = req.originalUrl || req.url;
      const endTime = process.hrtime.bigint();
      const responseTimeMs =
        Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
      const responseColor =
        responseCode >= 200 && responseCode < 300
          ? SUCCESS_COLOR
          : ERROR_COLOR;

      // eslint-disable-next-line no-console
      console.log(
        `${serviceColor}${serviceName}${RESET_CODE} [${operation}] ${responseColor}${responseCode}${RESET_CODE} [${requestedUrl}] [${responseTimeMs.toFixed(2)}ms]`
      );
    };

    res.send = function (body) {
      logResponse();
      return originalSend.call(this, body);
    };

    res.json = function (body) {
      logResponse();
      return originalJson.call(this, body);
    };

    next();
  };
}
