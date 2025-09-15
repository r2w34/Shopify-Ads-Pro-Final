import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  TextField,
  Select,
  Checkbox,
  Banner,
  InlineStack,
  Text,
  Divider,
  Badge,
  ResourceList,
  ResourceItem,
  Thumbnail,
  ButtonGroup,
  Modal,
  TextContainer,
  Spinner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // Debug logging
  console.log("🔍 Campaign New (WORKING) - Shop from session:", shop);

  // Check Facebook connection and get ad accounts, pages, and Instagram accounts
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
    include: {
      adAccounts: true,
      pages: {
        include: {
          instagramAccounts: true,
        },
      },
    },
  });

  console.log("🔍 Campaign New (WORKING) - Facebook account found:", !!facebookAccount);
  if (facebookAccount) {
    console.log("🔍 Campaign New (WORKING) - Ad accounts count:", facebookAccount.adAccounts.length);
    console.log("🔍 Campaign New (WORKING) - Pages count:", facebookAccount.pages.length);
  }

  if (!facebookAccount) {
    console.log("❌ Campaign New (WORKING) - No Facebook account found, redirecting to app with error");
    return redirect("/app?error=facebook_not_connected");
  }

  // Get products from Shopify
  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
          description
          handle
          status
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            nodes {
              url
              altText
            }
          }
          tags
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const productsData = await productsResponse.json();
  const products = productsData.data?.products?.nodes || [];

  // Flatten Instagram accounts for easier selection
  const instagramAccounts = facebookAccount.pages.flatMap(page => 
    page.instagramAccounts.map(ig => ({
      ...ig,
      pageId: page.pageId,
      pageName: page.name,
    }))
  );

  return json({
    shop,
    facebookAccount: {
      isConnected: true,
      businessId: facebookAccount.businessId,
      adAccountId: facebookAccount.adAccountId,
    },
    adAccounts: facebookAccount.adAccounts,
    pages: facebookAccount.pages,
    instagramAccounts,
    products,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "generate_ad_copy") {
    const productId = formData.get("productId") as string;
    const objective = formData.get("objective") as string;
    const targetAudience = formData.get("targetAudience") as string;
    const tone = formData.get("tone") as string;

    try {
      const { OpenAIService } = await import("../services/openai.server");
      const openaiService = new OpenAIService();

      // Get product details (simplified for demo)
      const product = {
        id: productId,
        title: formData.get("productTitle") as string,
        description: formData.get("productDescription") as string,
        price: formData.get("productPrice") as string,
        tags: (formData.get("productTags") as string)?.split(',') || [],
      };

      const adCopy = await openaiService.generateAdCopy({
        product,
        objective,
        targetAudience,
        tone: tone as any,
      }, shop);

      return json({ success: true, adCopy });
    } catch (error: any) {
      console.error("Ad copy generation error:", error);
      return json({ 
        success: false, 
        message: "Failed to generate ad copy. Please try again." 
      });
    }
  }

  if (action === "create_campaign") {
    const campaignName = formData.get("campaignName") as string;
    const objective = formData.get("objective") as string;
    const budget = parseFloat(formData.get("budget") as string);
    const budgetType = formData.get("budgetType") as string;
    const selectedAdAccount = formData.get("selectedAdAccount") as string;
    const currency = formData.get("currency") as string;
    const productIds = formData.get("productIds") as string;
    const adCopy = formData.get("adCopy") as string;

    try {
      const { FacebookAdsService } = await import("../services/facebook.server");
      const facebookService = await FacebookAdsService.getForShop(shop);
      
      if (!facebookService) {
        return json({ 
          success: false, 
          message: "Facebook account not connected." 
        });
      }

      // Get Facebook account
      const facebookAccount = await db.facebookAccount.findFirst({
        where: { shop, isActive: true },
      });

      if (!facebookAccount) {
        return json({ 
          success: false, 
          message: "Facebook account not found." 
        });
      }

      // Create campaign in database first
      const campaign = await db.campaign.create({
        data: {
          shop,
          facebookAccountId: facebookAccount.id,
          name: campaignName,
          objective,
          budget,
          budgetType,
          adAccountId: selectedAdAccount,
          currency: currency,
          productIds,
          adCopy,
          status: "PAUSED", // Start paused for review
        }
      });

      // Create campaign on Facebook
      try {
        const facebookCampaignId = await facebookService.createCampaign({
          name: campaignName,
          objective,
          status: "PAUSED",
          budget,
          budgetType,
        });

        // Update campaign with Facebook ID
        await db.campaign.update({
          where: { id: campaign.id },
          data: { facebookCampaignId }
        });

        return redirect(`/app/campaigns/${campaign.id}?success=created`);
      } catch (fbError: any) {
        console.error("Facebook campaign creation error:", fbError);
        
        // Keep the local campaign but mark it as failed
        await db.campaign.update({
          where: { id: campaign.id },
          data: { status: "FAILED" }
        });

        return json({ 
          success: false, 
          message: `Campaign created locally but Facebook creation failed: ${fbError.message}` 
        });
      }
    } catch (error: any) {
      console.error("Campaign creation error:", error);
      return json({ 
        success: false, 
        message: "Failed to create campaign. Please try again." 
      });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function NewCampaign() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("CONVERSIONS");
  const [budget, setBudget] = useState("50");
  const [budgetType, setBudgetType] = useState("DAILY");
  const [selectedAdAccount, setSelectedAdAccount] = useState(
    data.adAccounts.find(acc => acc.isDefault)?.adAccountId || 
    data.adAccounts[0]?.adAccountId || 
    ""
  );
  const [currency, setCurrency] = useState(
    data.adAccounts.find(acc => acc.isDefault)?.currency || 
    data.adAccounts[0]?.currency || 
    "USD"
  );
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState(data.pages[0]?.pageId || "");
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState(
    data.instagramAccounts[0]?.instagramId || ""
  );
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedAdCopy, setGeneratedAdCopy] = useState<any>(null);
  const [showAdCopyModal, setShowAdCopyModal] = useState(false);
  
  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.adCopy) {
      setGeneratedAdCopy(fetcher.data.adCopy);
      setShowAdCopyModal(true);
    }
  }, [fetcher.data]);

  const objectiveOptions = [
    { label: "Conversions", value: "CONVERSIONS" },
    { label: "Traffic", value: "LINK_CLICKS" },
    { label: "Brand Awareness", value: "BRAND_AWARENESS" },
    { label: "Reach", value: "REACH" },
    { label: "Engagement", value: "ENGAGEMENT" },
  ];

  const budgetTypeOptions = [
    { label: "Daily Budget", value: "DAILY" },
    { label: "Lifetime Budget", value: "LIFETIME" },
  ];

  const toneOptions = [
    { label: "Professional", value: "professional" },
    { label: "Casual", value: "casual" },
    { label: "Urgent", value: "urgent" },
    { label: "Friendly", value: "friendly" },
  ];

  const handleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const generateAdCopy = () => {
    if (selectedProducts.length === 0) {
      return;
    }

    const selectedProduct = data.products.find(p => p.id === selectedProducts[0]);
    if (!selectedProduct) return;

    fetcher.submit({
      action: "generate_ad_copy",
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      productDescription: selectedProduct.description || "",
      productPrice: selectedProduct.priceRangeV2.minVariantPrice.amount,
      productTags: selectedProduct.tags.join(','),
      objective,
      targetAudience,
      tone,
    }, { method: "POST" });
  };

  const createCampaign = () => {
    fetcher.submit({
      action: "create_campaign",
      campaignName,
      objective,
      budget,
      budgetType,
      selectedAdAccount,
      currency,
      productIds: JSON.stringify(selectedProducts),
      adCopy: JSON.stringify(generatedAdCopy),
    }, { method: "POST" });
  };

  return (
    <Page>
      <TitleBar title="Create New Campaign">
        <Button onClick={() => navigate("/app")}>Cancel</Button>
      </TitleBar>

      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Campaign Details */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Campaign Details</Text>
                
                <TextField
                  label="Campaign Name"
                  value={campaignName}
                  onChange={setCampaignName}
                  placeholder="Enter campaign name"
                  autoComplete="off"
                />

                <Select
                  label="Campaign Objective"
                  options={objectiveOptions}
                  value={objective}
                  onChange={setObjective}
                />

                {data.adAccounts.length > 0 && (
                  <Select
                    label="Ad Account"
                    options={data.adAccounts.map(account => ({
                      label: `${account.name} (${account.currency})`,
                      value: account.adAccountId,
                    }))}
                    value={selectedAdAccount}
                    onChange={(value) => {
                      setSelectedAdAccount(value);
                      const selectedAccount = data.adAccounts.find(acc => acc.adAccountId === value);
                      if (selectedAccount) {
                        setCurrency(selectedAccount.currency);
                      }
                    }}
                    helpText={`Currency will be automatically set to ${currency}`}
                  />
                )}

                {data.pages.length > 0 && (
                  <Select
                    label="Facebook Page"
                    options={[
                      { label: 'Select Facebook page', value: '' },
                      ...data.pages.map(page => ({
                        label: page.name,
                        value: page.pageId,
                      }))
                    ]}
                    value={selectedPage}
                    onChange={setSelectedPage}
                    helpText="Select the Facebook page to publish ads from"
                  />
                )}

                {data.instagramAccounts.length > 0 && (
                  <Select
                    label="Instagram Account"
                    options={[
                      { label: 'Select Instagram account (optional)', value: '' },
                      ...data.instagramAccounts.map(ig => ({
                        label: `@${ig.username} (${ig.pageName})`,
                        value: ig.instagramId,
                      }))
                    ]}
                    value={selectedInstagramAccount}
                    onChange={setSelectedInstagramAccount}
                    helpText="Optional: Select Instagram account for cross-platform advertising"
                  />
                )}

                <InlineStack gap="400">
                  <TextField
                    label={`Budget Amount (${currency})`}
                    type="number"
                    value={budget}
                    onChange={setBudget}
                    prefix={currency === 'USD' ? '$' : currency}
                  />
                  <Select
                    label="Budget Type"
                    options={budgetTypeOptions}
                    value={budgetType}
                    onChange={setBudgetType}
                  />
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Product Selection */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Select Products</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose products to promote in this campaign
                </Text>

                <ResourceList
                  resourceName={{ singular: 'product', plural: 'products' }}
                  items={data.products}
                  renderItem={(product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    const media = product.images.nodes[0] ? (
                      <Thumbnail
                        source={product.images.nodes[0].url}
                        alt={product.images.nodes[0].altText || product.title}
                        size="small"
                      />
                    ) : undefined;

                    return (
                      <ResourceItem
                        id={product.id}
                        media={media}
                        accessibilityLabel={`Select ${product.title}`}
                        onClick={() => handleProductSelection(product.id)}
                      >
                        <InlineStack align="space-between">
                          <BlockStack gap="100">
                            <InlineStack gap="200">
                              <Text as="h3" variant="bodyMd" fontWeight="bold">
                                {product.title}
                              </Text>
                              {isSelected && <Badge tone="success">Selected</Badge>}
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              ${product.priceRangeV2.minVariantPrice.amount} {product.priceRangeV2.minVariantPrice.currencyCode}
                            </Text>
                          </BlockStack>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleProductSelection(product.id)}
                          />
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                />
              </BlockStack>
            </Card>

            {/* AI Ad Copy Generation */}
            {selectedProducts.length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">AI Ad Copy Generation</Text>
                  
                  <TextField
                    label="Target Audience"
                    value={targetAudience}
                    onChange={setTargetAudience}
                    placeholder="e.g., Women aged 25-45 interested in fitness"
                    multiline={2}
                  />

                  <Select
                    label="Tone of Voice"
                    options={toneOptions}
                    value={tone}
                    onChange={setTone}
                  />

                  <Button
                    onClick={generateAdCopy}
                    loading={isLoading}
                    disabled={selectedProducts.length === 0}
                  >
                    Generate AI Ad Copy
                  </Button>

                  {generatedAdCopy && (
                    <Banner tone="success">
                      <p>AI ad copy generated successfully! Review and create your campaign.</p>
                    </Banner>
                  )}
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Campaign Summary */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Campaign Summary</Text>
                
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Name:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {campaignName || "Not set"}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Objective:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {objectiveOptions.find(o => o.value === objective)?.label}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Budget:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      ${budget} {budgetType.toLowerCase()}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Products:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {selectedProducts.length} selected
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Ad Copy:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {generatedAdCopy ? "Generated" : "Not generated"}
                    </Text>
                  </InlineStack>
                </BlockStack>

                <Divider />

                <Button
                  variant="primary"
                  fullWidth
                  onClick={createCampaign}
                  loading={isLoading}
                  disabled={!campaignName || selectedProducts.length === 0 || !generatedAdCopy}
                >
                  Create Campaign
                </Button>
              </BlockStack>
            </Card>

            {/* Facebook Account Info */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Facebook Account</Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Status:</Text>
                    <Badge tone="success">Connected</Badge>
                  </InlineStack>
                  {data.facebookAccount.businessId && (
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Business ID:</Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {data.facebookAccount.businessId}
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Ad Copy Preview Modal */}
      <Modal
        open={showAdCopyModal}
        onClose={() => setShowAdCopyModal(false)}
        title="Generated Ad Copy"
        primaryAction={{
          content: "Use This Copy",
          onAction: () => setShowAdCopyModal(false),
        }}
        secondaryActions={[
          {
            content: "Regenerate",
            onAction: generateAdCopy,
          },
        ]}
      >
        <Modal.Section>
          {generatedAdCopy && (
            <BlockStack gap="400">
              <div>
                <Text as="h3" variant="headingSm">Headlines</Text>
                <BlockStack gap="200">
                  {generatedAdCopy.headlines?.map((headline: string, index: number) => (
                    <Text key={index} as="p" variant="bodySm">• {headline}</Text>
                  ))}
                </BlockStack>
              </div>

              <div>
                <Text as="h3" variant="headingSm">Primary Text</Text>
                <BlockStack gap="200">
                  {generatedAdCopy.primaryText?.map((text: string, index: number) => (
                    <Text key={index} as="p" variant="bodySm">• {text}</Text>
                  ))}
                </BlockStack>
              </div>

              <div>
                <Text as="h3" variant="headingSm">Descriptions</Text>
                <BlockStack gap="200">
                  {generatedAdCopy.descriptions?.map((desc: string, index: number) => (
                    <Text key={index} as="p" variant="bodySm">• {desc}</Text>
                  ))}
                </BlockStack>
              </div>

              <div>
                <Text as="h3" variant="headingSm">Call to Actions</Text>
                <BlockStack gap="200">
                  {generatedAdCopy.callToActions?.map((cta: string, index: number) => (
                    <Text key={index} as="p" variant="bodySm">• {cta}</Text>
                  ))}
                </BlockStack>
              </div>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}