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
  RadioButton,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { FacebookAdsService, CAMPAIGN_OBJECTIVES, OPTIMIZATION_GOALS, BILLING_EVENTS, SPECIAL_AD_CATEGORIES } from "../services/facebook-ads.server";
import { AudienceSuggestionsService, type AudienceSuggestion } from "../services/audience-suggestions.server";
import { StoreMediaService, type StoreMedia } from "../services/store-media.server";
import { getFacebookAdsLibraryService, type AdLibraryAd } from "../services/facebook-ads-library.server";

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

// Intelligent fallback ad copy generation
const generateIntelligentFallbackAdCopy = (params: {
  title: string;
  description: string;
  price: string;
  tags: string[];
  objective: string;
  targetAudience: string;
  tone: string;
}) => {
  const { title, description, price, tags, objective, targetAudience, tone } = params;
  
  // Emotional triggers based on objective
  const emotionalTriggers = {
    "OUTCOME_SALES": ["🔥 Limited Time", "💰 Save Big", "⚡ Flash Sale", "🎯 Exclusive Deal"],
    "OUTCOME_TRAFFIC": ["👀 Discover", "🚀 Explore", "📖 Learn More", "🔍 Find Out"],
    "OUTCOME_LEADS": ["📧 Get Free", "🎁 Claim Your", "📋 Sign Up", "💡 Get Started"],
    "OUTCOME_ENGAGEMENT": ["💬 Join the Conversation", "❤️ Love This", "🔄 Share Now", "👥 Connect"],
    "OUTCOME_AWARENESS": ["🌟 Introducing", "📢 Announcing", "✨ New", "🎉 Meet"],
    "OUTCOME_APP_PROMOTION": ["📱 Download Now", "🚀 Get the App", "📲 Install Today", "⬇️ Download Free"]
  };

  // Tone-based language
  const toneLanguage = {
    professional: {
      adjectives: ["premium", "professional", "high-quality", "reliable", "trusted"],
      phrases: ["industry-leading", "expertly crafted", "proven results", "professional grade"]
    },
    casual: {
      adjectives: ["awesome", "cool", "amazing", "fantastic", "great"],
      phrases: ["you'll love", "super easy", "totally worth it", "pretty amazing"]
    },
    urgent: {
      adjectives: ["limited", "exclusive", "urgent", "immediate", "instant"],
      phrases: ["don't wait", "act now", "limited time", "hurry up", "while supplies last"]
    },
    friendly: {
      adjectives: ["friendly", "helpful", "caring", "supportive", "welcoming"],
      phrases: ["we're here for you", "made with love", "your new favorite", "perfect for you"]
    }
  };

  // Get random elements
  const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  
  const trigger = getRandomElement(emotionalTriggers[objective as keyof typeof emotionalTriggers] || emotionalTriggers["OUTCOME_SALES"]);
  const toneData = toneLanguage[tone as keyof typeof toneLanguage] || toneLanguage.professional;
  const adjective = getRandomElement(toneData.adjectives);
  const phrase = getRandomElement(toneData.phrases);

  // Generate primary text (keep under 125 characters for Facebook)
  let primaryText = `${trigger} ${title}! `;
  
  if (description && description.length > 10) {
    const remainingChars = 125 - primaryText.length - 30; // Reserve 30 chars for price and CTA
    const shortDesc = description.length > remainingChars ? description.substring(0, remainingChars - 3) + "..." : description;
    primaryText += `${shortDesc} `;
  } else {
    primaryText += `This ${adjective} product is ${phrase}. `;
  }

  if (price && parseFloat(price) > 0) {
    primaryText += `From $${price}. `;
  }

  // Add urgency based on objective (keep total under 125 chars)
  const currentLength = primaryText.length;
  if (currentLength < 100) {
    if (objective === "OUTCOME_SALES") {
      primaryText += "Shop now! 🛒";
    } else if (objective === "OUTCOME_TRAFFIC") {
      primaryText += "Learn more! 👆";
    } else if (objective === "OUTCOME_LEADS") {
      primaryText += "Get free access! 🎁";
    } else {
      primaryText += "Don't miss out! ✨";
    }
  }

  // Generate headline (keep under 40 characters for Facebook)
  let headline = title;
  if (objective === "OUTCOME_SALES" && price && title.length < 25) {
    headline = `${title} - $${price}`;
  } else if (objective === "OUTCOME_TRAFFIC" && title.length < 30) {
    headline = `Discover ${title}`;
  } else if (objective === "OUTCOME_LEADS" && title.length < 30) {
    headline = `Free ${title} Guide`;
  } else if (title.length < 30) {
    headline = `${adjective.charAt(0).toUpperCase() + adjective.slice(1)} ${title}`;
  }
  
  // Truncate if still too long
  if (headline.length > 40) {
    headline = title.length > 40 ? title.substring(0, 37) + "..." : title;
  }

  // Generate description
  let descriptionText = "";
  if (tags && tags.length > 0) {
    const relevantTags = tags.slice(0, 3).join(" • ");
    descriptionText = `${relevantTags} | `;
  }
  
  if (price && parseFloat(price) > 0) {
    descriptionText += `From $${price} | `;
  }
  
  descriptionText += "Quality guaranteed | Fast shipping";

  // Generate CTA based on objective
  const ctas = {
    "OUTCOME_SALES": "Shop Now",
    "OUTCOME_TRAFFIC": "Learn More", 
    "OUTCOME_LEADS": "Get Free Guide",
    "OUTCOME_ENGAGEMENT": "Join Now",
    "OUTCOME_AWARENESS": "Discover More",
    "OUTCOME_APP_PROMOTION": "Download App"
  };

  return {
    primaryText: primaryText.trim(),
    headline: headline.trim(),
    description: descriptionText,
    callToAction: ctas[objective as keyof typeof ctas] || "Shop Now"
  };
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

  // Get store media and audience suggestions
  const storeMedia = await StoreMediaService.getStoreMedia(request);
  const storeProducts = await StoreMediaService.getStoreProducts(request);
  const storeInfo = await StoreMediaService.getStoreInfo(request);
  
  // Generate audience suggestions
  const audienceService = new AudienceSuggestionsService();
  const audienceSuggestions = await audienceService.getAudienceSuggestions(storeProducts, storeInfo);

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
    storeMedia,
    audienceSuggestions,
    storeInfo,
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
      // Get product details
      const productData = {
        id: formData.get("productId") as string,
        title: formData.get("productTitle") as string,
        description: formData.get("productDescription") as string,
        price: formData.get("productPrice") as string,
        tags: (formData.get("productTags") as string)?.split(',') || [],
      };

      let adCopy = null;
      let aiService = "none";

      // Try Gemini AI first
      try {
        console.log("🤖 Trying Gemini AI for ad copy generation...");
        const { geminiService } = await import("../services/gemini.server");

        const audienceData = {
          age_min: 25,
          age_max: 55,
          interests: [targetAudience || "general"],
          countries: ["US"]
        };

        const response = await geminiService.generateAdCopy(
          productData,
          audienceData,
          objective || "OUTCOME_SALES"
        );

        if (response.success) {
          const parsedResponse = geminiService.parseJSONResponse(response);
          if (parsedResponse.success && parsedResponse.data) {
            const adCopyData = parsedResponse.data;
            adCopy = {
              primaryText: adCopyData.primaryTexts?.[0] || `✨ ${productData.title} - Amazing product! Don't miss out!`,
              headline: adCopyData.headlines?.[0] || `${productData.title} - Special Offer`,
              description: adCopyData.descriptions?.[0] || `Quality guaranteed | Order today!`,
              callToAction: adCopyData.callToActions?.[0] || 'Shop Now'
            };
            aiService = "gemini";
            console.log("✅ Gemini AI generated ad copy successfully");
          }
        } else {
          throw new Error(response.error || "Gemini API failed");
        }
      } catch (geminiError) {
        console.log("⚠️ Gemini AI failed:", geminiError.message);
        
        // Try OpenAI as fallback
        try {
          console.log("🤖 Trying OpenAI as fallback...");
          const { OpenAIService } = await import("../services/openai.server");
          const openaiService = new OpenAIService();

          const adCopyRequest = {
            product: productData,
            objective: objective || "OUTCOME_SALES",
            targetAudience: targetAudience || "general audience",
            tone: (tone as any) || "professional"
          };

          const openaiResponse = await openaiService.generateAdCopy(adCopyRequest, shop);
          
          adCopy = {
            primaryText: openaiResponse.primaryText?.[0] || `✨ ${productData.title} - Amazing product! Don't miss out!`,
            headline: openaiResponse.headlines?.[0] || `${productData.title} - Special Offer`,
            description: openaiResponse.descriptions?.[0] || `Quality guaranteed | Order today!`,
            callToAction: openaiResponse.callToActions?.[0] || 'Shop Now'
          };
          aiService = "openai";
          console.log("✅ OpenAI generated ad copy successfully");
        } catch (openaiError) {
          console.log("⚠️ OpenAI also failed:", openaiError.message);
          throw new Error("Both AI services failed");
        }
      }

      if (adCopy) {
        return json({ 
          success: true, 
          adCopy, 
          aiService,
          message: `Ad copy generated using ${aiService.toUpperCase()} AI`
        });
      }

      throw new Error("Failed to generate ad copy with any AI service");

    } catch (error: any) {
      console.error("Ad copy generation error:", error);
      console.log("🔄 Using intelligent fallback ad copy generation...");
      
      // Get product data for fallback
      const productTitle = formData.get("productTitle") as string;
      const productDescription = formData.get("productDescription") as string;
      const productPrice = formData.get("productPrice") as string;
      const productTags = (formData.get("productTags") as string)?.split(',') || [];
      
      // Intelligent fallback ad copy generation
      const fallbackAdCopy = generateIntelligentFallbackAdCopy({
        title: productTitle,
        description: productDescription,
        price: productPrice,
        tags: productTags,
        objective: objective || "OUTCOME_SALES",
        targetAudience: targetAudience || "general audience",
        tone: tone || "professional"
      });

      return json({ 
        success: true, 
        adCopy: fallbackAdCopy, 
        aiService: "fallback",
        message: "Generated using intelligent template system (AI services unavailable)"
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
    const campaignStatus = formData.get("campaignStatus") as string || "PAUSED";

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
          status: campaignStatus, // Use selected status
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
          status: campaignStatus,
          
          // Ad Set level
          adSetName: `${campaignName} - Ad Set`,
          optimizationGoal: getOptimizationGoal(objective),
          billingEvent: getBillingEvent(objective),
          dailyBudget: budgetType === "DAILY" ? Math.round(budget * 100) : undefined, // Convert to cents
          lifetimeBudget: budgetType === "LIFETIME" ? Math.round(budget * 100) : undefined,
          targeting: selectedAudience ? selectedAudience.targeting : {
            geo_locations: {
              countries: ["US"]
            },
            age_min: 18,
            age_max: 65,
            genders: [0], // All genders
            publisher_platforms: ["facebook", "instagram"],
            facebook_positions: ["feed", "right_hand_column", "instant_article"],
            instagram_positions: ["stream", "story"],
            device_platforms: ["mobile", "desktop"]
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
  const totalSteps = 7;
  
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
  const [aiServiceUsed, setAiServiceUsed] = useState<string>("");
  
  // Audience selection state
  const [selectedAudience, setSelectedAudience] = useState<AudienceSuggestion | null>(null);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  
  // Media and placement state
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [selectedStoreMedia, setSelectedStoreMedia] = useState<StoreMedia[]>([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaType, setMediaType] = useState("single_image");
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([
    "facebook_feed", "instagram_feed"
  ]);
  
  // UI state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  // Ads Library state
  const [showAdsLibraryModal, setShowAdsLibraryModal] = useState(false);
  const [adsLibraryResults, setAdsLibraryResults] = useState<AdLibraryAd[]>([]);
  const [adsLibraryLoading, setAdsLibraryLoading] = useState(false);
  
  // Campaign launch state
  const [campaignStatus, setCampaignStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED');
  
  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.adCopy) {
      setGeneratedAdCopy(fetcher.data.adCopy);
      setAiServiceUsed(fetcher.data.aiService || "unknown");
      setCurrentStep(4); // Move to review step
      
      // Show success message with AI service info
      if (fetcher.data.message) {
        setToastMessage(fetcher.data.message);
        setShowSuccessToast(true);
      }
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

  const searchAdsLibrary = async (keywords: string) => {
    setAdsLibraryLoading(true);
    try {
      const response = await fetch('/app/ads-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'search_keywords',
          keywords: keywords,
          country: 'US',
          mediaType: 'ALL',
          limit: '10'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setAdsLibraryResults(result.ads || []);
      } else {
        console.error('Ads library search failed:', result.error);
      }
    } catch (error) {
      console.error('Ads library search error:', error);
    } finally {
      setAdsLibraryLoading(false);
    }
  };

  const copyAdText = (text: string, field: 'primaryText' | 'headline' | 'description') => {
    if (!generatedAdCopy) {
      setGeneratedAdCopy({
        primaryText: '',
        headline: '',
        description: ''
      });
    }
    
    setGeneratedAdCopy((prev: any) => ({
      ...prev,
      [field]: text
    }));
    
    setShowAdsLibraryModal(false);
    setToastMessage(`${field} copied from ads library!`);
    setShowSuccessToast(true);
  };

  const createCampaign = () => {
    fetcher.submit({
      action: "create_campaign",
      campaignName: campaignName || "",
      objective: objective || "OUTCOME_SALES",
      campaignStatus: campaignStatus,
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
        return selectedAudience !== null;
      case 5:
        return (selectedMedia.length > 0 || selectedStoreMedia.length > 0) && selectedPlacements.length > 0;
      case 6:
        return targetAudience && tone;
      case 7:
        return generatedAdCopy !== null; // Preview must be generated
      default:
        return true;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Campaign Setup";
      case 2: return "Product Selection";
      case 3: return "Target Audience";
      case 4: return "Media & Placements";
      case 5: return "Creative Settings";
      case 6: return "Ad Preview";
      case 7: return "Review & Launch";
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
              <Text as="h2" variant="headingMd">Target Audience</Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Choose your target audience or let AI suggest the best audiences for your products
              </Text>

              {selectedAudience && (
                <Card background="bg-surface-success">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="bodyMd" fontWeight="bold">
                        Selected: {selectedAudience.name}
                      </Text>
                      <Badge tone={selectedAudience.aiGenerated ? "info" : "success"}>
                        {selectedAudience.aiGenerated ? "AI Suggested" : "Template"}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm">
                      {selectedAudience.description}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Estimated reach: {selectedAudience.estimatedReach}
                    </Text>
                  </BlockStack>
                </Card>
              )}

              <Button onClick={() => setShowAudienceModal(true)} variant="primary">
                {selectedAudience ? "Change Audience" : "Select Target Audience"}
              </Button>

              {!selectedAudience && (
                <Banner tone="info">
                  <p>Please select a target audience to continue. We have AI-generated suggestions based on your store products.</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        );

      case 4:
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

              <BlockStack gap="300">
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Choose Media Source</Text>
                  <ButtonGroup>
                    <Button onClick={() => setShowMediaGallery(true)}>
                      Select from Store Gallery ({data.storeMedia.length} items)
                    </Button>
                    <Button variant="plain">Upload New Files</Button>
                  </ButtonGroup>
                </div>

                {selectedStoreMedia.length > 0 && (
                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="medium">Selected Store Media</Text>
                      <InlineStack gap="200">
                        {selectedStoreMedia.slice(0, 3).map((media) => (
                          <Thumbnail
                            key={media.id}
                            source={media.url}
                            alt={media.alt || 'Store media'}
                            size="small"
                          />
                        ))}
                        {selectedStoreMedia.length > 3 && (
                          <Text as="span" variant="bodySm">
                            +{selectedStoreMedia.length - 3} more
                          </Text>
                        )}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                )}

                <div>
                  <Text as="p" variant="bodyMd" fontWeight="medium">Or Upload New Files</Text>
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
              </BlockStack>

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

      case 5:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Creative Settings</Text>
              
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

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="bodyMd" fontWeight="bold">Ad Inspiration</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Search Facebook Ads Library for inspiration from similar products or competitors
                  </Text>
                  
                  <ButtonGroup>
                    <Button 
                      onClick={() => {
                        const productKeywords = selectedProducts.length > 0 
                          ? data.products.find(p => p.id === selectedProducts[0])?.title || ''
                          : '';
                        if (productKeywords) {
                          searchAdsLibrary(productKeywords);
                          setShowAdsLibraryModal(true);
                        }
                      }}
                      disabled={selectedProducts.length === 0}
                    >
                      Find Similar Product Ads
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        const industryKeywords = targetAudience || 'ecommerce products';
                        searchAdsLibrary(industryKeywords);
                        setShowAdsLibraryModal(true);
                      }}
                    >
                      Browse Industry Ads
                    </Button>
                  </ButtonGroup>
                </BlockStack>
              </Card>
            </BlockStack>
          </Card>
        );

      case 6:
        return (
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Ad Preview</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Preview how your ads will appear on Facebook and Instagram
                </Text>

                {generatedAdCopy ? (
                  <BlockStack gap="400">
                    {/* Facebook Feed Preview */}
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h3" variant="bodyMd" fontWeight="bold">Facebook Feed</Text>
                        <div style={{ 
                          border: '1px solid #e1e3e5', 
                          borderRadius: '8px', 
                          padding: '16px',
                          backgroundColor: '#f8f9fa',
                          maxWidth: '500px'
                        }}>
                          <BlockStack gap="200">
                            <InlineStack gap="200">
                              <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                backgroundColor: '#1877f2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}>
                                {data.pages[0]?.name?.charAt(0) || 'S'}
                              </div>
                              <BlockStack gap="50">
                                <Text as="span" variant="bodySm" fontWeight="bold">
                                  {data.pages[0]?.name || 'Your Store'}
                                </Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  Sponsored
                                </Text>
                              </BlockStack>
                            </InlineStack>
                            
                            <Text as="p" variant="bodyMd">
                              {generatedAdCopy.primaryText}
                            </Text>
                            
                            {(selectedStoreMedia.length > 0 || selectedMedia.length > 0) && (
                              <div style={{
                                width: '100%',
                                height: '200px',
                                backgroundColor: '#e1e3e5',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b7280'
                              }}>
                                {selectedStoreMedia.length > 0 ? (
                                  <img 
                                    src={selectedStoreMedia[0].url} 
                                    alt="Ad media"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      borderRadius: '4px'
                                    }}
                                  />
                                ) : (
                                  <Text as="span" variant="bodySm">Your selected media</Text>
                                )}
                              </div>
                            )}
                            
                            <div style={{
                              border: '1px solid #e1e3e5',
                              borderRadius: '4px',
                              padding: '12px',
                              backgroundColor: 'white'
                            }}>
                              <BlockStack gap="100">
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {new URL(`https://${data.shop}`).hostname.toUpperCase()}
                                </Text>
                                <Text as="span" variant="bodyMd" fontWeight="bold">
                                  {generatedAdCopy.headline}
                                </Text>
                                <Text as="span" variant="bodySm">
                                  {generatedAdCopy.description}
                                </Text>
                              </BlockStack>
                            </div>
                            
                            <InlineStack gap="200">
                              <Button size="small" variant="primary">
                                Shop Now
                              </Button>
                              <Button size="small" variant="plain">
                                Like
                              </Button>
                              <Button size="small" variant="plain">
                                Comment
                              </Button>
                              <Button size="small" variant="plain">
                                Share
                              </Button>
                            </InlineStack>
                          </BlockStack>
                        </div>
                      </BlockStack>
                    </Card>

                    {/* Instagram Feed Preview */}
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h3" variant="bodyMd" fontWeight="bold">Instagram Feed</Text>
                        <div style={{ 
                          border: '1px solid #e1e3e5', 
                          borderRadius: '8px', 
                          padding: '16px',
                          backgroundColor: '#f8f9fa',
                          maxWidth: '400px'
                        }}>
                          <BlockStack gap="200">
                            <InlineStack gap="200" align="space-between">
                              <InlineStack gap="200">
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#e1306c',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {data.pages[0]?.name?.charAt(0) || 'S'}
                                </div>
                                <BlockStack gap="50">
                                  <Text as="span" variant="bodySm" fontWeight="bold">
                                    {data.pages[0]?.name || 'Your Store'}
                                  </Text>
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    Sponsored
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                              <Text as="span" variant="bodySm">•••</Text>
                            </InlineStack>
                            
                            {(selectedStoreMedia.length > 0 || selectedMedia.length > 0) && (
                              <div style={{
                                width: '100%',
                                height: '300px',
                                backgroundColor: '#e1e3e5',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b7280'
                              }}>
                                {selectedStoreMedia.length > 0 ? (
                                  <img 
                                    src={selectedStoreMedia[0].url} 
                                    alt="Ad media"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      borderRadius: '4px'
                                    }}
                                  />
                                ) : (
                                  <Text as="span" variant="bodySm">Your selected media</Text>
                                )}
                              </div>
                            )}
                            
                            <BlockStack gap="100">
                              <Text as="p" variant="bodyMd">
                                <Text as="span" fontWeight="bold">{data.pages[0]?.name || 'Your Store'}</Text>{' '}
                                {generatedAdCopy.primaryText}
                              </Text>
                              <Text as="span" variant="bodySm" tone="subdued">
                                View all comments
                              </Text>
                            </BlockStack>
                            
                            <InlineStack gap="200">
                              <Button size="small" variant="plain">♥</Button>
                              <Button size="small" variant="plain">💬</Button>
                              <Button size="small" variant="plain">📤</Button>
                            </InlineStack>
                          </BlockStack>
                        </div>
                      </BlockStack>
                    </Card>

                    <Banner tone="info">
                      <p>This is a preview of how your ads will appear. The actual appearance may vary slightly based on Facebook's rendering.</p>
                    </Banner>
                  </BlockStack>
                ) : (
                  <Banner tone="warning">
                    <p>Please generate ad copy in the previous step to see the preview.</p>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        );

      case 7:
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
                  <InlineStack gap="200" align="space-between">
                    <Text as="h2" variant="headingMd">Generated Ad Copy</Text>
                    {aiServiceUsed && (
                      <Badge tone={aiServiceUsed === 'gemini' ? 'success' : aiServiceUsed === 'openai' ? 'info' : 'attention'}>
                        {aiServiceUsed === 'gemini' ? '🤖 Gemini AI' : 
                         aiServiceUsed === 'openai' ? '🧠 OpenAI' : 
                         aiServiceUsed === 'fallback' ? '⚡ Smart Template' : 
                         '🔧 Generated'}
                      </Badge>
                    )}
                  </InlineStack>
                  <BlockStack gap="200">
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Primary Text:</Text>
                    <Text as="p" variant="bodyMd">{generatedAdCopy.primaryText}</Text>
                    
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Headline:</Text>
                    <Text as="p" variant="bodyMd">{generatedAdCopy.headline}</Text>
                    
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Description:</Text>
                    <Text as="p" variant="bodyMd">{generatedAdCopy.description}</Text>
                  </BlockStack>
                  
                  <Divider />
                  
                  <BlockStack gap="300">
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Campaign Launch Settings</Text>
                    <RadioButton
                      label="Start campaign immediately (ACTIVE)"
                      helpText="Campaign will start running and spending budget immediately"
                      checked={campaignStatus === 'ACTIVE'}
                      id="active"
                      name="campaignStatus"
                      onChange={() => setCampaignStatus('ACTIVE')}
                    />
                    <RadioButton
                      label="Create campaign as paused (PAUSED)"
                      helpText="Campaign will be created but won't start running until you manually activate it"
                      checked={campaignStatus === 'PAUSED'}
                      id="paused"
                      name="campaignStatus"
                      onChange={() => setCampaignStatus('PAUSED')}
                    />
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

      {/* Audience Selection Modal */}
      <Modal
        open={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        title="Select Target Audience"
        primaryAction={{
          content: 'Select Audience',
          onAction: () => setShowAudienceModal(false),
          disabled: !selectedAudience
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowAudienceModal(false)
        }]}
        large
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Choose from AI-suggested audiences based on your store products, or select from our templates.
            </Text>
            
            <ResourceList
              resourceName={{ singular: 'audience', plural: 'audiences' }}
              items={data.audienceSuggestions}
              renderItem={(audience) => (
                <ResourceItem
                  id={audience.id}
                  onClick={() => setSelectedAudience(audience)}
                  accessibilityLabel={`Select ${audience.name} audience`}
                >
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="bodyMd" fontWeight="bold">
                        {audience.name}
                      </Text>
                      <InlineStack gap="200">
                        <Badge tone={audience.aiGenerated ? "info" : "success"}>
                          {audience.aiGenerated ? "AI Suggested" : "Template"}
                        </Badge>
                        <Badge tone="attention">
                          {Math.round(audience.confidence * 100)}% match
                        </Badge>
                      </InlineStack>
                    </InlineStack>
                    <Text as="p" variant="bodySm">
                      {audience.description}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Estimated reach: {audience.estimatedReach}
                    </Text>
                    <InlineStack gap="100">
                      <Text as="span" variant="bodySm" tone="subdued">
                        Age: {audience.targeting.age_min}-{audience.targeting.age_max}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Countries: {audience.targeting.geo_locations.countries.join(', ')}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </ResourceItem>
              )}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Store Media Gallery Modal */}
      <Modal
        open={showMediaGallery}
        onClose={() => setShowMediaGallery(false)}
        title="Select from Store Gallery"
        primaryAction={{
          content: `Select ${selectedStoreMedia.length} item(s)`,
          onAction: () => setShowMediaGallery(false),
          disabled: selectedStoreMedia.length === 0
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowMediaGallery(false)
        }]}
        large
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Select images and videos from your store to use in your ads.
            </Text>
            
            <ResourceList
              resourceName={{ singular: 'media', plural: 'media' }}
              items={data.storeMedia}
              renderItem={(media) => {
                const isSelected = selectedStoreMedia.some(m => m.id === media.id);
                return (
                  <ResourceItem
                    id={media.id}
                    media={
                      <Thumbnail
                        source={media.url}
                        alt={media.alt || 'Store media'}
                        size="small"
                      />
                    }
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStoreMedia(selectedStoreMedia.filter(m => m.id !== media.id));
                      } else {
                        setSelectedStoreMedia([...selectedStoreMedia, media]);
                      }
                    }}
                    accessibilityLabel={`Select ${media.alt || 'media'}`}
                  >
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <InlineStack gap="200">
                          <Text as="h3" variant="bodyMd" fontWeight="bold">
                            {media.alt || `${media.type} file`}
                          </Text>
                          {isSelected && <Badge tone="success">Selected</Badge>}
                        </InlineStack>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {media.type.toUpperCase()} • {media.width}x{media.height}
                        </Text>
                        {media.productTitle && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            From: {media.productTitle}
                          </Text>
                        )}
                      </BlockStack>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedStoreMedia(selectedStoreMedia.filter(m => m.id !== media.id));
                          } else {
                            setSelectedStoreMedia([...selectedStoreMedia, media]);
                          }
                        }}
                      />
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Facebook Ads Library Modal */}
      <Modal
        open={showAdsLibraryModal}
        onClose={() => setShowAdsLibraryModal(false)}
        title="Facebook Ads Library - Ad Inspiration"
        large
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Browse successful ads from Facebook Ads Library and copy text for your campaign.
            </Text>
            
            {adsLibraryLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <Text as="p" variant="bodyMd">Searching Facebook Ads Library...</Text>
              </div>
            ) : adsLibraryResults.length > 0 ? (
              <ResourceList
                resourceName={{ singular: 'ad', plural: 'ads' }}
                items={adsLibraryResults}
                renderItem={(ad) => (
                  <ResourceItem
                    id={ad.id}
                    accessibilityLabel={`View ad from ${ad.page_name}`}
                  >
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="h3" variant="bodyMd" fontWeight="bold">
                          {ad.page_name || 'Unknown Page'}
                        </Text>
                        {ad.publisher_platforms && (
                          <InlineStack gap="100">
                            {ad.publisher_platforms.map((platform, index) => (
                              <Badge key={index} tone="info" size="small">
                                {platform}
                              </Badge>
                            ))}
                          </InlineStack>
                        )}
                      </InlineStack>
                      
                      {/* Ad Copy Sections */}
                      {(ad.ad_creative_link_title || ad.ad_creative_link_titles?.[0]) && (
                        <div>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodySm" fontWeight="bold">Headline:</Text>
                            <Button 
                              size="micro" 
                              onClick={() => copyAdText(
                                ad.ad_creative_link_title || ad.ad_creative_link_titles?.[0] || '', 
                                'headline'
                              )}
                            >
                              Copy Headline
                            </Button>
                          </InlineStack>
                          <Text as="p" variant="bodySm">
                            {ad.ad_creative_link_title || ad.ad_creative_link_titles?.[0]}
                          </Text>
                        </div>
                      )}
                      
                      {(ad.ad_creative_body || ad.ad_creative_bodies?.[0]) && (
                        <div>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodySm" fontWeight="bold">Primary Text:</Text>
                            <Button 
                              size="micro" 
                              onClick={() => copyAdText(
                                ad.ad_creative_body || ad.ad_creative_bodies?.[0] || '', 
                                'primaryText'
                              )}
                            >
                              Copy Text
                            </Button>
                          </InlineStack>
                          <Text as="p" variant="bodySm">
                            {(ad.ad_creative_body || ad.ad_creative_bodies?.[0] || '').substring(0, 200)}
                            {(ad.ad_creative_body || ad.ad_creative_bodies?.[0] || '').length > 200 ? '...' : ''}
                          </Text>
                        </div>
                      )}
                      
                      {(ad.ad_creative_link_description || ad.ad_creative_link_descriptions?.[0]) && (
                        <div>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodySm" fontWeight="bold">Description:</Text>
                            <Button 
                              size="micro" 
                              onClick={() => copyAdText(
                                ad.ad_creative_link_description || ad.ad_creative_link_descriptions?.[0] || '', 
                                'description'
                              )}
                            >
                              Copy Description
                            </Button>
                          </InlineStack>
                          <Text as="p" variant="bodySm">
                            {ad.ad_creative_link_description || ad.ad_creative_link_descriptions?.[0]}
                          </Text>
                        </div>
                      )}
                      
                      {/* Performance Data */}
                      <InlineStack gap="300">
                        {ad.impressions && (
                          <Text as="span" variant="bodySm" tone="subdued">
                            Impressions: {ad.impressions.lower_bound} - {ad.impressions.upper_bound}
                          </Text>
                        )}
                        {ad.spend && (
                          <Text as="span" variant="bodySm" tone="subdued">
                            Spend: ${ad.spend.lower_bound} - ${ad.spend.upper_bound}
                          </Text>
                        )}
                      </InlineStack>
                      
                      {ad.ad_snapshot_url && (
                        <Button 
                          url={ad.ad_snapshot_url} 
                          external 
                          size="small"
                        >
                          View Full Ad
                        </Button>
                      )}
                    </BlockStack>
                  </ResourceItem>
                )}
              />
            ) : (
              <Banner tone="info">
                <p>No ads found. Try different keywords or search terms.</p>
              </Banner>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Frame>
  );
}