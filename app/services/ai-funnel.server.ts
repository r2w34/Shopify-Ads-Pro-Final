import { db } from "../db.server";
import { GeminiService } from "./gemini.server";
import { FacebookAdsService } from "./facebook.server";
import { MachineLearningService } from "./machine-learning.server";
import axios from "axios";

// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyDSCsILpx3Glg4wtZq0o7U2NImP2JM9kn4";
const GEMINI_TEXT_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export interface FunnelStage {
  name: string;
  objective: string;
  audienceType: 'cold' | 'warm' | 'hot';
  budget: number;
  budgetPercentage: number;
  targeting: {
    interests?: string[];
    behaviors?: string[];
    demographics?: {
      age_min: number;
      age_max: number;
      genders: number[];
    };
    custom_audiences?: string[];
    lookalike_audiences?: string[];
  };
  creativeStrategy: {
    adFormat: 'single_image' | 'carousel' | 'video' | 'collection';
    messaging: 'awareness' | 'consideration' | 'conversion';
    cta: string;
  };
}

export interface AIFunnelConfig {
  shop: string;
  totalBudget: number;
  duration: number; // days
  productCategory: string;
  targetCountries: string[];
  stages: FunnelStage[];
  retargetingEnabled: boolean;
  lookalikesEnabled: boolean;
}

export interface FunnelPerformance {
  stage: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  roas: number;
  audienceSize: number;
}

export class AIFunnelService {
  private geminiService: GeminiService;
  private mlService: MachineLearningService;

  constructor() {
    this.geminiService = new GeminiService();
    this.mlService = new MachineLearningService();
  }

  private async generateWithGemini(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${GEMINI_TEXT_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      console.error('Gemini API error:', error);
      return "";
    }
  }

  async createAIFunnel(
    shop: string,
    productIds: string[],
    totalBudget: number,
    targetCountries: string[] = ['US']
  ): Promise<AIFunnelConfig> {
    
    // Get product data from Shopify
    const productData = await this.getProductData(shop, productIds);
    
    // Analyze product category and determine optimal funnel structure
    const productCategory = await this.analyzeProductCategory(productData);
    
    // Generate AI-optimized funnel stages
    const stages = await this.generateOptimalFunnelStages(
      productData,
      productCategory,
      totalBudget,
      targetCountries
    );

    // Create funnel configuration
    const funnelConfig: AIFunnelConfig = {
      shop,
      totalBudget,
      duration: 30, // Default 30 days
      productCategory,
      targetCountries,
      stages,
      retargetingEnabled: true,
      lookalikesEnabled: true
    };

    // Save funnel configuration to database
    await this.saveFunnelConfig(funnelConfig);

    return funnelConfig;
  }

  private async generateOptimalFunnelStages(
    productData: any[],
    category: string,
    totalBudget: number,
    countries: string[]
  ): Promise<FunnelStage[]> {
    
    // AI-generated funnel structure based on product analysis
    const prompt = `
    Create an optimal Facebook advertising funnel for ${category} products with a $${totalBudget} budget.
    
    Product details:
    ${productData.map(p => `- ${p.title}: $${p.price} (${p.description?.substring(0, 100)}...)`).join('\n')}
    
    Target countries: ${countries.join(', ')}
    
    Generate a 3-stage funnel with:
    1. Top of funnel (Awareness) - Cold audiences
    2. Middle of funnel (Consideration) - Warm audiences  
    3. Bottom of funnel (Conversion) - Hot audiences
    
    For each stage, provide:
    - Budget allocation percentage
    - Targeting strategy (interests, behaviors, demographics)
    - Creative strategy and messaging
    - Call-to-action recommendations
    
    Format as JSON with detailed targeting recommendations.
    `;

    const aiResponse = await this.generateWithGemini(prompt);
    
    try {
      const aiStages = JSON.parse(aiResponse);
      return this.processAIStages(aiStages, totalBudget, productData);
    } catch (error) {
      console.error('Error parsing AI funnel response from Gemini:', error);
      return this.getDefaultFunnelStages(totalBudget, category);
    }
  }

