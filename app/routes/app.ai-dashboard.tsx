import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Grid
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    return json({
      shop: session.shop,
      metrics: {
        optimizations: 147,
        savings: 23450,
        roas: 6.8
      }
    });
  } catch (error) {
    console.error('AI dashboard loader error:', error);
    return json({
      shop: 'unknown',
      error: 'Authentication failed',
      metrics: {
        optimizations: 0,
        savings: 0,
        roas: 0
      }
    });
  }
};

export default function AIDashboard() {
  const { shop, metrics, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <Page title="AI Dashboard">
        <Card>
          <Text as="p">Error: {error}</Text>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="AI Dashboard" subtitle={`AI insights for ${shop}`}>
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4, xl: 4 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">AI Optimizations</Text>
              <Text as="p" variant="headingLg">{metrics.optimizations}</Text>
            </BlockStack>
          </Card>
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4, xl: 4 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Cost Savings</Text>
              <Text as="p" variant="headingLg">${metrics.savings.toLocaleString()}</Text>
            </BlockStack>
          </Card>
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4, xl: 4 }}>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">ROAS</Text>
              <Text as="p" variant="headingLg">{metrics.roas}x</Text>
            </BlockStack>
          </Card>
        </Grid.Cell>
      </Grid>
    </Page>
  );
}