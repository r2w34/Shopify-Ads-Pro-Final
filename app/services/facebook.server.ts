import axios from "axios";
import { db } from "../db.server";

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

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
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
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${this.adAccountId}/campaigns`,
        {
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
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return response.data.id;
    } catch (error: any) {
      console.error("Facebook campaign creation error:", error.response?.data || error.message);
      throw new Error(`Failed to create Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getCampaigns(): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${this.adAccountId}/campaigns`,
        {
          params: {
            access_token: this.accessToken,
            fields: "id,name,objective,status,created_time,updated_time,insights{impressions,clicks,spend,actions}"
          }
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error("Facebook campaigns fetch error:", error.response?.data || error.message);
      return [];
    }
  }

  async getCampaignInsights(campaignId: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${campaignId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            fields: "impressions,clicks,spend,actions,ctr,cpc,cpm"
          }
        }
      );

      return response.data.data?.[0] || {};
    } catch (error: any) {
      console.error("Facebook campaign insights error:", error.response?.data || error.message);
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
}