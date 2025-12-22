import "dotenv/config";
import { createCampaignApp } from "./app";
import { InMemoryCampaignStore } from "./campaignStore";
import { createServiceServer } from "../../../packages/server-bootstrap";
import { ports } from "../../../packages/config";

createServiceServer({
  serviceName: "Campaign",
  port: ports.campaign,
  portEnvVar: "CAMPAIGN_PORT",
  createStores: () => ({ store: new InMemoryCampaignStore() }),
  createApp: ({ store }) => createCampaignApp({ store })
});


