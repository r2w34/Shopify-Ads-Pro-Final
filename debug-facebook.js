#!/usr/bin/env node

/**
 * Facebook Ads Creation Debug Script
 * 
 * This script helps diagnose issues with Facebook ads creation
 * Run this script to check your Facebook integration setup
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const db = new PrismaClient();

async function debugFacebookIntegration() {
  console.log('🔍 Facebook Ads Integration Debug Tool');
  console.log('=====================================\n');

  // 1. Check Environment Variables
  console.log('1. Environment Variables Check:');
  console.log('   FACEBOOK_APP_ID:', process.env.FACEBOOK_APP_ID ? '✅ Set' : '❌ Missing');
  console.log('   FACEBOOK_APP_SECRET:', process.env.FACEBOOK_APP_SECRET ? '✅ Set' : '❌ Missing');
  console.log('   FACEBOOK_REDIRECT_URI:', process.env.FACEBOOK_REDIRECT_URI ? '✅ Set' : '❌ Missing');
  
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    console.log('❌ Missing required Facebook environment variables');
    return;
  }

  // 2. Check Database Connection
  console.log('\n2. Database Connection Check:');
  try {
    await db.$connect();
    console.log('   Database connection: ✅ Connected');
  } catch (error) {
    console.log('   Database connection: ❌ Failed');
    console.log('   Error:', error.message);
    return;
  }

  // 3. Check Facebook Accounts in Database
  console.log('\n3. Facebook Accounts in Database:');
  try {
    const facebookAccounts = await db.facebookAccount.findMany({
      include: {
        adAccounts: true,
        pages: true
      }
    });

    if (facebookAccounts.length === 0) {
      console.log('   ❌ No Facebook accounts found in database');
      console.log('   → You need to connect a Facebook account first');
      return;
    }

    console.log(`   ✅ Found ${facebookAccounts.length} Facebook account(s)`);
    
    for (const account of facebookAccounts) {
      console.log(`\n   Account for shop: ${account.shop}`);
      console.log(`   - Facebook User ID: ${account.facebookUserId}`);
      console.log(`   - Business ID: ${account.businessId || 'Not set'}`);
      console.log(`   - Default Ad Account: ${account.adAccountId || 'Not set'}`);
      console.log(`   - Active: ${account.isActive ? '✅' : '❌'}`);
      console.log(`   - Ad Accounts: ${account.adAccounts.length}`);
      console.log(`   - Pages: ${account.pages.length}`);

      // Test the access token
      await testAccessToken(account);
    }

  } catch (error) {
    console.log('   ❌ Database query failed');
    console.log('   Error:', error.message);
  }

  await db.$disconnect();
}

async function testAccessToken(account) {
  console.log(`\n   Testing access token for ${account.shop}:`);
  
  try {
    // Test basic user info
    const userResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token: account.accessToken,
        fields: 'id,name,email'
      }
    });
    
    console.log('   - User info: ✅ Valid token');
    console.log(`   - User: ${userResponse.data.name} (${userResponse.data.id})`);

    // Test ad account access
    if (account.adAccountId) {
      try {
        const adAccountResponse = await axios.get(`https://graph.facebook.com/v18.0/${account.adAccountId}`, {
          params: {
            access_token: account.accessToken,
            fields: 'id,name,account_status,currency,timezone_name,capabilities'
          }
        });

        console.log('   - Ad Account access: ✅ Valid');
        console.log(`   - Ad Account: ${adAccountResponse.data.name}`);
        console.log(`   - Status: ${adAccountResponse.data.account_status === 1 ? 'Active' : 'Inactive'}`);
        console.log(`   - Currency: ${adAccountResponse.data.currency}`);
        
        // Check permissions
        const capabilities = adAccountResponse.data.capabilities || [];
        const canCreateCampaigns = capabilities.includes('CAN_CREATE_CAMPAIGNS');
        console.log(`   - Can create campaigns: ${canCreateCampaigns ? '✅' : '❌'}`);

        if (!canCreateCampaigns) {
          console.log('   ⚠️  This ad account cannot create campaigns. Check permissions.');
        }

        // Test campaign creation (dry run)
        await testCampaignCreation(account.accessToken, account.adAccountId);

      } catch (adAccountError) {
        console.log('   - Ad Account access: ❌ Failed');
        console.log(`   - Error: ${adAccountError.response?.data?.error?.message || adAccountError.message}`);
        
        if (adAccountError.response?.status === 403) {
          console.log('   ⚠️  Permission denied. The access token may not have ads_management permission.');
        }
      }
    } else {
      console.log('   - No ad account ID set');
    }

  } catch (error) {
    console.log('   - Access token: ❌ Invalid or expired');
    console.log(`   - Error: ${error.response?.data?.error?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('   ⚠️  Access token is invalid or expired. User needs to reconnect Facebook.');
    }
  }
}

async function testCampaignCreation(accessToken, adAccountId) {
  console.log('   - Testing campaign creation:');
  
  try {
    // Try to create a test campaign (this will fail but show us the exact error)
    const testCampaignData = {
      name: 'Test Campaign - Debug',
      objective: 'LINK_CLICKS',
      status: 'PAUSED',
      special_ad_categories: []
    };

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      testCampaignData,
      {
        params: {
          access_token: accessToken
        }
      }
    );

    console.log('   - Campaign creation test: ✅ Success (unexpected!)');
    console.log(`   - Test campaign ID: ${response.data.id}`);
    
    // Clean up - delete the test campaign
    try {
      await axios.delete(`https://graph.facebook.com/v18.0/${response.data.id}`, {
        params: { access_token: accessToken }
      });
      console.log('   - Test campaign cleaned up');
    } catch (cleanupError) {
      console.log('   - Could not clean up test campaign');
    }

  } catch (error) {
    console.log('   - Campaign creation test: ❌ Failed');
    console.log(`   - Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   - Error code: ${error.response?.data?.error?.code}`);
    console.log(`   - Error type: ${error.response?.data?.error?.type}`);
    
    // Common error analysis
    if (error.response?.data?.error?.code === 100) {
      console.log('   ⚠️  Invalid parameter. Check campaign objective and other parameters.');
    } else if (error.response?.data?.error?.code === 200) {
      console.log('   ⚠️  Permissions error. The user may not have permission to create campaigns.');
    } else if (error.response?.data?.error?.code === 190) {
      console.log('   ⚠️  Access token error. Token may be expired or invalid.');
    }
  }
}

// Run the debug script
debugFacebookIntegration().catch(console.error);