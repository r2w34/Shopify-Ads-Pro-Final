import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Banner,
  ProgressBar,
  Divider,
  ButtonGroup,
  Modal,
  TextField,
  Select,
  Checkbox,
  DataTable,
  ResourceList,
  ResourceItem,
  Avatar,
  Thumbnail,
  Grid,
  Tabs,
  EmptyState,
  Spinner,
  Toast,
  Frame,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { PlusIcon, ConnectIcon, InfoIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return json({
    shop: session.shop,
    demoData: {
      campaigns: [
        { id: '1', name: 'Summer Sale Campaign', status: 'Active', spend: 245.50, revenue: 892.30, roas: 3.6 },
        { id: '2', name: 'Back to School Promo', status: 'Paused', spend: 189.20, revenue: 456.80, roas: 2.4 },
        { id: '3', name: 'Holiday Collection', status: 'Active', spend: 567.80, revenue: 1234.50, roas: 2.2 },
      ],
      products: [
        { id: '1', title: 'Summer Dress Collection', price: '49.99', image: 'https://via.placeholder.com/60x60' },
        { id: '2', title: 'Beach Accessories Set', price: '29.99', image: 'https://via.placeholder.com/60x60' },
        { id: '3', title: 'Sunglasses Premium', price: '79.99', image: 'https://via.placeholder.com/60x60' },
      ]
    }
  });
};

