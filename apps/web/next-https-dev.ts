import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import next from "next";
import type { IncomingMessage, ServerResponse } from "http";
import { logRequest } from "../../packages/express-middleware/logging";
import { ports, https as httpsConfig } from "../../packages/config";

const dev = true;
const hostname = "localhost";
const port = ports.web;

const webDir = path.join(process.cwd(), "apps", "web");
const app = next({ dev, hostname, port, dir: webDir });
const handle = app.getRequestHandler();

// Use centralized config, but resolve paths at runtime
const certDir = httpsConfig.getCertDir();
const keyPath = httpsConfig.getKeyPath();
const certPath = httpsConfig.getCertPath();

async function start() {
  await app.prepare();

  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    },
    (req: IncomingMessage, res: ServerResponse) => {
      // Log request with consistent format
      const startTime = process.hrtime.bigint();
      const method = req.method || "GET";
      const url = req.url || "/";
      
      // Intercept the response finish event to log
      const originalEnd = res.end;
      res.end = function (chunk?: any, encoding?: any, cb?: any) {
        logRequest(
          "web",
          method,
          url,
          res.statusCode || 200,
          startTime
        );
        return originalEnd.call(this, chunk, encoding, cb);
      };
      
      handle(req, res);
    }
  );

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Web UI listening on https://localhost:${port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start Next HTTPS dev server", err);
  process.exit(1);
});


