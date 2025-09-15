import { db } from '../db.server';
import { FacebookAdsService } from './facebook.server';

export interface OptimizationRule {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    timeframe: number; // hours
  };
  action: {
    type: 'pause' | 'increase_budget' | 'decrease_budget' | 'change_bid';
    value?: number;
    percentage?: number;
  };
  isActive: boolean;
}

export interface CampaignPerformance {
  campaignId: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  frequency: number;
}

export class CampaignOptimizationService {
  private facebookService: FacebookAdsService;
  private shop: string;

  constructor(facebookService: FacebookAdsService, shop: string) {
    this.facebookService = facebookService;
    this.shop = shop;
  }

  static async getForShop(shop: string): Promise<CampaignOptimizationService | null> {
    const facebookService = await FacebookAdsService.getForShop(shop);
    if (!facebookService) return null;
    
    return new CampaignOptimizationService(facebookService, shop);
  }

  // Default optimization rules
  private getDefaultOptimizationRules(): OptimizationRule[] {
    return [
      {
        id: 'high_cpc_pause',
        name: 'Pause High CPC Campaigns',
        condition: {
          metric: 'cpc',
          operator: 'gt',
          value: 5.0,
          timeframe: 24
        },
        action: {
          type: 'pause'
        },
        isActive: true
      },
      {
        id: 'low_ctr_pause',
        name: 'Pause Low CTR Campaigns',
        condition: {
          metric: 'ctr',
          operator: 'lt',
          value: 0.5,
          timeframe: 48
        },
        action: {
          type: 'pause'
        },
        isActive: true
      },
      {
        id: 'high_roas_increase_budget',
        name: 'Increase Budget for High ROAS',
        condition: {
          metric: 'roas',
          operator: 'gt',
          value: 4.0,
          timeframe: 24
        },
        action: {
          type: 'increase_budget',
          percentage: 20
        },
        isActive: true
      },
      {
        id: 'low_roas_decrease_budget',
        name: 'Decrease Budget for Low ROAS',
        condition: {
          metric: 'roas',
          operator: 'lt',
          value: 1.5,
          timeframe: 48
        },
        action: {
          type: 'decrease_budget',
          percentage: 30
        },
        isActive: true
      },
      {
        id: 'high_frequency_pause',
        name: 'Pause High Frequency Campaigns',
        condition: {
          metric: 'frequency',
          operator: 'gt',
          value: 3.0,
          timeframe: 72
        },
        action: {
          type: 'pause'
        },
        isActive: true
      }
    ];
  }

