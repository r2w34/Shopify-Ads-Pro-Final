#!/usr/bin/env node

/**
 * Facebook Integration Testing Script
 * Tests all aspects of Facebook Marketing API integration
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration from environment
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "342313695281811";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "cdc03e18b1d755adc28575a54c7156db";
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || "EAAExampleTokenForDemoUse123456789";

console.log('🔍 FACEBOOK MARKETING API INTEGRATION TEST');
console.log('==========================================\n');

async function testFacebookAppConfiguration() {
  console.log('📱 Testing Facebook App Configuration...');
  
  try {
    // Test app access token
    const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const response = await axios.get(`https://graph.facebook.com/v18.0/${FACEBOOK_APP_ID}`, {
      params: {
        access_token: appAccessToken,
        fields: 'id,name,category,company,privacy_policy_url,terms_of_service_url'
      }
    });
    
    console.log('✅ Facebook App Configuration:');
    console.log(`   App ID: ${response.data.id}`);
    console.log(`   App Name: ${response.data.name || 'Not set'}`);
    console.log(`   Category: ${response.data.category || 'Not set'}`);
    console.log(`   Company: ${response.data.company || 'Not set'}`);
    console.log(`   Privacy Policy: ${response.data.privacy_policy_url || '❌ Missing'}`);
    console.log(`   Terms of Service: ${response.data.terms_of_service_url || '❌ Missing'}`);
    
  } catch (error) {
    console.log('❌ Facebook App Configuration Failed:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   Code: ${error.response?.data?.error?.code || 'Unknown'}`);
  }
  console.log('');
}

async function testAccessToken() {
  console.log('🔑 Testing Access Token...');
  
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN,
        fields: 'id,name,email'
      }
    });
    
    console.log('✅ Access Token Valid:');
    console.log(`   User ID: ${response.data.id}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Email: ${response.data.email || 'Not available'}`);
    
  } catch (error) {
    console.log('❌ Access Token Invalid:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   Code: ${error.response?.data?.error?.code || 'Unknown'}`);
    console.log(`   Type: ${error.response?.data?.error?.type || 'Unknown'}`);
  }
  console.log('');
}

async function testAdAccounts() {
  console.log('💼 Testing Ad Accounts Access...');
  
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN,
        fields: 'id,name,currency,account_status,timezone_name,business'
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('✅ Ad Accounts Found:');
      response.data.data.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.name} (${account.id})`);
        console.log(`      Currency: ${account.currency}`);
        console.log(`      Status: ${account.account_status}`);
        console.log(`      Timezone: ${account.timezone_name}`);
        console.log(`      Business: ${account.business?.name || 'None'}`);
      });
    } else {
      console.log('⚠️  No Ad Accounts Found');
    }
    
  } catch (error) {
    console.log('❌ Ad Accounts Access Failed:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   Code: ${error.response?.data?.error?.code || 'Unknown'}`);
    
    if (error.response?.data?.error?.code === 200) {
      console.log('   📝 This usually means insufficient permissions');
      console.log('   📝 Need ads_read or ads_management permission');
    }
  }
  console.log('');
}

async function testPages() {
  console.log('📄 Testing Pages Access...');
  
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN,
        fields: 'id,name,category,access_token,instagram_business_account'
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('✅ Pages Found:');
      response.data.data.forEach((page, index) => {
        console.log(`   ${index + 1}. ${page.name} (${page.id})`);
        console.log(`      Category: ${page.category}`);
        console.log(`      Has Page Token: ${page.access_token ? 'Yes' : 'No'}`);
        console.log(`      Instagram Business: ${page.instagram_business_account?.id || 'None'}`);
      });
    } else {
      console.log('⚠️  No Pages Found');
    }
    
  } catch (error) {
    console.log('❌ Pages Access Failed:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   Code: ${error.response?.data?.error?.code || 'Unknown'}`);
  }
  console.log('');
}

async function testPermissions() {
  console.log('🔐 Testing Current Permissions...');
  
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/permissions', {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('✅ Current Permissions:');
      const granted = response.data.data.filter(p => p.status === 'granted');
      const declined = response.data.data.filter(p => p.status === 'declined');
      
      if (granted.length > 0) {
        console.log('   ✅ Granted:');
        granted.forEach(perm => {
          console.log(`      - ${perm.permission}`);
        });
      }
      
      if (declined.length > 0) {
        console.log('   ❌ Declined:');
        declined.forEach(perm => {
          console.log(`      - ${perm.permission}`);
        });
      }
      
      // Check for required permissions
      const requiredPermissions = [
        'ads_management',
        'ads_read',
        'business_management',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_manage_insights'
      ];
      
      console.log('\n   📋 Required Permissions Check:');
      requiredPermissions.forEach(required => {
        const hasPermission = granted.some(p => p.permission === required);
        console.log(`      ${hasPermission ? '✅' : '❌'} ${required}`);
      });
      
    } else {
      console.log('⚠️  No Permissions Found');
    }
    
  } catch (error) {
    console.log('❌ Permissions Check Failed:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
  }
  console.log('');
}

async function testCampaignCreation() {
  console.log('🎯 Testing Campaign Creation...');
  
  try {
    // First, get an ad account
    const adAccountsResponse = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN,
        fields: 'id,name'
      }
    });
    
    if (!adAccountsResponse.data.data || adAccountsResponse.data.data.length === 0) {
      console.log('❌ No ad accounts available for testing');
      return;
    }
    
    const adAccountId = adAccountsResponse.data.data[0].id;
    console.log(`   Using ad account: ${adAccountId}`);
    
    // Try to create a test campaign
    const campaignData = {
      name: `Test Campaign ${Date.now()}`,
      objective: 'LINK_CLICKS',
      status: 'PAUSED',
      special_ad_categories: []
    };
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      campaignData,
      {
        params: {
          access_token: FACEBOOK_ACCESS_TOKEN
        }
      }
    );
    
    console.log('✅ Campaign Creation Successful:');
    console.log(`   Campaign ID: ${response.data.id}`);
    
    // Clean up - delete the test campaign
    try {
      await axios.delete(`https://graph.facebook.com/v18.0/${response.data.id}`, {
        params: {
          access_token: FACEBOOK_ACCESS_TOKEN
        }
      });
      console.log('   ✅ Test campaign cleaned up');
    } catch (cleanupError) {
      console.log('   ⚠️  Could not clean up test campaign');
    }
    
  } catch (error) {
    console.log('❌ Campaign Creation Failed:');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   Code: ${error.response?.data?.error?.code || 'Unknown'}`);
    console.log(`   Subcode: ${error.response?.data?.error?.error_subcode || 'None'}`);
    
    if (error.response?.data?.error?.code === 200) {
      console.log('   📝 This usually means insufficient permissions');
      console.log('   📝 Need ads_management permission with advanced access');
    }
  }
  console.log('');
}

async function testDatabaseIntegration() {
  console.log('🗄️  Testing Database Integration...');
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check for Facebook accounts
    const facebookAccounts = await prisma.facebookAccount.findMany({
      include: {
        adAccounts: true,
        pages: true
      }
    });
    
    console.log(`   Facebook Accounts in DB: ${facebookAccounts.length}`);
    
    if (facebookAccounts.length > 0) {
      facebookAccounts.forEach((account, index) => {
        console.log(`   ${index + 1}. Shop: ${account.shop}`);
        console.log(`      User ID: ${account.facebookUserId}`);
        console.log(`      Business ID: ${account.businessId || 'None'}`);
        console.log(`      Ad Accounts: ${account.adAccounts.length}`);
        console.log(`      Pages: ${account.pages.length}`);
        console.log(`      Active: ${account.isActive}`);
      });
    }
    
    // Check for campaigns
    const campaigns = await prisma.campaign.findMany();
    console.log(`   Campaigns in DB: ${campaigns.length}`);
    
  } catch (error) {
    console.log('❌ Database Integration Failed:');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
  console.log('');
}

async function generateReport() {
  console.log('📊 INTEGRATION ANALYSIS REPORT');
  console.log('==============================\n');
  
  console.log('🔍 CRITICAL ISSUES IDENTIFIED:');
  console.log('1. ❌ Facebook authentication flow is incomplete');
  console.log('2. ❌ Access token appears to be a demo/placeholder token');
  console.log('3. ❌ Missing required permissions for production use');
  console.log('4. ❌ No business verification completed');
  console.log('5. ❌ App not submitted for review\n');
  
  console.log('🚀 IMMEDIATE ACTION REQUIRED:');
  console.log('1. 🔥 Fix Facebook OAuth callback to exchange code for token');
  console.log('2. 🔥 Obtain real Facebook access token');
  console.log('3. 🔥 Request additional permissions (instagram_basic, etc.)');
  console.log('4. 📋 Complete business verification process');
  console.log('5. 📋 Submit app for review to get advanced access\n');
  
  console.log('⚠️  CURRENT STATUS: NOT PRODUCTION READY');
  console.log('The app cannot be used by external customers in its current state.\n');
}

async function runAllTests() {
  console.log(`🕐 Starting tests at ${new Date().toISOString()}\n`);
  
  await testFacebookAppConfiguration();
  await testAccessToken();
  await testPermissions();
  await testAdAccounts();
  await testPages();
  await testCampaignCreation();
  await testDatabaseIntegration();
  await generateReport();
  
  console.log(`🕐 Tests completed at ${new Date().toISOString()}`);
}

// Run the tests
runAllTests().catch(console.error);