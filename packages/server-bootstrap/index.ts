import https from "https";
import { Express } from "express";
import { loadCertificates } from "../https-config";
import { ports } from "../config";

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
