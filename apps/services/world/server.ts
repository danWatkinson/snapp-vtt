import "dotenv/config";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";
import { createHttpsServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

const store = new InMemoryWorldStore();
const entityStore = new InMemoryWorldEntityStore();

const app = createWorldApp({ store, entityStore });

createHttpsServer({
  app,
  serviceName: "World",
  port: ports.world,
  portEnvVar: "WORLD_PORT"
});


