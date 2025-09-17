#!/usr/bin/env node

/**
 * Enhanced Features Test Suite
 * Tests all the advanced features that were implemented
 */

import https from 'https';
import fs from 'fs';

const BASE_URL = 'https://fbai-app.trustclouds.in';

// Test configuration
const tests = [
  {
    name: '7-Step Campaign Creation',
    path: '/app/campaigns/create',
    expectedFeatures: [
      'currentStep',
      'totalSteps',
      'Campaign Setup',
      'Product Selection', 
      'Target Audience',
      'Media & Placements',
      'Creative Settings',
      'Ad Preview',
      'Review & Launch'
    ]
  },
  {
    name: 'Facebook Ads Library Integration',
    path: '/app/ads-library',
    expectedFeatures: [
      'Ad Inspiration',
      'Competitive Intelligence',
      'Search Ads',
      'Copy Ad Text'
    ]
  },
  {
    name: 'AI Dashboard',
    path: '/app/ai-dashboard',
    expectedFeatures: [
      'AI Analytics',
      'Performance Insights',
      'Optimization Recommendations'
    ]
  },
  {
    name: 'Enhanced Analytics',
    path: '/app/analytics',
    expectedFeatures: [
      'Advanced Metrics',
      'TensorFlow',
      'Machine Learning'
    ]
  }
];

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fbai-app.trustclouds.in',
      port: 443,
      path: url,
      method: 'GET',
      headers: {
        'User-Agent': 'Enhanced-Features-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test runner
async function runTests() {
  console.log('🚀 Enhanced Features Test Suite');
  console.log('================================\n');

  const results = {
    passed: 0,
    failed: 0,
    total: tests.length,
    details: []
  };

  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`📍 Path: ${test.path}`);
    
    try {
      const response = await makeRequest(test.path);
      
      const testResult = {
        name: test.name,
        path: test.path,
        statusCode: response.statusCode,
        passed: false,
        foundFeatures: [],
        missingFeatures: []
      };

      // Check if the page loads successfully
      if (response.statusCode === 200) {
        console.log(`✅ Page loads successfully (${response.statusCode})`);
        
        // Check for expected features in the response
        for (const feature of test.expectedFeatures) {
          if (response.body.includes(feature)) {
            testResult.foundFeatures.push(feature);
            console.log(`   ✅ Found: ${feature}`);
          } else {
            testResult.missingFeatures.push(feature);
            console.log(`   ❌ Missing: ${feature}`);
          }
        }
        
        // Test passes if at least 50% of features are found
        const foundPercentage = (testResult.foundFeatures.length / test.expectedFeatures.length) * 100;
        testResult.passed = foundPercentage >= 50;
        
        if (testResult.passed) {
          console.log(`✅ Test PASSED (${foundPercentage.toFixed(1)}% features found)`);
          results.passed++;
        } else {
          console.log(`❌ Test FAILED (${foundPercentage.toFixed(1)}% features found)`);
          results.failed++;
        }
      } else {
        console.log(`❌ Page failed to load (${response.statusCode})`);
        testResult.missingFeatures = test.expectedFeatures;
        results.failed++;
      }
      
      results.details.push(testResult);
      
    } catch (error) {
      console.log(`❌ Test ERROR: ${error.message}`);
      results.failed++;
      results.details.push({
        name: test.name,
        path: test.path,
        error: error.message,
        passed: false
      });
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  // Save detailed results
  const reportPath = '/workspace/Shopify-Ads-Pro-Final/enhanced-features-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return results;
}

// Additional feature verification
async function verifyEnhancedFeatures() {
  console.log('\n🔍 ENHANCED FEATURES VERIFICATION');
  console.log('=================================\n');

  const featureChecks = [
    {
      name: 'Application Health',
      test: async () => {
        const response = await makeRequest('/');
        return response.statusCode === 200;
      }
    },
    {
      name: 'API Health Check',
      test: async () => {
        try {
          const response = await makeRequest('/api/health');
          return response.statusCode === 200;
        } catch {
          return false; // API health endpoint might not exist
        }
      }
    },
    {
      name: 'Campaign Creation Accessibility',
      test: async () => {
        const response = await makeRequest('/app/campaigns/create');
        return response.statusCode === 200 && response.body.includes('Campaign');
      }
    },
    {
      name: 'Ads Library Accessibility',
      test: async () => {
        const response = await makeRequest('/app/ads-library');
        return response.statusCode === 200;
      }
    }
  ];

  for (const check of featureChecks) {
    try {
      const result = await check.test();
      console.log(`${result ? '✅' : '❌'} ${check.name}: ${result ? 'WORKING' : 'FAILED'}`);
    } catch (error) {
      console.log(`❌ ${check.name}: ERROR - ${error.message}`);
    }
  }
}

// Run all tests
async function main() {
  try {
    const testResults = await runTests();
    await verifyEnhancedFeatures();
    
    console.log('\n🎉 Enhanced Features Test Complete!');
    console.log(`Overall Status: ${testResults.passed >= testResults.total * 0.7 ? '✅ GOOD' : '⚠️  NEEDS ATTENTION'}`);
    
    process.exit(testResults.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();