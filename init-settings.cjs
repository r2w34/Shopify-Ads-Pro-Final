const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function initializeSettings() {
  try {
    console.log('Testing settings initialization...');
    
    // Check if adminSettings table exists and has data
    const settings = await db.adminSettings.findMany();
    console.log('Current settings count:', settings.length);
    
    if (settings.length === 0) {
      console.log('No settings found, creating defaults...');
      
      const defaultSettings = [
        { key: 'openai_api_key', value: '', description: 'OpenAI API Key for AI features', category: 'api', isEncrypted: true },
        { key: 'facebook_app_id', value: '', description: 'Facebook App ID', category: 'api' },
        { key: 'facebook_app_secret', value: '', description: 'Facebook App Secret', category: 'api', isEncrypted: true },
        { key: 'ai_features_enabled', value: 'true', description: 'Enable AI-powered features', category: 'features' },
        { key: 'facebook_ads_enabled', value: 'true', description: 'Enable Facebook Ads integration', category: 'features' },
        { key: 'trial_days', value: '14', description: 'Default trial period in days', category: 'billing' },
        { key: 'app_name', value: 'AI Facebook Ads Pro', description: 'Application name', category: 'general' },
        { key: 'support_email', value: 'support@example.com', description: 'Support email address', category: 'general' },
        { key: 'max_campaigns_per_customer', value: '100', description: 'Maximum campaigns per customer', category: 'limits' },
        { key: 'stripe_public_key', value: '', description: 'Stripe publishable key', category: 'billing' },
        { key: 'stripe_secret_key', value: '', description: 'Stripe secret key', category: 'billing', isEncrypted: true }
      ];
      
      for (const setting of defaultSettings) {
        await db.adminSettings.create({ data: setting });
      }
      
      console.log('Default settings created successfully!');
    } else {
      console.log('Settings already exist:', settings.map(s => s.key));
    }
    
    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await db.$disconnect();
  }
}

initializeSettings();