import "dotenv/config";
import { createAssetApp, InMemoryAssetStore } from "./app";
import { createHttpsServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

const store = new InMemoryAssetStore();

const app = createAssetApp({ store });

createHttpsServer({
  app,
  serviceName: "Asset",
  port: ports.assets,
  portEnvVar: "ASSET_PORT"
});

