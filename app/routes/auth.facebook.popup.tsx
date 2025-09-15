import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return redirect("/app?error=missing_shop");
  }

  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/facebook/callback`;
  
  if (!facebookAppId || !redirectUri) {
    throw new Error("Facebook configuration missing");
  }

  const state = btoa(JSON.stringify({ shop, popup: true }));
  
  const facebookAuthUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  facebookAuthUrl.searchParams.set("client_id", facebookAppId);
  facebookAuthUrl.searchParams.set("redirect_uri", redirectUri);
  facebookAuthUrl.searchParams.set("state", state);
  facebookAuthUrl.searchParams.set("scope", "ads_management,ads_read,business_management,pages_read_engagement");
  facebookAuthUrl.searchParams.set("response_type", "code");
  facebookAuthUrl.searchParams.set("display", "popup");

  return redirect(facebookAuthUrl.toString());
};