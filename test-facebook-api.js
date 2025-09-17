#!/usr/bin/env node

/**
 * Facebook Marketing API Test Suite
 * Tests all critical Facebook API endpoints with the new access token
 */

const axios = require('axios');

const ACCESS_TOKEN = 'EAAE3VR41gpMBPUnhVx3IE02XCunPLB5n6CJNdSW6AFsoZCUOKjHsYrLzdyiMWlcq3H2ZBYYe8KstYoU7aCluNGl2lBWSegHaRzonWvCmfCV3v5ZAPcPnqAW3TqReDR7mUVnUuqBwOdTfGx2apFPFX33fvpGZB5a8PDWs329qaA9wWNQjUP3VYBEydGERq3JIMshMg7qA';
const API_VERSION = 'v23.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

async function testFacebookAPI() {
  console.log('🚀 Starting Facebook Marketing API Test Suite...\n');

  const tests = [
    {
      name: 'User Profile Access',
      endpoint: '/me',
      params: { fields: 'id,name,email' }
    },
    {
      name: 'Ad Accounts Access',
      endpoint: '/me/adaccounts',
      params: { fields: 'account_id,name,account_status,currency,timezone_name' }
    },
    {
      name: 'Business Manager Access',
      endpoint: '/me/businesses',
      params: { fields: 'id,name,verification_status' }
    },
    {
      name: 'Pages Access',
      endpoint: '/me/accounts',
      params: { fields: 'id,name,category,access_token' }
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      
      const response = await axios.get(`${BASE_URL}${test.endpoint}`, {
        params: {
          access_token: ACCESS_TOKEN,
          ...test.params
        }
      });

      if (response.status === 200) {
        console.log(`✅ ${test.name}: PASSED`);
        
        // Show sample data
        if (test.endpoint === '/me') {
          console.log(`   User: ${response.data.name} (ID: ${response.data.id})`);
        } else if (test.endpoint === '/me/adaccounts') {
          const accounts = response.data.data || [];
          console.log(`   Found ${accounts.length} ad accounts`);
          if (accounts.length > 0) {
            console.log(`   Sample: ${accounts[0].account_id} (${accounts[0].currency || 'N/A'})`);
          }
        } else if (test.endpoint === '/me/businesses') {
          const businesses = response.data.data || [];
          console.log(`   Found ${businesses.length} businesses`);
        } else if (test.endpoint === '/me/accounts') {
          const pages = response.data.data || [];
          console.log(`   Found ${pages.length} pages`);
        }
        
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: FAILED (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED`);
      if (error.response) {
        console.log(`   Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    console.log('');
  }

  // Test specific ad account permissions
  console.log('🔍 Testing Ad Account Permissions...');
  try {
    const adAccountsResponse = await axios.get(`${BASE_URL}/me/adaccounts`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'account_id,name'
      }
    });

    const adAccounts = adAccountsResponse.data.data || [];
    if (adAccounts.length > 0) {
      const firstAccount = adAccounts[0];
      console.log(`✅ Testing permissions on account: ${firstAccount.account_id}`);

      // Test campaign access
      try {
        const campaignsResponse = await axios.get(`${BASE_URL}/act_${firstAccount.account_id}/campaigns`, {
          params: {
            access_token: ACCESS_TOKEN,
            fields: 'id,name,status',
            limit: 5
          }
        });
        console.log(`✅ Campaign Access: PASSED (${campaignsResponse.data.data?.length || 0} campaigns)`);
        passedTests++;
        totalTests++;
      } catch (error) {
        console.log(`❌ Campaign Access: FAILED - ${error.response?.data?.error?.message || error.message}`);
        totalTests++;
      }

      // Test ad set access
      try {
        const adSetsResponse = await axios.get(`${BASE_URL}/act_${firstAccount.account_id}/adsets`, {
          params: {
            access_token: ACCESS_TOKEN,
            fields: 'id,name,status',
            limit: 5
          }
        });
        console.log(`✅ Ad Set Access: PASSED (${adSetsResponse.data.data?.length || 0} ad sets)`);
        passedTests++;
        totalTests++;
      } catch (error) {
        console.log(`❌ Ad Set Access: FAILED - ${error.response?.data?.error?.message || error.message}`);
        totalTests++;
      }
    }
  } catch (error) {
    console.log(`❌ Ad Account Permissions Test: FAILED - ${error.response?.data?.error?.message || error.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Facebook API is fully functional.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('='.repeat(50));
}

// Run the tests
testFacebookAPI().catch(console.error);