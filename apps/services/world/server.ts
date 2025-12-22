import "dotenv/config";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";
import { createServiceServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

createServiceServer({
  serviceName: "World",
  port: ports.world,
  portEnvVar: "WORLD_PORT",
  createStores: () => ({
    store: new InMemoryWorldStore(),
    entityStore: new InMemoryWorldEntityStore()
  }),
  createApp: ({ store, entityStore }) => createWorldApp({ store, entityStore })
});


