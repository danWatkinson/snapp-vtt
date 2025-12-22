import { Request, Response, NextFunction } from "express";
import { logRequest } from "./logging";

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
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const originalSend = res.send;
    const originalJson = res.json;

    const logResponse = () => {
      logRequest(
        serviceName,
        req.method,
        req.originalUrl || req.url,
        res.statusCode,
        startTime
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
