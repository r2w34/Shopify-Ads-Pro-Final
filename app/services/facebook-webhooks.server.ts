import crypto from 'crypto';
import { db } from '../db.server';

export interface FacebookWebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: any;
    }>;
  }>;
}

export class FacebookWebhookService {
  private static readonly VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'fb_webhook_verify_token_2024';
  private static readonly APP_SECRET = process.env.FACEBOOK_APP_SECRET;

  // Verify webhook signature
  static verifySignature(payload: string, signature: string): boolean {
    if (!this.APP_SECRET) {
      console.error('Facebook App Secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.APP_SECRET)
      .update(payload)
      .digest('hex');

    const signatureHash = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signatureHash, 'hex')
    );
  }

  // Handle webhook verification challenge
  static handleVerification(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.VERIFY_TOKEN) {
      console.log('Facebook webhook verified successfully');
      return challenge;
    }
    
    console.error('Facebook webhook verification failed');
    return null;
  }

  // Process webhook events
  static async processWebhookEvent(event: FacebookWebhookEvent): Promise<void> {
    console.log('Processing Facebook webhook event:', JSON.stringify(event, null, 2));

    for (const entry of event.entry) {
      for (const change of entry.changes) {
        await this.handleChange(entry.id, change);
      }
    }
  }

  private static async handleChange(objectId: string, change: any): Promise<void> {
    const { field, value } = change;

    switch (field) {
      case 'campaigns':
        await this.handleCampaignChange(objectId, value);
        break;
      case 'adsets':
        await this.handleAdSetChange(objectId, value);
        break;
      case 'ads':
        await this.handleAdChange(objectId, value);
        break;
      case 'account':
        await this.handleAccountChange(objectId, value);
        break;
      default:
        console.log(`Unhandled webhook field: ${field}`);
    }
  }

  private static async handleCampaignChange(adAccountId: string, value: any): Promise<void> {
    console.log('Campaign change detected:', value);

    // Find the shop associated with this ad account
    const facebookAccount = await db.facebookAccount.findFirst({
      where: {
        adAccounts: {
          some: {
            adAccountId: adAccountId
          }
        }
      }
    });

    if (!facebookAccount) {
      console.log('No associated shop found for ad account:', adAccountId);
      return;
    }

    // Update campaign status in database
    if (value.campaign_id) {
      await db.campaign.updateMany({
        where: {
          facebookCampaignId: value.campaign_id,
          shop: facebookAccount.shop
        },
        data: {
          status: value.status || 'UNKNOWN',
          lastSyncAt: new Date()
        }
      });

      // Send notification to admin
      await this.sendNotification(facebookAccount.shop, {
        type: 'campaign_update',
        title: 'Campaign Status Changed',
        message: `Campaign ${value.campaign_id} status changed to ${value.status}`,
        data: value
      });
    }
  }

  private static async handleAdSetChange(adAccountId: string, value: any): Promise<void> {
    console.log('AdSet change detected:', value);

    const facebookAccount = await db.facebookAccount.findFirst({
      where: {
        adAccounts: {
          some: {
            adAccountId: adAccountId
          }
        }
      }
    });

    if (!facebookAccount) return;

    // Update ad set in database if needed
    if (value.adset_id) {
      await db.adSet.updateMany({
        where: {
          facebookAdSetId: value.adset_id,
          campaign: {
            shop: facebookAccount.shop
          }
        },
        data: {
          status: value.status || 'UNKNOWN',
          lastSyncAt: new Date()
        }
      });
    }
  }

  private static async handleAdChange(adAccountId: string, value: any): Promise<void> {
    console.log('Ad change detected:', value);

    const facebookAccount = await db.facebookAccount.findFirst({
      where: {
        adAccounts: {
          some: {
            adAccountId: adAccountId
          }
        }
      }
    });

    if (!facebookAccount) return;

    // Update ad in database if needed
    if (value.ad_id) {
      await db.ad.updateMany({
        where: {
          facebookAdId: value.ad_id,
          adSet: {
            campaign: {
              shop: facebookAccount.shop
            }
          }
        },
        data: {
          status: value.status || 'UNKNOWN',
          lastSyncAt: new Date()
        }
      });
    }
  }

  private static async handleAccountChange(adAccountId: string, value: any): Promise<void> {
    console.log('Account change detected:', value);

    const facebookAccount = await db.facebookAccount.findFirst({
      where: {
        adAccounts: {
          some: {
            adAccountId: adAccountId
          }
        }
      }
    });

    if (!facebookAccount) return;

    // Handle account-level changes
    if (value.account_status !== undefined) {
      await db.adAccount.updateMany({
        where: {
          adAccountId: adAccountId,
          facebookAccountId: facebookAccount.id
        },
        data: {
          accountStatus: value.account_status,
          updatedAt: new Date()
        }
      });

      // Send critical notification for account issues
      if (value.account_status !== 1) {
        await this.sendNotification(facebookAccount.shop, {
          type: 'account_issue',
          title: 'Facebook Ad Account Issue',
          message: `Your Facebook ad account ${adAccountId} has been restricted or disabled.`,
          priority: 'high',
          data: value
        });
      }
    }
  }

  private static async sendNotification(shop: string, notification: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    data?: any;
  }): Promise<void> {
    try {
      // Store notification in database
      await db.notification.create({
        data: {
          shop,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority || 'normal',
          data: notification.data ? JSON.stringify(notification.data) : null,
          isRead: false
        }
      });

      // Send email notification for high priority items
      if (notification.priority === 'high') {
        const { sendEmail } = await import('./email.server');
        
        // Get shop owner email (you might need to adjust this based on your user model)
        const shopData = await db.user.findFirst({
          where: { shop }
        });

        if (shopData?.email) {
          await sendEmail({
            to: shopData.email,
            subject: `🚨 ${notification.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e74c3c;">${notification.title}</h2>
                <p>${notification.message}</p>
                <p>Please log into your dashboard to review and take action.</p>
                <hr>
                <p style="font-size: 12px; color: #666;">
                  This is an automated notification from your Shopify Ads Pro application.
                </p>
              </div>
            `
          });
        }
      }

      console.log('Notification sent successfully:', notification.title);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Setup webhook subscriptions
  static async setupWebhookSubscriptions(adAccountId: string, accessToken: string): Promise<void> {
    try {
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? 'https://fbai-app.trustclouds.in/webhooks/facebook'
        : 'https://your-ngrok-url.ngrok.io/webhooks/facebook';

      const subscriptionData = {
        object: 'adaccount',
        callback_url: webhookUrl,
        fields: ['campaigns', 'adsets', 'ads', 'account'],
        verify_token: this.VERIFY_TOKEN
      };

      const response = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...subscriptionData,
          access_token: accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Webhook setup failed: ${error.error?.message || 'Unknown error'}`);
      }

      console.log('Facebook webhook subscriptions setup successfully');
    } catch (error) {
      console.error('Failed to setup webhook subscriptions:', error);
      throw error;
    }
  }

  // Get webhook subscriptions
  static async getWebhookSubscriptions(adAccountId: string, accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/subscriptions?access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch webhook subscriptions');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get webhook subscriptions:', error);
      return [];
    }
  }

  // Delete webhook subscription
  static async deleteWebhookSubscription(adAccountId: string, accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/subscriptions`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete webhook subscription');
      }

      console.log('Facebook webhook subscription deleted successfully');
    } catch (error) {
      console.error('Failed to delete webhook subscription:', error);
      throw error;
    }
  }
}

// Notification model (add this to your Prisma schema if not exists)
/*
model Notification {
  id        String   @id @default(cuid())
  shop      String
  type      String
  title     String
  message   String
  priority  String   @default("normal")
  data      String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("notifications")
}
*/