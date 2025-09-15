import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { db } from "../db.server";

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
  
  // Handle Facebook auth error
  if (error) {
    return new Response(`
      <html>
        <head><title>Facebook Authentication</title></head>
        <body>
          <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>❌ Facebook Authentication Error</h2>
            <p>Error: ${error}</p>
            <p>Please try connecting again.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'FACEBOOK_AUTH_ERROR',
                  error: '${error}'
                }, '*');
                window.close();
              } else {
                setTimeout(() => {
                  window.location.href = '/app/facebook-settings';
                }, 3000);
              }
            </script>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Handle successful auth
  if (code && state) {
    try {
      // Decode state to get shop information
      let shop: string;
      try {
        const stateData = JSON.parse(atob(state));
        shop = stateData.shop;
      } catch (stateError) {
        console.error('Invalid state parameter:', stateError);
        throw new Error('Invalid state parameter');
      }

      // Exchange authorization code for access token
      const facebookAppId = process.env.FACEBOOK_APP_ID;
      const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = process.env.NODE_ENV === 'development' 
        ? process.env.LOCAL_FACEBOOK_REDIRECT_URI || "http://localhost:3000/facebook-callback"
        : process.env.FACEBOOK_REDIRECT_URI || "https://fbai-app.trustclouds.in/facebook-callback";

      if (!facebookAppId || !facebookAppSecret) {
        throw new Error('Facebook app credentials not configured');
      }

      console.log('Exchanging code for access token...');
      
      // Exchange code for access token
      const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: facebookAppId,
          client_secret: facebookAppSecret,
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token exchange failed:', errorData);
        throw new Error(`Token exchange failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      if (!accessToken) {
        throw new Error('No access token received');
      }

      console.log('Access token received, fetching user data...');

      // Get user information
      const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information');
      }
      const userData = await userResponse.json();

      // Get ad accounts
      const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${accessToken}`);
      if (!adAccountsResponse.ok) {
        throw new Error('Failed to fetch ad accounts');
      }
      const adAccountsData = await adAccountsResponse.json();
      const adAccounts = adAccountsData.data || [];

      // Get pages
      const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,instagram_business_account&access_token=${accessToken}`);
      if (!pagesResponse.ok) {
        throw new Error('Failed to fetch pages');
      }
      const pagesData = await pagesResponse.json();
      const pages = pagesData.data || [];

      console.log(`Found ${adAccounts.length} ad accounts and ${pages.length} pages`);

      // Store Facebook account in database
      const facebookAccount = await db.facebookAccount.upsert({
        where: { 
          shop_facebookUserId: {
            shop: shop,
            facebookUserId: userData.id
          }
        },
        update: {
          accessToken: accessToken,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          shop,
          facebookUserId: userData.id,
          accessToken: accessToken,
          isActive: true
        }
      });

      // Store ad accounts
      for (const adAccount of adAccounts) {
        await db.adAccount.upsert({
          where: {
            facebookAccountId_adAccountId: {
              facebookAccountId: facebookAccount.id,
              adAccountId: adAccount.id
            }
          },
          update: {
            name: adAccount.name,
            currency: adAccount.currency,
            timezone: adAccount.timezone_name,
            accountStatus: adAccount.account_status,
            updatedAt: new Date()
          },
          create: {
            facebookAccountId: facebookAccount.id,
            adAccountId: adAccount.id,
            name: adAccount.name,
            currency: adAccount.currency,
            timezone: adAccount.timezone_name,
            accountStatus: adAccount.account_status,
            isDefault: adAccounts.indexOf(adAccount) === 0 // First account is default
          }
        });
      }

      // Store pages
      for (const page of pages) {
        const facebookPage = await db.facebookPage.upsert({
          where: {
            facebookAccountId_pageId: {
              facebookAccountId: facebookAccount.id,
              pageId: page.id
            }
          },
          update: {
            name: page.name,
            accessToken: page.access_token,
            category: page.category,
            updatedAt: new Date()
          },
          create: {
            facebookAccountId: facebookAccount.id,
            pageId: page.id,
            name: page.name,
            accessToken: page.access_token,
            category: page.category
          }
        });

        // If page has Instagram business account, store it
        if (page.instagram_business_account) {
          const igAccount = page.instagram_business_account;
          
          // Get Instagram account details
          try {
            const igResponse = await fetch(`https://graph.facebook.com/v18.0/${igAccount.id}?fields=id,name,username,profile_picture_url&access_token=${page.access_token}`);
            if (igResponse.ok) {
              const igData = await igResponse.json();
              
              await db.instagramAccount.upsert({
                where: {
                  facebookPageId_instagramId: {
                    facebookPageId: facebookPage.id,
                    instagramId: igData.id
                  }
                },
                update: {
                  name: igData.name,
                  username: igData.username,
                  profilePictureUrl: igData.profile_picture_url,
                  updatedAt: new Date()
                },
                create: {
                  facebookPageId: facebookPage.id,
                  instagramId: igData.id,
                  name: igData.name,
                  username: igData.username,
                  profilePictureUrl: igData.profile_picture_url
                }
              });
            }
          } catch (igError) {
            console.error('Failed to fetch Instagram account details:', igError);
          }
        }
      }

      console.log('Facebook account data stored successfully');

      return new Response(`
        <html>
          <head><title>Facebook Authentication</title></head>
          <body>
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
              <h2>✅ Facebook Authentication Successful</h2>
              <p>Your Facebook account has been connected!</p>
              <p>Found ${adAccounts.length} ad accounts and ${pages.length} pages.</p>
              <p>Redirecting back to settings...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'FACEBOOK_AUTH_SUCCESS',
                    data: {
                      adAccounts: ${adAccounts.length},
                      pages: ${pages.length}
                    }
                  }, '*');
                  window.close();
                } else {
                  setTimeout(() => {
                    window.location.href = '/app/facebook-settings';
                  }, 2000);
                }
              </script>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });

    } catch (authError: any) {
      console.error('Facebook authentication error:', authError);
      
      return new Response(`
        <html>
          <head><title>Facebook Authentication</title></head>
          <body>
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
              <h2>❌ Facebook Authentication Failed</h2>
              <p>Error: ${authError.message}</p>
              <p>Please try connecting again.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'FACEBOOK_AUTH_ERROR',
                    error: '${authError.message}'
                  }, '*');
                  window.close();
                } else {
                  setTimeout(() => {
                    window.location.href = '/app/facebook-settings';
                  }, 3000);
                }
              </script>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }

  // No code or state - invalid request
  return new Response(`
    <html>
      <head><title>Facebook Authentication</title></head>
      <body>
        <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
          <h2>❌ Invalid Request</h2>
          <p>Missing authorization code or state parameter.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'FACEBOOK_AUTH_ERROR',
                error: 'Invalid request'
              }, '*');
              window.close();
            } else {
              setTimeout(() => {
                window.location.href = '/app/facebook-settings';
              }, 3000);
            }
          </script>
        </div>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
};