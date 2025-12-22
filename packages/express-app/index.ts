import express, { Express } from "express";
import cors from "cors";
import { createResponseLoggingMiddleware } from "../express-middleware/index";

export interface ServiceAppOptions {
  /** Service name for logging */
  serviceName: string;
  /** CORS origin (default: "https://localhost:3000") */
  corsOrigin?: string;
  /** Function to register routes on the app */
  routes: (app: Express) => void;
}

/**
 * Creates a standardized Express app for services.
 * 
 * Sets up:
 * - CORS with configurable origin
 * - JSON body parsing
 * - Response logging middleware
 * - Custom routes via routes callback
 * 
 * @param options - Service app configuration
 * @returns Configured Express app
 */
export function createServiceApp(options: ServiceAppOptions): Express {
  const { serviceName, corsOrigin = "https://localhost:3000", routes } = options;

  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: corsOrigin
    })
  );

  // JSON body parsing
  app.use(express.json());

  // Response logging middleware
  app.use(createResponseLoggingMiddleware(serviceName.toLowerCase()));

  // Register service-specific routes
  routes(app);

  return app;
}
