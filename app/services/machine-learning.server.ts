import { db } from "../db.server";
import * as tf from '@tensorflow/tfjs-node';

export interface MLFeatures {
  // Campaign features
  budget: number;
  duration: number;
  productPrice: number;
  productCategory: number; // encoded
  seasonality: number;
  
  // Audience features
  audienceSize: number;
  ageRange: number;
  genderMix: number;
  interestCount: number;
  
  // Creative features
  headlineLength: number;
  descriptionLength: number;
  hasImage: number;
  hasVideo: number;
  ctaType: number; // encoded
  
  // Competitive features
  competitionLevel: number;
  marketSaturation: number;
  avgCompetitorSpend: number;
  
  // Historical features
  accountAge: number;
  previousCampaigns: number;
  avgHistoricalROAS: number;
}

export interface MLPrediction {
  predictedROAS: number;
  predictedCTR: number;
  predictedCVR: number;
  predictedCPC: number;
  confidence: number;
  riskScore: number;
}

export interface ReinforcementLearningAction {
  type: 'budget' | 'bid' | 'audience' | 'creative';
  action: 'increase' | 'decrease' | 'pause' | 'test';
  magnitude: number; // 0-1 scale
  expectedReward: number;
  confidence: number;
}

export interface ThompsonSamplingResult {
  variant: string;
  probability: number;
  expectedValue: number;
  confidenceInterval: [number, number];
}

export interface CustomerLTVPrediction {
  predictedLTV: number;
  paybackPeriod: number; // days
  churnProbability: number;
  optimalCAC: number;
  segmentProbabilities: { [segment: string]: number };
}

export class MachineLearningService {
  private performanceModel: tf.LayersModel | null = null;
  private ltvModel: tf.LayersModel | null = null;
  private reinforcementAgent: ReinforcementLearningAgent;
  private thompsonSampler: ThompsonSampler;