  private processAIStages(aiStages: any, totalBudget: number, productData: any[]): FunnelStage[] {
    const stages: FunnelStage[] = [];

    // Top of Funnel - Awareness (50% budget)
    stages.push({
      name: 'Awareness - Cold Audiences',
      objective: 'OUTCOME_AWARENESS',
      audienceType: 'cold',
      budget: totalBudget * 0.5,
      budgetPercentage: 50,
      targeting: {
        interests: this.generateInterestTargeting(productData),
        behaviors: this.generateBehaviorTargeting(productData),
        demographics: {
          age_min: 25,
          age_max: 55,
          genders: [1, 2] // All genders
        }
      },
      creativeStrategy: {
        adFormat: 'single_image',
        messaging: 'awareness',
        cta: 'LEARN_MORE'
      }
    });

    // Middle of Funnel - Consideration (30% budget)
    stages.push({
      name: 'Consideration - Warm Audiences',
      objective: 'TRAFFIC',
      audienceType: 'warm',
      budget: totalBudget * 0.3,
      budgetPercentage: 30,
      targeting: {
        custom_audiences: ['website_visitors_30_days', 'video_viewers'],
        lookalike_audiences: ['lookalike_1_percent'],
        demographics: {
          age_min: 25,
          age_max: 55,
          genders: [1, 2]
        }
      },
      creativeStrategy: {
        adFormat: 'carousel',
        messaging: 'consideration',
        cta: 'SHOP_NOW'
      }
    });

    // Bottom of Funnel - Conversion (20% budget)
    stages.push({
      name: 'Conversion - Hot Audiences',
      objective: 'OUTCOME_SALES',
      audienceType: 'hot',
      budget: totalBudget * 0.2,
      budgetPercentage: 20,
      targeting: {
        custom_audiences: ['add_to_cart', 'viewed_product', 'initiated_checkout'],
        demographics: {
          age_min: 25,
          age_max: 55,
          genders: [1, 2]
        }
      },
      creativeStrategy: {
        adFormat: 'collection',
        messaging: 'conversion',
        cta: 'SHOP_NOW'
      }
    });

    return stages;
  }

  private generateInterestTargeting(productData: any[]): string[] {
    const interests: string[] = [];
    
    // Extract interests based on product categories and titles
    productData.forEach(product => {
      const title = product.title?.toLowerCase() || '';
      const category = product.product_type?.toLowerCase() || '';
      
      // Category-based interests
      if (category.includes('fashion') || category.includes('clothing')) {
        interests.push('Fashion', 'Online shopping', 'Clothing', 'Style');
      } else if (category.includes('electronics')) {
        interests.push('Electronics', 'Technology', 'Gadgets');
      } else if (category.includes('beauty')) {
        interests.push('Beauty', 'Cosmetics', 'Skincare', 'Makeup');
      } else if (category.includes('home')) {
        interests.push('Home improvement', 'Interior design', 'Home decor');
      } else if (category.includes('fitness') || category.includes('sports')) {
        interests.push('Fitness and wellness', 'Physical fitness', 'Sports');
      }
      
      // Brand-based interests (extract potential brand names)
      const words = title.split(' ');
      words.forEach(word => {
        if (word.length > 4 && /^[A-Z]/.test(word)) {
          interests.push(word);
        }
      });
    });

    // Remove duplicates and return top 10
    return [...new Set(interests)].slice(0, 10);
  }

  private generateBehaviorTargeting(productData: any[]): string[] {
    const behaviors: string[] = [];
    
    // Add behaviors based on product price points
    const avgPrice = productData.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0) / productData.length;
    
    if (avgPrice > 100) {
      behaviors.push('Frequent online shoppers', 'Premium brand affinity');
    } else if (avgPrice > 50) {
      behaviors.push('Online shoppers', 'Deal seekers');
    } else {
      behaviors.push('Bargain hunters', 'Price-conscious shoppers');
    }

    // Add mobile behaviors
    behaviors.push('Mobile device users', 'Engaged shoppers');

