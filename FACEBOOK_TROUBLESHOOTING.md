# Facebook Ads Creation Troubleshooting Guide

## 🚨 Common Issues and Solutions

Based on the code analysis, here are the most likely reasons why Facebook ads creation is failing:

### 1. **Access Token Issues** (Most Common)

**Problem**: The Facebook access token is invalid, expired, or has insufficient permissions.

**Symptoms**:
- Error messages about invalid access token
- 401 Unauthorized errors
- Permission denied errors

**Solutions**:
```bash
# Run the debug script to check token validity
node debug-facebook.js
```

**Fix Steps**:
1. Go to your app and disconnect Facebook account
2. Reconnect Facebook account with proper permissions
3. Ensure you grant `ads_management` permission during OAuth

### 2. **Facebook App Configuration Issues**

**Problem**: Your Facebook App doesn't have the right permissions or setup.

**Check These Settings in Facebook Developers Console**:
- App is in "Live" mode (not Development)
- Has `ads_management` permission approved
- Has `business_management` permission (for business accounts)
- Redirect URI matches exactly: `https://fbai-app.trustclouds.in/auth/facebook/callback`

### 3. **Ad Account Permissions**

**Problem**: The connected Facebook user doesn't have permission to create campaigns in the ad account.

**Solutions**:
- User must be an Admin or Advertiser on the ad account
- Business Manager must grant campaign creation permissions
- Check if ad account is active (not disabled/restricted)

### 4. **API Version Issues**

**Problem**: Using Facebook Graph API v18.0 which might be deprecated.

**Fix**: Update API version in the code:
```javascript
// In facebook.server.ts, update all API calls from v18.0 to v19.0 or v20.0
const response = await axios.post(
  `https://graph.facebook.com/v20.0/${this.adAccountId}/campaigns`,
  // ... rest of the code
);
```

### 5. **Campaign Parameters Issues**

**Problem**: Invalid campaign parameters being sent to Facebook API.

**Common Issues**:
- Invalid objective values
- Budget too low (minimum $1.00)
- Missing required fields

**Fix**: Update the campaign creation parameters:
```javascript
// In facebook.server.ts
async createCampaign(campaignData: FacebookCampaignData): Promise<string> {
  try {
    const campaignParams = {
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status,
      special_ad_categories: [], // Required field
    };

    // Add budget only if provided and valid
    if (campaignData.budget && campaignData.budget >= 1) {
      if (campaignData.budgetType === 'DAILY') {
        campaignParams.daily_budget = Math.round(campaignData.budget * 100);
      } else if (campaignData.budgetType === 'LIFETIME') {
        campaignParams.lifetime_budget = Math.round(campaignData.budget * 100);
      }
    }

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${this.adAccountId}/campaigns`,
      campaignParams,
      {
        params: {
          access_token: this.accessToken
        }
      }
    );

    return response.data.id;
  } catch (error: any) {
    console.error("Facebook campaign creation error:", error.response?.data || error.message);
    throw new Error(`Failed to create Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
  }
}
```

## 🔧 Debugging Steps

### Step 1: Run the Debug Script
```bash
cd /path/to/your/app
node debug-facebook.js
```

This will check:
- Environment variables
- Database connections
- Facebook account data
- Access token validity
- Ad account permissions
- Campaign creation capabilities

### Step 2: Check Server Logs

Look for these error patterns in your server logs:

```bash
# SSH into your server
ssh root@77.37.45.67

# Check PM2 logs
pm2 logs

# Or check application logs
tail -f /var/log/your-app.log
```

### Step 3: Test Facebook API Directly

Use curl to test the Facebook API:

```bash
# Test user info (replace YOUR_ACCESS_TOKEN)
curl -G "https://graph.facebook.com/v20.0/me" \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  -d "fields=id,name,email"

# Test ad account access (replace YOUR_AD_ACCOUNT_ID and YOUR_ACCESS_TOKEN)
curl -G "https://graph.facebook.com/v20.0/act_YOUR_AD_ACCOUNT_ID" \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  -d "fields=id,name,account_status,capabilities"

# Test campaign creation (replace values)
curl -X POST "https://graph.facebook.com/v20.0/act_YOUR_AD_ACCOUNT_ID/campaigns" \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  -d "name=Test Campaign" \
  -d "objective=LINK_CLICKS" \
  -d "status=PAUSED" \
  -d "special_ad_categories=[]"
```

## 🛠️ Quick Fixes

### Fix 1: Update Facebook API Version
```bash
# Find and replace v18.0 with v20.0 in all files
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/v18\.0/v20.0/g'
```

### Fix 2: Add Better Error Handling
```javascript
// Add this to your campaign creation route
try {
  const facebookCampaignId = await facebookService.createCampaign({
    name: campaignName,
    objective,
    status: "PAUSED",
    budget: parseFloat(budget),
    budgetType,
  });
  
  // Success handling...
} catch (fbError: any) {
  console.error("Detailed Facebook error:", {
    message: fbError.message,
    response: fbError.response?.data,
    status: fbError.response?.status,
    headers: fbError.response?.headers
  });
  
  // Return detailed error to user
  return json({ 
    success: false, 
    message: `Facebook API Error: ${fbError.response?.data?.error?.message || fbError.message}`,
    errorCode: fbError.response?.data?.error?.code,
    errorType: fbError.response?.data?.error?.type
  });
}
```

### Fix 3: Validate Campaign Parameters
```javascript
// Add validation before creating campaign
function validateCampaignData(data) {
  const errors = [];
  
  if (!data.name || data.name.length < 1) {
    errors.push("Campaign name is required");
  }
  
  if (!['CONVERSIONS', 'LINK_CLICKS', 'BRAND_AWARENESS', 'REACH', 'ENGAGEMENT'].includes(data.objective)) {
    errors.push("Invalid campaign objective");
  }
  
  if (data.budget && data.budget < 1) {
    errors.push("Budget must be at least $1.00");
  }
  
  return errors;
}
```

## 📋 Checklist

Before creating campaigns, ensure:

- [ ] Facebook App is in Live mode
- [ ] User has reconnected Facebook with ads_management permission
- [ ] Ad account is active and user has Admin/Advertiser role
- [ ] Budget is at least $1.00
- [ ] Campaign objective is valid
- [ ] Access token is not expired
- [ ] API version is current (v19.0 or v20.0)

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check Facebook Business Help Center**: https://business.facebook.com/help/
2. **Review Facebook Marketing API docs**: https://developers.facebook.com/docs/marketing-api/
3. **Test with Facebook Graph API Explorer**: https://developers.facebook.com/tools/explorer/
4. **Contact Facebook Developer Support** if it's an API issue

## 🔍 Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 100 | Invalid parameter | Check campaign parameters |
| 190 | Access token error | Reconnect Facebook account |
| 200 | Permission denied | Check user permissions on ad account |
| 2500 | Ad account disabled | Contact Facebook support |
| 17 | User request limit reached | Wait or request higher limits |

Run the debug script first, then follow the specific solutions based on what it finds!