  constructor() {
    this.reinforcementAgent = new ReinforcementLearningAgent();
    this.thompsonSampler = new ThompsonSampler();
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      // Try to load existing models
      this.performanceModel = await tf.loadLayersModel('file://./models/performance_model.json');
      this.ltvModel = await tf.loadLayersModel('file://./models/ltv_model.json');
    } catch (error) {
      console.log('No existing models found, will train new ones');
      await this.trainModels();
    }
  }

  async trainModels(): Promise<void> {
    console.log('Training machine learning models...');
    
    // Get historical campaign data
    const historicalData = await this.getHistoricalTrainingData();
    
    if (historicalData.length < 100) {
      console.log('Insufficient data for training, using pre-trained models');
      await this.loadPretrainedModels();
      return;
    }

    // Train performance prediction model
    await this.trainPerformanceModel(historicalData);
    
    // Train LTV prediction model
    await this.trainLTVModel(historicalData);
    
    console.log('Model training completed');
  }

  private async trainPerformanceModel(data: any[]): Promise<void> {
    // Prepare features and labels
    const features = data.map(d => this.extractFeatures(d));
    const labels = data.map(d => [d.roas, d.ctr, d.cvr, d.cpc]);

    // Create feature tensor
    const xs = tf.tensor2d(features.map(f => Object.values(f)));
    const ys = tf.tensor2d(labels);

    // Define model architecture
    this.performanceModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [Object.keys(features[0]).length], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'linear' }) // ROAS, CTR, CVR, CPC
      ]
    });

    // Compile model
    this.performanceModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Train model
    await this.performanceModel.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
          }
        }
      }
    });

    // Save model
    await this.performanceModel.save('file://./models/performance_model');

    // Clean up tensors
    xs.dispose();
    ys.dispose();
  }

  private async trainLTVModel(data: any[]): Promise<void> {
    // Filter data for customers with sufficient history
    const ltvData = data.filter(d => d.customerAge > 90); // At least 90 days of history

    if (ltvData.length < 50) {
      console.log('Insufficient LTV data, using default model');
      return;
    }

    const features = ltvData.map(d => this.extractLTVFeatures(d));
    const labels = ltvData.map(d => [d.actualLTV, d.churnProbability]);

    const xs = tf.tensor2d(features.map(f => Object.values(f)));
    const ys = tf.tensor2d(labels);

    // LTV model architecture
    this.ltvModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [Object.keys(features[0]).length], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 2, activation: 'linear' }) // LTV, churn probability
      ]
    });

    this.ltvModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    await this.ltvModel.fit(xs, ys, {
      epochs: 50,
      batchSize: 16,
      validationSplit: 0.2
    });

    await this.ltvModel.save('file://./models/ltv_model');

    xs.dispose();
    ys.dispose();
  }

  async predictCampaignPerformance(
    campaignFeatures: Partial<MLFeatures>
  ): Promise<MLPrediction> {
    if (!this.performanceModel) {
      await this.loadPretrainedModels();
    }

    // Fill in missing features with defaults
    const features = this.normalizeFeatures({
      budget: 100,
      duration: 30,
      productPrice: 50,
      productCategory: 1,
      seasonality: 1,
      audienceSize: 1000000,
      ageRange: 2,
      genderMix: 0.5,
      interestCount: 5,
      headlineLength: 50,
      descriptionLength: 100,
      hasImage: 1,
      hasVideo: 0,
      ctaType: 1,
      competitionLevel: 0.5,
      marketSaturation: 0.3,
      avgCompetitorSpend: 1000,
      accountAge: 365,
      previousCampaigns: 5,
      avgHistoricalROAS: 2.0,
      ...campaignFeatures
    });

    const input = tf.tensor2d([Object.values(features)]);
    const prediction = this.performanceModel!.predict(input) as tf.Tensor;
    const results = await prediction.data();

    // Calculate confidence based on feature similarity to training data
    const confidence = this.calculatePredictionConfidence(features);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(features, results);

    input.dispose();
    prediction.dispose();

    return {
      predictedROAS: Math.max(0, results[0]),
      predictedCTR: Math.max(0, Math.min(10, results[1])), // Cap at 10%
      predictedCVR: Math.max(0, Math.min(20, results[2])), // Cap at 20%
      predictedCPC: Math.max(0.1, results[3]), // Minimum $0.10
      confidence,
      riskScore
    };
  }

  async predictCustomerLTV(
    customerFeatures: any
  ): Promise<CustomerLTVPrediction> {
    if (!this.ltvModel) {
      await this.loadPretrainedModels();
    }

    const features = this.extractLTVFeatures(customerFeatures);
    const input = tf.tensor2d([Object.values(features)]);
    const prediction = this.ltvModel!.predict(input) as tf.Tensor;
    const results = await prediction.data();

    input.dispose();
    prediction.dispose();

    const predictedLTV = Math.max(0, results[0]);
    const churnProbability = Math.max(0, Math.min(1, results[1]));

    return {
      predictedLTV,
      paybackPeriod: this.calculatePaybackPeriod(predictedLTV, customerFeatures.averageOrderValue),
      churnProbability,
      optimalCAC: predictedLTV * 0.33, // Target 3:1 LTV:CAC ratio
      segmentProbabilities: this.calculateSegmentProbabilities(features)
    };
  }

  async getReinforcementLearningAction(
    campaignId: string,
    currentState: any,
    availableActions: string[]
  ): Promise<ReinforcementLearningAction> {
    return await this.reinforcementAgent.selectAction(campaignId, currentState, availableActions);
  }

  async updateReinforcementLearning(
    campaignId: string,
    action: ReinforcementLearningAction,
    reward: number,
    newState: any
  ): Promise<void> {
    await this.reinforcementAgent.updateQTable(campaignId, action, reward, newState);
  }

  async runThompsonSampling(
    variants: string[],
    historicalData: { [variant: string]: { successes: number; trials: number } }
  ): Promise<ThompsonSamplingResult[]> {
    return this.thompsonSampler.sample(variants, historicalData);
  }

  // Helper methods
  private extractFeatures(campaignData: any): MLFeatures {
    return {
      budget: campaignData.budget || 100,
      duration: campaignData.duration || 30,
      productPrice: campaignData.productPrice || 50,
      productCategory: this.encodeCategoryToNumber(campaignData.productCategory),
      seasonality: this.calculateSeasonality(new Date()),
      audienceSize: campaignData.audienceSize || 1000000,
      ageRange: this.encodeAgeRange(campaignData.ageRange),
      genderMix: campaignData.genderMix || 0.5,
      interestCount: campaignData.interestCount || 5,
      headlineLength: campaignData.headlineLength || 50,
      descriptionLength: campaignData.descriptionLength || 100,
      hasImage: campaignData.hasImage ? 1 : 0,
      hasVideo: campaignData.hasVideo ? 1 : 0,
      ctaType: this.encodeCTAToNumber(campaignData.ctaType),
      competitionLevel: campaignData.competitionLevel || 0.5,
      marketSaturation: campaignData.marketSaturation || 0.3,
      avgCompetitorSpend: campaignData.avgCompetitorSpend || 1000,
      accountAge: campaignData.accountAge || 365,
      previousCampaigns: campaignData.previousCampaigns || 5,
      avgHistoricalROAS: campaignData.avgHistoricalROAS || 2.0
    };
  }

  private extractLTVFeatures(customerData: any): any {
    return {
      firstOrderValue: customerData.firstOrderValue || 50,
      daysSinceFirstOrder: customerData.daysSinceFirstOrder || 30,
      totalOrders: customerData.totalOrders || 1,
      totalSpent: customerData.totalSpent || 50,
      averageOrderValue: customerData.averageOrderValue || 50,
      daysBetweenOrders: customerData.daysBetweenOrders || 30,
      productCategories: customerData.productCategories || 1,
      channelAcquisition: this.encodeChannel(customerData.channelAcquisition),
      seasonalityScore: this.calculateSeasonality(new Date()),
      supportTickets: customerData.supportTickets || 0,
      returnsCount: customerData.returnsCount || 0,
      emailEngagement: customerData.emailEngagement || 0.5,
      socialEngagement: customerData.socialEngagement || 0.3
    };
  }

  private normalizeFeatures(features: MLFeatures): MLFeatures {
    // Normalize features to 0-1 range for better model performance
    return {
      budget: Math.log(features.budget + 1) / 10, // Log normalize budget
      duration: features.duration / 365, // Normalize to year
      productPrice: Math.log(features.productPrice + 1) / 10,
      productCategory: features.productCategory / 10,
      seasonality: features.seasonality,
      audienceSize: Math.log(features.audienceSize + 1) / 20,
      ageRange: features.ageRange / 5,
      genderMix: features.genderMix,
      interestCount: features.interestCount / 20,
      headlineLength: features.headlineLength / 100,
      descriptionLength: features.descriptionLength / 500,
      hasImage: features.hasImage,
      hasVideo: features.hasVideo,
      ctaType: features.ctaType / 10,
      competitionLevel: features.competitionLevel,
      marketSaturation: features.marketSaturation,
      avgCompetitorSpend: Math.log(features.avgCompetitorSpend + 1) / 15,
      accountAge: features.accountAge / 365,
      previousCampaigns: Math.min(features.previousCampaigns / 50, 1),
      avgHistoricalROAS: Math.min(features.avgHistoricalROAS / 10, 1)
    };
  }

  private calculatePredictionConfidence(features: MLFeatures): number {
    // Calculate confidence based on how similar features are to training data
    // This is a simplified version - in production, you'd use more sophisticated methods
    let confidence = 0.8; // Base confidence

    // Reduce confidence for extreme values
    if (features.budget > 10000) confidence -= 0.1;
    if (features.audienceSize < 10000) confidence -= 0.1;
    if (features.productPrice > 1000) confidence -= 0.1;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private calculateRiskScore(features: MLFeatures, predictions: Float32Array): number {
    let risk = 0;

    // High risk factors
    if (predictions[0] < 1.0) risk += 0.3; // Low predicted ROAS
    if (predictions[1] < 0.5) risk += 0.2; // Low predicted CTR
    if (features.competitionLevel > 0.8) risk += 0.2; // High competition
    if (features.accountAge < 30) risk += 0.1; // New account
    if (features.previousCampaigns < 2) risk += 0.1; // Limited experience

    return Math.min(1.0, risk);
  }

  private calculatePaybackPeriod(ltv: number, aov: number): number {
    // Estimate payback period based on LTV and AOV
    const estimatedOrders = ltv / aov;
    const avgDaysBetweenOrders = 45; // Assumption
    return estimatedOrders * avgDaysBetweenOrders;
  }

  private calculateSegmentProbabilities(features: any): { [segment: string]: number } {
    // Simplified segmentation based on features
    return {
      'high_value': features.firstOrderValue > 100 ? 0.7 : 0.3,
      'frequent_buyer': features.daysBetweenOrders < 30 ? 0.8 : 0.2,
      'loyal_customer': features.totalOrders > 5 ? 0.9 : 0.1,
      'at_risk': features.daysSinceFirstOrder > 90 ? 0.6 : 0.1
    };
  }

  // Encoding helper methods
  private encodeCategoryToNumber(category: string): number {
    const categories: { [key: string]: number } = {
      'fashion': 1, 'electronics': 2, 'home': 3, 'beauty': 4, 'sports': 5,
      'books': 6, 'toys': 7, 'automotive': 8, 'health': 9, 'other': 10
    };
    return categories[category?.toLowerCase()] || 10;
  }

  private encodeAgeRange(ageRange: string): number {
    const ranges: { [key: string]: number } = {
      '18-24': 1, '25-34': 2, '35-44': 3, '45-54': 4, '55-64': 5, '65+': 6
    };
    return ranges[ageRange] || 2;
  }

  private encodeCTAToNumber(cta: string): number {
    const ctas: { [key: string]: number } = {
      'SHOP_NOW': 1, 'LEARN_MORE': 2, 'SIGN_UP': 3, 'DOWNLOAD': 4,
      'GET_QUOTE': 5, 'CONTACT_US': 6, 'BOOK_NOW': 7, 'OTHER': 8
    };
    return ctas[cta] || 1;
  }

  private encodeChannel(channel: string): number {
    const channels: { [key: string]: number } = {
      'facebook': 1, 'google': 2, 'instagram': 3, 'email': 4,
      'organic': 5, 'referral': 6, 'direct': 7, 'other': 8
    };
    return channels[channel?.toLowerCase()] || 1;
  }

  private calculateSeasonality(date: Date): number {
    const month = date.getMonth() + 1;
    // Higher values for holiday seasons
    const seasonalityMap: { [key: number]: number } = {
      1: 0.8, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9, 6: 0.8,
      7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0, 11: 1.2, 12: 1.3
    };
    return seasonalityMap[month] || 1.0;
  }

  private async getHistoricalTrainingData(): Promise<any[]> {
    // Get historical campaign data from database
    const campaigns = await db.campaign.findMany({
      where: {
        spend: { gt: 0 },
        impressions: { gt: 0 }
      },
      take: 1000,
      orderBy: { createdAt: 'desc' }
    });

    return campaigns.map(campaign => ({
      budget: campaign.budget,
      spend: campaign.spend,
      revenue: campaign.revenue,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      roas: campaign.revenue / (campaign.spend || 1),
      ctr: (campaign.clicks / (campaign.impressions || 1)) * 100,
      cvr: (campaign.conversions / (campaign.clicks || 1)) * 100,
      cpc: campaign.spend / (campaign.clicks || 1),
      // Add more features as needed
      productCategory: 'other',
      duration: 30,
      productPrice: 50,
      // ... other features with defaults
    }));
  }

  private async loadPretrainedModels(): Promise<void> {
    // Load pre-trained models or create simple baseline models
    console.log('Loading baseline models...');
    
    // Create simple baseline models
    this.performanceModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'linear' })
      ]
    });

    this.ltvModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [13], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 2, activation: 'linear' })
      ]
    });

    // Initialize with random weights (in production, load actual pre-trained weights)
    this.performanceModel.compile({ optimizer: 'adam', loss: 'mse' });
    this.ltvModel.compile({ optimizer: 'adam', loss: 'mse' });
  }
}