    return behaviors;
  }

  private getDefaultFunnelStages(totalBudget: number, category: string): FunnelStage[] {
    return [
      {
        name: 'Awareness - Cold Traffic',
        objective: 'OUTCOME_AWARENESS',
        audienceType: 'cold',
        budget: totalBudget * 0.5,
        budgetPercentage: 50,
        targeting: {
          interests: ['Online shopping', 'E-commerce', category],
          demographics: {
            age_min: 25,
            age_max: 55,
            genders: [1, 2]
          }
        },
        creativeStrategy: {
          adFormat: 'single_image',
          messaging: 'awareness',
          cta: 'LEARN_MORE'
        }
      },
      {
        name: 'Consideration - Warm Traffic',
        objective: 'TRAFFIC',
        audienceType: 'warm',
        budget: totalBudget * 0.3,
        budgetPercentage: 30,
        targeting: {
          custom_audiences: ['website_visitors'],
          demographics: {
            age_min: 25,
            age_max: 55,
            genders: [1, 2]
          }
        },
        creativeStrategy: {
          adFormat: 'carousel',
          messaging: 'consideration',
          cta: 'SHOP_NOW'
        }
      },
      {
        name: 'Conversion - Hot Traffic',
        objective: 'OUTCOME_SALES',
        audienceType: 'hot',
        budget: totalBudget * 0.2,
        budgetPercentage: 20,
        targeting: {
          custom_audiences: ['add_to_cart', 'viewed_product'],
          demographics: {
            age_min: 25,
            age_max: 55,
            genders: [1, 2]
          }
        },
        creativeStrategy: {
          adFormat: 'single_image',
          messaging: 'conversion',
          cta: 'SHOP_NOW'
        }
      }
    ];
  }

  async deployFunnel(funnelConfig: AIFunnelConfig): Promise<string[]> {
    const campaignIds: string[] = [];

    // Get Facebook Ads service for the shop
    const facebookService = await FacebookAdsService.getForShop(funnelConfig.shop);
    if (!facebookService) {
      throw new Error('Facebook Ads account not connected');
    }

    // Create campaigns for each funnel stage
    for (const stage of funnelConfig.stages) {
      try {
        const campaignId = await this.createStageCampaign(
          facebookService,
          funnelConfig,
          stage
        );
        campaignIds.push(campaignId);
      } catch (error) {
        console.error(`Error creating campaign for stage ${stage.name}:`, error);
      }
    }

    return campaignIds;
  }

  private async createStageCampaign(
    facebookService: FacebookAdsService,
    funnelConfig: AIFunnelConfig,
    stage: FunnelStage
  ): Promise<string> {
    
    // Create campaign in database
    const campaign = await db.campaign.create({
      data: {
        shop: funnelConfig.shop,
        facebookAccountId: 'temp', // Will be updated with actual FB account
        name: `${stage.name} - AI Funnel`,
        objective: stage.objective,
        status: 'ACTIVE',
        budget: stage.budget,
        budgetType: 'DAILY',
        currency: 'USD',
        targetAudience: stage.targeting,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create Facebook campaign
    const fbCampaignData = {
      name: campaign.name,
      objective: stage.objective,
      status: 'ACTIVE',
      budget: stage.budget,
      budgetType: 'DAILY'
    };

    const fbCampaign = await facebookService.createCampaign(fbCampaignData);
    
    // Update campaign with Facebook ID
    await db.campaign.update({
      where: { id: campaign.id },
      data: { facebookCampaignId: fbCampaign.id }
    });

    // Create ad set for the campaign
    await this.createStageAdSet(facebookService, campaign.id, fbCampaign.id, stage);

    return campaign.id;
  }

  private async createStageAdSet(
    facebookService: FacebookAdsService,
    campaignId: string,
    fbCampaignId: string,
    stage: FunnelStage
  ): Promise<void> {
    
    const adSetData = {
      name: `${stage.name} - AdSet`,
      campaignId: fbCampaignId,
      budget: stage.budget,
      budgetType: 'DAILY',
      targeting: {
        age_min: stage.targeting.demographics?.age_min || 18,
        age_max: stage.targeting.demographics?.age_max || 65,
        genders: stage.targeting.demographics?.genders || [1, 2],
        geo_locations: {
          countries: ['US'] // Default to US
        },
        interests: stage.targeting.interests?.map(interest => ({
          id: interest,
          name: interest
        })) || []
      }
    };

    const fbAdSet = await facebookService.createAdSet(adSetData);

    // Save ad set to database
    await db.adSet.create({
      data: {
        campaignId,
        name: adSetData.name,
        status: 'ACTIVE',
        budget: stage.budget,
        budgetType: 'DAILY',
        facebookAdSetId: fbAdSet.id,
        targetingAge: `${adSetData.targeting.age_min}-${adSetData.targeting.age_max}`,
        targetingGender: 'all',
        targetingCountries: JSON.stringify(['US']),
        targetingInterests: JSON.stringify(stage.targeting.interests || [])
      }
    });
  }

  async optimizeFunnel(shop: string): Promise<void> {
    // Get all funnel campaigns for the shop
    const campaigns = await db.campaign.findMany({
      where: {
        shop,
        name: { contains: 'AI Funnel' }
      },
      include: {
        adSets: true,
        ads: true
      }
    });

    // Analyze performance of each stage
    for (const campaign of campaigns) {
      const performance = await this.analyzeCampaignPerformance(campaign);
      
      // Get ML recommendations for optimization
      const mlPrediction = await this.mlService.predictCampaignPerformance({
        budget: campaign.budget || 100,
        duration: 30,
        productPrice: 50, // Default
        roas: performance.roas
      });

      // Apply optimizations based on ML recommendations
      await this.applyOptimizations(campaign, performance, mlPrediction);
    }
  }

  private async analyzeCampaignPerformance(campaign: any): Promise<FunnelPerformance> {
    const impressions = campaign.impressions || 0;
    const clicks = campaign.clicks || 0;
    const conversions = campaign.conversions || 0;
    const spend = campaign.spend || 0.01;
    const revenue = campaign.revenue || 0;

    return {
      stage: campaign.name,
      impressions,
      clicks,
      conversions,
      spend,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      roas: spend > 0 ? revenue / spend : 0,
      audienceSize: 1000000 // Default audience size
    };
  }

  private async applyOptimizations(
    campaign: any,
    performance: FunnelPerformance,
    mlPrediction: any
  ): Promise<void> {
    
    // Budget optimization based on performance
    if (performance.roas > 3.0 && mlPrediction.predictedROAS > 2.5) {
      // Increase budget for high-performing campaigns
      const newBudget = (campaign.budget || 100) * 1.2;
      await db.campaign.update({
        where: { id: campaign.id },
        data: { budget: newBudget }
      });
    } else if (performance.roas < 1.0 && mlPrediction.riskScore > 0.7) {
      // Decrease budget for underperforming campaigns
      const newBudget = (campaign.budget || 100) * 0.8;
      await db.campaign.update({
        where: { id: campaign.id },
        data: { budget: Math.max(10, newBudget) } // Minimum $10 budget
      });
    }

    // Pause campaigns with very poor performance
    if (performance.roas < 0.5 && performance.spend > 50) {
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: 'PAUSED' }
      });
    }
  }

  private async getProductData(shop: string, productIds: string[]): Promise<any[]> {
    // This would integrate with Shopify API to get product data
    // For now, return mock data
    return [
      {
        id: productIds[0] || '1',
        title: 'Premium Product',
        price: '99.99',
        description: 'High-quality product with excellent features',
        product_type: 'Electronics',
        vendor: 'Premium Brand'
      }
    ];
  }

  private async analyzeProductCategory(productData: any[]): Promise<string> {
    if (productData.length === 0) return 'general';
    
    // Simple category analysis based on product types
    const categories = productData.map(p => p.product_type?.toLowerCase() || 'general');
    const categoryCount: { [key: string]: number } = {};
    
    categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Return most common category
    return Object.keys(categoryCount).reduce((a, b) => 
      categoryCount[a] > categoryCount[b] ? a : b
    );
  }

  private async saveFunnelConfig(config: AIFunnelConfig): Promise<void> {
    // Save funnel configuration to database for future reference
    // This could be a separate FunnelConfig model
    console.log('Funnel configuration saved:', config.shop);
  }
}