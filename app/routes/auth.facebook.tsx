import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.NODE_ENV === 'development' 
    ? process.env.LOCAL_FACEBOOK_REDIRECT_URI 
    : process.env.FACEBOOK_REDIRECT_URI;
  
  if (!facebookAppId || !redirectUri) {
    throw new Error("Facebook configuration missing");
  }

  // Store shop in session for callback
  const url = new URL(request.url);
  const state = btoa(JSON.stringify({ shop: session.shop }));
  
  const facebookAuthUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  facebookAuthUrl.searchParams.set("client_id", facebookAppId);
  facebookAuthUrl.searchParams.set("redirect_uri", redirectUri);
  facebookAuthUrl.searchParams.set("state", state);
  facebookAuthUrl.searchParams.set("scope", "ads_management,ads_read,business_management,pages_read_engagement");
  facebookAuthUrl.searchParams.set("response_type", "code");

  return redirect(facebookAuthUrl.toString());
};