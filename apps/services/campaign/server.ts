import "dotenv/config";
import { createCampaignApp } from "./app";
import { InMemoryCampaignStore } from "./campaignStore";
import { createHttpsServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

const store = new InMemoryCampaignStore();

const app = createCampaignApp({ store });

createHttpsServer({
  app,
  serviceName: "Campaign",
  port: ports.campaign,
  portEnvVar: "CAMPAIGN_PORT"
});