// Reinforcement Learning Agent for dynamic optimization
class ReinforcementLearningAgent {
  private qTable: Map<string, Map<string, number>> = new Map();
  private learningRate = 0.1;
  private discountFactor = 0.95;
  private explorationRate = 0.1;

  async selectAction(
    campaignId: string,
    state: any,
    availableActions: string[]
  ): Promise<ReinforcementLearningAction> {
    const stateKey = this.encodeState(state);
    
    if (!this.qTable.has(campaignId)) {
      this.qTable.set(campaignId, new Map());
    }

    const campaignQTable = this.qTable.get(campaignId)!;

    // Epsilon-greedy action selection
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
      return this.createAction(randomAction, Math.random());
    } else {
      // Exploit: best known action
      let bestAction = availableActions[0];
      let bestValue = campaignQTable.get(`${stateKey}_${bestAction}`) || 0;

      for (const action of availableActions) {
        const value = campaignQTable.get(`${stateKey}_${action}`) || 0;
        if (value > bestValue) {
          bestValue = value;
          bestAction = action;
        }
      }

      return this.createAction(bestAction, bestValue);
    }
  }

  async updateQTable(
    campaignId: string,
    action: ReinforcementLearningAction,
    reward: number,
    newState: any
  ): Promise<void> {
    const stateKey = this.encodeState(newState);
    const actionKey = `${stateKey}_${action.type}_${action.action}`;

    if (!this.qTable.has(campaignId)) {
      this.qTable.set(campaignId, new Map());
    }

    const campaignQTable = this.qTable.get(campaignId)!;
    const currentQ = campaignQTable.get(actionKey) || 0;

    // Q-learning update rule
    const maxFutureQ = this.getMaxQValue(campaignId, stateKey);
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxFutureQ - currentQ);

    campaignQTable.set(actionKey, newQ);

    // Decay exploration rate
    this.explorationRate = Math.max(0.01, this.explorationRate * 0.995);
  }

  private encodeState(state: any): string {
    // Encode state into a string key
    return `roas_${Math.floor(state.roas * 10)}_ctr_${Math.floor(state.ctr * 10)}_spend_${Math.floor(state.spend / 100)}`;
  }

  private getMaxQValue(campaignId: string, stateKey: string): number {
    const campaignQTable = this.qTable.get(campaignId);
    if (!campaignQTable) return 0;

    let maxQ = 0;
    for (const [key, value] of campaignQTable.entries()) {
      if (key.startsWith(stateKey) && value > maxQ) {
        maxQ = value;
      }
    }
    return maxQ;
  }

  private createAction(actionType: string, expectedReward: number): ReinforcementLearningAction {
    const [type, action] = actionType.split('_');
    return {
      type: type as any,
      action: action as any,
      magnitude: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
      expectedReward,
      confidence: Math.min(expectedReward / 10, 1)
    };
  }
}

