/**
 * Facebook Marketing API Service
 * Comprehensive implementation based on Facebook Marketing API v23.0
 * 
 * Campaign Structure:
 * 1. Campaign (highest level - defines objective)
 * 2. Ad Set (defines budget, schedule, targeting, audience)
 * 3. Ad Creative (visual elements - images, text, videos)
 * 4. Ad (combines ad set + creative)
 */

import { json } from "@remix-run/node";

const FACEBOOK_API_VERSION = "v23.0";
const FACEBOOK_API_BASE = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

interface FacebookApiResponse {
  data?: any;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  id?: string;
  success?: boolean;
}

interface CampaignObjective {
  OUTCOME_AWARENESS: string;
  OUTCOME_TRAFFIC: string;
  OUTCOME_ENGAGEMENT: string;
  OUTCOME_LEADS: string;
  OUTCOME_APP_PROMOTION: string;
  OUTCOME_SALES: string;
}

interface OptimizationGoal {
  IMPRESSIONS: string;
  REACH: string;
  LINK_CLICKS: string;
  LANDING_PAGE_VIEWS: string;
  OFFSITE_CONVERSIONS: string;
  CONVERSIONS: string;
  APP_INSTALLS: string;
  LEAD_GENERATION: string;
  THRUPLAY: string;
  VALUE: string;
}

interface BillingEvent {
  IMPRESSIONS: string;
  CLICKS: string;
  LINK_CLICKS: string;
  APP_INSTALLS: string;
  THRUPLAY: string;
}

interface AdStatus {
  ACTIVE: string;
  PAUSED: string;
  DELETED: string;
  ARCHIVED: string;
}