export default function UIShowcase() {
  const data = useLoaderData<typeof loader>();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formValues, setFormValues] = useState({
    campaignName: 'Summer Sale 2024',
    objective: 'conversions',
    budget: '50.00',
    targetAudience: 'Women 25-45 interested in fashion'
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge tone="success">Active</Badge>;
      case 'Paused':
        return <Badge tone="warning">Paused</Badge>;
      default:
        return <Badge tone="subdued">{status}</Badge>;
    }
  };

  const tabs = [
    { id: 'dashboard', content: 'Dashboard Components' },
    { id: 'forms', content: 'Forms & Inputs' },
    { id: 'data', content: 'Data Display' },
    { id: 'feedback', content: 'Feedback & Status' },
  ];

  const toastMarkup = showToast ? (
    <Toast
      content="Campaign created successfully!"
      onDismiss={() => setShowToast(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page>
        <TitleBar title="UI/UX Component Showcase" />

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Header Banner */}
              <Banner
                title="AI Facebook Ads Pro - UI Component Showcase"
                status="info"
                action={{
                  content: "View Documentation",
                  onAction: () => console.log("View docs")
                }}
              >
                <p>This page demonstrates all the UI components used in the AI Facebook Ads Pro application, built with Shopify Polaris design system.</p>
              </Banner>

              {/* Tabbed Content */}
              <Card>
                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                  <div style={{ marginTop: '20px' }}>
                    
                    {/* Dashboard Components Tab */}
                    {selectedTab === 0 && (
                      <BlockStack gap="500">
                        <Text as="h2" variant="headingLg">Dashboard Components</Text>
                        
                        {/* Metrics Cards */}
                        <Text as="h3" variant="headingMd">Key Metrics Cards</Text>
                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                            <Card>
                              <BlockStack gap="200">
                                <Text as="h3" variant="headingSm">Total Campaigns</Text>
                                <Text as="p" variant="headingLg">12</Text>
                                <Text as="p" variant="bodySm" tone="subdued">📈 +3 this month</Text>
                              </BlockStack>
                            </Card>
                          </Grid.Cell>
                          
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                            <Card>
                              <BlockStack gap="200">
                                <Text as="h3" variant="headingSm">Total Spend</Text>
                                <Text as="p" variant="headingLg">$2,450.00</Text>
                                <Text as="p" variant="bodySm" tone="subdued">📊 Last 30 days</Text>
                              </BlockStack>
                            </Card>
                          </Grid.Cell>
                          
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                            <Card>
                              <BlockStack gap="200">
                                <Text as="h3" variant="headingSm">Total Revenue</Text>
                                <Text as="p" variant="headingLg">$8,920.00</Text>
                                <Text as="p" variant="bodySm" tone="subdued">💰 ROAS: 3.6x</Text>
                              </BlockStack>
                            </Card>
                          </Grid.Cell>
                          
                          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                            <Card>
                              <BlockStack gap="200">
                                <Text as="h3" variant="headingSm">Active Campaigns</Text>
                                <Text as="p" variant="headingLg">8</Text>
                                <ProgressBar progress={67} tone="success" size="small" />
                              </BlockStack>
                            </Card>
                          </Grid.Cell>
                        </Grid>

                        {/* Action Buttons */}
                        <Text as="h3" variant="headingMd">Action Buttons</Text>
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h4" variant="headingSm">Primary Actions</Text>
                            <ButtonGroup>
                              <Button variant="primary" icon={PlusIcon}>Create Campaign</Button>
                              <Button icon={ConnectIcon}>Connect Facebook</Button>
                              <Button>Sync Campaigns</Button>
                            </ButtonGroup>
                            
                            <Divider />
                            
                            <Text as="h4" variant="headingSm">Secondary Actions</Text>
                            <ButtonGroup>
                              <Button size="slim">Edit</Button>
                              <Button size="slim" tone="critical">Delete</Button>
                              <Button size="slim" disabled>Disabled</Button>
                            </ButtonGroup>
                          </BlockStack>
                        </Card>

                        {/* Status Indicators */}
                        <Text as="h3" variant="headingMd">Status Indicators</Text>
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">Campaign Status</Text>
                            <InlineStack gap="200">
                              <Badge tone="success">Active</Badge>
                              <Badge tone="warning">Paused</Badge>
                              <Badge tone="critical">Failed</Badge>
                              <Badge tone="info">Trial</Badge>
                              <Badge tone="subdued">Draft</Badge>
                            </InlineStack>
                            
                            <Text as="h4" variant="headingSm">Subscription Status</Text>
                            <InlineStack gap="200">
                              <Badge tone="success">Professional</Badge>
                              <Badge tone="info">Starter</Badge>
                              <Badge tone="warning">Enterprise</Badge>
                              <Badge tone="critical">Expired</Badge>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}

                    {/* Forms & Inputs Tab */}
                    {selectedTab === 1 && (
                      <BlockStack gap="500">
                        <Text as="h2" variant="headingLg">Forms & Input Components</Text>
                        
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Campaign Creation Form</Text>
                            
                            <TextField
                              label="Campaign Name"
                              value={formValues.campaignName}
                              onChange={(value) => setFormValues({...formValues, campaignName: value})}
                              placeholder="Enter campaign name"
                              autoComplete="off"
                            />

                            <Select
                              label="Campaign Objective"
                              options={[
                                { label: 'Conversions', value: 'conversions' },
                                { label: 'Traffic', value: 'traffic' },
                                { label: 'Brand Awareness', value: 'awareness' },
                                { label: 'Reach', value: 'reach' },
                              ]}
                              value={formValues.objective}
                              onChange={(value) => setFormValues({...formValues, objective: value})}
                            />

                            <InlineStack gap="400">
                              <TextField
                                label="Budget Amount ($)"
                                type="number"
                                value={formValues.budget}
                                onChange={(value) => setFormValues({...formValues, budget: value})}
                                prefix="$"
                              />
                              <Select
                                label="Budget Type"
                                options={[
                                  { label: 'Daily Budget', value: 'daily' },
                                  { label: 'Lifetime Budget', value: 'lifetime' },
                                ]}
                                value="daily"
                                onChange={() => {}}
                              />
                            </InlineStack>

                            <TextField
                              label="Target Audience"
                              value={formValues.targetAudience}
                              onChange={(value) => setFormValues({...formValues, targetAudience: value})}
                              placeholder="e.g., Women aged 25-45 interested in fashion"
                              multiline={2}
                              autoComplete="off"
                            />

                            <InlineStack gap="200">
                              <Checkbox
                                label="Enable AI optimization"
                                checked={true}
                                onChange={() => {}}
                              />
                              <Checkbox
                                label="Auto-sync with Facebook"
                                checked={false}
                                onChange={() => {}}
                              />
                            </InlineStack>

                            <ButtonGroup>
                              <Button variant="primary" onClick={() => setShowToast(true)}>
                                Create Campaign
                              </Button>
                              <Button onClick={() => setShowModal(true)}>
                                Preview
                              </Button>
                            </ButtonGroup>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}

                    {/* Data Display Tab */}
                    {selectedTab === 2 && (
                      <BlockStack gap="500">
                        <Text as="h2" variant="headingLg">Data Display Components</Text>
                        
                        {/* Data Table */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Campaign Performance Table</Text>
                            
                            <DataTable
                              columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric']}
                              headings={['Campaign', 'Status', 'Spend', 'Revenue', 'ROAS']}
                              rows={data.demoData.campaigns.map(campaign => [
                                campaign.name,
                                getStatusBadge(campaign.status),
                                formatCurrency(campaign.spend),
                                formatCurrency(campaign.revenue),
                                `${campaign.roas}x`
                              ])}
                            />
                          </BlockStack>
                        </Card>

                        {/* Resource List */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Product Selection List</Text>
                            
                            <ResourceList
                              resourceName={{ singular: 'product', plural: 'products' }}
                              items={data.demoData.products}
                              renderItem={(product) => (
                                <ResourceItem
                                  id={product.id}
                                  media={<Thumbnail source={product.image} alt={product.title} size="small" />}
                                  accessibilityLabel={`Select ${product.title}`}
                                >
                                  <InlineStack align="space-between">
                                    <BlockStack gap="100">
                                      <Text as="h3" variant="bodyMd" fontWeight="bold">
                                        {product.title}
                                      </Text>
                                      <Text as="p" variant="bodySm" tone="subdued">
                                        ${product.price}
                                      </Text>
                                    </BlockStack>
                                    <Checkbox
                                      checked={false}
                                      onChange={() => {}}
                                    />
                                  </InlineStack>
                                </ResourceItem>
                              )}
                            />
                          </BlockStack>
                        </Card>

                        {/* Progress Indicators */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Usage Progress Bars</Text>
                            
                            <BlockStack gap="300">
                              <div>
                                <InlineStack align="space-between">
                                  <Text as="span" variant="bodySm">Campaigns Used</Text>
                                  <Text as="span" variant="bodySm">8 / 25</Text>
                                </InlineStack>
                                <ProgressBar progress={32} tone="success" size="small" />
                              </div>
                              
                              <div>
                                <InlineStack align="space-between">
                                  <Text as="span" variant="bodySm">AI Requests</Text>
                                  <Text as="span" variant="bodySm">156 / 500</Text>
                                </InlineStack>
                                <ProgressBar progress={31} tone="info" size="small" />
                              </div>
                              
                              <div>
                                <InlineStack align="space-between">
                                  <Text as="span" variant="bodySm">Storage Used</Text>
                                  <Text as="span" variant="bodySm">4.2GB / 5GB</Text>
                                </InlineStack>
                                <ProgressBar progress={84} tone="warning" size="small" />
                              </div>
                            </BlockStack>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}

                    {/* Feedback & Status Tab */}
                    {selectedTab === 3 && (
                      <BlockStack gap="500">
                        <Text as="h2" variant="headingLg">Feedback & Status Components</Text>
                        
                        {/* Banners */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Status Banners</Text>
                            
                            <Banner
                              title="Facebook account connected successfully"
                              status="success"
                              action={{
                                content: "View Account",
                                onAction: () => console.log("View account")
                              }}
                            >
                              <p>You can now create and manage Facebook ad campaigns.</p>
                            </Banner>

                            <Banner
                              title="Connect your Facebook account"
                              status="warning"
                              action={{
                                content: "Connect Facebook",
                                onAction: () => console.log("Connect Facebook")
                              }}
                            >
                              <p>Connect your Facebook Business account to create and manage campaigns.</p>
                            </Banner>

                            <Banner
                              title="API key configuration required"
                              status="critical"
                              action={{
                                content: "Configure API",
                                onAction: () => console.log("Configure API")
                              }}
                            >
                              <p>OpenAI API key is missing. AI features will not work without proper configuration.</p>
                            </Banner>

                            <Banner
                              title="New AI features available"
                              status="info"
                              action={{
                                content: "Learn More",
                                onAction: () => console.log("Learn more")
                              }}
                            >
                              <p>Try our new AI-powered audience targeting and campaign optimization features.</p>
                            </Banner>
                          </BlockStack>
                        </Card>

                        {/* Empty States */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Empty States</Text>
                            
                            <EmptyState
                              heading="No campaigns yet"
                              action={{
                                content: "Create your first campaign",
                                onAction: () => console.log("Create campaign")
                              }}
                              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                              <p>Get started by creating your first AI-powered Facebook ad campaign.</p>
                            </EmptyState>
                          </BlockStack>
                        </Card>

                        {/* Loading States */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Loading States</Text>
                            
                            <InlineStack gap="400" align="center">
                              <Spinner accessibilityLabel="Loading" size="small" />
                              <Text as="span" variant="bodySm">Generating AI content...</Text>
                            </InlineStack>
                            
                            <InlineStack gap="400" align="center">
                              <Spinner accessibilityLabel="Loading" size="large" />
                              <Text as="span" variant="bodySm">Syncing campaigns from Facebook...</Text>
                            </InlineStack>
                          </BlockStack>
                        </Card>

                        {/* Interactive Demo */}
                        <Card>
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">Interactive Demo</Text>
                            
                            <ButtonGroup>
                              <Button onClick={() => setShowToast(true)}>
                                Show Success Toast
                              </Button>
                              <Button onClick={() => setShowModal(true)}>
                                Open Modal
                              </Button>
                            </ButtonGroup>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}
                  </div>
                </Tabs>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Design System Info */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Design System</Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      <strong>Framework:</strong> Shopify Polaris
                    </Text>
                    <Text as="p" variant="bodySm">
                      <strong>Typography:</strong> Shopify Sans
                    </Text>
                    <Text as="p" variant="bodySm">
                      <strong>Icons:</strong> Polaris Icon Set
                    </Text>
                    <Text as="p" variant="bodySm">
                      <strong>Layout:</strong> Responsive Grid
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Color Palette */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Color Palette</Text>
                  
                  <BlockStack gap="200">
                    <InlineStack gap="200">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#008060', borderRadius: '4px' }}></div>
                      <Text as="span" variant="bodySm">Success / Active</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#FFC453', borderRadius: '4px' }}></div>
                      <Text as="span" variant="bodySm">Warning / Trial</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#D72C0D', borderRadius: '4px' }}></div>
                      <Text as="span" variant="bodySm">Critical / Error</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#006FBB', borderRadius: '4px' }}></div>
                      <Text as="span" variant="bodySm">Info / Primary</Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Component Stats */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Components Used</Text>
                  
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Layout Components</Text>
                      <Badge tone="subdued">12</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Form Components</Text>
                      <Badge tone="subdued">8</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Data Components</Text>
                      <Badge tone="subdued">6</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Feedback Components</Text>
                      <Badge tone="subdued">5</Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Demo Modal */}
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Campaign Preview"
          primaryAction={{
            content: "Create Campaign",
            onAction: () => {
              setShowModal(false);
              setShowToast(true);
            }
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowModal(false)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Campaign Summary</Text>
              
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Name:</Text>
                  <Text as="span" variant="bodySm" fontWeight="bold">
                    {formValues.campaignName}
                  </Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Objective:</Text>
                  <Text as="span" variant="bodySm" fontWeight="bold">
                    {formValues.objective}
                  </Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Budget:</Text>
                  <Text as="span" variant="bodySm" fontWeight="bold">
                    ${formValues.budget} daily
                  </Text>
                </InlineStack>
              </BlockStack>
              
              <Divider />
              
              <Text as="p" variant="bodySm">
                This campaign will target: {formValues.targetAudience}
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {toastMarkup}
      </Page>
    </Frame>
  );
}