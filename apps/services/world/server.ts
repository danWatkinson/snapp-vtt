import "dotenv/config";
import { createWorldApp } from "./app";
import { InMemoryWorldStore } from "./worldStore";
import { InMemoryWorldEntityStore } from "./worldEntitiesStore";
import { createHttpsServer } from "../../../packages/server-bootstrap";

const store = new InMemoryWorldStore();
const entityStore = new InMemoryWorldEntityStore();

const app = createWorldApp({ store, entityStore });

createHttpsServer({
  app,
  serviceName: "World",
  port: 4501,
  portEnvVar: "WORLD_PORT"
});


