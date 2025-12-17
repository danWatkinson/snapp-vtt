import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";
import { seedWorlds } from "./worldSeeder";

// Use a non-conflicting default port for the world service.
const port = Number(process.env.WORLD_PORT ?? process.env.PORT ?? 4501);

const store = new InMemoryWorldStore();
const entityStore = new InMemoryWorldEntityStore();

// Create async lookup function for assets by filename
// This queries the asset service to find assets by originalFileName
// Note: Ports may vary - check actual service ports in logs
const assetServiceUrl = process.env.ASSET_SERVICE_URL ?? "https://localhost:3004";
const authServiceUrl = process.env.AUTH_SERVICE_URL ?? "https://localhost:3001";

// Helper to make HTTPS requests with self-signed cert support
function httpsRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
      rejectUnauthorized: false // Allow self-signed certs in dev
    };

    const req = https.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 200, body });
        } catch (err) {
          reject(new Error(`Failed to parse response: ${(err as Error).message}`));
        }
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const lookupAssetByFileName = async (fileName: string): Promise<string | undefined> => {
  // Retry logic: wait for asset service to be ready and get an auth token
  const maxRetries = 5;
  const retryDelay = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // First, get an auth token by logging in as admin
      const loginResponse = await httpsRequest(`${authServiceUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" })
      });
      
      if (loginResponse.status !== 200) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        return undefined;
      }
      
      const token = (loginResponse.body as { token?: string }).token;
      
      if (!token) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        return undefined;
      }
      
      // Now query assets with authentication
      const assetsResponse = await httpsRequest(`${assetServiceUrl}/assets`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (assetsResponse.status !== 200) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        return undefined;
      }
      
      const assets = (assetsResponse.body as { assets?: Array<{ id: string; originalFileName: string }> }).assets ?? [];
      const asset = assets.find((a) => a.originalFileName === fileName);
      return asset?.id;
    } catch (err) {
      // Service might not be ready yet, retry with delay
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      // eslint-disable-next-line no-console
      console.warn(`Failed to lookup asset '${fileName}' after ${maxRetries} attempts:`, (err as Error).message);
      return undefined;
    }
  }
  
  return undefined;
};

async function bootstrap() {
  // Seed worlds before creating the app
  // Asset lookup will attempt to find splash images from the asset service
  try {
    await seedWorlds(store, entityStore, {
      lookupAssetByFileName
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to seed worlds:", (err as Error).message);
    // Avoid killing the test runner; only exit in non-test environments
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }

  const app = createWorldApp({ store, entityStore });

  const certDir =
    process.env.HTTPS_CERT_DIR ??
    path.join(process.cwd(), "..", "Snapp-other", "certs");
  const keyPath =
    process.env.HTTPS_KEY_PATH ?? path.join(certDir, "localhost-key.pem");
  const certPath =
    process.env.HTTPS_CERT_PATH ?? path.join(certDir, "localhost-cert.pem");

  try {
    const server = https.createServer(
      {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      },
      app
    );

    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`World service listening on https://localhost:${port}`);
    });

    server.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("World service server error:", err);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start world service:", err);
    // Avoid killing the test runner; only exit in non-test environments
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected error during world service bootstrap:", err);
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
});


