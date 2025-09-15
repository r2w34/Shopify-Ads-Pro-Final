import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  Banner,
  Badge,
  InlineStack,
  Layout
} from "@shopify/polaris";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    // Check Facebook connection status
    const facebookAccount = await db.facebookAccount.findFirst({
      where: { shop, isActive: true },
      include: {
        adAccounts: true,
        pages: true
      }
    });
    
    return json({
      shop: session.shop,
      isConnected: !!facebookAccount,
      facebookAccount: facebookAccount ? {
        facebookUserId: facebookAccount.facebookUserId,
        businessId: facebookAccount.businessId,
        adAccountId: facebookAccount.adAccountId,
        pageId: facebookAccount.pageId,
        adAccounts: facebookAccount.adAccounts,
        pages: facebookAccount.pages,
        createdAt: facebookAccount.createdAt
      } : null
    });
  } catch (error) {
    console.error('Facebook settings loader error:', error);
    return json({
      shop: 'unknown',
      isConnected: false,
      facebookAccount: null,
      error: 'Authentication failed'
    });
  }
}

export default function FacebookSettings() {
  const { shop, isConnected, facebookAccount, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <Page title="Facebook Settings">
        <Layout>
          <Layout.Section>
            <Banner title="Error" status="critical">
              <p>Error: {error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const handleConnectFacebook = () => {
    // Redirect to Facebook OAuth
    window.location.href = '/auth/facebook';
  };

  return (
    <Page title="Facebook Settings" subtitle={`Settings for ${shop}`}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" align="space-between">
                <Text variant="headingMd">Facebook Integration</Text>
                <Badge status={isConnected ? "success" : "attention"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </InlineStack>
              
              {isConnected && facebookAccount ? (
                <BlockStack gap="300">
                  <Banner status="success">
                    <p>Your Facebook account is successfully connected and ready for advertising.</p>
                  </Banner>
                  
                  <Text variant="headingMd">Account Details</Text>
                  <BlockStack gap="200">
                    <Text as="p">
                      <strong>Facebook User ID:</strong> {facebookAccount.facebookUserId}
                    </Text>
                    {facebookAccount.businessId && (
                      <Text as="p">
                        <strong>Business ID:</strong> {facebookAccount.businessId}
                      </Text>
                    )}
                    {facebookAccount.adAccountId && (
                      <Text as="p">
                        <strong>Ad Account ID:</strong> {facebookAccount.adAccountId}
                      </Text>
                    )}
                    <Text as="p">
                      <strong>Connected:</strong> {new Date(facebookAccount.createdAt).toLocaleDateString()}
                    </Text>
                  </BlockStack>

                  {facebookAccount.adAccounts && facebookAccount.adAccounts.length > 0 && (
                    <BlockStack gap="200">
                      <Text variant="headingMd">Ad Accounts ({facebookAccount.adAccounts.length})</Text>
                      {facebookAccount.adAccounts.map((account: any) => (
                        <Card key={account.id}>
                          <BlockStack gap="100">
                            <Text as="p"><strong>{account.name}</strong></Text>
                            <Text as="p">ID: {account.adAccountId}</Text>
                            <Text as="p">Currency: {account.currency}</Text>
                            {account.isDefault && <Badge status="info">Default</Badge>}
                          </BlockStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}

                  {facebookAccount.pages && facebookAccount.pages.length > 0 && (
                    <BlockStack gap="200">
                      <Text variant="headingMd">Facebook Pages ({facebookAccount.pages.length})</Text>
                      {facebookAccount.pages.map((page: any) => (
                        <Card key={page.id}>
                          <BlockStack gap="100">
                            <Text as="p"><strong>{page.name}</strong></Text>
                            <Text as="p">ID: {page.pageId}</Text>
                            <Text as="p">Category: {page.category || 'N/A'}</Text>
                          </BlockStack>
                        </Card>
                      ))}
                    </BlockStack>
                  )}

                  <InlineStack gap="200">
                    <Button url="/app/campaigns/new" variant="primary">
                      Create Campaign
                    </Button>
                    <Button url="/auth/facebook" variant="secondary">
                      Reconnect Facebook
                    </Button>
                  </InlineStack>
                </BlockStack>
              ) : (
                <BlockStack gap="300">
                  <Banner status="info">
                    <p>Connect your Facebook account to start creating and managing advertising campaigns.</p>
                  </Banner>
                  
                  <Text as="p">
                    To get started with Facebook advertising, you'll need to:
                  </Text>
                  <ul>
                    <li>Connect your Facebook account</li>
                    <li>Select your Facebook Business account</li>
                    <li>Choose your ad account and Facebook pages</li>
                    <li>Grant necessary permissions for campaign management</li>
                  </ul>
                  
                  <Button variant="primary" onClick={handleConnectFacebook}>
                    Connect Facebook Account
                  </Button>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Quick Actions</Text>
              <InlineStack gap="200">
                <Button url="/app" variant="secondary">
                  Back to Dashboard
                </Button>
                {isConnected && (
                  <>
                    <Button url="/app/campaigns/new" variant="primary">
                      Create Campaign
                    </Button>
                    <Button url="/app/analytics">
                      View Analytics
                    </Button>
                  </>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}