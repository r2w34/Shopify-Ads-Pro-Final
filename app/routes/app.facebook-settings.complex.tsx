import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Select,
  Banner,
  Divider,
  Box
} from "@shopify/polaris";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // Get Facebook account from database
    const { db } = await import("../db.server");
    const facebookAccount = await db.facebookAccount.findFirst({
      where: { shop, isActive: true },
      include: {
        adAccounts: true,
        pages: {
          include: {
            instagramAccounts: true,
          },
        },
      },
    });

    return json({
      facebookAccount: facebookAccount ? {
        id: facebookAccount.id,
        facebookUserId: facebookAccount.facebookUserId,
        businessId: facebookAccount.businessId,
        adAccountId: facebookAccount.adAccountId,
        pageId: facebookAccount.pageId,
        isActive: facebookAccount.isActive,
        createdAt: facebookAccount.createdAt,
        updatedAt: facebookAccount.updatedAt,
      } : null,
      isConnected: !!facebookAccount,
      shop,
      adAccounts: facebookAccount?.adAccounts || [],
      pages: facebookAccount?.pages || [],
      instagramAccounts: facebookAccount?.pages.flatMap(page => 
        page.instagramAccounts.map(ig => ({
          ...ig,
          pageId: page.pageId,
          pageName: page.name,
        }))
      ) || []
    });
  } catch (error) {
    console.error('Facebook settings loader error:', error);
    return json({
      facebookAccount: null,
      isConnected: false,
      shop: 'unknown',
      adAccounts: [],
      pages: [],
      instagramAccounts: [],
      error: 'Authentication failed'
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const action = formData.get("action");

    const { db } = await import("../db.server");

    if (action === "disconnect") {
      // Deactivate Facebook account
      await db.facebookAccount.updateMany({
        where: { shop, isActive: true },
        data: { isActive: false, updatedAt: new Date() }
      });
      
      return json({ success: true, message: "Facebook account disconnected" });
    }

    if (action === "select_ad_account") {
      const adAccountId = formData.get("adAccountId") as string;
      
      // Update the default ad account
      const facebookAccount = await db.facebookAccount.findFirst({
        where: { shop, isActive: true }
      });

      if (facebookAccount) {
        // Remove default from all ad accounts
        await db.adAccount.updateMany({
          where: { facebookAccountId: facebookAccount.id },
          data: { isDefault: false }
        });

        // Set new default
        await db.adAccount.updateMany({
          where: { 
            facebookAccountId: facebookAccount.id,
            adAccountId: adAccountId
          },
          data: { isDefault: true }
        });

        // Update Facebook account with selected ad account
        await db.facebookAccount.update({
          where: { id: facebookAccount.id },
          data: { adAccountId: adAccountId }
        });
      }
      
      return json({ success: true, message: "Ad account selected", adAccountId });
    }

    if (action === "connect_facebook") {
      // Redirect to Facebook auth
      return json({ success: true, redirect: "/auth/facebook" });
    }

    return json({ success: true, message: "Action completed" });
  } catch (error) {
    console.error('Facebook settings action error:', error);
    return json({ error: "Action failed" }, { status: 500 });
  }
}

export default function FacebookSettings() {
  const { facebookAccount, isConnected, shop, adAccounts, pages, instagramAccounts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedAdAccount, setSelectedAdAccount] = useState(
    facebookAccount?.adAccountId || ""
  );

  const connectFacebook = () => {
    const state = btoa(JSON.stringify({ shop, timestamp: Date.now() }));
    const authUrl = 'https://www.facebook.com/v18.0/dialog/oauth?' +
      'client_id=342313695281811&' +
      'redirect_uri=' + encodeURIComponent('https://fbai-app.trustclouds.in/auth/facebook/callback') + '&' +
      'scope=ads_management,ads_read,business_management,pages_read_engagement,instagram_basic,instagram_manage_insights,catalog_management&' +
      'response_type=code&' +
      'state=' + state;

    const popup = window.open(
      authUrl,
      'facebook_auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'FACEBOOK_AUTH_SUCCESS') {
        popup?.close();
        window.removeEventListener('message', messageHandler);
        window.location.reload();
      } else if (event.data.type === 'FACEBOOK_AUTH_ERROR') {
        popup?.close();
        window.removeEventListener('message', messageHandler);
        alert('Facebook authentication failed. Please try again.');
      }
    };

    window.addEventListener('message', messageHandler);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
      }
    }, 1000);
  };

  const handleAdAccountChange = (value: string) => {
    setSelectedAdAccount(value);
    
    const formData = new FormData();
    formData.append("action", "select_ad_account");
    formData.append("adAccountId", value);
    formData.append("facebookAccountId", facebookAccount?.id || "");
    
    fetcher.submit(formData, { method: "post" });
  };

  const disconnectFacebook = () => {
    if (confirm("Are you sure you want to disconnect your Facebook account?")) {
      const formData = new FormData();
      formData.append("action", "disconnect");
      fetcher.submit(formData, { method: "post" });
    }
  };

  const getAdAccountOptions = () => {
    if (!adAccounts || adAccounts.length === 0) return [];
    
    return adAccounts.map(account => ({
      label: `${account.name} (${account.currency}) - ${account.adAccountId}`,
      value: account.adAccountId
    }));
  };

  const getCurrentAdAccount = () => {
    if (!adAccounts || adAccounts.length === 0) return null;
    return adAccounts.find(acc => acc.adAccountId === selectedAdAccount);
  };

  const currentAdAccount = getCurrentAdAccount();

  return (
    <Page title="Facebook Integration Settings">
      <Layout>
        <Layout.Section>
          {fetcher.data?.success && (
            <Banner status="success">
              {fetcher.data.message}
            </Banner>
          )}
          
          {fetcher.data?.error && (
            <Banner status="critical">
              {fetcher.data.error}
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <BlockStack gap="200">
                  <Text variant="headingLg">Facebook Account Connection</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Connect your Facebook account to manage ads and access business data
                  </Text>
                </BlockStack>
                
                <Badge status={isConnected ? "success" : "attention"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </InlineStack>

              <Divider />

              {!isConnected ? (
                <BlockStack gap="300">
                  <Text variant="bodyMd">
                    Connect your Facebook account to start creating and managing ad campaigns.
                  </Text>
                  
                  <Box>
                    <Button
                      variant="primary"
                      onClick={connectFacebook}
                      loading={fetcher.state === "submitting"}
                    >
                      Connect Facebook Account
                    </Button>
                  </Box>
                </BlockStack>
              ) : (
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <BlockStack gap="200">
                      <Text variant="headingMd">✅ Facebook Account Connected</Text>
                      <Text variant="bodyMd" tone="subdued">
                        Your Facebook account is successfully connected and ready to use.
                      </Text>
                    </BlockStack>
                    
                    <Button
                      variant="plain"
                      onClick={disconnectFacebook}
                      loading={fetcher.state === "submitting"}
                    >
                      Disconnect
                    </Button>
                  </InlineStack>

                  {adAccounts && adAccounts.length > 0 && (
                    <>
                      <Divider />
                      
                      <BlockStack gap="300">
                        <Text variant="headingMd">Ad Account Selection</Text>
                        <Text variant="bodyMd" tone="subdued">
                          Choose which Facebook Ads account to use for your campaigns
                        </Text>
                        
                        <Select
                          label="Default Ad Account"
                          options={getAdAccountOptions()}
                          value={selectedAdAccount}
                          onChange={handleAdAccountChange}
                          disabled={fetcher.state === "submitting"}
                        />

                        {currentAdAccount && (
                          <Card background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text variant="headingSm">Selected Ad Account Details</Text>
                              <InlineStack gap="400">
                                <Text variant="bodyMd">
                                  <strong>Name:</strong> {currentAdAccount.name}
                                </Text>
                                <Text variant="bodyMd">
                                  <strong>Currency:</strong> {currentAdAccount.currency}
                                </Text>
                                <Text variant="bodyMd">
                                  <strong>Status:</strong> {currentAdAccount.accountStatus === 1 ? 'Active' : 'Inactive'}
                                </Text>
                              </InlineStack>
                              {currentAdAccount.timezone && (
                                <Text variant="bodyMd">
                                  <strong>Timezone:</strong> {currentAdAccount.timezone}
                                </Text>
                              )}
                            </BlockStack>
                          </Card>
                        )}
                      </BlockStack>
                    </>
                  )}

                  {pages && pages.length > 0 && (
                    <>
                      <Divider />
                      
                      <BlockStack gap="300">
                        <Text variant="headingMd">Connected Pages & Instagram</Text>
                        <Text variant="bodyMd" tone="subdued">
                          Facebook Pages and Instagram accounts available for marketing
                        </Text>
                        
                        <BlockStack gap="200">
                          {pages.map((page) => (
                            <Card key={page.id} background="bg-surface-secondary">
                              <InlineStack align="space-between">
                                <BlockStack gap="100">
                                  <Text variant="bodyMd" fontWeight="semibold">
                                    📄 {page.name}
                                  </Text>
                                  {page.category && (
                                    <Text variant="bodySm" tone="subdued">
                                      {page.category}
                                    </Text>
                                  )}
                                  {page.instagramAccounts.map((ig) => (
                                    <Text key={ig.id} variant="bodySm">
                                      📷 Instagram: @{ig.username}
                                    </Text>
                                  ))}
                                </BlockStack>
                                
                                <Badge>Connected</Badge>
                              </InlineStack>
                            </Card>
                          ))}
                        </BlockStack>
                      </BlockStack>
                    </>
                  )}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}