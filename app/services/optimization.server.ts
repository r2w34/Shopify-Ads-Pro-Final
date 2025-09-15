import { db } from "../db.server";
import { OpenAIService } from "./openai.server";
import { FacebookAdsService } from "./facebook.server";
import { CompetitiveIntelligenceService } from "./competitive-intelligence.server";
import { MachineLearningService } from "./machine-learning.server";

export interface OptimizationMetrics {
  roas: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  confidence: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface OptimizationRecommendation {
  type: 'budget' | 'creative' | 'audience' | 'bidding';
  action: 'increase' | 'decrease' | 'pause' | 'test' | 'optimize';
  currentValue: any;
  recommendedValue: any;
  expectedImprovement: number;
  confidence: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CampaignOptimization {
  campaignId: string;
  currentPerformance: OptimizationMetrics;
  recommendations: OptimizationRecommendation[];
  predictedROAS: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextOptimizationDate: Date;
}

export class OptimizationEngine {
  private openaiService: OpenAIService;
  private competitiveIntelligence: CompetitiveIntelligenceService;
  private machineLearning: MachineLearningService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.competitiveIntelligence = new CompetitiveIntelligenceService();
    this.machineLearning = new MachineLearningService();
  }

  async optimizeCampaign(campaignId: string, shop: string): Promise<CampaignOptimization> {
    // Get campaign data with performance metrics
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        ads: true,
        adSets: true,
        facebookAccount: true
      }
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Calculate current performance metrics
    const currentPerformance = this.calculatePerformanceMetrics(campaign);

    // Get competitive intelligence insights
    const competitiveInsights = await this.getCompetitiveInsights(campaign);

    // Get ML predictions
    const mlPrediction = await this.getMachineLearningPredictions(campaign);

    // Get reinforcement learning recommendations
    const rlAction = await this.getReinforcementLearningAction(campaign, currentPerformance);

    // Generate comprehensive optimization recommendations
    const recommendations = await this.generateAdvancedRecommendations(
      campaign, 
      currentPerformance, 
      competitiveInsights,
      mlPrediction,
      rlAction
    );

    // Predict future performance using ML
    const predictedROAS = mlPrediction.predictedROAS;

    // Assess risk level using ML
    const riskLevel = this.assessAdvancedRiskLevel(campaign, currentPerformance, mlPrediction);

    // Calculate next optimization date
    const nextOptimizationDate = this.calculateNextOptimizationDate(campaign, currentPerformance);

    return {
      campaignId,
      currentPerformance,
      recommendations,
      predictedROAS,
      riskLevel,
      nextOptimizationDate
    };
  }

  private async getCompetitiveInsights(campaign: any): Promise<any> {
    try {
      // Extract product category and competitors
      const productData = JSON.parse(campaign.productIds || '[]')[0];
      if (!productData) return null;

      const productCategory = productData.category || 'general';
      const competitors = this.extractCompetitorKeywords(productData);

      // Analyze competitors
      const competitorAnalyses = await this.competitiveIntelligence.analyzeCompetitors(
        productCategory,
        competitors,
        'US'
      );

      // Generate insights
      const insights = await this.competitiveIntelligence.generateCompetitiveInsights(
        productCategory,
        competitorAnalyses,
        productData
      );

      return { competitorAnalyses, insights };
    } catch (error) {
      console.error('Error getting competitive insights:', error);
      return null;
    }
  }

