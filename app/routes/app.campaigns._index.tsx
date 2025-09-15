import { useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
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
  Banner,
  EmptyState,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { PlusIcon, ConnectIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get Facebook account status with ad accounts
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
    include: {
      adAccounts: true,
    },
  });

  // Get campaigns
  const campaigns = await db.campaign.findMany({
    where: { shop },
    include: {
      ads: true,
      adSets: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return json({
    shop,
    facebookAccount: facebookAccount ? {
      isConnected: true,
      businessId: facebookAccount.businessId,
      adAccountId: facebookAccount.adAccountId,
      adAccounts: facebookAccount.adAccounts,
    } : { isConnected: false },
    campaigns,
  });
};

export default function CampaignsList() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge tone="success">Active</Badge>;
      case 'PAUSED':
        return <Badge tone="warning">Paused</Badge>;
      case 'FAILED':
        return <Badge tone="critical">Failed</Badge>;
      default:
        return <Badge tone="subdued">{status}</Badge>;
    }
  };

  const syncCampaigns = () => {
    fetcher.submit({ action: "sync_campaigns" }, { method: "POST", action: "/app" });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message);
      // Reload the page to show updated data
      window.location.reload();
    } else if (fetcher.data?.success === false) {
      shopify.toast.show(fetcher.data.message, { isError: true });
    }
  }, [fetcher.data, shopify]);

  return (
    <Page>
      <TitleBar title="Campaigns">
        <ButtonGroup>
          {data.facebookAccount.isConnected && (
            <Button 
              onClick={syncCampaigns}
              loading={fetcher.state === "submitting"}
              icon={ConnectIcon}
            >
              Sync from Facebook
            </Button>
          )}
          <Button 
            variant="primary" 
            icon={PlusIcon} 
            url="/app/campaigns/new"
            disabled={!data.facebookAccount.isConnected}
          >
            Create Campaign
          </Button>
        </ButtonGroup>
      </TitleBar>

      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Connection Status */}
            {!data.facebookAccount.isConnected && (
              <Banner
                title="Connect your Facebook account"
                status="warning"
                action={{
                  content: "Connect Facebook",
                  url: "/auth/facebook",
                }}
              >
                <p>Connect your Facebook Business account to create and manage campaigns.</p>
              </Banner>
            )}

            {/* Campaigns List */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">All Campaigns</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {data.campaigns.length} campaign{data.campaigns.length !== 1 ? 's' : ''}
                  </Text>
                </InlineStack>

                {data.campaigns.length === 0 ? (
                  <EmptyState
                    heading="No campaigns yet"
                    action={{
                      content: "Create your first campaign",
                      url: "/app/campaigns/new",
                      disabled: !data.facebookAccount.isConnected,
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Get started by creating your first AI-powered Facebook ad campaign.</p>
                    {!data.facebookAccount.isConnected && (
                      <p>You'll need to connect your Facebook account first.</p>
                    )}
                  </EmptyState>
                ) : (
                  <ResourceList
                    resourceName={{ singular: 'campaign', plural: 'campaigns' }}
                    items={data.campaigns}
                    renderItem={(campaign) => {
                      const roas = campaign.spend > 0 ? (campaign.revenue / campaign.spend) : 0;
                      const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0;
                      
                      return (
                        <ResourceItem
                          id={campaign.id}
                          url={`/app/campaigns/${campaign.id}`}
                          accessibilityLabel={`View campaign ${campaign.name}`}
                        >
                          <InlineStack align="space-between">
                            <BlockStack gap="200">
                              <InlineStack gap="200" align="start">
                                <Text as="h3" variant="bodyMd" fontWeight="bold">
                                  {campaign.name}
                                </Text>
                                {getStatusBadge(campaign.status)}
                                {campaign.facebookCampaignId && (
                                  <Badge tone="info">Synced</Badge>
                                )}
                              </InlineStack>
                              
                              <Text as="p" variant="bodySm" tone="subdued">
                                {campaign.objective} • {campaign.currency || 'USD'} • Created {formatDate(campaign.createdAt)}
                                {campaign.adAccountId && (
                                  <> • Ad Account: {campaign.adAccountId}</>
                                )}
                              </Text>
                              
                              <InlineStack gap="400">
                                <Text as="span" variant="bodySm">
                                  <strong>Spend:</strong> {formatCurrency(campaign.spend, campaign.currency)}
                                </Text>
                                <Text as="span" variant="bodySm">
                                  <strong>Revenue:</strong> {formatCurrency(campaign.revenue, campaign.currency)}
                                </Text>
                                <Text as="span" variant="bodySm">
                                  <strong>ROAS:</strong> {roas.toFixed(2)}x
                                </Text>
                                <Text as="span" variant="bodySm">
                                  <strong>CTR:</strong> {ctr.toFixed(2)}%
                                </Text>
                              </InlineStack>
                              
                              <InlineStack gap="400">
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {campaign.impressions.toLocaleString()} impressions
                                </Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {campaign.clicks.toLocaleString()} clicks
                                </Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {campaign.conversions} conversions
                                </Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {campaign.ads.length} ads
                                </Text>
                              </InlineStack>
                            </BlockStack>
                            
                            <BlockStack gap="200">
                              <Button url={`/app/campaigns/${campaign.id}`}>
                                View Details
                              </Button>
                              {campaign.budget && (
                                <Text as="p" variant="bodySm" tone="subdued" alignment="end">
                                  Budget: {formatCurrency(campaign.budget, campaign.currency)} {campaign.budgetType?.toLowerCase()}
                                </Text>
                              )}
                            </BlockStack>
                          </InlineStack>
                        </ResourceItem>
                      );
                    }}
                  />
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Quick Stats */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Campaign Overview</Text>
                
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Total Campaigns:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {data.campaigns.length}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Active:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {data.campaigns.filter(c => c.status === 'ACTIVE').length}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Total Spend:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {formatCurrency(data.campaigns.reduce((sum, c) => sum + c.spend, 0))}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Total Revenue:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {formatCurrency(data.campaigns.reduce((sum, c) => sum + c.revenue, 0))}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Facebook Account Status */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Facebook Account</Text>
                
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Status:</Text>
                    {data.facebookAccount.isConnected ? (
                      <Badge tone="success">Connected</Badge>
                    ) : (
                      <Badge tone="critical">Not Connected</Badge>
                    )}
                  </InlineStack>
                  
                  {data.facebookAccount.isConnected && (
                    <>
                      {data.facebookAccount.businessId && (
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodySm">Business ID:</Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {data.facebookAccount.businessId}
                          </Text>
                        </InlineStack>
                      )}
                      
                      {data.facebookAccount.adAccountId && (
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodySm">Ad Account:</Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {data.facebookAccount.adAccountId}
                          </Text>
                        </InlineStack>
                      )}
                    </>
                  )}
                </BlockStack>
                
                {!data.facebookAccount.isConnected && (
                  <Button fullWidth url="/auth/facebook">
                    Connect Facebook Account
                  </Button>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}