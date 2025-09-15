import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import axios from "axios";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  console.log('=== FACEBOOK CALLBACK DEBUG ===');
  console.log('URL:', url.toString());
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('State:', state);
  console.log('Error:', error);
  console.log('All params:', Object.fromEntries(url.searchParams.entries()));
  
  // Try to get shop from state parameter first
  let shop = '';
  try {
    if (state) {
      const decodedState = JSON.parse(atob(state));
      shop = decodedState.shop;
      console.log('Shop from state:', shop);
    }
  } catch (e) {
    console.log('Failed to decode state:', e);
  }
  
  // If no shop from state, try to authenticate with Shopify
  if (!shop) {
    try {
      const { session } = await authenticate.admin(request);
      shop = session.shop;
      console.log('Shop from session:', shop);
    } catch (e) {
      console.log('Failed to authenticate with Shopify:', e);
      // If we can't get shop, return error
      return new Response(`
        <html>
          <head><title>Authentication Error</title></head>
          <body>
            <div style="text-align: center; padding: 20px;">
              <h2>❌ Authentication Error</h2>
              <p>Unable to determine shop context</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'FACEBOOK_AUTH_ERROR',
                    error: 'Unable to determine shop context'
                  }, '*');
                  setTimeout(() => window.close(), 2000);
                } else {
                  setTimeout(() => window.location.href = '/', 2000);
                }
              </script>
            </div>
          </body>
        </html>
      `, { headers: { "Content-Type": "text/html" } });
    }
  }

  if (error) {
    console.error("Facebook OAuth error:", error);
    
    // Always return error page that checks popup context
    return new Response(`
      <html>
        <head>
          <title>Facebook Authentication Error</title>
        </head>
        <body>
          <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>❌ Facebook Authentication Failed</h2>
            <p>Error: ${error}</p>
            <p id="status">Processing error...</p>
          </div>
          <script>
            console.log('Facebook OAuth error processing...');
            
            if (window.opener && !window.opener.closed) {
              console.log('Detected popup context - sending error to parent');
              document.getElementById('status').textContent = 'This window will close automatically...';
              
              try {
                window.opener.postMessage({
                  type: 'FACEBOOK_AUTH_ERROR',
                  error: '${error}',
                  timestamp: Date.now()
                }, '*');
                
                setTimeout(() => {
                  window.close();
                }, 2000);
              } catch (e) {
                console.error('Error sending message to parent:', e);
                document.getElementById('status').textContent = 'Please close this window manually.';
              }
            } else {
              console.log('Not in popup context - redirecting to app');
              document.getElementById('status').textContent = 'Redirecting to dashboard...';
              setTimeout(() => {
                window.location.href = '/app?error=facebook_auth_failed';
              }, 2000);
            }
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  }

  if (!code || !state) {
    console.log('Missing code or state - redirecting to error');
    return redirect("/app?error=invalid_callback");
  }

  try {
    console.log('Processing Facebook OAuth success...');
    console.log('Shop context:', shop);

    // Exchange code for access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await axios.post("https://graph.facebook.com/v18.0/oauth/access_token", {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: "https://fbai-app.trustclouds.in/auth/facebook/callback",
      code: code,
    });
    
    console.log('Token response received:', tokenResponse.data);

    const { access_token } = tokenResponse.data;

    // Get user info
    console.log('Getting user info...');
    const userResponse = await axios.get(`https://graph.facebook.com/v18.0/me`, {
      params: {
        access_token: access_token,
        fields: "id,name,email"
      }
    });
    
    console.log('User response:', userResponse.data);

    const userData = userResponse.data;

    // Get business accounts and ad accounts
    let businessId = null;
    let adAccountId = null;
    let adAccounts = [];
    
    try {
      console.log('Fetching business accounts...');
      const businessResponse = await axios.get(`https://graph.facebook.com/v18.0/${userData.id}/businesses`, {
        params: {
          access_token: access_token,
          fields: "id,name"
        }
      });

      console.log('Business response:', businessResponse.data);

      if (businessResponse.data.data && businessResponse.data.data.length > 0) {
        businessId = businessResponse.data.data[0].id;
        console.log('Using business ID:', businessId);

        // Get ad accounts for the business with currency info
        console.log('Fetching ad accounts...');
        const adAccountsResponse = await axios.get(`https://graph.facebook.com/v18.0/${businessId}/owned_ad_accounts`, {
          params: {
            access_token: access_token,
            fields: "id,name,account_status,currency,timezone_name"
          }
        });

        console.log('Ad accounts response:', adAccountsResponse.data);

        if (adAccountsResponse.data.data && adAccountsResponse.data.data.length > 0) {
          adAccounts = adAccountsResponse.data.data;
          // Find an active ad account as default
          const activeAccount = adAccounts.find((acc: any) => acc.account_status === 1);
          adAccountId = activeAccount ? activeAccount.id : adAccounts[0].id;
          console.log('Default ad account ID:', adAccountId);
        }
      } else {
        // Try to get ad accounts directly from user
        console.log('No business found, trying direct ad accounts...');
        const directAdAccountsResponse = await axios.get(`https://graph.facebook.com/v18.0/${userData.id}/adaccounts`, {
          params: {
            access_token: access_token,
            fields: "id,name,account_status,currency,timezone_name"
          }
        });

        console.log('Direct ad accounts response:', directAdAccountsResponse.data);

        if (directAdAccountsResponse.data.data && directAdAccountsResponse.data.data.length > 0) {
          adAccounts = directAdAccountsResponse.data.data;
          const activeAccount = adAccounts.find((acc: any) => acc.account_status === 1);
          adAccountId = activeAccount ? activeAccount.id : adAccounts[0].id;
          console.log('Default ad account ID (direct):', adAccountId);
        }
      }
    } catch (businessError) {
      console.warn("Could not fetch business/ad account info:", businessError);
    }

    // Get Facebook pages
    let pages = [];
    try {
      console.log('Fetching Facebook pages...');
      const pagesResponse = await axios.get(`https://graph.facebook.com/v18.0/${userData.id}/accounts`, {
        params: {
          access_token: access_token,
          fields: "id,name,access_token,category,instagram_business_account"
        }
      });

      console.log('Pages response:', pagesResponse.data);
      pages = pagesResponse.data.data || [];
    } catch (pagesError) {
      console.warn("Could not fetch Facebook pages:", pagesError);
    }

    // Get Instagram accounts from pages
    let instagramAccounts = [];
    try {
      console.log('Fetching Instagram accounts...');
      for (const page of pages) {
        if (page.instagram_business_account) {
          const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.instagram_business_account.id}`, {
            params: {
              access_token: page.access_token,
              fields: "id,name,username,profile_picture_url"
            }
          });
          
          if (igResponse.data) {
            instagramAccounts.push({
              ...igResponse.data,
              pageId: page.id,
              pageName: page.name
            });
          }
        }
      }
      console.log('Instagram accounts:', instagramAccounts);
    } catch (igError) {
      console.warn("Could not fetch Instagram accounts:", igError);
    }

    // Store Facebook account in database
    console.log('Storing Facebook account in database...');
    console.log('Database data:', {
      shop,
      facebookUserId: userData.id,
      businessId,
      adAccountId
    });
    
    const facebookAccount = await db.facebookAccount.upsert({
      where: {
        shop_facebookUserId: {
          shop: shop,
          facebookUserId: userData.id
        }
      },
      update: {
        accessToken: access_token,
        businessId: businessId,
        adAccountId: adAccountId,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        shop: shop,
        facebookUserId: userData.id,
        accessToken: access_token,
        businessId: businessId,
        adAccountId: adAccountId,
        isActive: true
      }
    });
    
    console.log('Facebook account stored successfully:', facebookAccount.id);

    // Store ad accounts
    if (adAccounts.length > 0) {
      console.log('Storing ad accounts...');
      
      // Delete existing ad accounts for this Facebook account
      await db.adAccount.deleteMany({
        where: { facebookAccountId: facebookAccount.id }
      });

      // Create new ad accounts
      for (const adAccount of adAccounts) {
        await db.adAccount.create({
          data: {
            facebookAccountId: facebookAccount.id,
            adAccountId: adAccount.id,
            name: adAccount.name || `Ad Account ${adAccount.id}`,
            currency: adAccount.currency || 'USD',
            timezone: adAccount.timezone_name || null,
            accountStatus: adAccount.account_status || 1,
            isDefault: adAccount.id === adAccountId,
          }
        });
      }
      
      console.log(`Stored ${adAccounts.length} ad accounts`);
    }

    // Store Facebook pages
    if (pages.length > 0) {
      console.log('Storing Facebook pages...');
      
      // Delete existing pages for this Facebook account
      await db.facebookPage.deleteMany({
        where: { facebookAccountId: facebookAccount.id }
      });

      // Create new pages
      for (const page of pages) {
        await db.facebookPage.create({
          data: {
            facebookAccountId: facebookAccount.id,
            pageId: page.id,
            name: page.name,
            accessToken: page.access_token,
            category: page.category || null,
          }
        });
      }
      
      console.log(`Stored ${pages.length} Facebook pages`);
    }

    // Store Instagram accounts
    if (instagramAccounts.length > 0) {
      console.log('Storing Instagram accounts...');
      
      for (const igAccount of instagramAccounts) {
        // Find the corresponding Facebook page
        const facebookPage = await db.facebookPage.findFirst({
          where: {
            facebookAccountId: facebookAccount.id,
            pageId: igAccount.pageId
          }
        });

        if (facebookPage) {
          // Delete existing Instagram accounts for this page
          await db.instagramAccount.deleteMany({
            where: { facebookPageId: facebookPage.id }
          });

          // Create new Instagram account
          await db.instagramAccount.create({
            data: {
              facebookPageId: facebookPage.id,
              instagramId: igAccount.id,
              name: igAccount.name || null,
              username: igAccount.username,
              profilePictureUrl: igAccount.profile_picture_url || null,
            }
          });
        }
      }
      
      console.log(`Stored ${instagramAccounts.length} Instagram accounts`);
    }

    // Always return a page that checks if it's in a popup context
    // This handles Facebook's inconsistent state parameter handling
    return new Response(`
      <html>
        <head>
          <title>Facebook Authentication</title>
        </head>
        <body>
          <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>✅ Facebook Account Connected!</h2>
            <p id="status">Processing...</p>
          </div>
          <script>
            console.log('Facebook callback processing...');
            console.log('State parameter:', '${state}');
            console.log('Shop:', '${shop}');
            
            // Check if we're in a popup window
            if (window.opener && !window.opener.closed) {
              console.log('Detected popup context - sending message to parent');
              document.getElementById('status').textContent = 'This window will close automatically...';
              
              try {
                window.opener.postMessage({
                  type: 'FACEBOOK_AUTH_SUCCESS',
                  shop: '${shop}',
                  timestamp: Date.now()
                }, '*');
                
                // Close after a short delay to ensure message is sent
                setTimeout(() => {
                  console.log('Closing popup window');
                  window.close();
                }, 1500);
              } catch (e) {
                console.error('Error sending message to parent:', e);
                document.getElementById('status').textContent = 'Please close this window manually.';
              }
            } else {
              console.log('Not in popup context - redirecting to app');
              document.getElementById('status').textContent = 'Redirecting to dashboard...';
              setTimeout(() => {
                window.location.href = '/app?success=facebook_connected';
              }, 2000);
            }
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });

  } catch (error) {
    console.error("Facebook OAuth callback error:", error);
    
    // Always return error page that checks popup context
    return new Response(`
      <html>
        <head>
          <title>Facebook Authentication Error</title>
        </head>
        <body>
          <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>❌ Facebook Authentication Failed</h2>
            <p id="status">Processing error...</p>
          </div>
          <script>
            console.log('Facebook auth error processing...');
            
            if (window.opener && !window.opener.closed) {
              console.log('Detected popup context - sending error to parent');
              document.getElementById('status').textContent = 'This window will close automatically...';
              
              try {
                window.opener.postMessage({
                  type: 'FACEBOOK_AUTH_ERROR',
                  error: 'Authentication failed',
                  timestamp: Date.now()
                }, '*');
                
                setTimeout(() => {
                  window.close();
                }, 2000);
              } catch (e) {
                console.error('Error sending message to parent:', e);
                document.getElementById('status').textContent = 'Please close this window manually.';
              }
            } else {
              console.log('Not in popup context - redirecting to app');
              document.getElementById('status').textContent = 'Redirecting to dashboard...';
              setTimeout(() => {
                window.location.href = '/app?error=facebook_auth_failed';
              }, 2000);
            }
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  }
};