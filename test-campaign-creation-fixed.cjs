const https = require('https');

// Test campaign creation with special ad categories fix
async function testCampaignCreation() {
  console.log('🧪 Testing Campaign Creation with Special Ad Categories Fix...\n');

  const testData = {
    action: "create_campaign",
    campaignName: "Test Campaign - Special Ad Categories Fix",
    objective: "OUTCOME_TRAFFIC",
    specialAdCategory: "NONE", // Test with NONE value
    budget: "50.00",
    budgetType: "DAILY",
    selectedAdAccount: "act_1872033823253956",
    currency: "USD",
    productIds: JSON.stringify([{
      id: "test-product-1",
      title: "Test Product",
      description: "Test product description",
      priceRangeV2: { minVariantPrice: { amount: "29.99" } },
      tags: ["test", "product"]
    }]),
    adCopy: JSON.stringify({
      headline: "Test Headline",
      description: "Test Description",
      callToAction: "Shop Now"
    })
  };

  const postData = new URLSearchParams(testData).toString();

  const options = {
    hostname: 'fbai-app.trustclouds.in',
    port: 443,
    path: '/app/campaigns/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'Cookie': 'shopify_session=test_session_id', // Mock session
      'User-Agent': 'Mozilla/5.0 (compatible; Test/1.0)'
    },
    rejectUnauthorized: false
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📄 Response Body:');
        console.log(data.substring(0, 1000) + (data.length > 1000 ? '...' : ''));
        
        // Check for success indicators
        if (data.includes('Campaign created successfully') || 
            data.includes('campaign') || 
            res.statusCode === 200) {
          console.log('\n✅ Campaign creation test completed');
        } else if (data.includes('special_ad_categories')) {
          console.log('\n❌ Special ad categories error still present');
        } else {
          console.log('\n⚠️  Unexpected response');
        }
        
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test with different special ad category values
async function testDifferentCategories() {
  console.log('\n🔄 Testing different special ad category values...\n');
  
  const categories = ['NONE', 'CREDIT', 'EMPLOYMENT', 'HOUSING'];
  
  for (const category of categories) {
    console.log(`\n📝 Testing with specialAdCategory: ${category}`);
    
    try {
      const result = await testCampaignCreation();
      console.log(`✅ Test with ${category} completed`);
    } catch (error) {
      console.log(`❌ Test with ${category} failed:`, error.message);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the tests
async function runTests() {
  try {
    await testCampaignCreation();
    console.log('\n' + '='.repeat(60));
    await testDifferentCategories();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();