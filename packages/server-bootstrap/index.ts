import https from "https";
import { Express } from "express";
import { loadCertificates } from "../https-config";
import { ports } from "../config";

/**
 * Generic store type for service dependencies
 */
export type ServiceStores = Record<string, unknown>;

export interface ServerBootstrapOptions {
  /** Express app instance */
  app: Express;
  /** Service name for logging */
  serviceName: string;
  /** Port number (can be overridden by environment variable) */
  port: number;
  /** Environment variable name for port override (e.g., "AUTH_PORT") */
  portEnvVar?: string;
  /** Default port if neither port nor env var is set */
  defaultPort?: number;
}

/**
 * Creates and starts an HTTPS server for a service.
 * 
 * Port resolution priority:
 * 1. portEnvVar environment variable (e.g., AUTH_PORT)
 * 2. PORT environment variable
 * 3. port parameter
 * 4. defaultPort parameter
 * 
 * @param options - Server configuration options
 * @returns The HTTPS server instance
 * @throws Error if certificates cannot be loaded or server fails to start
 */
export function createHttpsServer(
  options: ServerBootstrapOptions
): https.Server {
  const {
    app,
    serviceName,
    port: providedPort,
    portEnvVar,
    defaultPort
  } = options;

  // Resolve port with priority: env var > provided port > default
  // Note: ports from config already handle PORT env var fallback
  const port =
    (portEnvVar && process.env[portEnvVar]
      ? Number(process.env[portEnvVar])
      : undefined) ??
    providedPort ??
    defaultPort ??
    3000;

  try {
    const { key, cert } = loadCertificates();

    const server = https.createServer({ key, cert }, app);

    server.listen(port, () => {
      // eslint-disable-next-line no-console
      /* c8 ignore next */ // startup log only; server.listen side-effects tested in service tests
      console.log(
        `${serviceName} service listening on https://localhost:${port}`
      );
    });

    server.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error(`${serviceName} service server error:`, err);
    });

    return server;
  } catch (err) {
    const error = err as Error;
    // eslint-disable-next-line no-console
    console.error(`Failed to start ${serviceName} service:`, error.message);
    // Avoid killing the test runner; only exit in non-test environments
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Options for creating a service server with automatic bootstrap
 */
export interface CreateServiceServerOptions<T extends ServiceStores> {
  /** Service name for logging */
  serviceName: string;
  /** Port number (can be overridden by environment variable) */
  port: number;
  /** Environment variable name for port override (e.g., "AUTH_PORT") */
  portEnvVar: string;
  /** Function to create the Express app from stores */
  createApp: (stores: T) => Express;
  /** Function to create the stores */
  createStores: () => T;
  /** Optional function to seed stores before starting server */
  seedStores?: (stores: T) => Promise<void>;
}

/**
 * Creates and starts a service server with automatic bootstrap handling.
 * 
 * This utility handles:
 * - Store creation
 * - Optional seeding (with error handling)
 * - App creation
 * - Server startup
 * - Error handling and process exit
 * 
 * @param options - Service configuration
 * @returns The HTTPS server instance
 */
export function createServiceServer<T extends ServiceStores>(
  options: CreateServiceServerOptions<T>
): void {
  const { serviceName, port, portEnvVar, createApp, createStores, seedStores } = options;

  const stores = createStores();

  async function bootstrap() {
    if (seedStores) {
      try {
        // Seed stores before starting the server. If seeding fails, log and continue
        // so that the service can still start (tests rely on this behaviour).
        await seedStores(stores);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to seed ${serviceName} service:`, err);
      }
    }

    const app = createApp(stores);

    createHttpsServer({
      app,
      serviceName,
      port,
      portEnvVar
    });
  }

  bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`Unexpected error during ${serviceName} service bootstrap:`, err);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  });
}
