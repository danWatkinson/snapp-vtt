import "dotenv/config";
import { createCampaignApp } from "./app";
import { InMemoryCampaignStore } from "./campaignStore";
import { createHttpsServer } from "../../../packages/server-bootstrap";

const store = new InMemoryCampaignStore();

const app = createCampaignApp({ store });

createHttpsServer({
  app,
  serviceName: "Campaign",
  port: 4600,
  portEnvVar: "CAMPAIGN_PORT"
});


