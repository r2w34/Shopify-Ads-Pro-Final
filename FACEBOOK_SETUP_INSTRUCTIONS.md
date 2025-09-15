# Facebook App Setup Instructions

## Current Issue
The Facebook OAuth redirect URI `https://fbai-app.trustclouds.in/auth/facebook/callback` is not whitelisted in your Facebook App settings.

## Solution Steps

### Option 1: Fix Current App (Recommended)
1. **Login to Facebook Developer Console:**
   - Go to: https://developers.facebook.com/
   - Login with: yashrajbhadane545@gmail.com
   - Password: %%Mh15hj@2812%%

2. **Navigate to Your App:**
   - App ID: 342313695281811
   - Direct link: https://developers.facebook.com/apps/342313695281811/

3. **Configure Facebook Login:**
   - Go to "Facebook Login" → "Settings" in the left sidebar
   - In "Valid OAuth Redirect URIs", add:
     ```
     https://fbai-app.trustclouds.in/auth/facebook/callback
     ```
   - Click "Save Changes"

4. **Configure App Domains:**
   - Go to "Settings" → "Basic"
   - In "App Domains", add:
     ```
     fbai-app.trustclouds.in
     ```
   - Save changes

### Option 2: Create New Test App
If you can't access the current app:

1. **Create New App:**
   - Go to https://developers.facebook.com/apps/
   - Click "Create App"
   - Choose "Business" type
   - App Name: "FB AI Ads Pro Test"

2. **Configure the New App:**
   - Add Facebook Login product
   - Set Valid OAuth Redirect URIs:
     ```
     https://fbai-app.trustclouds.in/auth/facebook/callback
     ```
   - Set App Domains:
     ```
     fbai-app.trustclouds.in
     ```

3. **Update Environment Variables:**
   - Copy the new App ID and App Secret
   - Update the production .env file with new credentials

## Current App Credentials
- **App ID:** 342313695281811
- **App Secret:** cdc03e18b1d755adc28575a54c7156db
- **Redirect URI:** https://fbai-app.trustclouds.in/auth/facebook/callback

## Testing
After configuring the Facebook app:
1. Go to your Shopify app dashboard
2. Click "Connect Facebook Account"
3. The popup should open without the redirect URI error
4. Complete the Facebook OAuth flow
5. The popup should close and show success message

## Troubleshooting
- If you still get redirect URI errors, double-check the exact URI in Facebook settings
- Make sure there are no extra spaces or characters
- The URI must match exactly: `https://fbai-app.trustclouds.in/auth/facebook/callback`
- Ensure the app is in "Live" mode, not "Development" mode for production use