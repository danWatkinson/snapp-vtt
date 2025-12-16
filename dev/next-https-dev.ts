import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import next from "next";
import type { IncomingMessage, ServerResponse } from "http";

const dev = true;
const hostname = "localhost";
const port = Number(process.env.WEB_PORT ?? 3000);

const webDir = path.join(process.cwd(), "apps", "web");
const app = next({ dev, hostname, port, dir: webDir });
const handle = app.getRequestHandler();

const certDir =
  process.env.HTTPS_CERT_DIR ??
  path.join(process.cwd(), "..", "Snapp-other", "certs");
const keyPath =
  process.env.HTTPS_KEY_PATH ?? path.join(certDir, "localhost-key.pem");
const certPath =
  process.env.HTTPS_CERT_PATH ?? path.join(certDir, "localhost-cert.pem");

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
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
        const service = "web";
        const operation = method;
        const responseCode = res.statusCode || 200;
        const requestedUrl = url;
        // Service color: blue for web
        const serviceColor = '\x1b[34m';
        // Response code color: green for 2xx (success), red for others
        const responseColor = responseCode >= 200 && responseCode < 300 ? '\x1b[32m' : '\x1b[31m';
        const resetCode = '\x1b[0m';
        // eslint-disable-next-line no-console
        console.log(`${serviceColor}${service}${resetCode} [${operation}] ${responseColor}${responseCode}${resetCode} [${requestedUrl}] [${responseTimeMs.toFixed(2)}ms]`);
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


