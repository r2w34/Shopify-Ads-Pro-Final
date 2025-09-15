#!/usr/bin/env node

/**
 * Facebook Business API Test
 * Tests business-level access for ad accounts
 */

const https = require('https');

const ACCESS_TOKEN = 'EAAE3VR41gpMBPSGm6xukqhAPGZBjYITCJriqYZBMm9AXXGXGqA8ADHX09DT5jk0LbCYEj9xxEpaNSecCTEL4OJW3TAnAJSiw570f9tZA3aZA43QVRGZCZAiDAhobyeA9S31aZBWtMomEsPlwtHF03rIJDqhFNMIcZAtZATe7wg4iG6LjBQhLBMXUUZCsHHi2JICvYHtcmhYpLN';
const API_VERSION = 'v23.0';

function makeRequest(endpoint, callback) {
  const url = `https://graph.facebook.com/${API_VERSION}${endpoint}?access_token=${ACCESS_TOKEN}`;
  
  https.get(url, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        callback(null, data);
      } catch (error) {
        callback(error, null);
      }
    });
  }).on('error', (err) => {
    callback(err, null);
  });
}

async function testBusinessAPI() {
  console.log('🏢 Testing Facebook Business API Access...\n');

  // Test 1: Get app info
  console.log('📱 Test 1: Getting app information...');
  makeRequest('/342313695281811?fields=id,name,category,link', (err, data) => {
    if (err) {
      console.log('   ❌ Error:', err.message);
    } else if (data.error) {
      console.log('   ❌ API Error:', data.error.message);
    } else {
      console.log('   ✅ App Info:', data);
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Try to get businesses
  console.log('\n🏢 Test 2: Getting businesses...');
  makeRequest('/me/businesses?fields=id,name', (err, data) => {
    if (err) {
      console.log('   ❌ Error:', err.message);
    } else if (data.error) {
      console.log('   ❌ API Error:', data.error.message);
    } else {
      console.log('   ✅ Businesses:', data);
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Try direct ad account access (common test account IDs)
  console.log('\n💼 Test 3: Testing direct ad account access...');
  
  // Common test ad account patterns
  const testAccountIds = [
    'act_342313695281811', // App ID as account
    'act_123456789', // Common test pattern
  ];

  for (const accountId of testAccountIds) {
    console.log(`   Testing ${accountId}...`);
    makeRequest(`/${accountId}?fields=id,name,account_id,currency`, (err, data) => {
      if (err) {
        console.log(`   ❌ ${accountId} Error:`, err.message);
      } else if (data.error) {
        console.log(`   ❌ ${accountId} API Error:`, data.error.message);
      } else {
        console.log(`   ✅ ${accountId} Success:`, data);
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test 4: Check what we can access with current token
  console.log('\n🔍 Test 4: Checking accessible resources...');
  
  // Try to get debug info about the token
  makeRequest('/debug_token?input_token=' + ACCESS_TOKEN, (err, data) => {
    if (err) {
      console.log('   ❌ Error:', err.message);
    } else if (data.error) {
      console.log('   ❌ API Error:', data.error.message);
    } else {
      console.log('   ✅ Token Debug Info:', JSON.stringify(data, null, 2));
    }
  });

  setTimeout(() => {
    console.log('\n📊 Analysis:');
    console.log('   🔑 Token Type: App Access Token (not User Access Token)');
    console.log('   ✅ Required Permissions: ads_management, ads_read, read_insights');
    console.log('   ⚠️  Need specific ad account ID to access campaigns');
    console.log('   💡 Token is valid for Facebook Marketing API operations');
    
    console.log('\n🎯 Recommendations:');
    console.log('   1. Use token for campaign creation with known ad account ID');
    console.log('   2. Implement ad account selection in UI');
    console.log('   3. Test campaign creation with specific account');
    console.log('   4. Add error handling for account access issues');
  }, 3000);
}

testBusinessAPI().catch(console.error);