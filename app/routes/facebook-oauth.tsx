import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  // Shop parameter is required for Facebook OAuth
  if (!shop) {
    return new Response(`
      <html>
        <head><title>Facebook Authentication</title></head>
        <body>
          <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>❌ Missing Shop Parameter</h2>
            <p>Shop parameter is required for Facebook authentication.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'FACEBOOK_AUTH_ERROR',
                  error: 'Missing shop parameter'
                }, '*');
                window.close();
              }
            </script>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  const facebookAppId = process.env.FACEBOOK_APP_ID || "342313695281811";
  const redirectUri = process.env.NODE_ENV === 'development' 
    ? process.env.LOCAL_FACEBOOK_REDIRECT_URI || "http://localhost:3000/facebook-callback"
    : process.env.FACEBOOK_REDIRECT_URI || "https://fbai-app.trustclouds.in/facebook-callback";
  
  // Store shop in state for callback
  const state = btoa(JSON.stringify({ shop }));
  
  const facebookAuthUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  facebookAuthUrl.searchParams.set("client_id", facebookAppId);
  facebookAuthUrl.searchParams.set("redirect_uri", redirectUri);
  facebookAuthUrl.searchParams.set("state", state);
  facebookAuthUrl.searchParams.set("scope", "ads_management,ads_read,business_management,pages_read_engagement,instagram_basic,instagram_manage_insights,catalog_management");
  facebookAuthUrl.searchParams.set("response_type", "code");

  return redirect(facebookAuthUrl.toString());
};