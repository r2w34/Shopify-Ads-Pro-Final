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
  ProgressBar,
  Toast,
  Frame,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { FacebookAdsService, CAMPAIGN_OBJECTIVES, OPTIMIZATION_GOALS, BILLING_EVENTS, SPECIAL_AD_CATEGORIES } from "../services/facebook-ads.server";

// Helper function to map objectives to optimization goals
const getOptimizationGoal = (objective: string) => {
  switch (objective) {
    case "OUTCOME_TRAFFIC":
      return "LINK_CLICKS";
    case "OUTCOME_SALES":
      return "OFFSITE_CONVERSIONS";
    case "OUTCOME_LEADS":
      return "LEAD_GENERATION";
    case "OUTCOME_ENGAGEMENT":
      return "POST_ENGAGEMENT";
    case "OUTCOME_AWARENESS":
      return "REACH";
    case "OUTCOME_APP_PROMOTION":
      return "APP_INSTALLS";
    default:
      return "OFFSITE_CONVERSIONS";
  }
};

// Helper function to map objectives to billing events
const getBillingEvent = (objective: string) => {
  switch (objective) {
    case "OUTCOME_TRAFFIC":
      return "LINK_CLICKS";
    case "OUTCOME_SALES":
      return "IMPRESSIONS";
    case "OUTCOME_LEADS":
      return "IMPRESSIONS";
    case "OUTCOME_ENGAGEMENT":
      return "IMPRESSIONS";
    case "OUTCOME_AWARENESS":
      return "IMPRESSIONS";
    case "OUTCOME_APP_PROMOTION":
      return "IMPRESSIONS";
    default:
      return "IMPRESSIONS";
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // Debug logging
  console.log("🔍 Campaign Create - Shop from session:", shop);

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

  console.log("🔍 Campaign Create - Facebook account found:", !!facebookAccount);
  if (facebookAccount) {
    console.log("🔍 Campaign Create - Ad accounts count:", facebookAccount.adAccounts.length);
    console.log("🔍 Campaign Create - Pages count:", facebookAccount.pages.length);
  }

  if (!facebookAccount) {
    console.log("❌ Campaign Create - No Facebook account found, redirecting to app with error");
    return redirect("/app?error=facebook_not_connected");
  }

  // Get products from Shopify
  const productsQuery = `
    query getProducts($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
          handle
          description
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
  `;

  const productsResponse = await admin.graphql(productsQuery, {
    variables: { first: 50 },
  });
  const productsData = await productsResponse.json();
  const products = productsData.data?.products?.nodes || [];

  // Flatten Instagram accounts
  const instagramAccounts = facebookAccount.pages.flatMap(page => 
    page.instagramAccounts.map(ig => ({
      ...ig,
      pageName: page.name,
    }))
  );

  return json({
    shop,
    facebookAccount: {
      id: facebookAccount.id,
      facebookUserId: facebookAccount.facebookUserId,
      businessId: facebookAccount.businessId,
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
      // Check if OpenAI API key is properly configured
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey || openaiApiKey.includes('demo') || openaiApiKey.includes('testing')) {
        // Return demo ad copy when OpenAI is not configured
        const product = {
          title: formData.get("productTitle") as string,
          description: formData.get("productDescription") as string,
          price: formData.get("productPrice") as string,
        };
        
        const demoAdCopy = {
          primaryText: `🚀 Discover ${product.title}! ${targetAudience ? `Perfect for ${targetAudience.toLowerCase()}.` : ''} ${product.description ? product.description.substring(0, 100) + '...' : 'Amazing quality and value.'} Shop now and transform your experience!`,
          headline: `${product.title} - ${objective === 'OUTCOME_SALES' ? 'Buy Now' : objective === 'OUTCOME_TRAFFIC' ? 'Learn More' : objective === 'OUTCOME_LEADS' ? 'Get Started' : 'Discover More'}`,
          description: `${product.price ? `Starting at ${product.price}` : 'Great value'} | Free shipping available | ${tone === 'urgent' ? 'Limited time offer!' : tone === 'friendly' ? 'We\'d love to help you!' : 'Premium quality guaranteed'}`,
          callToAction: objective === 'OUTCOME_SALES' ? 'Shop Now' : objective === 'OUTCOME_TRAFFIC' ? 'Learn More' : objective === 'OUTCOME_LEADS' ? 'Sign Up' : 'See More'
        };
        
        return json({ success: true, adCopy: demoAdCopy, isDemoMode: true });
      }

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
      
      // Fallback to demo ad copy on error
      const product = {
        title: formData.get("productTitle") as string,
        description: formData.get("productDescription") as string,
        price: formData.get("productPrice") as string,
      };
      
      const fallbackAdCopy = {
        primaryText: `✨ ${product.title} - ${targetAudience ? `Perfect for ${targetAudience.toLowerCase()}` : 'Amazing product'}! ${product.description ? product.description.substring(0, 80) + '...' : 'High quality and great value.'} Don't miss out!`,
        headline: `${product.title} - Special Offer`,
        description: `${product.price ? `From ${product.price}` : 'Great prices'} | Quality guaranteed | Order today!`,
        callToAction: 'Shop Now'
      };
      
      return json({ 
        success: true, 
        adCopy: fallbackAdCopy, 
        isDemoMode: true,
        message: "Using demo ad copy (OpenAI not configured)" 
      });
    }
  }

  if (action === "create_campaign") {
    const campaignName = formData.get("campaignName") as string;
    const objective = formData.get("objective") as string;
    const specialAdCategory = formData.get("specialAdCategory") as string;
    const budget = parseFloat(formData.get("budget") as string);
    const budgetType = formData.get("budgetType") as string;
    const selectedAdAccount = formData.get("selectedAdAccount") as string;
    const currency = formData.get("currency") as string;
    const productIds = formData.get("productIds") as string;
    const adCopy = formData.get("adCopy") as string;
    const mediaType = formData.get("mediaType") as string;
    const mediaCount = parseInt(formData.get("mediaCount") as string || "0");
    const placements = formData.get("placements") as string;
    const targetAudience = formData.get("targetAudience") as string;
    const tone = formData.get("tone") as string;

    try {
      // Get Facebook account with access token
      const facebookAccount = await db.facebookAccount.findFirst({
        where: { shop, isActive: true },
        include: {
          pages: {
            include: {
              instagramAccounts: true,
            },
          },
        },
      });

      if (!facebookAccount) {
        return json({ 
          success: false, 
          message: "Facebook account not connected." 
        });
      }

      // Initialize Facebook Ads service
      const facebookAdsService = new FacebookAdsService(facebookAccount.accessToken);

      // Parse ad copy data
      let parsedAdCopy;
      try {
        parsedAdCopy = JSON.parse(adCopy);
      } catch (e) {
        parsedAdCopy = {
          primaryText: "Check out our amazing products!",
          headline: "Shop Now",
          description: "Limited time offer - don't miss out!",
          callToAction: "SHOP_NOW"
        };
      }

      // Get the first page for creative
      const facebookPage = facebookAccount.pages[0];
      if (!facebookPage) {
        return json({ 
          success: false, 
          message: "No Facebook page found. Please connect a Facebook page." 
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

      console.log("🚀 Creating complete Facebook campaign...");

      // Create complete campaign structure on Facebook
      const campaignResult = await facebookAdsService.createCompleteCampaign(
        selectedAdAccount.replace('act_', ''), // Remove 'act_' prefix
        {
          // Campaign level
          campaignName: campaignName,
          objective: objective,
          specialAdCategory: specialAdCategory,
          
          // Ad Set level
          adSetName: `${campaignName} - Ad Set`,
          optimizationGoal: getOptimizationGoal(objective),
          billingEvent: getBillingEvent(objective),
          dailyBudget: budgetType === "DAILY" ? Math.round(budget * 100) : undefined, // Convert to cents
          lifetimeBudget: budgetType === "LIFETIME" ? Math.round(budget * 100) : undefined,
          targeting: {
            geo_locations: {
              countries: ["US"] // Default targeting - can be enhanced
            },
            age_min: 18,
            age_max: 65,
          },
          
          // Creative level
          creativeName: `${campaignName} - Creative`,
          adCopy: parsedAdCopy,
          linkUrl: `https://${shop}`, // Link to Shopify store
          pageId: facebookPage.facebookPageId,
          instagramActorId: facebookPage.instagramAccounts[0]?.instagramAccountId,
          
          // Ad level
          adName: `${campaignName} - Ad`,
        }
      );

      if (campaignResult.success) {
        // Update campaign with Facebook IDs
        await db.campaign.update({
          where: { id: campaign.id },
          data: { 
            facebookCampaignId: campaignResult.campaign?.id,
            status: "PAUSED" // Keep paused until user activates
          }
        });

        console.log("✅ Complete Facebook campaign created successfully!");

        return json({ 
          success: true, 
          campaignId: campaign.id,
          facebookCampaignId: campaignResult.campaign?.id,
          message: "Complete campaign created successfully! Campaign is paused and ready for review." 
        });
      } else {
        console.error("❌ Facebook campaign creation failed:", campaignResult.error);
        
        // Keep the local campaign but mark it as failed
        await db.campaign.update({
          where: { id: campaign.id },
          data: { status: "FAILED" }
        });

        return json({ 
          success: false, 
          message: `Campaign creation failed: ${campaignResult.error}` 
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

export default function CreateCampaign() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  
  // Multi-stage state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_SALES");
  const [specialAdCategory, setSpecialAdCategory] = useState("NONE");
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
  
  // Media and placement state
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState("single_image");
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([
    "facebook_feed", "instagram_feed"
  ]);
  
  // UI state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.adCopy) {
      setGeneratedAdCopy(fetcher.data.adCopy);
      setCurrentStep(4); // Move to review step
    }
    
    if (fetcher.data?.success && fetcher.data?.campaignId) {
      setToastMessage("Campaign created successfully!");
      setShowSuccessToast(true);
      setTimeout(() => {
        navigate(`/app/campaigns/${fetcher.data.campaignId}`);
      }, 2000);
    }
    
    if (fetcher.data?.success === false) {
      setToastMessage(fetcher.data.message || "An error occurred");
      setShowErrorToast(true);
    }
  }, [fetcher.data, navigate]);

  const objectiveOptions = [
    { label: "Sales (Conversions)", value: "OUTCOME_SALES" },
    { label: "Traffic (Website Visits)", value: "OUTCOME_TRAFFIC" },
    { label: "Leads (Lead Generation)", value: "OUTCOME_LEADS" },
    { label: "Engagement (Post Engagement)", value: "OUTCOME_ENGAGEMENT" },
    { label: "Brand Awareness", value: "OUTCOME_AWARENESS" },
    { label: "App Promotion", value: "OUTCOME_APP_PROMOTION" },
  ];

  const budgetTypeOptions = [
    { label: "Daily Budget", value: "DAILY" },
    { label: "Lifetime Budget", value: "LIFETIME" },
  ];

  const mediaTypeOptions = [
    { label: "Single Image", value: "single_image" },
    { label: "Carousel Images", value: "carousel" },
    { label: "Video", value: "video" },
    { label: "Collection", value: "collection" },
  ];

  const placementOptions = [
    { label: "Facebook Feed", value: "facebook_feed" },
    { label: "Instagram Feed", value: "instagram_feed" },
    { label: "Facebook Stories", value: "facebook_stories" },
    { label: "Instagram Stories", value: "instagram_stories" },
    { label: "Facebook Reels", value: "facebook_reels" },
    { label: "Instagram Reels", value: "instagram_reels" },
    { label: "Messenger", value: "messenger" },
    { label: "Audience Network", value: "audience_network" },
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
    if (selectedProducts.length === 0) return;
    
    const selectedProduct = data.products.find(p => p.id === selectedProducts[0]);
    if (!selectedProduct) return;

    fetcher.submit({
      action: "generate_ad_copy",
      productId: selectedProduct.id || "",
      productTitle: selectedProduct.title || "",
      productDescription: selectedProduct.description || "",
      productPrice: selectedProduct.priceRangeV2?.minVariantPrice?.amount || "0",
      productTags: (selectedProduct.tags || []).join(','),
      objective: objective || "OUTCOME_SALES",
      targetAudience: targetAudience || "",
      tone: tone || "professional",
    }, { method: "POST" });
  };

  const createCampaign = () => {
    fetcher.submit({
      action: "create_campaign",
      campaignName: campaignName || "",
      objective: objective || "OUTCOME_SALES",
      specialAdCategory: specialAdCategory || "NONE",
      budget: budget || "50",
      budgetType: budgetType || "DAILY",
      selectedAdAccount: selectedAdAccount || "",
      currency: currency || "USD",
      productIds: JSON.stringify(selectedProducts || []),
      adCopy: JSON.stringify(generatedAdCopy || {}),
      mediaType: mediaType || "single_image",
      mediaCount: (selectedMedia?.length || 0).toString(),
      placements: (selectedPlacements || []).join(','),
      targetAudience: targetAudience || "",
      tone: tone || "professional",
    }, { method: "POST" });
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return campaignName && objective && budget && selectedAdAccount;
      case 3:
        return selectedProducts.length > 0;
      case 4:
        return selectedMedia.length > 0 && selectedPlacements.length > 0;
      case 5:
        return targetAudience && tone;
      default:
        return true;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Campaign Setup";
      case 2: return "Product Selection";
      case 3: return "Media & Placements";
      case 4: return "Audience & Creative";
      case 5: return "Review & Launch";
      default: return "Campaign Creation";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
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
                helpText="Choose what you want to achieve with this campaign"
              />

              <Select
                label="Special Ad Category"
                options={[
                  { label: 'None (Standard ads)', value: 'NONE' },
                  { label: 'Credit/Financial Services', value: 'CREDIT' },
                  { label: 'Employment', value: 'EMPLOYMENT' },
                  { label: 'Housing/Real Estate', value: 'HOUSING' },
                  { label: 'Politics/Issues', value: 'ISSUES_ELECTIONS_POLITICS' },
                  { label: 'Online Gambling/Gaming', value: 'ONLINE_GAMBLING_AND_GAMING' },
                ]}
                value={specialAdCategory}
                onChange={setSpecialAdCategory}
                helpText="Select if your ads fall into a special regulated category"
              />

              <Select
                label="Ad Account"
                options={data.adAccounts.map(acc => ({
                  label: `${acc.name} (${acc.currency})`,
                  value: acc.adAccountId,
                }))}
                value={selectedAdAccount}
                onChange={(value) => {
                  setSelectedAdAccount(value);
                  const account = data.adAccounts.find(acc => acc.adAccountId === value);
                  if (account) setCurrency(account.currency);
                }}
                helpText="Select the Facebook ad account to use"
              />

              {data.pages.length > 0 && (
                <Select
                  label="Facebook Page"
                  options={[
                    { label: 'Select a Facebook page', value: '' },
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
        );

      case 2:
        return (
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
        );

      case 3:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Media & Placements</Text>
              
              <Select
                label="Media Type"
                options={mediaTypeOptions}
                value={mediaType}
                onChange={setMediaType}
                helpText="Choose the type of media for your ads"
              />

              <div>
                <Text as="p" variant="bodyMd" fontWeight="medium">Upload Media Files</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {mediaType === 'single_image' && 'Upload 1 image (JPG, PNG, max 30MB)'}
                  {mediaType === 'carousel' && 'Upload 2-10 images for carousel (JPG, PNG, max 30MB each)'}
                  {mediaType === 'video' && 'Upload 1 video (MP4, MOV, max 4GB)'}
                  {mediaType === 'collection' && 'Upload 1 cover image + 4-50 product images'}
                </Text>
                <input
                  type="file"
                  multiple={mediaType === 'carousel' || mediaType === 'collection'}
                  accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedMedia(files);
                  }}
                  style={{ marginTop: '8px' }}
                />
                {selectedMedia.length > 0 && (
                  <Text as="p" variant="bodySm" tone="success">
                    {selectedMedia.length} file(s) selected
                  </Text>
                )}
              </div>

              <div>
                <Text as="p" variant="bodyMd" fontWeight="medium">Ad Placements</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Choose where your ads will appear
                </Text>
                <BlockStack gap="200">
                  {placementOptions.map((placement) => (
                    <label key={placement.value} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPlacements.includes(placement.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlacements([...selectedPlacements, placement.value]);
                          } else {
                            setSelectedPlacements(selectedPlacements.filter(p => p !== placement.value));
                          }
                        }}
                      />
                      <Text as="span" variant="bodySm">{placement.label}</Text>
                    </label>
                  ))}
                </BlockStack>
              </div>
            </BlockStack>
          </Card>
        );

      case 4:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Audience & Creative Settings</Text>
              
              <TextField
                label="Target Audience"
                value={targetAudience}
                onChange={setTargetAudience}
                placeholder="e.g., Women aged 25-45 interested in fitness"
                multiline={3}
                helpText="Describe your target audience for AI ad copy generation"
              />

              <Select
                label="Ad Copy Tone"
                options={toneOptions}
                value={tone}
                onChange={setTone}
                helpText="Choose the tone for your ad copy"
              />

              {data.instagramAccounts.length > 0 && (
                <Select
                  label="Instagram Account (Optional)"
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
            </BlockStack>
          </Card>
        );

      case 5:
        return (
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Campaign Summary</Text>
                
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Campaign Name:</Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">{campaignName}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Objective:</Text>
                    <Text as="span" variant="bodySm">{objectiveOptions.find(o => o.value === objective)?.label}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Budget:</Text>
                    <Text as="span" variant="bodySm">{currency === 'USD' ? '$' : currency}{budget} {budgetType.toLowerCase()}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Products:</Text>
                    <Text as="span" variant="bodySm">{selectedProducts.length} selected</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Media Type:</Text>
                    <Text as="span" variant="bodySm">{mediaTypeOptions.find(m => m.value === mediaType)?.label}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Media Files:</Text>
                    <Text as="span" variant="bodySm">{selectedMedia.length} file(s)</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Placements:</Text>
                    <Text as="span" variant="bodySm">{selectedPlacements.length} selected</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {!generatedAdCopy && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Generate AI Ad Copy</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Generate AI-powered ad copy based on your selected products and audience.
                  </Text>
                  <Button
                    onClick={generateAdCopy}
                    loading={isLoading}
                    disabled={selectedProducts.length === 0}
                  >
                    Generate Ad Copy
                  </Button>
                </BlockStack>
              </Card>
            )}

            {generatedAdCopy && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Generated Ad Copy</Text>
                  <BlockStack gap="200">
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Primary Text:</Text>
                    <Text as="p" variant="bodyMd">{generatedAdCopy.primaryText}</Text>
                    
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Headline:</Text>
                    <Text as="p" variant="bodyMd">{generatedAdCopy.headline}</Text>
                    
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Description:</Text>
                    <Text as="p" variant="bodyMd">{generatedAdCopy.description}</Text>
                  </BlockStack>
                  
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={createCampaign}
                    loading={isLoading}
                  >
                    Create Campaign
                  </Button>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        );

      default:
        return null;
    }
  };

  const toastMarkup = showSuccessToast ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setShowSuccessToast(false)}
    />
  ) : null;

  const errorToastMarkup = showErrorToast ? (
    <Toast
      content={toastMessage}
      error
      onDismiss={() => setShowErrorToast(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page>
        <TitleBar title="Create New Campaign">
          <Button onClick={() => navigate("/app/campaigns")}>Cancel</Button>
        </TitleBar>

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Progress Bar */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">{getStepTitle(currentStep)}</Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      Step {currentStep} of {totalSteps}
                    </Text>
                  </InlineStack>
                  <ProgressBar progress={(currentStep / totalSteps) * 100} />
                </BlockStack>
              </Card>

              {/* Demo Mode Banner */}
              {(fetcher.data?.isDemoMode || process.env.NODE_ENV === 'development') && (
                <Banner
                  title="Demo Mode Active"
                  status="info"
                >
                  <Text as="p" variant="bodyMd">
                    AI ad copy generation is using demo content. Configure OpenAI API key for full functionality.
                  </Text>
                </Banner>
              )}

              {/* Step Content */}
              {renderStepContent()}

              {/* Navigation Buttons */}
              <Card>
                <InlineStack align="space-between">
                  <Button
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < totalSteps && (
                    <Button
                      variant="primary"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={!canProceedToStep(currentStep + 1)}
                    >
                      Next
                    </Button>
                  )}
                </InlineStack>
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
      </Page>
      
      {toastMarkup}
      {errorToastMarkup}
    </Frame>
  );
}