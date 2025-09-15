import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Banner,
  Grid,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get Facebook account status
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
  });

  // Get campaigns with performance data
  const campaigns = await db.campaign.findMany({
    where: { shop },
    include: {
      ads: true,
      adSets: true,
    },
  });

  // Calculate analytics
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0;
  const cpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0;

  // Get top performing campaigns
  const topCampaigns = campaigns
    .filter(c => c.spend > 0)
    .sort((a, b) => (b.revenue / b.spend) - (a.revenue / a.spend))
    .slice(0, 5);

  return json({
    shop,
    facebookAccount: facebookAccount ? {
      isConnected: true,
      businessId: facebookAccount.businessId,
      adAccountId: facebookAccount.adAccountId,
    } : { isConnected: false },
    analytics: {
      totalCampaigns,
      activeCampaigns,
      totalSpend,
      totalRevenue,
      totalImpressions,
      totalClicks,
      totalConversions,
      roas,
      ctr,
      conversionRate,
      cpc,
      cpm,
    },
    topCampaigns,
  });
};

export default function Analytics() {
  const data = useLoaderData<typeof loader>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number, type: 'roas' | 'ctr' | 'conversion') => {
    switch (type) {
      case 'roas':
        return value >= 3 ? 'success' : value >= 2 ? 'warning' : 'critical';
      case 'ctr':
        return value >= 2 ? 'success' : value >= 1 ? 'warning' : 'critical';
      case 'conversion':
        return value >= 3 ? 'success' : value >= 1 ? 'warning' : 'critical';
      default:
        return 'subdued';
    }
  };

  return (
    <Page>
      <TitleBar title="Analytics & Performance" />

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
                <p>Connect your Facebook Business account to view detailed analytics.</p>
              </Banner>
            )}

            {/* Overview Metrics */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Performance Overview</Text>
                
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">Total Spend</Text>
                        <Text as="p" variant="headingLg">
                          {formatCurrency(data.analytics.totalSpend)}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Across {data.analytics.totalCampaigns} campaigns
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">Revenue Generated</Text>
                        <Text as="p" variant="headingLg">
                          {formatCurrency(data.analytics.totalRevenue)}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {data.analytics.totalConversions} conversions
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">ROAS</Text>
                        <InlineStack gap="200" align="start">
                          <Text as="p" variant="headingLg">
                            {data.analytics.roas.toFixed(2)}x
                          </Text>
                          <Badge tone={getPerformanceColor(data.analytics.roas, 'roas') as any}>
                            {data.analytics.roas >= 3 ? 'Excellent' : 
                             data.analytics.roas >= 2 ? 'Good' : 'Needs Work'}
                          </Badge>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Return on ad spend
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">Click-Through Rate</Text>
                        <InlineStack gap="200" align="start">
                          <Text as="p" variant="headingLg">
                            {formatPercentage(data.analytics.ctr)}
                          </Text>
                          <Badge tone={getPerformanceColor(data.analytics.ctr, 'ctr') as any}>
                            {data.analytics.ctr >= 2 ? 'Great' : 
                             data.analytics.ctr >= 1 ? 'Average' : 'Low'}
                          </Badge>
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {formatNumber(data.analytics.totalClicks)} clicks
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>

            {/* Detailed Metrics */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Detailed Metrics</Text>
                
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Impressions:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {formatNumber(data.analytics.totalImpressions)}
                        </Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Clicks:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {formatNumber(data.analytics.totalClicks)}
                        </Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Conversions:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {formatNumber(data.analytics.totalConversions)}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Cost Per Click:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {formatCurrency(data.analytics.cpc)}
                        </Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Cost Per Mille:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {formatCurrency(data.analytics.cpm)}
                        </Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Conversion Rate:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {formatPercentage(data.analytics.conversionRate)}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">Active Campaigns:</Text>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {data.analytics.activeCampaigns} / {data.analytics.totalCampaigns}
                        </Text>
                      </InlineStack>
                      
                      <ProgressBar 
                        progress={data.analytics.totalCampaigns > 0 ? 
                          (data.analytics.activeCampaigns / data.analytics.totalCampaigns * 100) : 0
                        } 
                        size="small" 
                      />
                      
                      <Text as="p" variant="bodySm" tone="subdued">
                        Campaign activity rate
                      </Text>
                    </BlockStack>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>

            {/* Top Performing Campaigns */}
            {data.topCampaigns.length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Top Performing Campaigns</Text>
                  
                  <BlockStack gap="300">
                    {data.topCampaigns.map((campaign, index) => {
                      const campaignRoas = campaign.spend > 0 ? (campaign.revenue / campaign.spend) : 0;
                      const campaignCtr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0;
                      
                      return (
                        <Card key={campaign.id} padding="400">
                          <InlineStack align="space-between">
                            <BlockStack gap="200">
                              <InlineStack gap="200" align="start">
                                <Text as="h3" variant="bodyMd" fontWeight="bold">
                                  #{index + 1} {campaign.name}
                                </Text>
                                <Badge tone="success">
                                  {campaignRoas.toFixed(2)}x ROAS
                                </Badge>
                              </InlineStack>
                              
                              <Text as="p" variant="bodySm" tone="subdued">
                                {campaign.objective} • {campaign.status}
                              </Text>
                              
                              <InlineStack gap="400">
                                <Text as="span" variant="bodySm">
                                  Spend: {formatCurrency(campaign.spend)}
                                </Text>
                                <Text as="span" variant="bodySm">
                                  Revenue: {formatCurrency(campaign.revenue)}
                                </Text>
                                <Text as="span" variant="bodySm">
                                  CTR: {formatPercentage(campaignCtr)}
                                </Text>
                                <Text as="span" variant="bodySm">
                                  Conversions: {campaign.conversions}
                                </Text>
                              </InlineStack>
                            </BlockStack>
                          </InlineStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Performance Summary */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Performance Summary</Text>
                
                <BlockStack gap="300">
                  <div>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">ROAS Performance:</Text>
                      <Badge tone={getPerformanceColor(data.analytics.roas, 'roas') as any}>
                        {data.analytics.roas >= 3 ? 'Excellent' : 
                         data.analytics.roas >= 2 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Target: 3.0x or higher
                    </Text>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">CTR Performance:</Text>
                      <Badge tone={getPerformanceColor(data.analytics.ctr, 'ctr') as any}>
                        {data.analytics.ctr >= 2 ? 'Great' : 
                         data.analytics.ctr >= 1 ? 'Average' : 'Low'}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Target: 2.0% or higher
                    </Text>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Conversion Rate:</Text>
                      <Badge tone={getPerformanceColor(data.analytics.conversionRate, 'conversion') as any}>
                        {data.analytics.conversionRate >= 3 ? 'Excellent' : 
                         data.analytics.conversionRate >= 1 ? 'Good' : 'Low'}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Target: 3.0% or higher
                    </Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Quick Actions */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Quick Actions</Text>
                
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">
                    📊 <strong>Optimize Performance:</strong> Review underperforming campaigns and adjust targeting or budgets.
                  </Text>
                  
                  <Text as="p" variant="bodySm">
                    🎯 <strong>Scale Winners:</strong> Increase budgets for campaigns with ROAS above 3.0x.
                  </Text>
                  
                  <Text as="p" variant="bodySm">
                    🔄 <strong>A/B Test:</strong> Create variations of high-performing ads to improve results.
                  </Text>
                  
                  <Text as="p" variant="bodySm">
                    📈 <strong>Sync Data:</strong> Regularly sync with Facebook to get the latest performance metrics.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}