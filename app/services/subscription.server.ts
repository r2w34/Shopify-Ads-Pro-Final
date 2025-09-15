import { db } from "../db.server";

export interface CreateSubscriptionData {
  shop: string;
  planId: string;
  shopifyChargeId?: string;
  trialDays?: number;
}

export interface UsageData {
  type: 'campaign_created' | 'ai_request' | 'facebook_sync';
  description?: string;
  metadata?: any;
}

export class SubscriptionService {
  static async createSubscription(data: CreateSubscriptionData) {
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: data.planId }
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    const now = new Date();
    const trialEnd = data.trialDays ? new Date(now.getTime() + (data.trialDays * 24 * 60 * 60 * 1000)) : null;
    const periodEnd = new Date(now.getTime() + (plan.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    return await db.subscription.create({
      data: {
        shop: data.shop,
        planId: data.planId,
        status: trialEnd ? 'trial' : 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        shopifyChargeId: data.shopifyChargeId,
        trialStart: trialEnd ? now : null,
        trialEnd: trialEnd,
        isTrialActive: !!trialEnd,
      },
      include: {
        plan: true
      }
    });
  }

  static async getSubscription(shop: string) {
    return await db.subscription.findUnique({
      where: { shop },
      include: {
        plan: true,
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }

  static async checkUsageLimit(shop: string, type: 'campaigns' | 'ai_requests'): Promise<boolean> {
    const subscription = await this.getSubscription(shop);
    
    if (!subscription || subscription.status !== 'active') {
      return false;
    }

    const plan = subscription.plan;
    
    if (type === 'campaigns') {
      return plan.maxCampaigns === -1 || subscription.campaignsUsed < plan.maxCampaigns;
    } else if (type === 'ai_requests') {
      return plan.maxAIRequests === -1 || subscription.aiRequestsUsed < plan.maxAIRequests;
    }

    return false;
  }

  static async trackUsage(shop: string, usage: UsageData) {
    const subscription = await this.getSubscription(shop);
    
    if (!subscription) {
      throw new Error("No subscription found for shop");
    }

    // Create usage log
    await db.usageLog.create({
      data: {
        subscriptionId: subscription.id,
        type: usage.type,
        description: usage.description,
        metadata: usage.metadata ? JSON.stringify(usage.metadata) : null,
      }
    });

    // Update usage counters
    const updateData: any = {};
    
    if (usage.type === 'campaign_created') {
      updateData.campaignsUsed = { increment: 1 };
    } else if (usage.type === 'ai_request') {
      updateData.aiRequestsUsed = { increment: 1 };
    }

    if (Object.keys(updateData).length > 0) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: updateData
      });
    }
  }

  static async cancelSubscription(shop: string, cancelAtPeriodEnd: boolean = true) {
    return await db.subscription.update({
      where: { shop },
      data: {
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
        updatedAt: new Date()
      }
    });
  }

  static async upgradeSubscription(shop: string, newPlanId: string) {
    const newPlan = await db.subscriptionPlan.findUnique({
      where: { id: newPlanId }
    });

    if (!newPlan) {
      throw new Error("New subscription plan not found");
    }

    return await db.subscription.update({
      where: { shop },
      data: {
        planId: newPlanId,
        updatedAt: new Date()
      },
      include: {
        plan: true
      }
    });
  }

  static async resetUsage(shop: string) {
    return await db.subscription.update({
      where: { shop },
      data: {
        campaignsUsed: 0,
        aiRequestsUsed: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        updatedAt: new Date()
      }
    });
  }

  static async getAllPlans() {
    return await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
  }

  static async createDefaultPlans() {
    const plans = [
      {
        name: "Starter",
        description: "Perfect for small businesses getting started with Facebook ads",
        price: 29.99,
        interval: "monthly",
        features: JSON.stringify([
          "Up to 5 campaigns",
          "100 AI-generated ad copies per month",
          "Basic analytics",
          "Email support"
        ]),
        maxCampaigns: 5,
        maxAIRequests: 100,
        maxFacebookAccounts: 1
      },
      {
        name: "Professional",
        description: "For growing businesses that need more campaigns and AI power",
        price: 79.99,
        interval: "monthly",
        features: JSON.stringify([
          "Up to 25 campaigns",
          "500 AI-generated ad copies per month",
          "Advanced analytics",
          "Priority email support",
          "Campaign optimization suggestions"
        ]),
        maxCampaigns: 25,
        maxAIRequests: 500,
        maxFacebookAccounts: 3
      },
      {
        name: "Enterprise",
        description: "For large businesses with unlimited needs",
        price: 199.99,
        interval: "monthly",
        features: JSON.stringify([
          "Unlimited campaigns",
          "Unlimited AI-generated ad copies",
          "Advanced analytics & reporting",
          "Priority phone & email support",
          "Custom integrations",
          "Dedicated account manager"
        ]),
        maxCampaigns: -1,
        maxAIRequests: -1,
        maxFacebookAccounts: -1
      }
    ];

    for (const planData of plans) {
      await db.subscriptionPlan.upsert({
        where: { name: planData.name },
        update: planData,
        create: planData
      });
    }
  }
}