import "dotenv/config";
import { createApp } from "./app";
import { InMemoryUserStore } from "./userStore";
import { seedUsers } from "./userSeeder";
import { createServiceServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

createServiceServer({
  serviceName: "Auth",
  port: ports.auth,
  portEnvVar: "AUTH_PORT",
  createStores: () => ({ userStore: new InMemoryUserStore() }),
  createApp: ({ userStore }) => createApp({ userStore }),
  seedStores: async ({ userStore }) => {
    await seedUsers(userStore);
  }
});

