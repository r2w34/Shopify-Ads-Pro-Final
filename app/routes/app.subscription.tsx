import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
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
  Banner,
  ProgressBar,
  Divider,
  ButtonGroup,
  Modal,
  TextContainer,
  List,
  Grid,
  ResourceList,
  ResourceItem,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { SubscriptionService } from "../services/subscription.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get current subscription
  const subscription = await SubscriptionService.getSubscription(shop);
  
  // Get all available plans
  const plans = await SubscriptionService.getAllPlans();

  // Get usage statistics
  const campaigns = await db.campaign.findMany({
    where: { shop },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      spend: true,
      revenue: true
    }
  });

  const aiPrompts = await db.aIPrompt.findMany({
    where: { shop },
    select: {
      id: true,
      type: true,
      createdAt: true
    }
  });

  // Calculate current period usage
  const currentPeriodStart = subscription?.currentPeriodStart || new Date();
  const currentPeriodCampaigns = campaigns.filter(c => 
    new Date(c.createdAt) >= currentPeriodStart
  ).length;

  const currentPeriodAIRequests = aiPrompts.filter(p => 
    new Date(p.createdAt) >= currentPeriodStart
  ).length;

  return json({
    shop,
    subscription,
    plans,
    usage: {
      campaigns: {
        total: campaigns.length,
        currentPeriod: currentPeriodCampaigns,
        limit: subscription?.plan?.maxCampaigns || 0
      },
      aiRequests: {
        total: aiPrompts.length,
        currentPeriod: currentPeriodAIRequests,
        limit: subscription?.plan?.maxAIRequests || 0
      }
    },
    recentCampaigns: campaigns.slice(0, 5)
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "upgrade_plan") {
    const planId = formData.get("planId") as string;
    
    try {
      await SubscriptionService.upgradeSubscription(shop, planId);
      return json({ success: true, message: "Plan upgraded successfully!" });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  if (action === "cancel_subscription") {
    const cancelAtPeriodEnd = formData.get("cancelAtPeriodEnd") === "true";
    
    try {
      await SubscriptionService.cancelSubscription(shop, cancelAtPeriodEnd);
      return json({ 
        success: true, 
        message: cancelAtPeriodEnd 
          ? "Subscription will be cancelled at the end of current period" 
          : "Subscription cancelled immediately"
      });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  if (action === "start_trial") {
    const planId = formData.get("planId") as string;
    
    try {
      await SubscriptionService.createSubscription({
        shop,
        planId,
        trialDays: 14
      });
      return json({ success: true, message: "Trial started successfully!" });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function SubscriptionPage() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'trial':
        return <Badge tone="info">Trial</Badge>;
      case 'cancelled':
        return <Badge tone="warning">Cancelled</Badge>;
      case 'expired':
        return <Badge tone="critical">Expired</Badge>;
      default:
        return <Badge tone="subdued">{status}</Badge>;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const openUpgradeModal = (plan: any) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
    setSelectedPlan(null);
  };

  const upgradePlan = () => {
    if (selectedPlan) {
      fetcher.submit({
        action: "upgrade_plan",
        planId: selectedPlan.id
      }, { method: "POST" });
    }
  };

  const startTrial = (plan: any) => {
    fetcher.submit({
      action: "start_trial",
      planId: plan.id
    }, { method: "POST" });
  };

  const cancelSubscription = (cancelAtPeriodEnd: boolean) => {
    fetcher.submit({
      action: "cancel_subscription",
      cancelAtPeriodEnd: cancelAtPeriodEnd.toString()
    }, { method: "POST" });
    setShowCancelModal(false);
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message);
      if (showUpgradeModal) {
        closeUpgradeModal();
      }
      // Reload page to show updated data
      setTimeout(() => window.location.reload(), 1000);
    } else if (fetcher.data?.success === false) {
      shopify.toast.show(fetcher.data.message, { isError: true });
    }
  }, [fetcher.data, shopify]);

  return (
    <Page>
      <TitleBar title="Subscription & Billing" />

      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Current Subscription */}
            {data.subscription ? (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Current Subscription</Text>
                    {getStatusBadge(data.subscription.status)}
                  </InlineStack>
                  
                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">Plan</Text>
                        <Text as="p" variant="bodyLg" fontWeight="bold">
                          {data.subscription.plan.name}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {formatCurrency(data.subscription.plan.price)} / {data.subscription.plan.interval}
                        </Text>
                      </BlockStack>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">Billing Period</Text>
                        <Text as="p" variant="bodyMd">
                          {formatDate(data.subscription.currentPeriodStart)} - {formatDate(data.subscription.currentPeriodEnd)}
                        </Text>
                        {data.subscription.isTrialActive && data.subscription.trialEnd && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            Trial ends: {formatDate(data.subscription.trialEnd)}
                          </Text>
                        )}
                      </BlockStack>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">Actions</Text>
                        <ButtonGroup>
                          <Button onClick={() => setShowCancelModal(true)}>
                            {data.subscription.cancelAtPeriodEnd ? "Reactivate" : "Cancel"}
                          </Button>
                        </ButtonGroup>
                      </BlockStack>
                    </Grid.Cell>
                  </Grid>

                  {data.subscription.cancelAtPeriodEnd && (
                    <Banner tone="warning">
                      <p>Your subscription will be cancelled on {formatDate(data.subscription.currentPeriodEnd)}</p>
                    </Banner>
                  )}
                </BlockStack>
              </Card>
            ) : (
              <Banner
                title="No active subscription"
                status="info"
                action={{
                  content: "Choose a plan",
                  onAction: () => document.getElementById('plans-section')?.scrollIntoView()
                }}
              >
                <p>Start your free trial to access all AI-powered Facebook Ads features.</p>
              </Banner>
            )}

            {/* Usage Statistics */}
            {data.subscription && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Usage This Period</Text>
                  
                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">Campaigns</Text>
                          <Text as="span" variant="bodySm">
                            {data.usage.campaigns.currentPeriod} / {data.subscription.plan.maxCampaigns === -1 ? '∞' : data.subscription.plan.maxCampaigns}
                          </Text>
                        </InlineStack>
                        
                        {data.subscription.plan.maxCampaigns !== -1 && (
                          <ProgressBar
                            progress={getUsagePercentage(data.usage.campaigns.currentPeriod, data.subscription.plan.maxCampaigns)}
                            tone={getUsageColor(getUsagePercentage(data.usage.campaigns.currentPeriod, data.subscription.plan.maxCampaigns)) as any}
                            size="small"
                          />
                        )}
                        
                        <Text as="p" variant="bodySm" tone="subdued">
                          Total campaigns created: {data.usage.campaigns.total}
                        </Text>
                      </BlockStack>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">AI Requests</Text>
                          <Text as="span" variant="bodySm">
                            {data.usage.aiRequests.currentPeriod} / {data.subscription.plan.maxAIRequests === -1 ? '∞' : data.subscription.plan.maxAIRequests}
                          </Text>
                        </InlineStack>
                        
                        {data.subscription.plan.maxAIRequests !== -1 && (
                          <ProgressBar
                            progress={getUsagePercentage(data.usage.aiRequests.currentPeriod, data.subscription.plan.maxAIRequests)}
                            tone={getUsageColor(getUsagePercentage(data.usage.aiRequests.currentPeriod, data.subscription.plan.maxAIRequests)) as any}
                            size="small"
                          />
                        )}
                        
                        <Text as="p" variant="bodySm" tone="subdued">
                          Total AI requests: {data.usage.aiRequests.total}
                        </Text>
                      </BlockStack>
                    </Grid.Cell>
                  </Grid>
                </BlockStack>
              </Card>
            )}

            {/* Available Plans */}
            <div id="plans-section">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Available Plans</Text>
                  
                  <Grid>
                    {data.plans.map((plan) => {
                      const isCurrentPlan = data.subscription?.planId === plan.id;
                      const features = JSON.parse(plan.features);
                      
                      return (
                        <Grid.Cell key={plan.id} columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <Card>
                            <BlockStack gap="400">
                              <BlockStack gap="200">
                                <InlineStack align="space-between">
                                  <Text as="h3" variant="headingMd">{plan.name}</Text>
                                  {isCurrentPlan && <Badge tone="success">Current</Badge>}
                                </InlineStack>
                                
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {plan.description}
                                </Text>
                                
                                <Text as="p" variant="headingLg">
                                  {formatCurrency(plan.price)}
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    /{plan.interval}
                                  </Text>
                                </Text>
                              </BlockStack>
                              
                              <Divider />
                              
                              <BlockStack gap="200">
                                <Text as="h4" variant="headingSm">Features</Text>
                                <List>
                                  {features.map((feature: string, index: number) => (
                                    <List.Item key={index}>{feature}</List.Item>
                                  ))}
                                </List>
                              </BlockStack>
                              
                              <BlockStack gap="200">
                                <Text as="h4" variant="headingSm">Limits</Text>
                                <Text as="p" variant="bodySm">
                                  Campaigns: {plan.maxCampaigns === -1 ? 'Unlimited' : plan.maxCampaigns}
                                </Text>
                                <Text as="p" variant="bodySm">
                                  AI Requests: {plan.maxAIRequests === -1 ? 'Unlimited' : plan.maxAIRequests}
                                </Text>
                                <Text as="p" variant="bodySm">
                                  Facebook Accounts: {plan.maxFacebookAccounts === -1 ? 'Unlimited' : plan.maxFacebookAccounts}
                                </Text>
                              </BlockStack>
                              
                              {!data.subscription ? (
                                <Button
                                  variant="primary"
                                  fullWidth
                                  onClick={() => startTrial(plan)}
                                  loading={fetcher.state === "submitting"}
                                >
                                  Start 14-Day Free Trial
                                </Button>
                              ) : !isCurrentPlan ? (
                                <Button
                                  fullWidth
                                  onClick={() => openUpgradeModal(plan)}
                                  loading={fetcher.state === "submitting"}
                                >
                                  {plan.price > data.subscription.plan.price ? 'Upgrade' : 'Downgrade'}
                                </Button>
                              ) : (
                                <Button fullWidth disabled>
                                  Current Plan
                                </Button>
                              )}
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                      );
                    })}
                  </Grid>
                </BlockStack>
              </Card>
            </div>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Recent Activity */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Recent Campaigns</Text>
                
                {data.recentCampaigns.length === 0 ? (
                  <Text as="p" variant="bodySm" tone="subdued">
                    No campaigns created yet
                  </Text>
                ) : (
                  <ResourceList
                    resourceName={{ singular: 'campaign', plural: 'campaigns' }}
                    items={data.recentCampaigns}
                    renderItem={(campaign) => (
                      <ResourceItem
                        id={campaign.id}
                        accessibilityLabel={`Campaign ${campaign.name}`}
                      >
                        <InlineStack align="space-between">
                          <BlockStack gap="100">
                            <Text as="h3" variant="bodyMd" fontWeight="bold">
                              {campaign.name}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Created {formatDate(campaign.createdAt)}
                            </Text>
                          </BlockStack>
                          <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'subdued'}>
                            {campaign.status}
                          </Badge>
                        </InlineStack>
                      </ResourceItem>
                    )}
                  />
                )}
                
                <Button fullWidth url="/app/campaigns">
                  View All Campaigns
                </Button>
              </BlockStack>
            </Card>

            {/* Support */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Need Help?</Text>
                
                <Text as="p" variant="bodySm">
                  Our support team is here to help you get the most out of AI Facebook Ads Pro.
                </Text>
                
                <ButtonGroup>
                  <Button url="mailto:support@example.com">Email Support</Button>
                  <Button url="/app/help">Help Center</Button>
                </ButtonGroup>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Upgrade Modal */}
      <Modal
        open={showUpgradeModal}
        onClose={closeUpgradeModal}
        title={`${selectedPlan?.price > data.subscription?.plan.price ? 'Upgrade' : 'Downgrade'} to ${selectedPlan?.name}`}
        primaryAction={{
          content: "Confirm",
          onAction: upgradePlan,
          loading: fetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: closeUpgradeModal
          }
        ]}
      >
        <Modal.Section>
          {selectedPlan && data.subscription && (
            <TextContainer>
              <p>
                You are about to {selectedPlan.price > data.subscription.plan.price ? 'upgrade' : 'downgrade'} from{' '}
                <strong>{data.subscription.plan.name}</strong> to <strong>{selectedPlan.name}</strong>.
              </p>
              
              <p>
                New price: <strong>{formatCurrency(selectedPlan.price)}/{selectedPlan.interval}</strong>
              </p>
              
              <p>
                The change will take effect immediately and your next billing date will be adjusted accordingly.
              </p>
            </TextContainer>
          )}
        </Modal.Section>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        primaryAction={{
          content: "Cancel at Period End",
          onAction: () => cancelSubscription(true),
          loading: fetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: "Cancel Immediately",
            onAction: () => cancelSubscription(false),
            destructive: true
          },
          {
            content: "Keep Subscription",
            onAction: () => setShowCancelModal(false)
          }
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              Are you sure you want to cancel your subscription? You can choose to:
            </p>
            
            <List>
              <List.Item>
                <strong>Cancel at period end:</strong> Continue using the app until your current billing period ends
              </List.Item>
              <List.Item>
                <strong>Cancel immediately:</strong> Lose access to premium features right away
              </List.Item>
            </List>
            
            <p>
              You can reactivate your subscription at any time.
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}