  // Analyze campaign performance
  async analyzeCampaignPerformance(campaignId: string, timeframe: number = 24): Promise<CampaignPerformance | null> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeframe * 60 * 60 * 1000));

      const insights = await this.facebookService.getAdvancedInsights(
        campaignId,
        {
          since: startDate.toISOString().split('T')[0],
          until: endDate.toISOString().split('T')[0]
        }
      );

      if (!insights || insights.length === 0) {
        return null;
      }

      const data = insights[0];
      const impressions = parseInt(data.impressions || '0');
      const clicks = parseInt(data.clicks || '0');
      const spend = parseFloat(data.spend || '0');
      const conversions = this.extractConversions(data.actions);
      const frequency = parseFloat(data.frequency || '0');

      // Calculate metrics
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const roas = spend > 0 ? (conversions * this.getAverageOrderValue()) / spend : 0;

      return {
        campaignId,
        impressions,
        clicks,
        spend,
        conversions,
        ctr,
        cpc,
        cpm,
        roas,
        frequency
      };
    } catch (error) {
      console.error('Failed to analyze campaign performance:', error);
      return null;
    }
  }

  private extractConversions(actions: any[]): number {
    if (!actions) return 0;
    
    const conversionActions = actions.filter(action => 
      action.action_type === 'purchase' || 
      action.action_type === 'complete_registration' ||
      action.action_type === 'add_to_cart'
    );

    return conversionActions.reduce((sum, action) => sum + parseInt(action.value || '0'), 0);
  }

  private async getAverageOrderValue(): Promise<number> {
    // Get average order value from Shopify data
    // This is a simplified version - you might want to integrate with Shopify API
    try {
      const recentOrders = await db.order.findMany({
        where: { shop: this.shop },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      if (recentOrders.length === 0) return 50; // Default AOV

      const totalValue = recentOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      return totalValue / recentOrders.length;
    } catch (error) {
      console.error('Failed to get average order value:', error);
      return 50; // Default AOV
    }
  }

  // Check if optimization rule should trigger
  private checkOptimizationRule(rule: OptimizationRule, performance: CampaignPerformance): boolean {
    const metricValue = performance[rule.condition.metric as keyof CampaignPerformance] as number;
    
    switch (rule.condition.operator) {
      case 'gt':
        return metricValue > rule.condition.value;
      case 'lt':
        return metricValue < rule.condition.value;
      case 'eq':
        return metricValue === rule.condition.value;
      case 'gte':
        return metricValue >= rule.condition.value;
      case 'lte':
        return metricValue <= rule.condition.value;
      default:
        return false;
    }
  }

  // Execute optimization action
  private async executeOptimizationAction(
    rule: OptimizationRule, 
    campaignId: string, 
    performance: CampaignPerformance
  ): Promise<boolean> {
    try {
      switch (rule.action.type) {
        case 'pause':
          await this.pauseCampaign(campaignId);
          break;
        
        case 'increase_budget':
          await this.adjustCampaignBudget(campaignId, rule.action.percentage || 20, 'increase');
          break;
        
        case 'decrease_budget':
          await this.adjustCampaignBudget(campaignId, rule.action.percentage || 20, 'decrease');
          break;
        
        case 'change_bid':
          // Implement bid adjustment logic
          console.log('Bid adjustment not implemented yet');
          break;
        
        default:
          console.log('Unknown optimization action:', rule.action.type);
          return false;
      }

      // Log the optimization action
      await this.logOptimizationAction(campaignId, rule, performance);
      return true;
    } catch (error) {
      console.error('Failed to execute optimization action:', error);
      return false;
    }
  }

  private async pauseCampaign(campaignId: string): Promise<void> {
    // Update campaign status to paused
    await fetch(`https://graph.facebook.com/v18.0/${campaignId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'PAUSED',
        access_token: (this.facebookService as any).accessToken
      })
    });

    // Update local database
    await db.campaign.updateMany({
      where: {
        facebookCampaignId: campaignId,
        shop: this.shop
      },
      data: {
        status: 'PAUSED',
        lastSyncAt: new Date()
      }
    });
  }

  private async adjustCampaignBudget(
    campaignId: string, 
    percentage: number, 
    direction: 'increase' | 'decrease'
  ): Promise<void> {
    // Get current campaign budget
    const campaign = await db.campaign.findFirst({
      where: {
        facebookCampaignId: campaignId,
        shop: this.shop
      }
    });

    if (!campaign || !campaign.budget) {
      throw new Error('Campaign or budget not found');
    }

    const currentBudget = campaign.budget;
    const adjustment = direction === 'increase' ? 1 + (percentage / 100) : 1 - (percentage / 100);
    const newBudget = Math.round(currentBudget * adjustment);

    // Update Facebook campaign budget
    await this.facebookService.updateCampaignBudget(campaignId, newBudget, 'DAILY');

    // Update local database
    await db.campaign.updateMany({
      where: {
        facebookCampaignId: campaignId,
        shop: this.shop
      },
      data: {
        budget: newBudget,
        lastSyncAt: new Date()
      }
    });
  }

  private async logOptimizationAction(
    campaignId: string,
    rule: OptimizationRule,
    performance: CampaignPerformance
  ): Promise<void> {
    try {
      await db.optimizationLog.create({
        data: {
          shop: this.shop,
          campaignId,
          ruleName: rule.name,
          ruleId: rule.id,
          actionType: rule.action.type,
          triggerMetric: rule.condition.metric,
          triggerValue: performance[rule.condition.metric as keyof CampaignPerformance] as number,
          thresholdValue: rule.condition.value,
          performanceData: JSON.stringify(performance)
        }
      });
    } catch (error) {
      console.error('Failed to log optimization action:', error);
    }
  }

  // Run optimization for all campaigns
  async runOptimization(): Promise<{
    processed: number;
    optimized: number;
    errors: number;
    actions: Array<{
      campaignId: string;
      ruleName: string;
      actionType: string;
    }>;
  }> {
    const results = {
      processed: 0,
      optimized: 0,
      errors: 0,
      actions: [] as Array<{
        campaignId: string;
        ruleName: string;
        actionType: string;
      }>
    };

    try {
      // Get all active campaigns for this shop
      const campaigns = await db.campaign.findMany({
        where: {
          shop: this.shop,
          status: 'ACTIVE'
        }
      });

      const optimizationRules = this.getDefaultOptimizationRules().filter(rule => rule.isActive);

      for (const campaign of campaigns) {
        results.processed++;

        try {
          // Analyze campaign performance
          const performance = await this.analyzeCampaignPerformance(
            campaign.facebookCampaignId,
            24 // 24 hour timeframe
          );

          if (!performance) {
            console.log(`No performance data for campaign ${campaign.facebookCampaignId}`);
            continue;
          }

          // Check each optimization rule
          for (const rule of optimizationRules) {
            if (this.checkOptimizationRule(rule, performance)) {
              console.log(`Optimization rule triggered: ${rule.name} for campaign ${campaign.facebookCampaignId}`);
              
              const success = await this.executeOptimizationAction(rule, campaign.facebookCampaignId, performance);
              
              if (success) {
                results.optimized++;
                results.actions.push({
                  campaignId: campaign.facebookCampaignId,
                  ruleName: rule.name,
                  actionType: rule.action.type
                });
              }
            }
          }
        } catch (campaignError) {
          console.error(`Error processing campaign ${campaign.facebookCampaignId}:`, campaignError);
          results.errors++;
        }
      }

      console.log('Optimization completed:', results);
      return results;
    } catch (error) {
      console.error('Optimization run failed:', error);
      throw error;
    }
  }

  // Get optimization recommendations without executing
  async getOptimizationRecommendations(): Promise<Array<{
    campaignId: string;
    campaignName: string;
    recommendations: Array<{
      rule: string;
      action: string;
      reason: string;
      impact: 'low' | 'medium' | 'high';
    }>;
  }>> {
    const recommendations = [];

    try {
      const campaigns = await db.campaign.findMany({
        where: {
          shop: this.shop,
          status: 'ACTIVE'
        }
      });

      for (const campaign of campaigns) {
        const performance = await this.analyzeCampaignPerformance(campaign.facebookCampaignId, 48);
        
        if (!performance) continue;

        const campaignRecommendations = [];
        const rules = this.getDefaultOptimizationRules();

        for (const rule of rules) {
          if (this.checkOptimizationRule(rule, performance)) {
            campaignRecommendations.push({
              rule: rule.name,
              action: rule.action.type,
              reason: this.getRecommendationReason(rule, performance),
              impact: this.getRecommendationImpact(rule, performance)
            });
          }
        }

        if (campaignRecommendations.length > 0) {
          recommendations.push({
            campaignId: campaign.facebookCampaignId,
            campaignName: campaign.name,
            recommendations: campaignRecommendations
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to get optimization recommendations:', error);
      return [];
    }
  }

  private getRecommendationReason(rule: OptimizationRule, performance: CampaignPerformance): string {
    const metricValue = performance[rule.condition.metric as keyof CampaignPerformance] as number;
    
    switch (rule.condition.metric) {
      case 'cpc':
        return `Cost per click (${metricValue.toFixed(2)}) is above threshold (${rule.condition.value})`;
      case 'ctr':
        return `Click-through rate (${metricValue.toFixed(2)}%) is below threshold (${rule.condition.value}%)`;
      case 'roas':
        return `Return on ad spend (${metricValue.toFixed(2)}) is ${rule.condition.operator === 'gt' ? 'above' : 'below'} threshold (${rule.condition.value})`;
      case 'frequency':
        return `Ad frequency (${metricValue.toFixed(2)}) is above threshold (${rule.condition.value})`;
      default:
        return `${rule.condition.metric} is ${rule.condition.operator} ${rule.condition.value}`;
    }
  }

  private getRecommendationImpact(rule: OptimizationRule, performance: CampaignPerformance): 'low' | 'medium' | 'high' {
    // Determine impact based on spend and performance
    if (performance.spend > 100) {
      return 'high';
    } else if (performance.spend > 50) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Add this to your Prisma schema:
/*
model OptimizationLog {
  id              String   @id @default(cuid())
  shop            String
  campaignId      String
  ruleName        String
  ruleId          String
  actionType      String
  triggerMetric   String
  triggerValue    Float
  thresholdValue  Float
  performanceData String
  createdAt       DateTime @default(now())

  @@map("optimization_logs")
}
*/