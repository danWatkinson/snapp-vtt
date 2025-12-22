import { Request, Response, RequestHandler } from "express";

/**
 * Route handler function that can be async or sync
 */
type RouteHandler<T = unknown> = (req: Request) => T | Promise<T>;

/**
 * Options for route creation
 */
export interface RouteOptions {
  /** HTTP status code for success (default: 200 for GET, 201 for POST) */
  statusCode?: number;
  /** Property name to wrap response in (e.g., "users", "world") */
  responseProperty?: string;
}

/**
 * Creates a GET route handler with automatic error handling.
 * 
 * @param handler - Function that returns the data
 * @param options - Route options
 * @returns Express route handler
 */
export function createGetRoute<T>(
  handler: RouteHandler<T>,
  options: RouteOptions = {}
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const data = await handler(req);
      const statusCode = options.statusCode ?? 200;
      
      if (options.responseProperty) {
        return res.status(statusCode).json({ [options.responseProperty]: data });
      }
      return res.status(statusCode).json(data);
    } catch (err) {
      const message = (err as Error).message;
      // Default to 500, but allow handler to throw specific errors
      const statusCode = message.includes("not found") ? 404 : 500;
      return res.status(statusCode).json({ error: message });
    }
  };
}

/**
 * Creates a POST route handler with automatic error handling.
 * 
 * @param handler - Function that returns the created resource
 * @param options - Route options
 * @returns Express route handler
 */
export function createPostRoute<T>(
  handler: RouteHandler<T>,
  options: RouteOptions = {}
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const data = await handler(req);
      const statusCode = options.statusCode ?? 201;
      const responseProperty = options.responseProperty ?? "item";
      
      return res.status(statusCode).json({ [responseProperty]: data });
    } catch (err) {
      const message = (err as Error).message;
      // Default to 400 for POST errors (validation, business logic)
      const statusCode = message.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: message });
    }
  };
}

/**
 * Creates a PATCH route handler with automatic error handling.
 * 
 * @param handler - Function that returns the updated resource
 * @param options - Route options
 * @returns Express route handler
 */
export function createPatchRoute<T>(
  handler: RouteHandler<T>,
  options: RouteOptions = {}
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const data = await handler(req);
      const statusCode = options.statusCode ?? 200;
      const responseProperty = options.responseProperty ?? "item";
      
      return res.status(statusCode).json({ [responseProperty]: data });
    } catch (err) {
      const message = (err as Error).message;
      const statusCode = message.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: message });
    }
  };
}

/**
 * Creates a DELETE route handler with automatic error handling.
 * 
 * @param handler - Function that performs the deletion (can return void or a message)
 * @param options - Route options
 * @returns Express route handler
 */
export function createDeleteRoute(
  handler: RouteHandler<void | { message: string }>,
  options: RouteOptions = {}
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const result = await handler(req);
      const statusCode = options.statusCode ?? 200;
      
      if (result && typeof result === "object" && "message" in result) {
        return res.status(statusCode).json(result);
      }
      return res.status(statusCode).json({ message: "Deleted successfully" });
    } catch (err) {
      const message = (err as Error).message;
      const statusCode = message.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: message });
    }
  };
}

/**
 * Validates that required fields are present in the request body.
 * 
 * @param req - Express request
 * @param fields - Array of required field names
 * @throws Error if any required field is missing
 */
export function requireFields(req: Request, fields: string[]): void {
  const missing: string[] = [];
  for (const field of fields) {
    const value = req.body[field];
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`);
  }
}

/**
 * Creates a POST route that returns void (for operations that don't return data).
 * 
 * @param handler - Function that performs the operation
 * @returns Express route handler
 */
export function createPostVoidRoute(
  handler: RouteHandler<void>
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      await handler(req);
      return res.status(201).json({ success: true });
    } catch (err) {
      const message = (err as Error).message;
      const statusCode = message.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: message });
    }
  };
}