  private async getMachineLearningPredictions(campaign: any): Promise<any> {
    try {
      // Extract features for ML model
      const features = {
        budget: campaign.budget,
        duration: 30, // Default duration
        productPrice: this.extractProductPrice(campaign),
        productCategory: this.extractProductCategory(campaign),
        seasonality: this.calculateSeasonality(new Date()),
        audienceSize: campaign.audienceSize || 1000000,
        ageRange: 2, // Default age range
        genderMix: 0.5,
        interestCount: 5,
        headlineLength: campaign.name?.length || 50,
        descriptionLength: 100,
        hasImage: 1,
        hasVideo: 0,
        ctaType: 1,
        competitionLevel: 0.5,
        marketSaturation: 0.3,
        avgCompetitorSpend: 1000,
        accountAge: 365,
        previousCampaigns: 5,
        avgHistoricalROAS: 2.0
      };

      return await this.machineLearning.predictCampaignPerformance(features);
    } catch (error) {
      console.error('Error getting ML predictions:', error);
      return {
        predictedROAS: 2.0,
        predictedCTR: 1.5,
        predictedCVR: 3.0,
        predictedCPC: 1.0,
        confidence: 0.5,
        riskScore: 0.3
      };
    }
  }

  private async getReinforcementLearningAction(campaign: any, performance: any): Promise<any> {
    try {
      const state = {
        roas: performance.roas,
        ctr: performance.ctr,
        spend: campaign.spend || 0,
        conversions: campaign.conversions || 0
      };

      const availableActions = [
        'budget_increase', 'budget_decrease', 'bid_increase', 'bid_decrease',
        'audience_expand', 'audience_narrow', 'creative_test'
      ];

      return await this.machineLearning.getReinforcementLearningAction(
        campaign.id,
        state,
        availableActions
      );
    } catch (error) {
      console.error('Error getting RL action:', error);
      return null;
    }
  }

