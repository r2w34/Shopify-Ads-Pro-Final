import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Badge,
  Banner,
  ButtonGroup,
  Divider,
  Box,
  DataTable,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { EditIcon, DeleteIcon, PlayIcon, PauseCircleIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const campaignId = params.id;

  if (!campaignId) {
    throw new Response("Campaign ID is required", { status: 400 });
  }

  // Get campaign with related data
  const campaign = await db.campaign.findFirst({
    where: { 
      id: campaignId,
      shop: shop 
    },
    include: {
      ads: {
        include: {
          adSet: true
        }
      },
      adSets: true,
    },
  });

  if (!campaign) {
    // For debugging: check if campaign exists for any shop
    const campaignAnyShop = await db.campaign.findFirst({
      where: { id: campaignId },
      select: { id: true, shop: true, name: true }
    });
    
    if (campaignAnyShop) {
      throw new Response(
        `Campaign found but belongs to different shop. Current shop: ${shop}, Campaign shop: ${campaignAnyShop.shop}`, 
        { status: 403 }
      );
    }
    
    throw new Response("Campaign not found", { status: 404 });
  }

  // Get Facebook account for ad account selection
  const facebookAccounts = await db.facebookAccount.findMany({
    where: { shop, isActive: true },
  });

  return json({
    campaign,
    facebookAccounts,
    shop,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const campaignId = params.id;
  
  if (!campaignId) {
    return json({ error: "Campaign ID is required" }, { status: 400 });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  try {
    switch (action) {
      case "update":
        const name = formData.get("name") as string;
        const objective = formData.get("objective") as string;
        const budget = parseFloat(formData.get("budget") as string);
        const adAccountId = formData.get("adAccountId") as string;

        await db.campaign.update({
          where: { id: campaignId },
          data: {
            name,
            objective,
            budget,
            adAccountId,
            updatedAt: new Date(),
          },
        });

        return json({ success: "Campaign updated successfully" });

      case "delete":
        await db.campaign.delete({
          where: { id: campaignId },
        });

        return redirect("/app/campaigns");

      case "pause":
      case "resume":
        const newStatus = action === "pause" ? "PAUSED" : "ACTIVE";
        
        await db.campaign.update({
          where: { id: campaignId },
          data: {
            status: newStatus,
            updatedAt: new Date(),
          },
        });

        return json({ success: `Campaign ${action === "pause" ? "paused" : "resumed"} successfully` });

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Campaign action error:", error);
    return json({ error: "Failed to perform action" }, { status: 500 });
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return { tone: "success" as const, text: "Active" };
    case 'PAUSED':
      return { tone: "warning" as const, text: "Paused" };
    case 'COMPLETED':
      return { tone: "info" as const, text: "Completed" };
    case 'DELETED':
      return { tone: "critical" as const, text: "Deleted" };
    default:
      return { tone: undefined, text: "Draft" };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function CampaignDetail() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { success?: string; error?: string } | undefined;
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: data.campaign.name,
    objective: data.campaign.objective,
    budget: data.campaign.budget.toString(),
    adAccountId: data.campaign.adAccountId || '',
  });

  // Show success/error messages
  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show(actionData.success);
      setIsEditing(false);
    } else if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData, shopify]);

  const isLoading = navigation.state === "submitting";

  // Calculate performance metrics
  const roas = data.campaign.spend > 0 ? (data.campaign.revenue / data.campaign.spend) : 0;
  const ctr = data.campaign.impressions > 0 ? (data.campaign.clicks / data.campaign.impressions * 100) : 0;
  const cpc = data.campaign.clicks > 0 ? (data.campaign.spend / data.campaign.clicks) : 0;

  // Prepare ads data for table
  const adsTableData = data.campaign.ads.map(ad => {
    const statusBadge = getStatusBadge(ad.status);
    return [
      ad.name,
      <Badge tone={statusBadge.tone}>{statusBadge.text}</Badge>,
      formatCurrency(ad.spend || 0),
      (ad.clicks || 0).toLocaleString(),
      ad.impressions ? `${((ad.clicks || 0) / ad.impressions * 100).toFixed(2)}%` : '0%',
      formatDate(ad.createdAt),
    ];
  });

  const objectiveOptions = [
    { label: 'Sales', value: 'OUTCOME_SALES' },
    { label: 'Traffic', value: 'OUTCOME_TRAFFIC' },
    { label: 'Leads', value: 'OUTCOME_LEADS' },
    { label: 'Engagement', value: 'OUTCOME_ENGAGEMENT' },
    { label: 'Awareness', value: 'OUTCOME_AWARENESS' },
    { label: 'App Promotion', value: 'OUTCOME_APP_PROMOTION' },
  ];

  const adAccountOptions = data.facebookAccounts.map(account => ({
    label: `Ad Account ${account.adAccountId}`,
    value: account.adAccountId || '',
  }));

  return (
    <Page>
      <TitleBar title={data.campaign.name}>
        <ButtonGroup>
          <Button
            icon={data.campaign.status === 'ACTIVE' ? PauseCircleIcon : PlayIcon}
            onClick={() => {
              const form = new FormData();
              form.append('action', data.campaign.status === 'ACTIVE' ? 'pause' : 'resume');
              fetch(`/app/campaigns/${data.campaign.id}`, {
                method: 'POST',
                body: form,
              });
            }}
            loading={isLoading}
          >
            {data.campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
          </Button>
          <Button
            icon={EditIcon}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            icon={DeleteIcon}
            tone="critical"
            onClick={() => {
              if (confirm('Are you sure you want to delete this campaign?')) {
                const form = new FormData();
                form.append('action', 'delete');
                fetch(`/app/campaigns/${data.campaign.id}`, {
                  method: 'POST',
                  body: form,
                });
              }
            }}
            loading={isLoading}
          >
            Delete
          </Button>
        </ButtonGroup>
      </TitleBar>

      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Campaign Info */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Campaign Details</Text>
                  {data.campaign.facebookCampaignId && (
                    <Badge tone="info">Synced with Facebook</Badge>
                  )}
                </InlineStack>

                {isEditing ? (
                  <Form method="post">
                    <input type="hidden" name="action" value="update" />
                    <BlockStack gap="400">
                      <TextField
                        label="Campaign Name"
                        value={formData.name}
                        onChange={(value) => setFormData({ ...formData, name: value })}
                        name="name"
                        autoComplete="off"
                      />

                      <Select
                        label="Objective"
                        options={objectiveOptions}
                        value={formData.objective}
                        onChange={(value) => setFormData({ ...formData, objective: value })}
                        name="objective"
                      />

                      <TextField
                        label="Daily Budget"
                        type="number"
                        value={formData.budget}
                        onChange={(value) => setFormData({ ...formData, budget: value })}
                        name="budget"
                        prefix="$"
                        autoComplete="off"
                      />

                      {adAccountOptions.length > 0 && (
                        <Select
                          label="Ad Account"
                          options={[
                            { label: 'Select ad account', value: '' },
                            ...adAccountOptions
                          ]}
                          value={formData.adAccountId}
                          onChange={(value) => setFormData({ ...formData, adAccountId: value })}
                          name="adAccountId"
                        />
                      )}

                      <InlineStack gap="200">
                        <Button submit variant="primary" loading={isLoading}>
                          Save Changes
                        </Button>
                        <Button onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Form>
                ) : (
                  <BlockStack gap="300">
                    <InlineStack gap="400">
                      <Text as="span"><strong>Status:</strong></Text>
                      {(() => {
                        const statusBadge = getStatusBadge(data.campaign.status);
                        return <Badge tone={statusBadge.tone}>{statusBadge.text}</Badge>;
                      })()}
                    </InlineStack>
                    
                    <Text as="p">
                      <strong>Objective:</strong> {data.campaign.objective}
                    </Text>
                    
                    <Text as="p">
                      <strong>Daily Budget:</strong> {formatCurrency(data.campaign.budget)}
                    </Text>
                    
                    {data.campaign.adAccountId && (
                      <Text as="p">
                        <strong>Ad Account:</strong> {data.campaign.adAccountId}
                      </Text>
                    )}
                    
                    <Text as="p">
                      <strong>Created:</strong> {formatDate(data.campaign.createdAt)}
                    </Text>
                    
                    {data.campaign.facebookCampaignId && (
                      <Text as="p">
                        <strong>Facebook Campaign ID:</strong> {data.campaign.facebookCampaignId}
                      </Text>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Performance</Text>
                
                <InlineStack gap="600">
                  <Box>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Total Spend</Text>
                      <Text as="p" variant="headingMd">{formatCurrency(data.campaign.spend)}</Text>
                    </BlockStack>
                  </Box>
                  
                  <Box>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Revenue</Text>
                      <Text as="p" variant="headingMd">{formatCurrency(data.campaign.revenue)}</Text>
                    </BlockStack>
                  </Box>
                  
                  <Box>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">ROAS</Text>
                      <Text as="p" variant="headingMd">{roas.toFixed(2)}x</Text>
                    </BlockStack>
                  </Box>
                  
                  <Box>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">CTR</Text>
                      <Text as="p" variant="headingMd">{ctr.toFixed(2)}%</Text>
                    </BlockStack>
                  </Box>
                  
                  <Box>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">CPC</Text>
                      <Text as="p" variant="headingMd">{formatCurrency(cpc)}</Text>
                    </BlockStack>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Ads List */}
            {data.campaign.ads.length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Ads ({data.campaign.ads.length})</Text>
                    <Button url={`/app/campaigns/${data.campaign.id}/ads/new`}>
                      Create Ad
                    </Button>
                  </InlineStack>

                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric', 'text']}
                    headings={['Name', 'Status', 'Spend', 'Clicks', 'CTR', 'Created']}
                    rows={adsTableData}
                  />
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}