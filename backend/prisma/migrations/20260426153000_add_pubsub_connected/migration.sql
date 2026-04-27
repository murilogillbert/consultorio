-- Add Pub/Sub connection status for Gmail push notifications.
ALTER TABLE "IntegrationSettings" ADD COLUMN "pubsubConnected" BOOLEAN NOT NULL DEFAULT false;
