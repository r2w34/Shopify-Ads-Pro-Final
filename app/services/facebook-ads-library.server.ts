import axios from 'axios';

export interface AdLibraryAd {
  id: string;
  ad_creative_body?: string;
  ad_creative_link_caption?: string;
  ad_creative_link_description?: string;
  ad_creative_link_title?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
  currency?: string;
  demographic_distribution?: any;
  funding_entity?: string;
  impressions?: {
    lower_bound: string;
    upper_bound: string;
  };
  languages?: string[];
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  spend?: {
    lower_bound: string;
    upper_bound: string;
  };
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_titles?: string[];
}

export interface AdLibrarySearchParams {
  search_terms?: string;
  ad_reached_countries?: string[];
  ad_active_status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  ad_delivery_date_min?: string;
  ad_delivery_date_max?: string;
  search_page_ids?: string[];
  publisher_platforms?: ('FACEBOOK' | 'INSTAGRAM' | 'AUDIENCE_NETWORK' | 'MESSENGER')[];
  media_type?: 'ALL' | 'IMAGE' | 'VIDEO' | 'VIDEO_AND_IMAGE';
  limit?: number;
}

export class FacebookAdsLibraryService {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0/ads_archive';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Search Facebook Ads Library for ads
   */
  async searchAds(params: AdLibrarySearchParams): Promise<{
    success: boolean;
    ads?: AdLibraryAd[];
    error?: string;
    pagination?: {
      next?: string;
      previous?: string;
    };
  }> {
    try {
      const searchParams = new URLSearchParams({
        access_token: this.accessToken,
        ad_type: 'POLITICAL_AND_ISSUE_ADS',
        ...params.search_terms && { search_terms: params.search_terms },
        ...params.ad_reached_countries && { ad_reached_countries: params.ad_reached_countries.join(',') },
        ...params.ad_active_status && { ad_active_status: params.ad_active_status },
        ...params.ad_delivery_date_min && { ad_delivery_date_min: params.ad_delivery_date_min },
        ...params.ad_delivery_date_max && { ad_delivery_date_max: params.ad_delivery_date_max },
        ...params.search_page_ids && { search_page_ids: params.search_page_ids.join(',') },
        ...params.publisher_platforms && { publisher_platforms: params.publisher_platforms.join(',') },
        ...params.media_type && { media_type: params.media_type },
        limit: (params.limit || 25).toString(),
        fields: [
          'id',
          'ad_creative_body',
          'ad_creative_link_caption',
          'ad_creative_link_description',
          'ad_creative_link_title',
          'ad_delivery_start_time',
          'ad_delivery_stop_time',
          'ad_snapshot_url',
          'currency',
          'demographic_distribution',
          'funding_entity',
          'impressions',
          'languages',
          'page_id',
          'page_name',
          'publisher_platforms',
          'spend',
          'ad_creative_bodies',
          'ad_creative_link_captions',
          'ad_creative_link_descriptions',
          'ad_creative_link_titles'
        ].join(',')
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams.toString()}`);

      return {
        success: true,
        ads: response.data.data || [],
        pagination: response.data.paging || {}
      };

    } catch (error: any) {
      console.error('Facebook Ads Library search error:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to search ads library';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error.message || errorMessage;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Search for ads by competitor page
   */
  async searchCompetitorAds(pageId: string, options: {
    limit?: number;
    activeOnly?: boolean;
    countries?: string[];
  } = {}): Promise<{
    success: boolean;
    ads?: AdLibraryAd[];
    error?: string;
  }> {
    return this.searchAds({
      search_page_ids: [pageId],
      ad_active_status: options.activeOnly ? 'ACTIVE' : 'ALL',
      ad_reached_countries: options.countries || ['US'],
      limit: options.limit || 25,
      publisher_platforms: ['FACEBOOK', 'INSTAGRAM']
    });
  }

  /**
   * Search for ads by keywords/industry
   */
  async searchByKeywords(keywords: string, options: {
    limit?: number;
    countries?: string[];
    mediaType?: 'ALL' | 'IMAGE' | 'VIDEO' | 'VIDEO_AND_IMAGE';
    platforms?: ('FACEBOOK' | 'INSTAGRAM' | 'AUDIENCE_NETWORK' | 'MESSENGER')[];
  } = {}): Promise<{
    success: boolean;
    ads?: AdLibraryAd[];
    error?: string;
  }> {
    return this.searchAds({
      search_terms: keywords,
      ad_active_status: 'ACTIVE',
      ad_reached_countries: options.countries || ['US'],
      limit: options.limit || 25,
      media_type: options.mediaType || 'ALL',
      publisher_platforms: options.platforms || ['FACEBOOK', 'INSTAGRAM']
    });
  }

  /**
   * Get trending ads in a specific industry/category
   */
  async getTrendingAds(category: string, options: {
    limit?: number;
    countries?: string[];
    dateRange?: {
      start: string; // YYYY-MM-DD
      end: string;   // YYYY-MM-DD
    };
  } = {}): Promise<{
    success: boolean;
    ads?: AdLibraryAd[];
    error?: string;
  }> {
    const params: AdLibrarySearchParams = {
      search_terms: category,
      ad_active_status: 'ACTIVE',
      ad_reached_countries: options.countries || ['US'],
      limit: options.limit || 50,
      publisher_platforms: ['FACEBOOK', 'INSTAGRAM']
    };

    if (options.dateRange) {
      params.ad_delivery_date_min = options.dateRange.start;
      params.ad_delivery_date_max = options.dateRange.end;
    }

    return this.searchAds(params);
  }

  /**
   * Extract ad copy suggestions from library ads
   */
  extractAdCopySuggestions(ads: AdLibraryAd[]): {
    headlines: string[];
    primaryTexts: string[];
    descriptions: string[];
    callToActions: string[];
  } {
    const headlines: string[] = [];
    const primaryTexts: string[] = [];
    const descriptions: string[] = [];
    const callToActions: string[] = [];

    ads.forEach(ad => {
      // Extract headlines
      if (ad.ad_creative_link_title) {
        headlines.push(ad.ad_creative_link_title);
      }
      if (ad.ad_creative_link_titles) {
        headlines.push(...ad.ad_creative_link_titles);
      }

      // Extract primary text
      if (ad.ad_creative_body) {
        primaryTexts.push(ad.ad_creative_body);
      }
      if (ad.ad_creative_bodies) {
        primaryTexts.push(...ad.ad_creative_bodies);
      }

      // Extract descriptions
      if (ad.ad_creative_link_description) {
        descriptions.push(ad.ad_creative_link_description);
      }
      if (ad.ad_creative_link_descriptions) {
        descriptions.push(...ad.ad_creative_link_descriptions);
      }

      // Extract call to actions (from captions)
      if (ad.ad_creative_link_caption) {
        callToActions.push(ad.ad_creative_link_caption);
      }
      if (ad.ad_creative_link_captions) {
        callToActions.push(...ad.ad_creative_link_captions);
      }
    });

    return {
      headlines: [...new Set(headlines)].filter(Boolean),
      primaryTexts: [...new Set(primaryTexts)].filter(Boolean),
      descriptions: [...new Set(descriptions)].filter(Boolean),
      callToActions: [...new Set(callToActions)].filter(Boolean)
    };
  }

  /**
   * Analyze competitor ad performance patterns
   */
  analyzeCompetitorPatterns(ads: AdLibraryAd[]): {
    commonKeywords: string[];
    popularPlatforms: string[];
    averageAdDuration: number;
    spendRanges: { min: number; max: number }[];
    impressionRanges: { min: number; max: number }[];
  } {
    const keywords: string[] = [];
    const platforms: string[] = [];
    const durations: number[] = [];
    const spendRanges: { min: number; max: number }[] = [];
    const impressionRanges: { min: number; max: number }[] = [];

    ads.forEach(ad => {
      // Extract keywords from ad text
      const text = [
        ad.ad_creative_body,
        ad.ad_creative_link_title,
        ad.ad_creative_link_description,
        ...(ad.ad_creative_bodies || []),
        ...(ad.ad_creative_link_titles || []),
        ...(ad.ad_creative_link_descriptions || [])
      ].filter(Boolean).join(' ');

      // Simple keyword extraction (you could enhance this with NLP)
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      keywords.push(...words);

      // Platforms
      if (ad.publisher_platforms) {
        platforms.push(...ad.publisher_platforms);
      }

      // Duration calculation
      if (ad.ad_delivery_start_time && ad.ad_delivery_stop_time) {
        const start = new Date(ad.ad_delivery_start_time);
        const end = new Date(ad.ad_delivery_stop_time);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // days
        durations.push(duration);
      }

      // Spend ranges
      if (ad.spend) {
        spendRanges.push({
          min: parseInt(ad.spend.lower_bound),
          max: parseInt(ad.spend.upper_bound)
        });
      }

      // Impression ranges
      if (ad.impressions) {
        impressionRanges.push({
          min: parseInt(ad.impressions.lower_bound),
          max: parseInt(ad.impressions.upper_bound)
        });
      }
    });

    // Get most common keywords
    const keywordCounts: { [key: string]: number } = {};
    keywords.forEach(keyword => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });

    const commonKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([keyword]) => keyword);

    // Get popular platforms
    const platformCounts: { [key: string]: number } = {};
    platforms.forEach(platform => {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const popularPlatforms = Object.entries(platformCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([platform]) => platform);

    const averageAdDuration = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    return {
      commonKeywords,
      popularPlatforms,
      averageAdDuration,
      spendRanges,
      impressionRanges
    };
  }
}

/**
 * Get Facebook Ads Library service instance for a shop
 */
export async function getFacebookAdsLibraryService(shop: string): Promise<FacebookAdsLibraryService | null> {
  try {
    // You would typically get this from your database
    // For now, we'll use a system access token or the shop's Facebook account token
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_SYSTEM_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('No Facebook access token available for Ads Library');
      return null;
    }

    return new FacebookAdsLibraryService(accessToken);
  } catch (error) {
    console.error('Failed to create Facebook Ads Library service:', error);
    return null;
  }
}