  private async generateAdvancedRecommendations(
    campaign: any,
    performance: any,
    competitiveInsights: any,
    mlPrediction: any,
    rlAction: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Traditional recommendations
    const basicRecs = await this.generateRecommendations(campaign, performance);
    recommendations.push(...basicRecs);

    // Competitive intelligence recommendations
    if (competitiveInsights?.insights) {
      const competitiveRecs = this.generateCompetitiveRecommendations(competitiveInsights.insights);
      recommendations.push(...competitiveRecs);
    }

    // Machine learning recommendations
    if (mlPrediction) {
      const mlRecs = this.generateMLRecommendations(mlPrediction, performance);
      recommendations.push(...mlRecs);
    }

    // Reinforcement learning recommendations
    if (rlAction) {
      const rlRec = this.generateRLRecommendation(rlAction);
      recommendations.push(rlRec);
    }

    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
      })
      .slice(0, 5); // Top 5 recommendations
  }

  private generateCompetitiveRecommendations(insights: any): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Winning headlines recommendation
    if (insights.winningHeadlines?.length > 0) {
      recommendations.push({
        type: 'creative',
        action: 'test',
        currentValue: 'Current headlines',
        recommendedValue: insights.winningHeadlines.slice(0, 3),
        expectedImprovement: 0.25,
        confidence: 0.8,
        reasoning: 'Competitors are seeing success with these headline patterns',
        priority: 'high'
      });
    }

    // Winning CTAs recommendation
    if (insights.winningCTAs?.length > 0) {
      recommendations.push({
        type: 'creative',
        action: 'optimize',
        currentValue: 'Current CTA',
        recommendedValue: insights.winningCTAs[0],
        expectedImprovement: 0.15,
        confidence: 0.7,
        reasoning: `Top competitors are using "${insights.winningCTAs[0]}" CTA with success`,
        priority: 'medium'
      });
    }

    // Budget recommendations based on competitor spend
    if (insights.budgetRecommendations?.length > 0) {
      recommendations.push({
        type: 'budget',
        action: 'optimize',
        currentValue: 'Current budget allocation',
        recommendedValue: insights.budgetRecommendations[0],
        expectedImprovement: 0.20,
        confidence: 0.6,
        reasoning: 'Based on successful competitor budget strategies',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private generateMLRecommendations(mlPrediction: any, currentPerformance: any): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // High risk score recommendation
    if (mlPrediction.riskScore > 0.7) {
      recommendations.push({
        type: 'budget',
        action: 'decrease',
        currentValue: 'Current budget',
        recommendedValue: 'Reduce budget by 30%',
        expectedImprovement: 0,
        confidence: mlPrediction.confidence,
        reasoning: `ML model predicts high risk (${(mlPrediction.riskScore * 100).toFixed(1)}%)`,
        priority: 'high'
      });
    }

    // Low predicted performance
    if (mlPrediction.predictedROAS < currentPerformance.roas * 0.8) {
      recommendations.push({
        type: 'audience',
        action: 'optimize',
        currentValue: 'Current targeting',
        recommendedValue: 'Refine audience based on ML insights',
        expectedImprovement: 0.3,
        confidence: mlPrediction.confidence,
        reasoning: 'ML model predicts declining performance with current targeting',
        priority: 'high'
      });
    }

    // Predicted CTR optimization
    if (mlPrediction.predictedCTR > currentPerformance.ctr * 1.2) {
      recommendations.push({
        type: 'creative',
        action: 'test',
        currentValue: 'Current creatives',
        recommendedValue: 'Test ML-optimized creative variations',
        expectedImprovement: (mlPrediction.predictedCTR - currentPerformance.ctr) / currentPerformance.ctr,
        confidence: mlPrediction.confidence,
        reasoning: `ML model predicts ${mlPrediction.predictedCTR.toFixed(2)}% CTR with optimized creatives`,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private generateRLRecommendation(rlAction: any): OptimizationRecommendation {
    return {
      type: rlAction.type,
      action: rlAction.action,
      currentValue: `Current ${rlAction.type}`,
      recommendedValue: `${rlAction.action} by ${(rlAction.magnitude * 100).toFixed(1)}%`,
      expectedImprovement: rlAction.expectedReward,
      confidence: rlAction.confidence,
      reasoning: 'Reinforcement learning agent recommends this action based on historical performance',
      priority: rlAction.expectedReward > 0.2 ? 'high' : 'medium'
    };
  }

  private assessAdvancedRiskLevel(campaign: any, performance: any, mlPrediction: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Traditional risk factors
    if (performance.confidence < 0.5) riskScore += 2;
    if (performance.roas < 1.0) riskScore += 2;
    if (performance.trend === 'declining') riskScore += 1;

    // ML risk factors
    if (mlPrediction.riskScore > 0.7) riskScore += 3;
    if (mlPrediction.confidence < 0.6) riskScore += 1;
    if (mlPrediction.predictedROAS < 1.0) riskScore += 2;

    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  // Helper methods for competitive intelligence
  private extractCompetitorKeywords(productData: any): string[] {
    const keywords = [];
    
    if (productData.title) {
      // Extract brand names and product types from title
      const words = productData.title.split(' ').filter((word: string) => word.length > 3);
      keywords.push(...words.slice(0, 3));
    }
    
    if (productData.category) {
      keywords.push(productData.category);
    }
    
    // Add generic competitors based on category
    const categoryCompetitors: { [key: string]: string[] } = {
      'fashion': ['nike', 'adidas', 'zara', 'h&m'],
      'electronics': ['apple', 'samsung', 'sony', 'lg'],
      'beauty': ['sephora', 'ulta', 'loreal', 'maybelline'],
      'home': ['ikea', 'wayfair', 'target', 'walmart']
    };
    
    const category = productData.category?.toLowerCase();
    if (category && categoryCompetitors[category]) {
      keywords.push(...categoryCompetitors[category]);
    }
    
    return keywords.slice(0, 5); // Limit to 5 competitors
  }

  private extractProductPrice(campaign: any): number {
    try {
      const productData = JSON.parse(campaign.productIds || '[]')[0];
      return parseFloat(productData?.price || '50');
    } catch {
      return 50; // Default price
    }
  }

  private extractProductCategory(campaign: any): string {
    try {
      const productData = JSON.parse(campaign.productIds || '[]')[0];
      return productData?.category || 'other';
    } catch {
      return 'other';
    }
  }

  private calculateSeasonality(date: Date): number {
    const month = date.getMonth() + 1;
    const seasonalityMap: { [key: number]: number } = {
      1: 0.8, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9, 6: 0.8,
      7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0, 11: 1.2, 12: 1.3
    };
    return seasonalityMap[month] || 1.0;
  }

  private calculatePerformanceMetrics(campaign: any): OptimizationMetrics {
    const impressions = campaign.impressions || 1;
    const clicks = campaign.clicks || 0;
    const conversions = campaign.conversions || 0;
    const spend = campaign.spend || 0.01;
    const revenue = campaign.revenue || 0;

    const roas = revenue / spend;
    const ctr = (clicks / impressions) * 100;
    const cpc = spend / (clicks || 1);
    const conversionRate = (conversions / (clicks || 1)) * 100;

    // Calculate confidence based on data volume and consistency
    const confidence = this.calculateConfidence(impressions, clicks, conversions);

    // Determine trend based on recent performance
    const trend = this.calculateTrend(campaign);

    return {
      roas,
      ctr,
      cpc,
      conversionRate,
      confidence,
      trend
    };
  }

  private async generateRecommendations(
    campaign: any, 
    performance: OptimizationMetrics
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Budget optimization recommendations
    const budgetRec = this.generateBudgetRecommendation(campaign, performance);
    if (budgetRec) recommendations.push(budgetRec);

    // Creative optimization recommendations
    const creativeRec = await this.generateCreativeRecommendation(campaign, performance);
    if (creativeRec) recommendations.push(creativeRec);

    // Audience optimization recommendations
    const audienceRec = this.generateAudienceRecommendation(campaign, performance);
    if (audienceRec) recommendations.push(audienceRec);

    // Bidding optimization recommendations
    const biddingRec = this.generateBiddingRecommendation(campaign, performance);
    if (biddingRec) recommendations.push(biddingRec);

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
    });
  }

  private generateBudgetRecommendation(
    campaign: any, 
    performance: OptimizationMetrics
  ): OptimizationRecommendation | null {
    const currentBudget = campaign.budget || 0;
    
    // If ROAS is good and we're not spending full budget, increase
    if (performance.roas > 2.0 && performance.confidence > 0.7) {
      const recommendedIncrease = Math.min(currentBudget * 0.5, 100); // Max $100 increase
      
      return {
        type: 'budget',
        action: 'increase',
        currentValue: currentBudget,
        recommendedValue: currentBudget + recommendedIncrease,
        expectedImprovement: 0.3, // 30% more conversions expected
        confidence: performance.confidence,
        reasoning: `Strong ROAS of ${performance.roas.toFixed(2)}x indicates room for budget increase`,
        priority: 'high'
      };
    }

    // If ROAS is poor, decrease budget or pause
    if (performance.roas < 1.0 && performance.confidence > 0.5) {
      return {
        type: 'budget',
        action: performance.roas < 0.5 ? 'pause' : 'decrease',
        currentValue: currentBudget,
        recommendedValue: performance.roas < 0.5 ? 0 : currentBudget * 0.7,
        expectedImprovement: 0, // Cost savings
        confidence: performance.confidence,
        reasoning: `Poor ROAS of ${performance.roas.toFixed(2)}x requires budget reduction`,
        priority: 'high'
      };
    }

    return null;
  }

  private async generateCreativeRecommendation(
    campaign: any, 
    performance: OptimizationMetrics
  ): Promise<OptimizationRecommendation | null> {
    // If CTR is low, suggest creative optimization
    if (performance.ctr < 1.0 && performance.confidence > 0.5) {
      try {
        // Use AI to generate new creative suggestions
        const productData = JSON.parse(campaign.productIds || '[]')[0];
        if (productData) {
          const newCreatives = await this.openaiService.generateHeadlines(
            {
              id: productData.id,
              title: productData.title || 'Product',
              description: productData.description || '',
              price: productData.price || '0'
            },
            3,
            campaign.shop
          );

          return {
            type: 'creative',
            action: 'test',
            currentValue: 'Current ad creative',
            recommendedValue: newCreatives,
            expectedImprovement: 0.4, // 40% CTR improvement expected
            confidence: 0.8,
            reasoning: `Low CTR of ${performance.ctr.toFixed(2)}% suggests creative fatigue`,
            priority: 'medium'
          };
        }
      } catch (error) {
        console.error('Creative recommendation error:', error);
      }
    }

    return null;
  }

  private generateAudienceRecommendation(
    campaign: any, 
    performance: OptimizationMetrics
  ): OptimizationRecommendation | null {
    // If conversion rate is low but CTR is good, audience might be wrong
    if (performance.ctr > 1.5 && performance.conversionRate < 2.0 && performance.confidence > 0.6) {
      return {
        type: 'audience',
        action: 'optimize',
        currentValue: 'Current audience targeting',
        recommendedValue: 'Refined audience based on converters',
        expectedImprovement: 0.5, // 50% conversion rate improvement
        confidence: 0.7,
        reasoning: `Good CTR (${performance.ctr.toFixed(2)}%) but low conversion rate (${performance.conversionRate.toFixed(2)}%) suggests audience mismatch`,
        priority: 'medium'
      };
    }

    return null;
  }

  private generateBiddingRecommendation(
    campaign: any, 
    performance: OptimizationMetrics
  ): OptimizationRecommendation | null {
    // If CPC is high but performance is good, might be overbidding
    if (performance.cpc > 2.0 && performance.roas > 2.0 && performance.confidence > 0.6) {
      return {
        type: 'bidding',
        action: 'decrease',
        currentValue: `$${performance.cpc.toFixed(2)} CPC`,
        recommendedValue: `$${(performance.cpc * 0.8).toFixed(2)} CPC`,
        expectedImprovement: 0.2, // 20% cost reduction
        confidence: 0.6,
        reasoning: `High CPC of $${performance.cpc.toFixed(2)} with good ROAS suggests overbidding`,
        priority: 'low'
      };
    }

    return null;
  }

  private async predictFutureROAS(
    campaign: any, 
    recommendations: OptimizationRecommendation[]
  ): Promise<number> {
    const currentROAS = (campaign.revenue || 0) / (campaign.spend || 0.01);
    
    // Calculate expected improvement from recommendations
    let totalImprovement = 0;
    let totalConfidence = 0;

    for (const rec of recommendations) {
      totalImprovement += rec.expectedImprovement * rec.confidence;
      totalConfidence += rec.confidence;
    }

    const averageImprovement = totalConfidence > 0 ? totalImprovement / totalConfidence : 0;
    
    // Apply improvement with diminishing returns
    const predictedROAS = currentROAS * (1 + averageImprovement * 0.7); // 70% of expected improvement
    
    return Math.max(predictedROAS, 0);
  }

  private assessRiskLevel(campaign: any, performance: OptimizationMetrics): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Low confidence increases risk
    if (performance.confidence < 0.5) riskScore += 2;
    else if (performance.confidence < 0.7) riskScore += 1;

    // Poor performance increases risk
    if (performance.roas < 1.0) riskScore += 2;
    else if (performance.roas < 1.5) riskScore += 1;

    // Declining trend increases risk
    if (performance.trend === 'declining') riskScore += 1;

    // High spend without results increases risk
    const spend = campaign.spend || 0;
    const conversions = campaign.conversions || 0;
    if (spend > 100 && conversions === 0) riskScore += 2;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private calculateNextOptimizationDate(campaign: any, performance: OptimizationMetrics): Date {
    const now = new Date();
    let hoursUntilNext = 24; // Default 24 hours

    // Optimize more frequently for poor performance
    if (performance.roas < 1.0) {
      hoursUntilNext = 6; // Every 6 hours
    } else if (performance.roas < 2.0) {
      hoursUntilNext = 12; // Every 12 hours
    } else if (performance.trend === 'declining') {
      hoursUntilNext = 8; // Every 8 hours
    }

    // Less frequent optimization for stable, good performance
    if (performance.roas > 3.0 && performance.trend === 'stable') {
      hoursUntilNext = 48; // Every 48 hours
    }

    return new Date(now.getTime() + hoursUntilNext * 60 * 60 * 1000);
  }

  private calculateConfidence(impressions: number, clicks: number, conversions: number): number {
    // Confidence based on statistical significance
    let confidence = 0;

    // Impressions confidence (0-0.4)
    if (impressions > 10000) confidence += 0.4;
    else if (impressions > 5000) confidence += 0.3;
    else if (impressions > 1000) confidence += 0.2;
    else if (impressions > 100) confidence += 0.1;

    // Clicks confidence (0-0.3)
    if (clicks > 100) confidence += 0.3;
    else if (clicks > 50) confidence += 0.2;
    else if (clicks > 10) confidence += 0.1;

    // Conversions confidence (0-0.3)
    if (conversions > 20) confidence += 0.3;
    else if (conversions > 10) confidence += 0.2;
    else if (conversions > 5) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private calculateTrend(campaign: any): 'improving' | 'declining' | 'stable' {
    // This would analyze historical performance data
    // For now, return stable as default
    const recentROAS = (campaign.revenue || 0) / (campaign.spend || 0.01);
    
    // Simple trend calculation based on ROAS
    if (recentROAS > 2.5) return 'improving';
    if (recentROAS < 1.0) return 'declining';
    return 'stable';
  }

  async applyOptimizations(
    campaignId: string, 
    recommendations: OptimizationRecommendation[],
    shop: string
  ): Promise<void> {
    const facebookService = await FacebookAdsService.getForShop(shop);
    if (!facebookService) {
      throw new Error("Facebook service not available");
    }

    for (const rec of recommendations) {
      try {
        switch (rec.type) {
          case 'budget':
            if (rec.action === 'increase' || rec.action === 'decrease') {
              await this.updateCampaignBudget(campaignId, rec.recommendedValue);
            } else if (rec.action === 'pause') {
              await this.pauseCampaign(campaignId);
            }
            break;

          case 'creative':
            if (rec.action === 'test') {
              await this.createCreativeTests(campaignId, rec.recommendedValue);
            }
            break;

          // Add other optimization types as needed
        }

        // Log the optimization
        await this.logOptimization(campaignId, rec);

      } catch (error) {
        console.error(`Failed to apply ${rec.type} optimization:`, error);
      }
    }
  }

  private async updateCampaignBudget(campaignId: string, newBudget: number): Promise<void> {
    await db.campaign.update({
      where: { id: campaignId },
      data: { 
        budget: newBudget,
        updatedAt: new Date()
      }
    });
  }

  private async pauseCampaign(campaignId: string): Promise<void> {
    await db.campaign.update({
      where: { id: campaignId },
      data: { 
        status: 'PAUSED',
        updatedAt: new Date()
      }
    });
  }

  private async createCreativeTests(campaignId: string, newCreatives: string[]): Promise<void> {
    // This would create new ad variations for testing
    // Implementation would depend on Facebook Ads API integration
    console.log(`Creating creative tests for campaign ${campaignId}:`, newCreatives);
  }

  private async logOptimization(
    campaignId: string, 
    recommendation: OptimizationRecommendation
  ): Promise<void> {
    // Log optimization for audit trail and learning
    console.log(`Applied ${recommendation.type} optimization to campaign ${campaignId}:`, {
      action: recommendation.action,
      expectedImprovement: recommendation.expectedImprovement,
      confidence: recommendation.confidence
    });
  }
}