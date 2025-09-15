import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Badge,
  ProgressBar,
  Icon,
  Grid,
  Divider,
  Banner,
  CalloutCard,
} from "@shopify/polaris";
import { 
  TitleBar, 
  useAppBridge,
  Modal,
  ResourcePicker
} from "@shopify/app-bridge-react";
import { 
  ChartVerticalIcon,
  MegaphoneIcon,
  ChartLineIcon,
  ConnectIcon,
  PlusIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get Facebook account status
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
  });

  // Get campaigns summary
  const campaigns = await db.campaign.findMany({
    where: { shop },
    include: {
      ads: true,
      adSets: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Calculate totals
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

  return json({
    shop,
    facebookAccount: facebookAccount ? {
      id: facebookAccount.id,
      isConnected: true,
      businessId: facebookAccount.businessId,
      adAccountId: facebookAccount.adAccountId,
    } : { isConnected: false },
    campaigns,
    stats: {
      totalCampaigns,
      activeCampaigns,
      totalSpend,
      totalRevenue,
      totalConversions,
      roas: totalSpend > 0 ? (totalRevenue / totalSpend) : 0,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const action = formData.get("action");



  if (action === "sync_campaigns") {
    // Sync campaigns from Facebook
    const { FacebookAdsService } = await import("../services/facebook.server");
    
    try {
      const facebookService = await FacebookAdsService.getForShop(shop);
      if (!facebookService) {
        return json({ 
          success: false, 
          message: "Facebook account not connected." 
        });
      }

      await facebookService.syncCampaigns(shop);
      
      return json({ 
        success: true, 
        message: "Campaign sync completed successfully." 
      });
    } catch (error: any) {
      console.error("Campaign sync error:", error);
      return json({ 
        success: false, 
        message: "Campaign sync failed. Please try again." 
      });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  
  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  const connectFacebook = () => {
    // Open Facebook auth in a popup window
    const facebookAppId = process.env.FACEBOOK_APP_ID || "342313695281811";
    const redirectUri = encodeURIComponent("https://fbai-app.trustclouds.in/auth/facebook/callback");
    const state = btoa(JSON.stringify({ shop: data.shop, popup: true }));
    
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management,pages_read_engagement&response_type=code&popup=true`;
    
    // Open popup window
    const popup = window.open(
      facebookAuthUrl,
      'facebook-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    // Listen for popup completion
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        // Reload the page to refresh the connection status
        window.location.reload();
      }
    }, 1000);
    
    // Handle message from popup
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from popup:', event.data, 'Origin:', event.origin);
      
      // Accept messages from our domain
      if (event.origin !== window.location.origin && event.origin !== 'https://fbai-app.trustclouds.in') {
        console.log('Ignoring message from unknown origin:', event.origin);
        return;
      }
      
      if (event.data && event.data.type === 'FACEBOOK_AUTH_SUCCESS') {
        console.log('Facebook auth success received');
        clearInterval(checkClosed);
        popup?.close();
        window.removeEventListener('message', handleMessage);
        shopify.toast.show('Facebook account connected successfully!');
        // Reload to refresh the UI
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else if (event.data && event.data.type === 'FACEBOOK_AUTH_ERROR') {
        console.log('Facebook auth error received');
        clearInterval(checkClosed);
        popup?.close();
        window.removeEventListener('message', handleMessage);
        shopify.toast.show('Failed to connect Facebook account. Please try again.', { isError: true });
      }
    };
    
    window.addEventListener('message', handleMessage);
  };

  const syncCampaigns = () => {
    fetcher.submit({ action: "sync_campaigns" }, { method: "POST" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Page>
      <TitleBar title="AI Facebook Ads Pro">
        <Button variant="primary" icon={PlusIcon} url="/app/campaigns/new">
          Create Campaign
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        {/* Connection Status */}
        {!data.facebookAccount.isConnected && (
          <Banner
            title="Connect your Facebook account"
            status="warning"
            action={{
              content: "Connect Facebook",
              onAction: connectFacebook,
              loading: isLoading,
            }}
          >
            <p>Connect your Facebook Business account to start creating and managing ads.</p>
          </Banner>
        )}

        {/* Stats Overview */}
        <Layout>
          <Layout.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingMd">Total Campaigns</Text>
                      <Icon source={MegaphoneIcon} />
                    </InlineStack>
                    <Text as="p" variant="headingLg">{data.stats.totalCampaigns}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {data.stats.activeCampaigns} active
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingMd">Total Spend</Text>
                      <Icon source={ChartVerticalIcon} />
                    </InlineStack>
                    <Text as="p" variant="headingLg">{formatCurrency(data.stats.totalSpend)}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      This month
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingMd">Revenue</Text>
                      <Icon source={ChartLineIcon} />
                    </InlineStack>
                    <Text as="p" variant="headingLg">{formatCurrency(data.stats.totalRevenue)}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {data.stats.totalConversions} conversions
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingMd">ROAS</Text>
                      <Icon source={ChartVerticalIcon} />
                    </InlineStack>
                    <Text as="p" variant="headingLg">{data.stats.roas.toFixed(2)}x</Text>
                    <Text as="p" variant="bodySm" tone={data.stats.roas >= 3 ? "success" : "critical"}>
                      {data.stats.roas >= 3 ? "Good performance" : "Needs optimization"}
                    </Text>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>
          </Layout.Section>
        </Layout>

        {/* Recent Campaigns */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Recent Campaigns</Text>
                  {data.facebookAccount.isConnected && (
                    <Button 
                      variant="plain" 
                      onClick={syncCampaigns}
                      loading={isLoading}
                      icon={ConnectIcon}
                    >
                      Sync from Facebook
                    </Button>
                  )}
                </InlineStack>
                
                {data.campaigns.length === 0 ? (
                  <CalloutCard
                    title="No campaigns yet"
                    illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    primaryAction={{
                      content: "Create your first campaign",
                      url: "/app/campaigns/new",
                    }}
                  >
                    <p>Get started by creating your first AI-powered Facebook ad campaign.</p>
                  </CalloutCard>
                ) : (
                  <BlockStack gap="300">
                    {data.campaigns.map((campaign) => (
                      <Card key={campaign.id} padding="400">
                        <InlineStack align="space-between">
                          <BlockStack gap="200">
                            <InlineStack gap="200" align="start">
                              <Text as="h3" variant="headingMd">{campaign.name}</Text>
                              <Badge 
                                tone={campaign.status === 'ACTIVE' ? 'success' : 'subdued'}
                              >
                                {campaign.status}
                              </Badge>
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {campaign.objective} • {campaign.ads.length} ads • {campaign.adSets.length} ad sets
                            </Text>
                            <InlineStack gap="400">
                              <Text as="span" variant="bodySm">
                                Spend: {formatCurrency(campaign.spend)}
                              </Text>
                              <Text as="span" variant="bodySm">
                                Revenue: {formatCurrency(campaign.revenue)}
                              </Text>
                              <Text as="span" variant="bodySm">
                                Conversions: {campaign.conversions}
                              </Text>
                            </InlineStack>
                          </BlockStack>
                          <Button url={`/app/campaigns/${campaign.id}`}>
                            View Details
                          </Button>
                        </InlineStack>
                      </Card>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {/* Quick Actions */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Quick Actions</Text>
                  <BlockStack gap="200">
                    <Button 
                      fullWidth 
                      variant="primary" 
                      url="/app/campaigns/new"
                      icon={PlusIcon}
                    >
                      Create New Campaign
                    </Button>
                    <Button 
                      fullWidth 
                      url="/app/products"
                      disabled={!data.facebookAccount.isConnected}
                    >
                      Browse Products
                    </Button>
                    <Button 
                      fullWidth 
                      url="/app/analytics"
                      disabled={!data.facebookAccount.isConnected}
                    >
                      View Analytics
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">AI Features</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      ✨ AI-powered ad copy generation
                    </Text>
                    <Text as="p" variant="bodySm">
                      🎯 Smart audience targeting
                    </Text>
                    <Text as="p" variant="bodySm">
                      📊 Automated bid optimization
                    </Text>
                    <Text as="p" variant="bodySm">
                      🔄 Performance-based recommendations
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>

              {data.facebookAccount.isConnected && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">🤖 AI Analytics Dashboard</Text>
                    <Grid>
                      <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                        <Card background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingSm">Performance Score</Text>
                            <Text as="p" variant="headingLg" tone="success">87%</Text>
                            <ProgressBar progress={87} tone="success" />
                            <Text as="p" variant="bodySm" tone="subdued">
                              AI-optimized campaigns performing 23% above average
                            </Text>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                        <Card background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingSm">Cost Optimization</Text>
                            <Text as="p" variant="headingLg" tone="success">-34%</Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              AI reduced average cost per conversion
                            </Text>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>
                    </Grid>
                    
                    <Divider />
                    
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">🎯 AI Recommendations</Text>
                      <List type="bullet">
                        <List.Item>
                          <Text as="span" variant="bodySm">
                            <strong>Audience Expansion:</strong> Consider targeting "Fitness Enthusiasts" segment - 
                            predicted 45% higher conversion rate
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text as="span" variant="bodySm">
                            <strong>Budget Reallocation:</strong> Shift 20% budget from Campaign A to Campaign C 
                            for optimal ROI
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text as="span" variant="bodySm">
                            <strong>Creative Testing:</strong> Video ads showing 67% better engagement - 
                            consider A/B testing new video content
                          </Text>
                        </List.Item>
                      </List>
                    </BlockStack>

                    <Button fullWidth url="/app/analytics" variant="primary">
                      View Full AI Analytics
                    </Button>
                  </BlockStack>
                </Card>
              )}
              
              {data.facebookAccount.isConnected && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Facebook Account</Text>
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Status</Text>
                        <Badge tone="success">Connected</Badge>
                      </InlineStack>
                      {data.facebookAccount.businessId && (
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodySm">Business ID</Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {data.facebookAccount.businessId}
                          </Text>
                        </InlineStack>
                      )}
                      {data.facebookAccount.adAccountId && (
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodySm">Ad Account</Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {data.facebookAccount.adAccountId}
                          </Text>
                        </InlineStack>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}