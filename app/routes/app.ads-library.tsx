import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Select,
  ResourceList,
  ResourceItem,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Thumbnail,
  Banner,
  Tabs,
  ButtonGroup,
  Modal,
  Spinner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getFacebookAdsLibraryService, type AdLibraryAd } from "../services/facebook-ads-library.server";
import { useState, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  return json({
    shop: shop.replace('.myshopify.com', ''),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const action = formData.get("action");

  const adsLibraryService = await getFacebookAdsLibraryService(shop);
  if (!adsLibraryService) {
    return json({ 
      success: false, 
      error: "Facebook Ads Library service not available" 
    });
  }

  try {
    switch (action) {
      case "search_keywords": {
        const keywords = formData.get("keywords") as string;
        const country = formData.get("country") as string || "US";
        const mediaType = formData.get("mediaType") as any || "ALL";
        const limit = parseInt(formData.get("limit") as string) || 25;

        const result = await adsLibraryService.searchByKeywords(keywords, {
          countries: [country],
          mediaType,
          limit
        });

        if (result.success) {
          const suggestions = adsLibraryService.extractAdCopySuggestions(result.ads || []);
          const patterns = adsLibraryService.analyzeCompetitorPatterns(result.ads || []);
          
          return json({
            success: true,
            ads: result.ads,
            suggestions,
            patterns
          });
        } else {
          return json({ success: false, error: result.error });
        }
      }

      case "search_competitor": {
        const pageId = formData.get("pageId") as string;
        const country = formData.get("country") as string || "US";
        const activeOnly = formData.get("activeOnly") === "true";
        const limit = parseInt(formData.get("limit") as string) || 25;

        const result = await adsLibraryService.searchCompetitorAds(pageId, {
          countries: [country],
          activeOnly,
          limit
        });

        if (result.success) {
          const suggestions = adsLibraryService.extractAdCopySuggestions(result.ads || []);
          const patterns = adsLibraryService.analyzeCompetitorPatterns(result.ads || []);
          
          return json({
            success: true,
            ads: result.ads,
            suggestions,
            patterns
          });
        } else {
          return json({ success: false, error: result.error });
        }
      }

      case "get_trending": {
        const category = formData.get("category") as string;
        const country = formData.get("country") as string || "US";
        const limit = parseInt(formData.get("limit") as string) || 50;

        const result = await adsLibraryService.getTrendingAds(category, {
          countries: [country],
          limit
        });

        if (result.success) {
          const suggestions = adsLibraryService.extractAdCopySuggestions(result.ads || []);
          const patterns = adsLibraryService.analyzeCompetitorPatterns(result.ads || []);
          
          return json({
            success: true,
            ads: result.ads,
            suggestions,
            patterns
          });
        } else {
          return json({ success: false, error: result.error });
        }
      }

      default:
        return json({ success: false, error: "Invalid action" });
    }
  } catch (error: any) {
    console.error("Ads Library action error:", error);
    return json({ 
      success: false, 
      error: error.message || "An error occurred" 
    });
  }
};

export default function AdsLibrary() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedAd, setSelectedAd] = useState<AdLibraryAd | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const isLoading = fetcher.state === "submitting";
  const searchResults = fetcher.data;

  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  const tabs = [
    {
      id: 'keywords',
      content: 'Search by Keywords',
      panelID: 'keywords-panel',
    },
    {
      id: 'competitor',
      content: 'Competitor Analysis',
      panelID: 'competitor-panel',
    },
    {
      id: 'trending',
      content: 'Trending Ads',
      panelID: 'trending-panel',
    },
  ];

  const renderKeywordsSearch = () => (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Search Ads by Keywords</Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Find ads related to your industry or products for inspiration
        </Text>

        <fetcher.Form method="post">
          <input type="hidden" name="action" value="search_keywords" />
          <BlockStack gap="300">
            <TextField
              label="Keywords"
              name="keywords"
              placeholder="e.g., fitness, skincare, jewelry"
              autoComplete="off"
            />
            
            <InlineStack gap="300">
              <Select
                label="Country"
                name="country"
                options={[
                  { label: 'United States', value: 'US' },
                  { label: 'Canada', value: 'CA' },
                  { label: 'United Kingdom', value: 'GB' },
                  { label: 'Australia', value: 'AU' },
                ]}
                value="US"
              />
              
              <Select
                label="Media Type"
                name="mediaType"
                options={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Images', value: 'IMAGE' },
                  { label: 'Videos', value: 'VIDEO' },
                  { label: 'Images & Videos', value: 'VIDEO_AND_IMAGE' },
                ]}
                value="ALL"
              />
              
              <Select
                label="Limit"
                name="limit"
                options={[
                  { label: '10 ads', value: '10' },
                  { label: '25 ads', value: '25' },
                  { label: '50 ads', value: '50' },
                ]}
                value="25"
              />
            </InlineStack>

            <Button submit variant="primary" loading={isLoading}>
              Search Ads
            </Button>
          </BlockStack>
        </fetcher.Form>
      </BlockStack>
    </Card>
  );

  const renderCompetitorSearch = () => (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Competitor Analysis</Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Analyze ads from specific Facebook pages or competitors
        </Text>

        <fetcher.Form method="post">
          <input type="hidden" name="action" value="search_competitor" />
          <BlockStack gap="300">
            <TextField
              label="Facebook Page ID"
              name="pageId"
              placeholder="e.g., 123456789"
              helpText="Enter the Facebook Page ID of the competitor you want to analyze"
              autoComplete="off"
            />
            
            <InlineStack gap="300">
              <Select
                label="Country"
                name="country"
                options={[
                  { label: 'United States', value: 'US' },
                  { label: 'Canada', value: 'CA' },
                  { label: 'United Kingdom', value: 'GB' },
                  { label: 'Australia', value: 'AU' },
                ]}
                value="US"
              />
              
              <div>
                <label>
                  <input type="checkbox" name="activeOnly" value="true" defaultChecked />
                  {' '}Active ads only
                </label>
              </div>
              
              <Select
                label="Limit"
                name="limit"
                options={[
                  { label: '10 ads', value: '10' },
                  { label: '25 ads', value: '25' },
                  { label: '50 ads', value: '50' },
                ]}
                value="25"
              />
            </InlineStack>

            <Button submit variant="primary" loading={isLoading}>
              Analyze Competitor
            </Button>
          </BlockStack>
        </fetcher.Form>
      </BlockStack>
    </Card>
  );

  const renderTrendingSearch = () => (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Trending Ads</Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Discover trending ads in your industry or category
        </Text>

        <fetcher.Form method="post">
          <input type="hidden" name="action" value="get_trending" />
          <BlockStack gap="300">
            <Select
              label="Category"
              name="category"
              options={[
                { label: 'Fashion & Apparel', value: 'fashion clothing apparel' },
                { label: 'Beauty & Skincare', value: 'beauty skincare cosmetics' },
                { label: 'Fitness & Health', value: 'fitness health wellness' },
                { label: 'Home & Garden', value: 'home garden decor' },
                { label: 'Electronics & Tech', value: 'electronics technology gadgets' },
                { label: 'Food & Beverage', value: 'food beverage restaurant' },
                { label: 'Travel & Tourism', value: 'travel tourism vacation' },
                { label: 'Automotive', value: 'automotive cars vehicles' },
                { label: 'Jewelry & Accessories', value: 'jewelry accessories watches' },
                { label: 'Sports & Recreation', value: 'sports recreation outdoor' },
              ]}
            />
            
            <InlineStack gap="300">
              <Select
                label="Country"
                name="country"
                options={[
                  { label: 'United States', value: 'US' },
                  { label: 'Canada', value: 'CA' },
                  { label: 'United Kingdom', value: 'GB' },
                  { label: 'Australia', value: 'AU' },
                ]}
                value="US"
              />
              
              <Select
                label="Limit"
                name="limit"
                options={[
                  { label: '25 ads', value: '25' },
                  { label: '50 ads', value: '50' },
                  { label: '100 ads', value: '100' },
                ]}
                value="50"
              />
            </InlineStack>

            <Button submit variant="primary" loading={isLoading}>
              Get Trending Ads
            </Button>
          </BlockStack>
        </fetcher.Form>
      </BlockStack>
    </Card>
  );

  const renderSearchResults = () => {
    if (!searchResults) return null;

    if (!searchResults.success) {
      return (
        <Banner tone="critical">
          <p>Error: {searchResults.error}</p>
        </Banner>
      );
    }

    const { ads = [], suggestions, patterns } = searchResults;

    return (
      <BlockStack gap="400">
        {/* Ad Copy Suggestions */}
        {suggestions && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Ad Copy Suggestions</Text>
              
              <BlockStack gap="300">
                {suggestions.headlines.length > 0 && (
                  <div>
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Headlines</Text>
                    <BlockStack gap="100">
                      {suggestions.headlines.slice(0, 5).map((headline, index) => (
                        <InlineStack key={index} align="space-between">
                          <Text as="span" variant="bodySm">{headline}</Text>
                          <Button 
                            size="micro" 
                            onClick={() => handleCopyText(headline)}
                            variant={copiedText === headline ? "primary" : "plain"}
                          >
                            {copiedText === headline ? "Copied!" : "Copy"}
                          </Button>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </div>
                )}

                {suggestions.primaryTexts.length > 0 && (
                  <div>
                    <Text as="h3" variant="bodyMd" fontWeight="bold">Primary Text</Text>
                    <BlockStack gap="100">
                      {suggestions.primaryTexts.slice(0, 3).map((text, index) => (
                        <InlineStack key={index} align="space-between">
                          <Text as="span" variant="bodySm">{text.substring(0, 100)}...</Text>
                          <Button 
                            size="micro" 
                            onClick={() => handleCopyText(text)}
                            variant={copiedText === text ? "primary" : "plain"}
                          >
                            {copiedText === text ? "Copied!" : "Copy"}
                          </Button>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </div>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {/* Competitor Patterns */}
        {patterns && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Analysis Insights</Text>
              
              <InlineStack gap="400">
                <div>
                  <Text as="h3" variant="bodyMd" fontWeight="bold">Popular Keywords</Text>
                  <InlineStack gap="100">
                    {patterns.commonKeywords.slice(0, 10).map((keyword, index) => (
                      <Badge key={index}>{keyword}</Badge>
                    ))}
                  </InlineStack>
                </div>
                
                <div>
                  <Text as="h3" variant="bodyMd" fontWeight="bold">Platforms</Text>
                  <InlineStack gap="100">
                    {patterns.popularPlatforms.map((platform, index) => (
                      <Badge key={index} tone="info">{platform}</Badge>
                    ))}
                  </InlineStack>
                </div>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* Ads List */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Found Ads ({ads.length})</Text>
            
            <ResourceList
              resourceName={{ singular: 'ad', plural: 'ads' }}
              items={ads}
              renderItem={(ad) => (
                <ResourceItem
                  id={ad.id}
                  onClick={() => {
                    setSelectedAd(ad);
                    setShowAdModal(true);
                  }}
                  accessibilityLabel={`View ad from ${ad.page_name}`}
                >
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <InlineStack gap="200">
                        <Text as="h3" variant="bodyMd" fontWeight="bold">
                          {ad.page_name || 'Unknown Page'}
                        </Text>
                        {ad.publisher_platforms && (
                          <InlineStack gap="100">
                            {ad.publisher_platforms.map((platform, index) => (
                              <Badge key={index} tone="info" size="small">
                                {platform}
                              </Badge>
                            ))}
                          </InlineStack>
                        )}
                      </InlineStack>
                      
                      <Text as="p" variant="bodySm">
                        {ad.ad_creative_body?.substring(0, 150) || 
                         ad.ad_creative_bodies?.[0]?.substring(0, 150) || 
                         'No ad text available'}
                        {(ad.ad_creative_body?.length || 0) > 150 ? '...' : ''}
                      </Text>
                      
                      <InlineStack gap="200">
                        {ad.impressions && (
                          <Text as="span" variant="bodySm" tone="subdued">
                            Impressions: {ad.impressions.lower_bound} - {ad.impressions.upper_bound}
                          </Text>
                        )}
                        {ad.spend && (
                          <Text as="span" variant="bodySm" tone="subdued">
                            Spend: ${ad.spend.lower_bound} - ${ad.spend.upper_bound}
                          </Text>
                        )}
                      </InlineStack>
                    </BlockStack>
                    
                    <Button size="small">View Details</Button>
                  </InlineStack>
                </ResourceItem>
              )}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    );
  };

  return (
    <Page
      title="Facebook Ads Library"
      subtitle="Discover and analyze competitor ads for inspiration"
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="info">
              <p>
                Search the Facebook Ads Library to find competitor ads, get inspiration, 
                and analyze successful ad strategies in your industry.
              </p>
            </Banner>

            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '16px' }}>
                {selectedTab === 0 && renderKeywordsSearch()}
                {selectedTab === 1 && renderCompetitorSearch()}
                {selectedTab === 2 && renderTrendingSearch()}
              </div>
            </Tabs>

            {isLoading && (
              <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spinner size="large" />
                  <Text as="p" variant="bodyMd">Searching Facebook Ads Library...</Text>
                </div>
              </Card>
            )}

            {renderSearchResults()}
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Ad Details Modal */}
      <Modal
        open={showAdModal}
        onClose={() => setShowAdModal(false)}
        title={`Ad from ${selectedAd?.page_name || 'Unknown Page'}`}
        large
      >
        {selectedAd && (
          <Modal.Section>
            <BlockStack gap="400">
              {selectedAd.ad_snapshot_url && (
                <div>
                  <Text as="h3" variant="bodyMd" fontWeight="bold">Ad Preview</Text>
                  <iframe
                    src={selectedAd.ad_snapshot_url}
                    width="100%"
                    height="400"
                    style={{ border: '1px solid #e1e3e5', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div>
                <Text as="h3" variant="bodyMd" fontWeight="bold">Ad Copy</Text>
                <BlockStack gap="200">
                  {selectedAd.ad_creative_link_title && (
                    <div>
                      <Text as="span" variant="bodySm" fontWeight="bold">Headline:</Text>
                      <Text as="p" variant="bodySm">{selectedAd.ad_creative_link_title}</Text>
                    </div>
                  )}
                  
                  {selectedAd.ad_creative_body && (
                    <div>
                      <Text as="span" variant="bodySm" fontWeight="bold">Primary Text:</Text>
                      <Text as="p" variant="bodySm">{selectedAd.ad_creative_body}</Text>
                    </div>
                  )}
                  
                  {selectedAd.ad_creative_link_description && (
                    <div>
                      <Text as="span" variant="bodySm" fontWeight="bold">Description:</Text>
                      <Text as="p" variant="bodySm">{selectedAd.ad_creative_link_description}</Text>
                    </div>
                  )}
                </BlockStack>
              </div>

              <div>
                <Text as="h3" variant="bodyMd" fontWeight="bold">Performance Data</Text>
                <InlineStack gap="300">
                  {selectedAd.impressions && (
                    <div>
                      <Text as="span" variant="bodySm" fontWeight="bold">Impressions:</Text>
                      <Text as="p" variant="bodySm">
                        {selectedAd.impressions.lower_bound} - {selectedAd.impressions.upper_bound}
                      </Text>
                    </div>
                  )}
                  
                  {selectedAd.spend && (
                    <div>
                      <Text as="span" variant="bodySm" fontWeight="bold">Spend:</Text>
                      <Text as="p" variant="bodySm">
                        ${selectedAd.spend.lower_bound} - ${selectedAd.spend.upper_bound}
                      </Text>
                    </div>
                  )}
                </InlineStack>
              </div>
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>
    </Page>
  );
}