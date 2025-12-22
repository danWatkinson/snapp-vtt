import "dotenv/config";
import { createApp } from "./app";
import { InMemoryUserStore } from "./userStore";
import { seedUsers } from "./userSeeder";
import { createHttpsServer } from "../../../packages/server-bootstrap";

const seededStore = new InMemoryUserStore();

async function bootstrap() {
  try {
    // Seed users before starting the server. If seeding fails, log and continue
    // so that the service can still start (tests rely on this behaviour).
    await seedUsers(seededStore);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to seed users for auth service:", err);
  }

  const app = createApp({ userStore: seededStore });

  createHttpsServer({
    app,
    serviceName: "Auth",
    port: 4400,
    portEnvVar: "AUTH_PORT"
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected error during auth service bootstrap:", err);
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
});

