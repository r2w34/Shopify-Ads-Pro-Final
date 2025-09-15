/*
  Warnings:

  - A unique constraint covering the columns `[shop,facebookCampaignId]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Campaign_shop_facebookCampaignId_key" ON "Campaign"("shop", "facebookCampaignId");
