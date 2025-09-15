import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  ResourceList,
  ResourceItem,
  ButtonGroup,
  Modal,
  TextContainer,
  Spinner,
  Banner,
  DataTable,
  Tooltip,
  Icon,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { FacebookAdsService } from "../services/facebook-ads.server";
import { PlayIcon, EditIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get all campaigns for this shop
  const campaigns = await db.campaign.findMany({
    where: { shop },
    include: {
      facebookAccount: {
        include: {
          pages: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get Facebook account for API access
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
  });

  return json({
    campaigns,
    facebookAccount,
    shop,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "update_campaign_status") {
    const campaignId = formData.get("campaignId") as string;
    const newStatus = formData.get("status") as "ACTIVE" | "PAUSED" | "DELETED";

    try {
      // Get campaign and Facebook account
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, shop },
        include: { facebookAccount: true },
      });

      if (!campaign) {
        return json({ success: false, message: "Campaign not found." });
      }

      if (!campaign.facebookCampaignId) {
        return json({ success: false, message: "Campaign not synced with Facebook." });
      }

      // Initialize Facebook Ads service
      const facebookAdsService = new FacebookAdsService(campaign.facebookAccount.accessToken);

      // Update status on Facebook
      const result = await facebookAdsService.updateCampaignStatus(
        campaign.facebookCampaignId,
        newStatus
      );

      if (result.error) {
        return json({ 
          success: false, 
          message: `Failed to update Facebook campaign: ${result.error.message}` 
        });
      }

      // Update status in database
      await db.campaign.update({
        where: { id: campaignId },
        data: { status: newStatus },
      });

      return json({ 
        success: true, 
        message: `Campaign ${newStatus.toLowerCase()} successfully!` 
      });

    } catch (error: any) {
      console.error("Campaign status update error:", error);
      return json({ 
        success: false, 
        message: "Failed to update campaign status." 
      });
    }
  }

  if (action === "get_campaign_insights") {
    const campaignId = formData.get("campaignId") as string;

    try {
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, shop },
        include: { facebookAccount: true },
      });

      if (!campaign || !campaign.facebookCampaignId) {
        return json({ success: false, message: "Campaign not found or not synced." });
      }

      const facebookAdsService = new FacebookAdsService(campaign.facebookAccount.accessToken);

      // Get campaign insights for last 7 days
      const insights = await facebookAdsService.getCampaignInsights(
        campaign.facebookCampaignId,
        {
          date_preset: "last_7d",
          fields: "impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,actions,cost_per_action_type"
        }
      );

      return json({ 
        success: true, 
        insights: insights.data || [] 
      });

    } catch (error: any) {
      console.error("Campaign insights error:", error);
      return json({ 
        success: false, 
        message: "Failed to get campaign insights." 
      });
    }
  }

  if (action === "delete_campaign") {
    const campaignId = formData.get("campaignId") as string;

    try {
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, shop },
        include: { facebookAccount: true },
      });

      if (!campaign) {
        return json({ success: false, message: "Campaign not found." });
      }

      // If campaign exists on Facebook, delete it there first
      if (campaign.facebookCampaignId && campaign.facebookAccount) {
        const facebookAdsService = new FacebookAdsService(campaign.facebookAccount.accessToken);
        await facebookAdsService.updateCampaignStatus(
          campaign.facebookCampaignId,
          "DELETED"
        );
      }

      // Delete from database
      await db.campaign.delete({
        where: { id: campaignId },
      });

      return json({ 
        success: true, 
        message: "Campaign deleted successfully!" 
      });

    } catch (error: any) {
      console.error("Campaign deletion error:", error);
      return json({ 
        success: false, 
        message: "Failed to delete campaign." 
      });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function ManageCampaigns() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge status="success">Active</Badge>;
      case "PAUSED":
        return <Badge status="attention">Paused</Badge>;
      case "FAILED":
        return <Badge status="critical">Failed</Badge>;
      case "DELETED":
        return <Badge status="critical">Deleted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleStatusUpdate = (campaignId: string, newStatus: string) => {
    fetcher.submit(
      {
        action: "update_campaign_status",
        campaignId,
        status: newStatus,
      },
      { method: "post" }
    );
  };

  const handleGetInsights = (campaign: any) => {
    setSelectedCampaign(campaign);
    setShowInsights(true);
    
    fetcher.submit(
      {
        action: "get_campaign_insights",
        campaignId: campaign.id,
      },
      { method: "post" }
    );
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      fetcher.submit(
        {
          action: "delete_campaign",
          campaignId,
        },
        { method: "post" }
      );
    }
  };

  // Update insights when fetcher data changes
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.insights) {
      setInsights(fetcher.data.insights);
    }
  }, [fetcher.data]);

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100); // Convert from cents
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(2)}%`;
  };

  return (
    <Page>
      <TitleBar title="Manage Campaigns" />
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  Your Facebook Campaigns
                </Text>
                <Button
                  variant="primary"
                  onClick={() => navigate("/app/campaigns/create")}
                >
                  Create New Campaign
                </Button>
              </InlineStack>

              {data.campaigns.length === 0 ? (
                <Banner>
                  <p>No campaigns found. Create your first campaign to get started!</p>
                </Banner>
              ) : (
                <ResourceList
                  resourceName={{ singular: "campaign", plural: "campaigns" }}
                  items={data.campaigns}
                  renderItem={(campaign) => {
                    const { id, name, objective, status, budget, budgetType, currency, createdAt } = campaign;
                    
                    return (
                      <ResourceItem
                        id={id}
                        accessibilityLabel={`Campaign ${name}`}
                      >
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="bold" as="h3">
                                {name}
                              </Text>
                              <InlineStack gap="200">
                                <Text variant="bodySm" color="subdued">
                                  {objective}
                                </Text>
                                <Text variant="bodySm" color="subdued">
                                  {formatCurrency(budget * 100, currency)} {budgetType}
                                </Text>
                                <Text variant="bodySm" color="subdued">
                                  Created: {new Date(createdAt).toLocaleDateString()}
                                </Text>
                              </InlineStack>
                            </BlockStack>
                            
                            <InlineStack gap="200" align="center">
                              {getStatusBadge(status)}
                              
                              <ButtonGroup>
                                {status === "PAUSED" && (
                                  <Tooltip content="Activate Campaign">
                                    <Button
                                      size="micro"
                                      icon={PlayIcon}
                                      onClick={() => handleStatusUpdate(id, "ACTIVE")}
                                      loading={fetcher.state === "submitting"}
                                    />
                                  </Tooltip>
                                )}
                                
                                {status === "ACTIVE" && (
                                  <Tooltip content="Pause Campaign">
                                    <Button
                                      size="micro"
                                      onClick={() => handleStatusUpdate(id, "PAUSED")}
                                      loading={fetcher.state === "submitting"}
                                    >
                                      ⏸️
                                    </Button>
                                  </Tooltip>
                                )}
                                
                                <Tooltip content="View Insights">
                                  <Button
                                    size="micro"
                                    onClick={() => handleGetInsights(campaign)}
                                    disabled={!campaign.facebookCampaignId}
                                  >
                                    📊
                                  </Button>
                                </Tooltip>
                                
                                <Tooltip content="Edit Campaign">
                                  <Button
                                    size="micro"
                                    icon={EditIcon}
                                    onClick={() => navigate(`/app/campaigns/${id}/edit`)}
                                  />
                                </Tooltip>
                                
                                <Tooltip content="Delete Campaign">
                                  <Button
                                    size="micro"
                                    variant="primary"
                                    tone="critical"
                                    onClick={() => handleDeleteCampaign(id)}
                                  >
                                    🗑️
                                  </Button>
                                </Tooltip>
                              </ButtonGroup>
                            </InlineStack>
                          </InlineStack>
                        </BlockStack>
                      </ResourceItem>
                    );
                  }}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Campaign Insights Modal */}
      <Modal
        open={showInsights}
        onClose={() => {
          setShowInsights(false);
          setSelectedCampaign(null);
          setInsights([]);
        }}
        title={`Campaign Insights: ${selectedCampaign?.name}`}
        large
      >
        <Modal.Section>
          {fetcher.state === "submitting" ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <Spinner size="large" />
              <Text variant="bodyMd">Loading insights...</Text>
            </div>
          ) : insights.length > 0 ? (
            <BlockStack gap="400">
              {insights.map((insight, index) => (
                <Card key={index}>
                  <BlockStack gap="300">
                    <Text variant="headingMd">Performance Metrics</Text>
                    
                    <DataTable
                      columnContentTypes={["text", "numeric"]}
                      headings={["Metric", "Value"]}
                      rows={[
                        ["Impressions", formatNumber(parseInt(insight.impressions || "0"))],
                        ["Clicks", formatNumber(parseInt(insight.clicks || "0"))],
                        ["Spend", formatCurrency(parseFloat(insight.spend || "0") * 100, selectedCampaign?.currency)],
                        ["CPM", formatCurrency(parseFloat(insight.cpm || "0") * 100, selectedCampaign?.currency)],
                        ["CPC", formatCurrency(parseFloat(insight.cpc || "0") * 100, selectedCampaign?.currency)],
                        ["CTR", formatPercentage(parseFloat(insight.ctr || "0") / 100)],
                        ["Reach", formatNumber(parseInt(insight.reach || "0"))],
                        ["Frequency", parseFloat(insight.frequency || "0").toFixed(2)],
                      ]}
                    />
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          ) : (
            <Banner>
              <p>No insights data available for this campaign yet.</p>
            </Banner>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}