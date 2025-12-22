import "dotenv/config";
import { createAssetApp, InMemoryAssetStore } from "./app";
import { createHttpsServer } from "../../../packages/server-bootstrap";

const store = new InMemoryAssetStore();

const app = createAssetApp({ store });

createHttpsServer({
  app,
  serviceName: "Asset",
  port: 4700,
  portEnvVar: "ASSET_PORT"
});

