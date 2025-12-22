import "dotenv/config";
import { createAssetApp, InMemoryAssetStore } from "./app";
import { createServiceServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

createServiceServer({
  serviceName: "Asset",
  port: ports.assets,
  portEnvVar: "ASSET_PORT",
  createStores: () => ({ store: new InMemoryAssetStore() }),
  createApp: ({ store }) => createAssetApp({ store })
});

