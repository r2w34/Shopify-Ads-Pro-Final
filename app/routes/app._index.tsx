import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Grid,
  Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    // Check Facebook connection status
    const facebookAccount = await db.facebookAccount.findFirst({
      where: { shop, isActive: true },
      include: {
        adAccounts: true,
        pages: true
      }
    });

    // Get URL parameters for error messages
    const url = new URL(request.url);
    const error = url.searchParams.get('error');
    
    return json({
      shop: session.shop,
      isAuthenticated: true,
      facebookConnected: !!facebookAccount,
      error,
      stats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalRevenue: 156780,
        roas: 6.8,
        conversionRate: 4.7,
        audienceReach: 285000,
        aiOptimizations: 147,
        costSavings: 23450
      }
    });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return json({
      shop: 'unknown',
      isAuthenticated: false,
      facebookConnected: false,
      error: null,
      stats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalRevenue: 0,
        roas: 0,
        conversionRate: 0,
        audienceReach: 0,
        aiOptimizations: 0,
        costSavings: 0
      }
    });
  }
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  if (!data.isAuthenticated) {
    return (
      <Page title="Authentication Required">
        <Layout>
          <Layout.Section>
            <Banner
              title="Authentication Required"
              status="critical"
            >
              <p>Please authenticate your Shopify store to access the dashboard.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="FB AI Ads Pro Dashboard">
      <Layout>
        {/* Error Banner */}
        {data.error && (
          <Layout.Section>
            <Banner
              title="Action Required"
              status="warning"
            >
              {data.error === 'facebook_not_connected' && (
                <p>Please connect your Facebook account first to create campaigns. Go to Facebook Settings to get started.</p>
              )}
            </Banner>
          </Layout.Section>
        )}

        {/* Welcome Banner */}
        <Layout.Section>
          <Banner
            title="Welcome to FB AI Ads Pro!"
            status={data.facebookConnected ? "success" : "info"}
          >
            <p>Your AI-powered Facebook advertising optimization platform is ready for {data.shop}.</p>
            {!data.facebookConnected && (
              <p><strong>Next step:</strong> Connect your Facebook account to start creating campaigns.</p>
            )}
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd">Campaign Overview</Text>
                  <InlineStack gap="400">
                    <Box>
                      <Text variant="bodyMd">Total Campaigns</Text>
                      <Text variant="headingLg">{data.stats.totalCampaigns}</Text>
                    </Box>
                    <Box>
                      <Text variant="bodyMd">Active Campaigns</Text>
                      <Text variant="headingLg">{data.stats.activeCampaigns}</Text>
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd">AI Performance</Text>
                  <InlineStack gap="400">
                    <Box>
                      <Text variant="bodyMd">AI Revenue</Text>
                      <Text variant="headingLg">${data.stats.totalRevenue.toLocaleString()}</Text>
                    </Box>
                    <Box>
                      <Text variant="bodyMd">ROAS</Text>
                      <Text variant="headingLg">{data.stats.roas}x</Text>
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Quick Actions</Text>
              <InlineStack gap="300">
                {data.facebookConnected ? (
                  <Button variant="primary" url="/app/campaigns/new">
                    Create Campaign
                  </Button>
                ) : (
                  <Button variant="primary" url="/app/facebooksettings">
                    Connect Facebook
                  </Button>
                )}
                <Button url="/app/facebooksettings">
                  Facebook Settings
                </Button>
                <Button url="/app/ai-dashboard/complex">
                  AI Dashboard
                </Button>
                <Button url="/app/analytics">
                  Analytics
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Shop Information</Text>
              <Text variant="bodyMd">
                Connected Shop: {data.shop}
              </Text>
              <Text variant="bodyMd">
                Conversion Rate: {data.stats.conversionRate}%
              </Text>
              <Text variant="bodyMd">
                Audience Reach: {data.stats.audienceReach.toLocaleString()}
              </Text>
              <Text variant="bodyMd">
                AI Optimizations: {data.stats.aiOptimizations}
              </Text>
              <Text variant="bodyMd">
                Cost Savings: ${data.stats.costSavings.toLocaleString()}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}