export class FacebookAdsService {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.FACEBOOK_ACCESS_TOKEN || "";
    if (!this.accessToken) {
      throw new Error("Facebook access token is required");
    }
  }

  /**
   * Make authenticated request to Facebook API
   */
  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: any
  ): Promise<FacebookApiResponse> {
    const url = `${FACEBOOK_API_BASE}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "GET") {
      const params = new URLSearchParams({
        access_token: this.accessToken,
        ...data,
      });
      const response = await fetch(`${url}?${params}`);
      return response.json();
    } else {
      const body = new FormData();
      body.append("access_token", this.accessToken);
      
      if (data) {
        Object.keys(data).forEach(key => {
          if (typeof data[key] === "object") {
            body.append(key, JSON.stringify(data[key]));
          } else {
            body.append(key, data[key]);
          }
        });
      }

      options.body = body;
      options.headers = {}; // Let browser set Content-Type for FormData
      
      const response = await fetch(url, options);
      return response.json();
    }
  }

  /**
   * Get user's ad accounts
   */
  async getAdAccounts(userId: string = "me"): Promise<FacebookApiResponse> {
    return this.makeRequest(`/${userId}/adaccounts`, "GET", {
      fields: "id,name,account_id,currency,account_status,business,timezone_name,spend_cap,amount_spent,balance"
    });
  }

  /**
   * Get ad account details
   */
  async getAdAccount(adAccountId: string): Promise<FacebookApiResponse> {
    return this.makeRequest(`/act_${adAccountId}`, "GET", {
      fields: "id,name,account_id,currency,account_status,business,timezone_name,spend_cap,amount_spent,balance,funding_source_details"
    });
  }

  /**
   * Get Facebook pages for ad account
   */
  async getPages(userId: string = "me"): Promise<FacebookApiResponse> {
    return this.makeRequest(`/${userId}/accounts`, "GET", {
      fields: "id,name,access_token,category,picture,link,fan_count,about"
    });
  }

  /**
   * Get Instagram accounts connected to Facebook pages
   */
  async getInstagramAccounts(pageId: string): Promise<FacebookApiResponse> {
    return this.makeRequest(`/${pageId}`, "GET", {
      fields: "instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}"
    });
  }

  /**
   * Create a new campaign
   * Based on Facebook Marketing API Campaign structure
   */
  async createCampaign(adAccountId: string, campaignData: {
    name: string;
    objective: string;
    status?: string;
    buying_type?: string;
    bid_strategy?: string;
    budget_rebalance_flag?: boolean;
    daily_budget?: number;
    lifetime_budget?: number;
    start_time?: string;
    end_time?: string;
    special_ad_categories?: string[];
  }): Promise<FacebookApiResponse> {
    const data = {
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status || "PAUSED",
      buying_type: campaignData.buying_type || "AUCTION",
      ...campaignData
    };

    return this.makeRequest(`/act_${adAccountId}/campaigns`, "POST", data);
  }

  /**
   * Create an ad set
   * Ad sets define budget, schedule, targeting, and optimization
   */
  async createAdSet(adAccountId: string, adSetData: {
    name: string;
    campaign_id: string;
    optimization_goal: string;
    billing_event: string;
    bid_amount?: number;
    daily_budget?: number;
    lifetime_budget?: number;
    start_time?: string;
    end_time?: string;
    targeting: any;
    status?: string;
    promoted_object?: any;
    attribution_spec?: any[];
  }): Promise<FacebookApiResponse> {
    const data = {
      name: adSetData.name,
      campaign_id: adSetData.campaign_id,
      optimization_goal: adSetData.optimization_goal,
      billing_event: adSetData.billing_event,
      status: adSetData.status || "PAUSED",
      ...adSetData
    };

    return this.makeRequest(`/act_${adAccountId}/adsets`, "POST", data);
  }

  /**
   * Create ad creative
   * Ad creatives contain visual elements and cannot be changed once created
   */
  async createAdCreative(adAccountId: string, creativeData: {
    name: string;
    object_story_spec?: any;
    image_hash?: string;
    image_url?: string;
    video_id?: string;
    body?: string;
    title?: string;
    link_url?: string;
    call_to_action?: any;
    object_id?: string;
    page_id?: string;
    instagram_actor_id?: string;
  }): Promise<FacebookApiResponse> {
    return this.makeRequest(`/act_${adAccountId}/adcreatives`, "POST", creativeData);
  }

  /**
   * Upload image to ad account
   */
  async uploadImage(adAccountId: string, imageUrl: string, filename?: string): Promise<FacebookApiResponse> {
    return this.makeRequest(`/act_${adAccountId}/adimages`, "POST", {
      filename: filename || "ad_image.jpg",
      url: imageUrl
    });
  }

  /**
   * Create an ad
   * Combines ad set and creative to create the final ad
   */
  async createAd(adAccountId: string, adData: {
    name: string;
    adset_id: string;
    creative: {
      creative_id: string;
    };
    status?: string;
    tracking_specs?: any[];
  }): Promise<FacebookApiResponse> {
    const data = {
      name: adData.name,
      adset_id: adData.adset_id,
      creative: adData.creative,
      status: adData.status || "PAUSED",
      ...adData
    };

    return this.makeRequest(`/act_${adAccountId}/ads`, "POST", data);
  }

  /**
   * Get campaigns for ad account
   */
  async getCampaigns(adAccountId: string, options?: {
    limit?: number;
    fields?: string;
    filtering?: any[];
  }): Promise<FacebookApiResponse> {
    const params = {
      fields: options?.fields || "id,name,objective,status,created_time,updated_time,start_time,stop_time,budget_rebalance_flag,buying_type",
      limit: options?.limit?.toString() || "25",
      ...(options?.filtering && { filtering: JSON.stringify(options.filtering) })
    };

    return this.makeRequest(`/act_${adAccountId}/campaigns`, "GET", params);
  }

  /**
   * Get ad sets for campaign or ad account
   */
  async getAdSets(adAccountId: string, campaignId?: string, options?: {
    limit?: number;
    fields?: string;
  }): Promise<FacebookApiResponse> {
    const endpoint = campaignId 
      ? `/${campaignId}/adsets`
      : `/act_${adAccountId}/adsets`;
    
    const params = {
      fields: options?.fields || "id,name,status,optimization_goal,billing_event,daily_budget,lifetime_budget,start_time,end_time,created_time,updated_time",
      limit: options?.limit?.toString() || "25"
    };

    return this.makeRequest(endpoint, "GET", params);
  }

  /**
   * Get ads for ad set or ad account
   */
  async getAds(adAccountId: string, adSetId?: string, options?: {
    limit?: number;
    fields?: string;
  }): Promise<FacebookApiResponse> {
    const endpoint = adSetId 
      ? `/${adSetId}/ads`
      : `/act_${adAccountId}/ads`;
    
    const params = {
      fields: options?.fields || "id,name,status,created_time,updated_time,creative{id,name,title,body,image_url,object_story_spec}",
      limit: options?.limit?.toString() || "25"
    };

    return this.makeRequest(endpoint, "GET", params);
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: string, status: "ACTIVE" | "PAUSED" | "DELETED"): Promise<FacebookApiResponse> {
    return this.makeRequest(`/${campaignId}`, "POST", { status });
  }

  /**
   * Update ad set status
   */
  async updateAdSetStatus(adSetId: string, status: "ACTIVE" | "PAUSED" | "DELETED"): Promise<FacebookApiResponse> {
    return this.makeRequest(`/${adSetId}`, "POST", { status });
  }

  /**
   * Update ad status
   */
  async updateAdStatus(adId: string, status: "ACTIVE" | "PAUSED" | "DELETED"): Promise<FacebookApiResponse> {
    return this.makeRequest(`/${adId}`, "POST", { status });
  }

  /**
   * Get campaign insights (performance data)
   */
  async getCampaignInsights(campaignId: string, options?: {
    fields?: string;
    time_range?: {
      since: string;
      until: string;
    };
    date_preset?: string;
  }): Promise<FacebookApiResponse> {
    const params = {
      fields: options?.fields || "impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,actions,cost_per_action_type",
      ...(options?.time_range && { time_range: JSON.stringify(options.time_range) }),
      ...(options?.date_preset && { date_preset: options.date_preset })
    };

    return this.makeRequest(`/${campaignId}/insights`, "GET", params);
  }

  /**
   * Get ad set insights
   */
  async getAdSetInsights(adSetId: string, options?: {
    fields?: string;
    time_range?: {
      since: string;
      until: string;
    };
    date_preset?: string;
  }): Promise<FacebookApiResponse> {
    const params = {
      fields: options?.fields || "impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,actions,cost_per_action_type",
      ...(options?.time_range && { time_range: JSON.stringify(options.time_range) }),
      ...(options?.date_preset && { date_preset: options.date_preset })
    };

    return this.makeRequest(`/${adSetId}/insights`, "GET", params);
  }

  /**
   * Get ad insights
   */
  async getAdInsights(adId: string, options?: {
    fields?: string;
    time_range?: {
      since: string;
      until: string;
    };
    date_preset?: string;
  }): Promise<FacebookApiResponse> {
    const params = {
      fields: options?.fields || "impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,actions,cost_per_action_type",
      ...(options?.time_range && { time_range: JSON.stringify(options.time_range) }),
      ...(options?.date_preset && { date_preset: options.date_preset })
    };

    return this.makeRequest(`/${adId}/insights`, "GET", params);
  }

  /**
   * Create complete campaign with ad set and ad
   * This is a high-level method that creates the full campaign structure
   */
  async createCompleteCampaign(adAccountId: string, campaignConfig: {
    // Campaign level
    campaignName: string;
    objective: string;
    
    // Ad Set level
    adSetName: string;
    optimizationGoal: string;
    billingEvent: string;
    dailyBudget?: number;
    lifetimeBudget?: number;
    startTime?: string;
    endTime?: string;
    targeting: any;
    
    // Creative level
    creativeName: string;
    adCopy: {
      primaryText?: string;
      headline?: string;
      description?: string;
      callToAction?: string;
    };
    imageUrl?: string;
    linkUrl?: string;
    pageId: string;
    instagramActorId?: string;
    
    // Ad level
    adName: string;
  }): Promise<{
    success: boolean;
    campaign?: any;
    adSet?: any;
    creative?: any;
    ad?: any;
    error?: string;
  }> {
    try {
      console.log("🚀 Creating complete Facebook campaign...");

      // Step 1: Create Campaign
      console.log("📋 Step 1: Creating campaign...");
      const campaignResponse = await this.createCampaign(adAccountId, {
        name: campaignConfig.campaignName,
        objective: campaignConfig.objective,
        status: "PAUSED" // Start paused for safety
      });

      if (campaignResponse.error) {
        throw new Error(`Campaign creation failed: ${campaignResponse.error.message}`);
      }

      const campaignId = campaignResponse.id;
      console.log(`✅ Campaign created: ${campaignId}`);

      // Step 2: Create Ad Set
      console.log("🎯 Step 2: Creating ad set...");
      const adSetResponse = await this.createAdSet(adAccountId, {
        name: campaignConfig.adSetName,
        campaign_id: campaignId,
        optimization_goal: campaignConfig.optimizationGoal,
        billing_event: campaignConfig.billingEvent,
        daily_budget: campaignConfig.dailyBudget,
        lifetime_budget: campaignConfig.lifetimeBudget,
        start_time: campaignConfig.startTime,
        end_time: campaignConfig.endTime,
        targeting: campaignConfig.targeting,
        status: "PAUSED"
      });

      if (adSetResponse.error) {
        throw new Error(`Ad Set creation failed: ${adSetResponse.error.message}`);
      }

      const adSetId = adSetResponse.id;
      console.log(`✅ Ad Set created: ${adSetId}`);

      // Step 3: Upload image if provided
      let imageHash;
      if (campaignConfig.imageUrl) {
        console.log("🖼️ Step 3a: Uploading image...");
        const imageResponse = await this.uploadImage(adAccountId, campaignConfig.imageUrl);
        if (imageResponse.error) {
          console.warn(`Image upload failed: ${imageResponse.error.message}`);
        } else {
          imageHash = Object.keys(imageResponse)[0]; // Image hash is the key
          console.log(`✅ Image uploaded: ${imageHash}`);
        }
      }

      // Step 4: Create Ad Creative
      console.log("🎨 Step 4: Creating ad creative...");
      const objectStorySpec = {
        page_id: campaignConfig.pageId,
        link_data: {
          link: campaignConfig.linkUrl,
          message: campaignConfig.adCopy.primaryText,
          name: campaignConfig.adCopy.headline,
          description: campaignConfig.adCopy.description,
          call_to_action: {
            type: campaignConfig.adCopy.callToAction || "LEARN_MORE"
          },
          ...(imageHash && { image_hash: imageHash })
        }
      };

      const creativeResponse = await this.createAdCreative(adAccountId, {
        name: campaignConfig.creativeName,
        object_story_spec: objectStorySpec,
        ...(campaignConfig.instagramActorId && { 
          instagram_actor_id: campaignConfig.instagramActorId 
        })
      });

      if (creativeResponse.error) {
        throw new Error(`Creative creation failed: ${creativeResponse.error.message}`);
      }

      const creativeId = creativeResponse.id;
      console.log(`✅ Creative created: ${creativeId}`);

      // Step 5: Create Ad
      console.log("📢 Step 5: Creating ad...");
      const adResponse = await this.createAd(adAccountId, {
        name: campaignConfig.adName,
        adset_id: adSetId,
        creative: {
          creative_id: creativeId
        },
        status: "PAUSED"
      });

      if (adResponse.error) {
        throw new Error(`Ad creation failed: ${adResponse.error.message}`);
      }

      const adId = adResponse.id;
      console.log(`✅ Ad created: ${adId}`);

      console.log("🎉 Complete campaign created successfully!");

      return {
        success: true,
        campaign: { id: campaignId, ...campaignResponse },
        adSet: { id: adSetId, ...adSetResponse },
        creative: { id: creativeId, ...creativeResponse },
        ad: { id: adId, ...adResponse }
      };

    } catch (error) {
      console.error("❌ Campaign creation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Test Facebook API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    user?: any;
    adAccounts?: any[];
    error?: string;
  }> {
    try {
      // Test basic connection by getting user info
      const userResponse = await this.makeRequest("/me", "GET", {
        fields: "id,name,email"
      });

      if (userResponse.error) {
        throw new Error(`User info failed: ${userResponse.error.message}`);
      }

      // Get ad accounts
      const adAccountsResponse = await this.getAdAccounts();
      
      return {
        success: true,
        user: userResponse,
        adAccounts: adAccountsResponse.data || []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed"
      };
    }
  }
}

// Export constants for use in other files
export const CAMPAIGN_OBJECTIVES = {
  OUTCOME_AWARENESS: "OUTCOME_AWARENESS",
  OUTCOME_TRAFFIC: "OUTCOME_TRAFFIC", 
  OUTCOME_ENGAGEMENT: "OUTCOME_ENGAGEMENT",
  OUTCOME_LEADS: "OUTCOME_LEADS",
  OUTCOME_APP_PROMOTION: "OUTCOME_APP_PROMOTION",
  OUTCOME_SALES: "OUTCOME_SALES"
};

export const OPTIMIZATION_GOALS = {
  IMPRESSIONS: "IMPRESSIONS",
  REACH: "REACH",
  LINK_CLICKS: "LINK_CLICKS",
  LANDING_PAGE_VIEWS: "LANDING_PAGE_VIEWS",
  OFFSITE_CONVERSIONS: "OFFSITE_CONVERSIONS",
  CONVERSIONS: "CONVERSIONS",
  APP_INSTALLS: "APP_INSTALLS",
  LEAD_GENERATION: "LEAD_GENERATION",
  THRUPLAY: "THRUPLAY",
  VALUE: "VALUE"
};

export const BILLING_EVENTS = {
  IMPRESSIONS: "IMPRESSIONS",
  CLICKS: "CLICKS",
  LINK_CLICKS: "LINK_CLICKS",
  APP_INSTALLS: "APP_INSTALLS",
  THRUPLAY: "THRUPLAY"
};

export const AD_STATUS = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  DELETED: "DELETED",
  ARCHIVED: "ARCHIVED"
};