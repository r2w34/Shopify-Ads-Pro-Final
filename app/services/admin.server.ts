import bcrypt from "bcryptjs";
import { db } from "../db.server";

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface CreateAdminData {
  email: string;
  name: string;
  password: string;
  role: 'super_admin' | 'admin' | 'support';
  permissions: string[];
}

export interface UpdateSettingData {
  key: string;
  value: string;
  description?: string;
  category?: string;
  isEncrypted?: boolean;
}

export class AdminService {
  static async authenticateAdmin(data: AdminLoginData) {
    const admin = await db.adminUser.findUnique({
      where: { email: data.email }
    });

    if (!admin || !admin.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(data.password, admin.passwordHash);
    
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: JSON.parse(admin.permissions)
    };
  }

  static async createAdmin(data: CreateAdminData) {
    const existingAdmin = await db.adminUser.findUnique({
      where: { email: data.email }
    });

    if (existingAdmin) {
      throw new Error("Admin user already exists");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    return await db.adminUser.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        permissions: JSON.stringify(data.permissions)
      }
    });
  }

  static async getAllCustomers(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      db.customer.count()
    ]);

    return {
      customers,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  static async getCustomerDetails(shop: string) {
    const customer = await db.customer.findUnique({
      where: { shop }
    });

    if (!customer) {
      return null;
    }

    // Get subscription info
    const subscription = await db.subscription.findUnique({
      where: { shop },
      include: {
        plan: true,
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    // Get campaigns
    const campaigns = await db.campaign.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get Facebook accounts
    const facebookAccounts = await db.facebookAccount.findMany({
      where: { shop }
    });

    return {
      customer,
      subscription,
      campaigns,
      facebookAccounts,
      stats: {
        totalCampaigns: campaigns.length,
        totalSpend: campaigns.reduce((sum, c) => sum + c.spend, 0),
        totalRevenue: campaigns.reduce((sum, c) => sum + c.revenue, 0),
      }
    };
  }

  static async updateCustomer(shop: string, data: Partial<{
    shopName: string;
    email: string;
    ownerName: string;
    isActive: boolean;
    isBlocked: boolean;
    blockReason: string;
    supportNotes: string;
    supportPriority: string;
  }>, adminUserId: string) {
    const oldCustomer = await db.customer.findUnique({
      where: { shop }
    });

    const updatedCustomer = await db.customer.update({
      where: { shop },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    // Log the change
    await this.logAuditAction({
      adminUserId,
      action: 'customer_updated',
      resource: 'customer',
      resourceId: shop,
      oldValues: oldCustomer,
      newValues: updatedCustomer
    });

    return updatedCustomer;
  }

  static async getAllSubscriptions(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true
        }
      }),
      db.subscription.count()
    ]);

    return {
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getSettings(category?: string) {
    const where = category ? { category } : {};
    
    return await db.adminSettings.findMany({
      where,
      orderBy: { category: 'asc' }
    });
  }

  static async updateSetting(data: UpdateSettingData, adminUserId: string) {
    const oldSetting = await db.adminSettings.findUnique({
      where: { key: data.key }
    });

    const setting = await db.adminSettings.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        description: data.description,
        category: data.category,
        isEncrypted: data.isEncrypted,
        updatedAt: new Date()
      },
      create: {
        key: data.key,
        value: data.value,
        description: data.description,
        category: data.category || 'general',
        isEncrypted: data.isEncrypted || false
      }
    });

    // Log the change
    await this.logAuditAction({
      adminUserId,
      action: 'settings_updated',
      resource: 'settings',
      resourceId: data.key,
      oldValues: oldSetting,
      newValues: setting
    });

    return setting;
  }

  static async getDashboardStats() {
    const [
      totalCustomers,
      activeCustomers,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      recentCustomers
    ] = await Promise.all([
      db.customer.count(),
      db.customer.count({ where: { isActive: true } }),
      db.subscription.count(),
      db.subscription.count({ where: { status: 'active' } }),
      // Calculate total revenue from customers
      db.customer.aggregate({
        _sum: { 
          totalRevenue: true
        }
      }),
      db.customer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          shop: true,
          shopName: true,
          createdAt: true,
          isActive: true
        }
      })
    ]);

    // Get campaign stats
    const campaignStats = await db.campaign.aggregate({
      _sum: {
        spend: true,
        revenue: true,
        impressions: true,
        clicks: true,
        conversions: true
      },
      _count: true
    });

    return {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: totalCustomers - activeCustomers
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        inactive: totalSubscriptions - activeSubscriptions
      },
      campaigns: {
        total: campaignStats._count,
        totalSpend: campaignStats._sum.spend || 0,
        totalRevenue: campaignStats._sum.revenue || 0,
        totalImpressions: campaignStats._sum.impressions || 0,
        totalClicks: campaignStats._sum.clicks || 0,
        totalConversions: campaignStats._sum.conversions || 0
      },
      revenue: {
        total: totalRevenue._sum.totalRevenue || 0
      },
      recentCustomers
    };
  }

  static async logAuditAction(data: {
    adminUserId: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return await db.auditLog.create({
      data: {
        adminUserId: data.adminUserId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      }
    });
  }

  static async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      db.auditLog.count()
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async initializeDefaultSettings() {
    const defaultSettings = [
      // API Settings
      { key: 'openai_api_key', value: '', description: 'OpenAI API Key for AI features', category: 'api', isEncrypted: true },
      { key: 'facebook_app_id', value: '', description: 'Facebook App ID', category: 'api' },
      { key: 'facebook_app_secret', value: '', description: 'Facebook App Secret', category: 'api', isEncrypted: true },
      
      // Feature Flags
      { key: 'ai_features_enabled', value: 'true', description: 'Enable AI-powered features', category: 'features' },
      { key: 'facebook_ads_enabled', value: 'true', description: 'Enable Facebook Ads integration', category: 'features' },
      { key: 'trial_days', value: '14', description: 'Default trial period in days', category: 'billing' },
      
      // General Settings
      { key: 'app_name', value: 'AI Facebook Ads Pro', description: 'Application name', category: 'general' },
      { key: 'support_email', value: 'support@example.com', description: 'Support email address', category: 'general' },
      { key: 'max_campaigns_per_customer', value: '100', description: 'Maximum campaigns per customer', category: 'limits' },
      
      // Billing Settings
      { key: 'stripe_public_key', value: '', description: 'Stripe publishable key', category: 'billing' },
      { key: 'stripe_secret_key', value: '', description: 'Stripe secret key', category: 'billing', isEncrypted: true },
    ];

    for (const setting of defaultSettings) {
      await db.adminSettings.upsert({
        where: { key: setting.key },
        update: {},
        create: setting
      });
    }
  }

  static async createDefaultAdmin() {
    const existingAdmin = await db.adminUser.findFirst({
      where: { role: 'super_admin' }
    });

    if (existingAdmin) {
      return existingAdmin;
    }

    const passwordHash = await bcrypt.hash('admin123', 12);

    return await db.adminUser.create({
      data: {
        email: 'admin@example.com',
        name: 'Super Admin',
        passwordHash,
        role: 'super_admin',
        permissions: JSON.stringify([
          'customers.read',
          'customers.write',
          'subscriptions.read',
          'subscriptions.write',
          'settings.read',
          'settings.write',
          'admin.read',
          'admin.write',
          'audit.read'
        ])
      }
    });
  }

  // Customer Management Methods
  static async blockCustomer(customerId: string, reason: string) {
    return await db.customer.update({
      where: { id: customerId },
      data: { 
        isBlocked: true,
        blockReason: reason,
        isActive: false
      }
    });
  }

  static async unblockCustomer(customerId: string) {
    return await db.customer.update({
      where: { id: customerId },
      data: { 
        isBlocked: false,
        blockReason: null,
        isActive: true
      }
    });
  }

  static async activateCustomer(customerId: string) {
    return await db.customer.update({
      where: { id: customerId },
      data: { isActive: true }
    });
  }

  static async deactivateCustomer(customerId: string) {
    return await db.customer.update({
      where: { id: customerId },
      data: { isActive: false }
    });
  }

  // Settings Management Methods
  static async getAllSettings() {
    return await db.adminSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });
  }

  // Analytics Methods
  static async getAnalytics() {
    // Mock analytics data - replace with real implementation
    return {
      overview: {
        totalRevenue: 15420.50,
        totalCustomers: await db.customer.count(),
        activeCampaigns: await db.campaign.count({ where: { status: 'active' } }),
        conversionRate: 3.2
      },
      revenueChart: [],
      topCampaigns: [],
      customerGrowth: []
    };
  }

  // System Logs Methods
  static async getSystemLogs({ level, page, limit }: { level: string; page: number; limit: number }) {
    // Mock logs data - replace with real implementation
    return {
      logs: [],
      pagination: {
        current: page,
        total: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  // Billing Methods
  static async getBillingData() {
    // Mock billing data - replace with real implementation
    return {
      overview: {
        totalRevenue: 45230.75,
        monthlyRecurring: 12450.00,
        activeSubscriptions: await db.subscription.count({ where: { status: 'active' } }),
        churnRate: 2.3,
        averageRevenuePerUser: 79.81
      },
      recentTransactions: [],
      subscriptionPlans: [],
      failedPayments: []
    };
  }

  static async updateCustomerPlan(customerId: string, planId: string) {
    return await db.subscription.update({
      where: { customerId },
      data: { planId }
    });
  }

  static async processRefund(paymentId: string, amount: number) {
    // Mock refund processing - replace with real Stripe implementation
    return { success: true, refundId: `re_${Date.now()}` };
  }

  static async suspendCustomer(customerId: string) {
    return await db.customer.update({
      where: { id: customerId },
      data: { status: 'suspended' }
    });
  }
}