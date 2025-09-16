import axios, { AxiosError } from "axios";
import { db } from "../db.server";

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

// Facebook API error codes that should trigger retries
const RETRYABLE_ERROR_CODES = [1, 2, 4, 17, 341, 368];

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get Facebook account status
export async function getFacebookAccountStatus(shop: string) {
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
    include: {
      adAccounts: {
        where: { isDefault: true },
        take: 1
      }
    }
  });

  return {
    isConnected: !!facebookAccount,
    account: facebookAccount,
    defaultAdAccount: facebookAccount?.adAccounts[0] || null,
    currency: facebookAccount?.adAccounts[0]?.currency || 'USD'
  };
}

// Helper function to get available ad accounts
export async function getAvailableAdAccounts(shop: string) {
  const facebookAccount = await db.facebookAccount.findFirst({
    where: { shop, isActive: true },
    include: {
      adAccounts: {
        orderBy: { isDefault: 'desc' }
      }
    }
  });

  return facebookAccount?.adAccounts || [];
}

// Helper function to format currency
export function formatCurrency(amount: string | number, currencyCode: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';

  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': 'MX$'
  };

  const symbol = currencySymbols[currencyCode] || currencyCode;
  
  return `${symbol}${numAmount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

export interface FacebookCampaignData {
  name: string;
  objective: string;
  status: string;
  budget?: number;
  budgetType?: string;
}

export interface FacebookAdSetData {
  name: string;
  campaignId: string;
  budget?: number;
  budgetType?: string;
  targeting: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
    };
    interests?: Array<{ id: string; name: string }>;
  };
}

export interface FacebookAdData {
  name: string;
  adSetId: string;
  creative: {
    title: string;
    body: string;
    image_url?: string;
    link_url?: string;
    call_to_action_type?: string;
  };
}

export class FacebookAdsService {
  private accessToken: string;
  private adAccountId: string;
  private isSystemUser: boolean;

  constructor(accessToken: string, adAccountId: string, isSystemUser: boolean = false) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.isSystemUser = isSystemUser;
  }

  // Enhanced error handling with retry logic
  private async makeApiCall<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    params?: any,
    retryCount: number = 0
  ): Promise<T> {
    try {
      const config = {
        method,
        url,
        data,
        params: {
          access_token: this.accessToken,
          ...params
        },
        timeout: 30000 // 30 second timeout
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data as any;
      const errorCode = errorData?.error?.code;
      const errorSubcode = errorData?.error?.error_subcode;

      // Log the error for monitoring
      console.error('Facebook API Error:', {
        url,
        method,
        errorCode,
        errorSubcode,
        message: errorData?.error?.message,
        retryCount
      });

      // Check if error is retryable
      const isRetryable = RETRYABLE_ERROR_CODES.includes(errorCode) || 
                         axiosError.response?.status === 429 || // Rate limit
                         axiosError.response?.status === 500 || // Server error
                         axiosError.response?.status === 503;   // Service unavailable

      if (isRetryable && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        const delay = Math.min(
          RATE_LIMIT_CONFIG.baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, retryCount),
          RATE_LIMIT_CONFIG.maxDelay
        );

        console.log(`Retrying Facebook API call in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
        await sleep(delay);
        return this.makeApiCall(method, url, data, params, retryCount + 1);
      }

      // Transform Facebook errors into user-friendly messages
      const userMessage = this.getFriendlyErrorMessage(errorCode, errorData?.error?.message);
      throw new Error(userMessage);
    }
  }

  private getFriendlyErrorMessage(errorCode: number, originalMessage: string): string {
    const errorMessages: { [key: number]: string } = {
      1: 'Facebook API is temporarily unavailable. Please try again later.',
      2: 'Facebook service is temporarily unavailable. Please try again later.',
      4: 'Facebook API rate limit exceeded. Please wait a moment and try again.',
      10: 'You do not have permission to perform this action. Please check your Facebook account permissions.',
      17: 'You have reached your Facebook API rate limit. Please try again later.',
      100: 'Invalid Facebook access token. Please reconnect your Facebook account.',
      190: 'Your Facebook access token has expired. Please reconnect your Facebook account.',
      200: 'You do not have the required permissions for this action.',
      341: 'Facebook API is temporarily unavailable due to maintenance.',
      368: 'The Facebook ad account is temporarily restricted.',
      1487297: 'Your Facebook ad account needs to be verified before you can create ads.',
      1487298: 'Your Facebook ad account has spending limits that prevent ad creation.',
      1487299: 'Your Facebook ad account is restricted and cannot create new ads.'
    };

    return errorMessages[errorCode] || originalMessage || 'An unexpected error occurred with Facebook API.';
  }

  static async getForShop(shop: string): Promise<FacebookAdsService | null> {
    const facebookAccount = await db.facebookAccount.findFirst({
      where: { shop, isActive: true }
    });

    if (!facebookAccount || !facebookAccount.adAccountId) {
      return null;
    }

    return new FacebookAdsService(facebookAccount.accessToken, facebookAccount.adAccountId);
  }

  async createCampaign(campaignData: FacebookCampaignData): Promise<string> {
    const data = {
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status,
      special_ad_categories: [],
      ...(campaignData.budget && campaignData.budgetType === 'DAILY' && {
        daily_budget: Math.round(campaignData.budget * 100) // Convert to cents
      }),
      ...(campaignData.budget && campaignData.budgetType === 'LIFETIME' && {
        lifetime_budget: Math.round(campaignData.budget * 100) // Convert to cents
      })
    };

    const response = await this.makeApiCall<{ id: string }>(
      'POST',
      `https://graph.facebook.com/v18.0/${this.adAccountId}/campaigns`,
      data
    );

    return response.id;
  }

  async getCampaigns(): Promise<any[]> {
    try {
      const response = await this.makeApiCall<{ data: any[] }>(
        'GET',
        `https://graph.facebook.com/v18.0/${this.adAccountId}/campaigns`,
        undefined,
        {
          fields: "id,name,objective,status,created_time,updated_time,insights{impressions,clicks,spend,actions}"
        }
      );

      return response.data || [];
    } catch (error: any) {
      console.error("Facebook campaigns fetch error:", error.message);
      return [];
    }
  }

  async getCampaignInsights(campaignId: string): Promise<any> {
    try {
      const response = await this.makeApiCall<{ data: any[] }>(
        'GET',
        `https://graph.facebook.com/v18.0/${campaignId}/insights`,
        undefined,
        {
          fields: "impressions,clicks,spend,actions,ctr,cpc,cpm"
        }
      );

      return response.data?.[0] || {};
    } catch (error: any) {
      console.error("Facebook campaign insights error:", error.message);
      return {};
    }
  }

  async syncCampaigns(shop: string): Promise<void> {
    try {
      const campaigns = await this.getCampaigns();
      
      for (const fbCampaign of campaigns) {
        const insights = await this.getCampaignInsights(fbCampaign.id);
        
        // Convert Facebook actions to conversions count
        let conversions = 0;
        if (insights.actions) {
          const conversionActions = insights.actions.filter((action: any) => 
            action.action_type === 'purchase' || action.action_type === 'complete_registration'
          );
          conversions = conversionActions.reduce((sum: number, action: any) => sum + parseInt(action.value || '0'), 0);
        }

        await db.campaign.upsert({
          where: {
            shop_facebookCampaignId: {
              shop: shop,
              facebookCampaignId: fbCampaign.id
            }
          },
          update: {
            name: fbCampaign.name,
            objective: fbCampaign.objective,
            status: fbCampaign.status,
            impressions: parseInt(insights.impressions || '0'),
            clicks: parseInt(insights.clicks || '0'),
            spend: parseFloat(insights.spend || '0'),
            conversions: conversions,
            lastSyncAt: new Date()
          },
          create: {
            shop: shop,
            facebookAccountId: (await db.facebookAccount.findFirst({
              where: { shop, isActive: true }
            }))!.id,
            facebookCampaignId: fbCampaign.id,
            name: fbCampaign.name,
            objective: fbCampaign.objective,
            status: fbCampaign.status,
            impressions: parseInt(insights.impressions || '0'),
            clicks: parseInt(insights.clicks || '0'),
            spend: parseFloat(insights.spend || '0'),
            conversions: conversions,
            lastSyncAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error("Campaign sync error:", error);
      throw error;
    }
  }

  // Advanced Facebook Marketing API features

  async createAdSet(adSetData: FacebookAdSetData): Promise<string> {
    const data = {
      name: adSetData.name,
      campaign_id: adSetData.campaignId,
      targeting: adSetData.targeting,
      status: 'PAUSED', // Always create paused for review
      billing_event: 'IMPRESSIONS',
      optimization_goal: adSetData.optimizationGoal || 'OFFSITE_CONVERSIONS',
      ...(adSetData.budget && adSetData.budgetType === 'DAILY' && {
        daily_budget: Math.round(adSetData.budget * 100)
      }),
      ...(adSetData.budget && adSetData.budgetType === 'LIFETIME' && {
        lifetime_budget: Math.round(adSetData.budget * 100)
      })
    };

    const response = await this.makeApiCall<{ id: string }>(
      'POST',
      `https://graph.facebook.com/v18.0/${this.adAccountId}/adsets`,
      data
    );

    return response.id;
  }

  async createAd(adData: FacebookAdData): Promise<string> {
    // First create the ad creative
    const creativeData = {
      name: `${adData.name} - Creative`,
      object_story_spec: {
        page_id: await this.getDefaultPageId(),
        link_data: {
          link: adData.creative.link_url,
          message: adData.creative.body,
          name: adData.creative.title,
          ...(adData.creative.image_url && {
            picture: adData.creative.image_url
          }),
          ...(adData.creative.call_to_action_type && {
            call_to_action: {
              type: adData.creative.call_to_action_type
            }
          })
        }
      }
    };

    const creativeResponse = await this.makeApiCall<{ id: string }>(
      'POST',
      `https://graph.facebook.com/v18.0/${this.adAccountId}/adcreatives`,
      creativeData
    );

    // Then create the ad
    const adDataPayload = {
      name: adData.name,
      adset_id: adData.adSetId,
      creative: {
        creative_id: creativeResponse.id
      },
      status: 'PAUSED' // Always create paused for review
    };

    const adResponse = await this.makeApiCall<{ id: string }>(
      'POST',
      `https://graph.facebook.com/v18.0/${this.adAccountId}/ads`,
      adDataPayload
    );

    return adResponse.id;
  }

  async getDefaultPageId(): Promise<string> {
    // Get the first available page for the account
    const pages = await this.makeApiCall<{ data: any[] }>(
      'GET',
      'https://graph.facebook.com/v18.0/me/accounts',
      undefined,
      { fields: 'id,name' }
    );

    if (!pages.data || pages.data.length === 0) {
      throw new Error('No Facebook pages available. Please connect a Facebook page to create ads.');
    }

    return pages.data[0].id;
  }

  // Custom Audiences
  async createCustomAudience(name: string, description: string, customerList?: string[]): Promise<string> {
    const data = {
      name,
      description,
      subtype: customerList ? 'CUSTOM' : 'WEBSITE',
      ...(customerList && {
        customer_file_source: 'USER_PROVIDED_ONLY'
      })
    };

    const response = await this.makeApiCall<{ id: string }>(
      'POST',
      `https://graph.facebook.com/v18.0/${this.adAccountId}/customaudiences`,
      data
    );

    // If customer list provided, upload it
    if (customerList && customerList.length > 0) {
      await this.uploadCustomAudienceUsers(response.id, customerList);
    }

    return response.id;
  }

  async uploadCustomAudienceUsers(audienceId: string, emails: string[]): Promise<void> {
    // Hash emails for privacy
    const crypto = await import('crypto');
    const hashedEmails = emails.map(email => 
      crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
    );

    const data = {
      payload: {
        schema: ['EMAIL_SHA256'],
        data: hashedEmails.map(hash => [hash])
      }
    };

    await this.makeApiCall(
      'POST',
      `https://graph.facebook.com/v18.0/${audienceId}/users`,
      data
    );
  }

  // Lookalike Audiences
  async createLookalikeAudience(
    name: string,
    sourceAudienceId: string,
    targetCountries: string[],
    ratio: number = 0.01
  ): Promise<string> {
    const data = {
      name,
      origin_audience_id: sourceAudienceId,
      target_spec: {
        geo_locations: {
          countries: targetCountries
        }
      },
      lookalike_spec: {
        ratio,
        country: targetCountries[0]
      }
    };

    const response = await this.makeApiCall<{ id: string }>(
      'POST',
      `https://graph.facebook.com/v18.0/${this.adAccountId}/customaudiences`,
      data
    );

    return response.id;
  }

  // Campaign Budget Optimization
  async updateCampaignBudget(campaignId: string, budget: number, budgetType: 'DAILY' | 'LIFETIME'): Promise<void> {
    const data = budgetType === 'DAILY' 
      ? { daily_budget: Math.round(budget * 100) }
      : { lifetime_budget: Math.round(budget * 100) };

    await this.makeApiCall(
      'POST',
      `https://graph.facebook.com/v18.0/${campaignId}`,
      data
    );
  }

  // Advanced Insights with Breakdowns
  async getAdvancedInsights(
    campaignId: string,
    dateRange: { since: string; until: string },
    breakdowns?: string[]
  ): Promise<any> {
    const params = {
      fields: 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency,cost_per_action_type',
      time_range: `{"since":"${dateRange.since}","until":"${dateRange.until}"}`,
      ...(breakdowns && { breakdowns: breakdowns.join(',') })
    };

    const response = await this.makeApiCall<{ data: any[] }>(
      'GET',
      `https://graph.facebook.com/v18.0/${campaignId}/insights`,
      undefined,
      params
    );

    return response.data || [];
  }

  // Account Health Check
  async getAccountHealth(): Promise<{
    status: string;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const accountInfo = await this.makeApiCall<any>(
        'GET',
        `https://graph.facebook.com/v18.0/${this.adAccountId}`,
        undefined,
        {
          fields: 'account_status,disable_reason,capabilities,spend_cap,amount_spent,balance'
        }
      );

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check account status
      if (accountInfo.account_status !== 1) {
        issues.push('Ad account is not active');
        if (accountInfo.disable_reason) {
          issues.push(`Disable reason: ${accountInfo.disable_reason}`);
        }
      }

      // Check spending limits
      if (accountInfo.spend_cap && accountInfo.amount_spent) {
        const spentPercentage = (accountInfo.amount_spent / accountInfo.spend_cap) * 100;
        if (spentPercentage > 80) {
          issues.push('Approaching spending limit');
          recommendations.push('Consider increasing your spending limit');
        }
      }

      // Check capabilities
      if (!accountInfo.capabilities?.includes('CAN_CREATE_CAMPAIGNS')) {
        issues.push('Cannot create campaigns');
        recommendations.push('Contact Facebook support to restore campaign creation capability');
      }

      return {
        status: issues.length === 0 ? 'healthy' : 'issues_detected',
        issues,
        recommendations
      };
    } catch (error: any) {
      return {
        status: 'error',
        issues: ['Unable to check account health'],
        recommendations: ['Verify Facebook account connection']
      };
    }
  }

  // System User Management (for server-to-server authentication)
  static async createSystemUser(businessId: string, accessToken: string, name: string): Promise<{
    id: string;
    accessToken: string;
  }> {
    try {
      // Create system user
      const systemUserResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${businessId}/system_users`,
        {
          name,
          role: 'ADMIN'
        },
        {
          params: { access_token: accessToken }
        }
      );

      const systemUserId = systemUserResponse.data.id;

      // Generate access token for system user
      const tokenResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${systemUserId}/access_tokens`,
        {
          scope: 'ads_management,ads_read,business_management'
        },
        {
          params: { access_token: accessToken }
        }
      );

      return {
        id: systemUserId,
        accessToken: tokenResponse.data.access_token
      };
    } catch (error: any) {
      console.error('System user creation error:', error.response?.data || error.message);
      throw new Error('Failed to create system user');
    }
  }

  // Complete campaign creation method
  async createCompleteCampaign(adAccountId: string, campaignData: {
    // Campaign level
    campaignName: string;
    objective: string;
    specialAdCategory?: string;
    status?: string;
    
    // Ad Set level
    adSetName: string;
    optimizationGoal: string;
    billingEvent: string;
    dailyBudget?: number;
    lifetimeBudget?: number;
    targeting: any;
    
    // Creative level
    creativeName: string;
    adCopy: any;
    linkUrl: string;
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
      console.log('🚀 Starting complete campaign creation...');
      
      // Step 1: Create Campaign
      console.log('📝 Creating campaign...');
      const campaignId = await this.createCampaign({
        name: campaignData.campaignName,
        objective: campaignData.objective,
        special_ad_categories: campaignData.specialAdCategory ? [campaignData.specialAdCategory] : [],
        status: campaignData.status || 'PAUSED' // Use provided status or default to paused
      });

      // Step 2: Create Ad Set
      console.log('🎯 Creating ad set...');
      const adSetId = await this.createAdSet({
        name: campaignData.adSetName,
        campaign_id: campaignId,
        optimization_goal: campaignData.optimizationGoal,
        billing_event: campaignData.billingEvent,
        daily_budget: campaignData.dailyBudget,
        lifetime_budget: campaignData.lifetimeBudget,
        targeting: campaignData.targeting,
        status: campaignData.status || 'PAUSED'
      });

      // Step 3: Create Ad Creative
      console.log('🎨 Creating ad creative...');
      const creativeResponse = await this.makeApiCall(
        `https://graph.facebook.com/v18.0/act_${this.adAccountId}/adcreatives`,
        'POST',
        {
          name: campaignData.creativeName,
          object_story_spec: {
            page_id: campaignData.pageId,
            link_data: {
              link: campaignData.linkUrl,
              message: campaignData.adCopy.primaryText || 'Check out our amazing products!',
              name: campaignData.adCopy.headline || 'Shop Now',
              description: campaignData.adCopy.description || 'Limited time offer - don\'t miss out!',
              call_to_action: {
                type: 'SHOP_NOW',
                value: {
                  link: campaignData.linkUrl
                }
              }
            }
          },
          ...(campaignData.instagramActorId && {
            instagram_actor_id: campaignData.instagramActorId
          })
        }
      );

      const creativeId = creativeResponse.id;

      // Step 4: Create Ad
      console.log('📢 Creating ad...');
      const adId = await this.createAd({
        name: campaignData.adName,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: campaignData.status || 'PAUSED'
      });

      console.log('✅ Complete campaign created successfully!');
      
      return {
        success: true,
        campaign: { id: campaignId },
        adSet: { id: adSetId },
        creative: { id: creativeId },
        ad: { id: adId }
      };

    } catch (error: any) {
      console.error('❌ Complete campaign creation failed:', error);
      
      let errorMessage = 'Campaign creation failed';
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        errorMessage = this.formatErrorMessage(fbError.code, fbError.message);
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}