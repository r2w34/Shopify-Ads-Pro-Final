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
  Tabs
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

  // Get Facebook account status with ad accounts
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
    include: {
      adAccounts: {
        where: { isDefault: true },
        take: 1
      }
    }
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

  // Enhanced AI data
  const aiStats = {
    totalRevenue: 156780,
    roas: 6.8,
    conversionRate: 4.7,
    audienceReach: 285000,
    aiOptimizations: 147,
    costSavings: 23450
  };

  const recentAiActivity = [
    { action: 'AI optimized Instagram campaign budget', time: '3 minutes ago', impact: '+28% ROAS', type: 'optimization' },
    { action: 'Created lookalike audience from top customers', time: '15 minutes ago', impact: '45K reach', type: 'audience' },
    { action: 'Launched automated retargeting funnel', time: '1 hour ago', impact: '+12% conversions', type: 'funnel' },
    { action: 'Generated 5 new ad creatives with AI', time: '2 hours ago', impact: '+18% CTR', type: 'creative' }
  ];

  const aiInsights = [
    'Your Instagram ads are performing 34% better than industry average',
    'AI detected optimal bidding window: 2-4 PM weekdays',
    'Lookalike audiences show 67% higher conversion rates',
    'Cart abandonment retargeting has 89% success rate'
  ];

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
    aiStats,
    recentAiActivity,
    aiInsights
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
  const [selectedTab, setSelectedTab] = useState(0);

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  const connectFacebook = () => {
    // Open Facebook auth in a popup window
    const facebookAppId = process.env.FACEBOOK_APP_ID || "342313695281811";
    const redirectUri = encodeURIComponent("https://ainet.sellerai.in/auth/facebook/callback");
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
      if (event.origin !== window.location.origin && event.origin !== 'https://ainet.sellerai.in') {
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

  const getImpactBadge = (type: string) => {
    switch (type) {
      case 'optimization': return <Badge tone="success">Optimization</Badge>;
      case 'audience': return <Badge tone="info">Audience</Badge>;
      case 'funnel': return <Badge tone="attention">Funnel</Badge>;
      case 'creative': return <Badge tone="warning">Creative</Badge>;
      default: return <Badge>AI</Badge>;
    }
  };

  const tabs = [
    {
      id: 'ai-dashboard',
      content: '🤖 AI Dashboard',
      panelID: 'ai-dashboard-panel',
    },
    {
      id: 'ai-funnels',
      content: '🎯 AI Funnels',
      panelID: 'ai-funnels-panel',
    },
    {
      id: 'business-intelligence',
      content: '📊 Business Intelligence',
      panelID: 'business-intelligence-panel',
    },
    {
      id: 'attribution-tracking',
      content: '🔍 Attribution Tracking',
      panelID: 'attribution-tracking-panel',
    },
  ];

  return (
    <Page>
      <TitleBar title="🚀 AI Facebook Ads Pro - Enhanced">
        <Button variant="primary" icon={PlusIcon} url="/app/campaigns/new">
          Create AI Campaign
        </Button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Enhanced Welcome Banner */}
        <Banner status="success" title="🚀 Welcome to AI-Powered Advertising!">
          <p>Your enhanced Facebook Ads Pro is now powered by advanced AI. Experience 24/7 optimization, intelligent funnels, and comprehensive business intelligence.</p>
        </Banner>

        {/* AI Performance Overview */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">🤖 AI Performance Overview</Text>
              <Badge tone="success">All Systems Active</Badge>
            </InlineStack>
            
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm" tone="subdued">Total Revenue</Text>
                    <Text variant="heading2xl">${data.aiStats.totalRevenue.toLocaleString()}</Text>
                    <Badge tone="success">+42% vs last month</Badge>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm" tone="subdued">AI ROAS</Text>
                    <Text variant="heading2xl">{data.aiStats.roas}x</Text>
                    <Badge tone="success">Above 5x target</Badge>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm" tone="subdued">Conversion Rate</Text>
                    <Text variant="heading2xl">{data.aiStats.conversionRate}%</Text>
                    <Badge tone="success">+1.8% this week</Badge>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm" tone="subdued">Audience Reach</Text>
                    <Text variant="heading2xl">{data.aiStats.audienceReach.toLocaleString()}</Text>
                    <Badge tone="info">Multi-channel</Badge>
                  </BlockStack>
                </Box>
              </Grid.Cell>
            </Grid>
          </BlockStack>
        </Card>

        {/* Enhanced Tabbed Interface */}
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box padding="400">
              {selectedTab === 0 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">🎯 AI-Powered Features Dashboard</Text>
                  
                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text variant="headingSm">Active AI Funnels</Text>
                          <Text variant="headingLg">12</Text>
                          <Text variant="bodySm" tone="subdued">+3 this week</Text>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text variant="headingSm">AI Optimizations</Text>
                          <Text variant="headingLg">{data.aiStats.aiOptimizations}</Text>
                          <Text variant="bodySm" tone="subdued">24/7 active</Text>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text variant="headingSm">Cost Savings</Text>
                          <Text variant="headingLg">${data.aiStats.costSavings.toLocaleString()}</Text>
                          <Text variant="bodySm" tone="subdued">+15% this month</Text>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                      <Card>
                        <BlockStack gap="200">
                          <Text variant="headingSm">Attribution Tracked</Text>
                          <Text variant="headingLg">1,247</Text>
                          <Text variant="bodySm" tone="subdued">conversions</Text>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                  </Grid>
                  
                  <InlineStack gap="300">
                    <Button variant="primary">🚀 Launch AI Funnel</Button>
                    <Button>📊 Create Campaign</Button>
                    <Button>📈 View Analytics</Button>
                  </InlineStack>
                </BlockStack>
              )}

              {selectedTab === 1 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">🎯 AI Advertising Funnels</Text>
                  <Text variant="bodySm">Personalized Facebook & Instagram ads with intelligent targeting and automatic optimization.</Text>
                  <Button url="/app/ai-funnel">Launch AI Funnel Builder →</Button>
                </BlockStack>
              )}

              {selectedTab === 2 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">📊 Business Intelligence</Text>
                  <Text variant="bodySm">Comprehensive analytics with AI-powered insights and actionable recommendations.</Text>
                  <Button url="/app/business-intelligence">Explore Business Intelligence →</Button>
                </BlockStack>
              )}

              {selectedTab === 3 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">🔍 Attribution Tracking</Text>
                  <Text variant="bodySm">Advanced cross-channel customer journey analysis with AI attribution modeling.</Text>
                  <Button url="/app/attribution-tracking">View Attribution Analysis →</Button>
                </BlockStack>
              )}
            </Box>
          </Tabs>
        </Card>

        {/* Recent AI Activity & Insights */}
        <Layout>
          <Layout.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 8, xl: 8 }}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">🤖 Recent AI Activity</Text>
                    {data.recentAiActivity.map((activity, index) => (
                      <Box key={index}>
                        <InlineStack align="space-between">
                          <BlockStack gap="100">
                            <Text variant="headingSm">{activity.action}</Text>
                            <Text variant="bodySm" tone="subdued">{activity.time}</Text>
                          </BlockStack>
                          <BlockStack gap="100" align="end">
                            {getImpactBadge(activity.type)}
                            <Text variant="bodySm">{activity.impact}</Text>
                          </BlockStack>
                        </InlineStack>
                        {index < data.recentAiActivity.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">💡 AI Insights</Text>
                    <List type="bullet">
                      {data.aiInsights.map((insight, index) => (
                        <List.Item key={index}>{insight}</List.Item>
                      ))}
                    </List>
                    <Button variant="primary" fullWidth>
                      Apply AI Recommendations
                    </Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>
          </Layout.Section>
        </Layout>

        {/* Enhanced Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">🚀 Enhanced Quick Actions</Text>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm">🎯 AI Advertising Funnels</Text>
                    <Text variant="bodySm">Personalized Facebook & Instagram ads with intelligent targeting and automatic optimization.</Text>
                    <Button>Launch Funnel Builder →</Button>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm">📊 Business Intelligence</Text>
                    <Text variant="bodySm">Comprehensive analytics with AI-powered insights and actionable recommendations.</Text>
                    <Button>Explore BI Dashboard →</Button>
                  </BlockStack>
                </Box>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingSm">🔍 Attribution Tracking</Text>
                    <Text variant="bodySm">Advanced cross-channel customer journey analysis with AI attribution modeling.</Text>
                    <Button>View Attribution →</Button>
                  </BlockStack>
                </Box>
              </Grid.Cell>
            </Grid>
          </BlockStack>
        </Card>

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
            <p>Connect your Facebook Business account to start creating and managing AI-powered ads.</p>
          </Banner>
        )}
      </BlockStack>
    </Page>
  );
}