// Thompson Sampling for A/B testing
class ThompsonSampler {
  sample(
    variants: string[],
    historicalData: { [variant: string]: { successes: number; trials: number } }
  ): ThompsonSamplingResult[] {
    const results: ThompsonSamplingResult[] = [];

    for (const variant of variants) {
      const data = historicalData[variant] || { successes: 1, trials: 2 }; // Prior
      
      // Beta distribution parameters
      const alpha = data.successes + 1; // Add 1 for prior
      const beta = data.trials - data.successes + 1; // Add 1 for prior

      // Sample from Beta distribution (simplified)
      const sample = this.sampleBeta(alpha, beta);
      
      // Calculate confidence interval
      const mean = alpha / (alpha + beta);
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
      const stdDev = Math.sqrt(variance);
      
      results.push({
        variant,
        probability: sample,
        expectedValue: mean,
        confidenceInterval: [
          Math.max(0, mean - 1.96 * stdDev),
          Math.min(1, mean + 1.96 * stdDev)
        ]
      });
    }

    return results.sort((a, b) => b.probability - a.probability);
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Simplified Beta distribution sampling
    // In production, use a proper statistical library
    const gamma1 = this.sampleGamma(alpha);
    const gamma2 = this.sampleGamma(beta);
    return gamma1 / (gamma1 + gamma2);
  }

  private sampleGamma(shape: number): number {
    // Simplified Gamma distribution sampling
    // This is a very basic implementation - use a proper library in production
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      let x = this.sampleNormal();
      let v = 1 + c * x;
      
      if (v <= 0) continue;
      
      v = v * v * v;
      const u = Math.random();
      
      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }
      
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  private sampleNormal(): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}