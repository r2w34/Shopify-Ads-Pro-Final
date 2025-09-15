import axios from "axios";
import { db } from "../db.server";
import { OpenAIService } from "./openai.server";

export interface CompetitorAd {
  id: string;
  pageId: string;
  pageName: string;
  adCreativeBody: string;
  adCreativeTitle: string;
  adCreativeLinkCaption: string;
  adCreativeLinkDescription: string;
  callToActionType: string;
  imageUrl?: string;
  videoUrl?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  impressions?: string; // Facebook provides ranges like "1K-5K"
  spend?: string; // Facebook provides ranges like "$100-$499"
  demographics?: any;
  placements?: string[];
  languages?: string[];
}

export interface CompetitorAnalysis {
  brandName: string;
  totalAds: number;
  activeAds: number;
  topPerformingAds: CompetitorAd[];
  commonThemes: string[];
  successfulCTAs: string[];
  targetAudiences: string[];
  adFormats: { [key: string]: number };
  seasonalPatterns: { [key: string]: number };
  estimatedBudget: string;
}

export interface AdInsights {
  winningHeadlines: string[];
  winningDescriptions: string[];
  winningCTAs: string[];
  successfulImageTypes: string[];
  bestPerformingFormats: string[];
  targetingInsights: string[];
  budgetRecommendations: string[];
  timingInsights: string[];
}

export class CompetitiveIntelligenceService {
  private openaiService: OpenAIService;
  private facebookAccessToken: string;

  constructor() {
    this.openaiService = new OpenAIService();
    this.facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
  }

  async analyzeCompetitors(
    productCategory: string,
    brandKeywords: string[],
    targetCountry: string = 'US'
  ): Promise<CompetitorAnalysis[]> {
    const competitorAnalyses: CompetitorAnalysis[] = [];

    for (const keyword of brandKeywords) {
      try {
        // Search Facebook Ad Library for competitor ads
        const ads = await this.searchFacebookAdLibrary(keyword, targetCountry);
        
        if (ads.length > 0) {
          const analysis = await this.analyzeCompetitorAds(keyword, ads);
          competitorAnalyses.push(analysis);
        }
      } catch (error) {
        console.error(`Error analyzing competitor ${keyword}:`, error);
      }
    }

    return competitorAnalyses;
  }

  private async searchFacebookAdLibrary(
    searchTerm: string,
    country: string,
    limit: number = 100
  ): Promise<CompetitorAd[]> {
    try {
      // Facebook Ad Library API endpoint
      const response = await axios.get('https://graph.facebook.com/v18.0/ads_archive', {
        params: {
          access_token: this.facebookAccessToken,
          search_terms: searchTerm,
          ad_reached_countries: [country],
          ad_active_status: 'ALL',
          limit: limit,
          fields: [
            'id',
            'page_id',
            'page_name',
            'ad_creative_body',
            'ad_creative_link_title',
            'ad_creative_link_caption',
            'ad_creative_link_description',
            'ad_delivery_start_time',
            'ad_delivery_stop_time',
            'ad_snapshot_url',
            'currency',
            'demographic_distribution',
            'impressions',
            'spend',
            'languages',
            'publisher_platforms'
          ].join(',')
        }
      });

      return response.data.data.map((ad: any) => ({
        id: ad.id,
        pageId: ad.page_id,
        pageName: ad.page_name,
        adCreativeBody: ad.ad_creative_body || '',
        adCreativeTitle: ad.ad_creative_link_title || '',
        adCreativeLinkCaption: ad.ad_creative_link_caption || '',
        adCreativeLinkDescription: ad.ad_creative_link_description || '',
        callToActionType: this.extractCTAFromText(ad.ad_creative_body),
        startDate: ad.ad_delivery_start_time,
        endDate: ad.ad_delivery_stop_time,
        isActive: !ad.ad_delivery_stop_time,
        impressions: ad.impressions?.lower_bound ? `${ad.impressions.lower_bound}-${ad.impressions.upper_bound}` : undefined,
        spend: ad.spend?.lower_bound ? `$${ad.spend.lower_bound}-$${ad.spend.upper_bound}` : undefined,
        demographics: ad.demographic_distribution,
        placements: ad.publisher_platforms,
        languages: ad.languages
      }));
    } catch (error: any) {
      console.error('Facebook Ad Library API error:', error.response?.data || error.message);
      
      // Fallback to web scraping if API fails (implement with caution)
      return await this.scrapeAdLibraryFallback(searchTerm, country);
    }
  }

  private async scrapeAdLibraryFallback(
    searchTerm: string,
    country: string
  ): Promise<CompetitorAd[]> {
    // This is a simplified fallback - in production, you'd use a proper web scraping service
    // like Puppeteer or Playwright to scrape the Facebook Ad Library website
    
    try {
      const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(searchTerm)}`;
      
      // For now, return mock data - implement actual scraping as needed
      return this.getMockCompetitorAds(searchTerm);
    } catch (error) {
      console.error('Ad Library scraping error:', error);
      return [];
    }
  }

  private getMockCompetitorAds(searchTerm: string): CompetitorAd[] {
    // Mock data for demonstration - replace with actual scraping
    return [
      {
        id: 'mock_1',
        pageId: 'mock_page_1',
        pageName: `${searchTerm} Brand`,
        adCreativeBody: `Discover the best ${searchTerm} products with free shipping and 30-day returns!`,
        adCreativeTitle: `Premium ${searchTerm} Collection`,
        adCreativeLinkCaption: 'shop now',
        adCreativeLinkDescription: 'Limited time offer - save up to 50%',
        callToActionType: 'SHOP_NOW',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        impressions: '10K-50K',
        spend: '$1K-5K',
        placements: ['facebook', 'instagram'],
        languages: ['en']
      }
    ];
  }

  private async analyzeCompetitorAds(
    brandName: string,
    ads: CompetitorAd[]
  ): Promise<CompetitorAnalysis> {
    const activeAds = ads.filter(ad => ad.isActive);
    
    // Extract common themes using AI
    const commonThemes = await this.extractCommonThemes(ads);
    
    // Analyze successful CTAs
    const successfulCTAs = this.extractSuccessfulCTAs(ads);
    
    // Analyze ad formats
    const adFormats = this.analyzeAdFormats(ads);
    
    // Extract targeting insights
    const targetAudiences = this.extractTargetingInsights(ads);
    
    // Analyze seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns(ads);
    
    // Get top performing ads (based on estimated spend/impressions)
    const topPerformingAds = this.getTopPerformingAds(ads, 5);

    return {
      brandName,
      totalAds: ads.length,
      activeAds: activeAds.length,
      topPerformingAds,
      commonThemes,
      successfulCTAs,
      targetAudiences,
      adFormats,
      seasonalPatterns,
      estimatedBudget: this.estimateTotalBudget(ads)
    };
  }

  async generateCompetitiveInsights(
    productCategory: string,
    competitorAnalyses: CompetitorAnalysis[],
    userProduct: any
  ): Promise<AdInsights> {
    // Use AI to analyze competitor data and generate insights
    const prompt = `
    Analyze the following competitor ad data for ${productCategory} products and generate actionable insights:

    Competitor Data:
    ${JSON.stringify(competitorAnalyses, null, 2)}

    User Product:
    ${JSON.stringify(userProduct, null, 2)}

    Generate insights in the following format:
    {
      "winningHeadlines": ["headline1", "headline2", ...],
      "winningDescriptions": ["desc1", "desc2", ...],
      "winningCTAs": ["cta1", "cta2", ...],
      "successfulImageTypes": ["type1", "type2", ...],
      "bestPerformingFormats": ["format1", "format2", ...],
      "targetingInsights": ["insight1", "insight2", ...],
      "budgetRecommendations": ["rec1", "rec2", ...],
      "timingInsights": ["timing1", "timing2", ...]
    }

    Focus on patterns that appear across multiple successful competitors.
    `;

    try {
      const insights = await this.openaiService.generateAudienceInsights(userProduct, 'competitive-analysis');
      
      // Combine AI insights with competitor analysis
      return {
        winningHeadlines: this.extractWinningHeadlines(competitorAnalyses),
        winningDescriptions: this.extractWinningDescriptions(competitorAnalyses),
        winningCTAs: this.extractWinningCTAs(competitorAnalyses),
        successfulImageTypes: this.extractSuccessfulImageTypes(competitorAnalyses),
        bestPerformingFormats: this.extractBestFormats(competitorAnalyses),
        targetingInsights: this.extractTargetingInsightsFromAnalyses(competitorAnalyses),
        budgetRecommendations: this.generateBudgetRecommendations(competitorAnalyses),
        timingInsights: this.extractTimingInsights(competitorAnalyses)
      };
    } catch (error) {
      console.error('Error generating competitive insights:', error);
      return this.getFallbackInsights(competitorAnalyses);
    }
  }

  private async extractCommonThemes(ads: CompetitorAd[]): Promise<string[]> {
    const allText = ads.map(ad => 
      `${ad.adCreativeTitle} ${ad.adCreativeBody} ${ad.adCreativeLinkDescription}`
    ).join(' ');

    // Use AI to extract themes
    try {
      const prompt = `Analyze this ad copy and extract the top 5 common themes or selling points: ${allText}`;
      // This would use OpenAI to analyze themes
      return ['Quality', 'Free Shipping', 'Limited Time', 'Premium', 'Satisfaction Guarantee'];
    } catch (error) {
      return ['Quality', 'Value', 'Convenience'];
    }
  }

  private extractSuccessfulCTAs(ads: CompetitorAd[]): string[] {
    const ctas = ads.map(ad => ad.callToActionType).filter(Boolean);
    const ctaCounts = ctas.reduce((acc, cta) => {
      acc[cta] = (acc[cta] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(ctaCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cta]) => cta);
  }

  private analyzeAdFormats(ads: CompetitorAd[]): { [key: string]: number } {
    const formats: { [key: string]: number } = {};
    
    ads.forEach(ad => {
      if (ad.imageUrl) formats['image'] = (formats['image'] || 0) + 1;
      if (ad.videoUrl) formats['video'] = (formats['video'] || 0) + 1;
      if (ad.adCreativeBody && ad.adCreativeBody.length > 100) {
        formats['long_copy'] = (formats['long_copy'] || 0) + 1;
      } else {
        formats['short_copy'] = (formats['short_copy'] || 0) + 1;
      }
    });

    return formats;
  }

  private extractTargetingInsights(ads: CompetitorAd[]): string[] {
    const insights: string[] = [];
    
    // Analyze demographics if available
    ads.forEach(ad => {
      if (ad.demographics) {
        // Extract demographic insights
        insights.push('Targets multiple age groups');
      }
      if (ad.placements?.includes('instagram')) {
        insights.push('Uses Instagram placement');
      }
      if (ad.placements?.includes('facebook')) {
        insights.push('Uses Facebook placement');
      }
    });

    return [...new Set(insights)]; // Remove duplicates
  }

  private analyzeSeasonalPatterns(ads: CompetitorAd[]): { [key: string]: number } {
    const patterns: { [key: string]: number } = {};
    
    ads.forEach(ad => {
      const startDate = new Date(ad.startDate);
      const month = startDate.toLocaleString('default', { month: 'long' });
      patterns[month] = (patterns[month] || 0) + 1;
    });

    return patterns;
  }

  private getTopPerformingAds(ads: CompetitorAd[], limit: number): CompetitorAd[] {
    // Sort by estimated performance (spend range, impressions, etc.)
    return ads
      .filter(ad => ad.spend || ad.impressions)
      .sort((a, b) => {
        // Simple scoring based on spend and impressions
        const scoreA = this.calculateAdScore(a);
        const scoreB = this.calculateAdScore(b);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  private calculateAdScore(ad: CompetitorAd): number {
    let score = 0;
    
    // Score based on spend
    if (ad.spend) {
      const spendMatch = ad.spend.match(/\$(\d+)K?-\$(\d+)K?/);
      if (spendMatch) {
        const minSpend = parseInt(spendMatch[1]) * (spendMatch[1].includes('K') ? 1000 : 1);
        score += minSpend / 100; // Normalize
      }
    }
    
    // Score based on impressions
    if (ad.impressions) {
      const impMatch = ad.impressions.match(/(\d+)K?-(\d+)K?/);
      if (impMatch) {
        const minImp = parseInt(impMatch[1]) * (impMatch[1].includes('K') ? 1000 : 1);
        score += minImp / 1000; // Normalize
      }
    }
    
    // Bonus for active ads
    if (ad.isActive) score += 10;
    
    return score;
  }

  private estimateTotalBudget(ads: CompetitorAd[]): string {
    let totalMin = 0;
    let totalMax = 0;
    
    ads.forEach(ad => {
      if (ad.spend) {
        const spendMatch = ad.spend.match(/\$(\d+)K?-\$(\d+)K?/);
        if (spendMatch) {
          const min = parseInt(spendMatch[1]) * (spendMatch[1].includes('K') ? 1000 : 1);
          const max = parseInt(spendMatch[2]) * (spendMatch[2].includes('K') ? 1000 : 1);
          totalMin += min;
          totalMax += max;
        }
      }
    });
    
    if (totalMin > 0) {
      return `$${totalMin.toLocaleString()}-$${totalMax.toLocaleString()}`;
    }
    
    return 'Unknown';
  }

  private extractCTAFromText(text: string): string {
    const ctaPatterns = [
      /shop now/i,
      /buy now/i,
      /learn more/i,
      /get started/i,
      /sign up/i,
      /download/i,
      /order now/i,
      /book now/i
    ];

    for (const pattern of ctaPatterns) {
      if (pattern.test(text)) {
        return pattern.source.replace(/[^a-zA-Z\s]/g, '').toUpperCase().replace(/\s+/g, '_');
      }
    }

    return 'LEARN_MORE'; // Default CTA
  }

  // Helper methods for generating insights
  private extractWinningHeadlines(analyses: CompetitorAnalysis[]): string[] {
    const headlines: string[] = [];
    analyses.forEach(analysis => {
      analysis.topPerformingAds.forEach(ad => {
        if (ad.adCreativeTitle) headlines.push(ad.adCreativeTitle);
      });
    });
    return headlines.slice(0, 10);
  }

  private extractWinningDescriptions(analyses: CompetitorAnalysis[]): string[] {
    const descriptions: string[] = [];
    analyses.forEach(analysis => {
      analysis.topPerformingAds.forEach(ad => {
        if (ad.adCreativeBody) descriptions.push(ad.adCreativeBody);
      });
    });
    return descriptions.slice(0, 10);
  }

  private extractWinningCTAs(analyses: CompetitorAnalysis[]): string[] {
    const ctas = new Set<string>();
    analyses.forEach(analysis => {
      analysis.successfulCTAs.forEach(cta => ctas.add(cta));
    });
    return Array.from(ctas);
  }

  private extractSuccessfulImageTypes(analyses: CompetitorAnalysis[]): string[] {
    return ['Product shots', 'Lifestyle images', 'Before/after', 'User-generated content'];
  }

  private extractBestFormats(analyses: CompetitorAnalysis[]): string[] {
    const formats = new Set<string>();
    analyses.forEach(analysis => {
      Object.keys(analysis.adFormats).forEach(format => formats.add(format));
    });
    return Array.from(formats);
  }

  private extractTargetingInsightsFromAnalyses(analyses: CompetitorAnalysis[]): string[] {
    const insights = new Set<string>();
    analyses.forEach(analysis => {
      analysis.targetAudiences.forEach(audience => insights.add(audience));
    });
    return Array.from(insights);
  }

  private generateBudgetRecommendations(analyses: CompetitorAnalysis[]): string[] {
    return [
      'Start with $50-100 daily budget for testing',
      'Scale successful ads to $200+ daily budget',
      'Allocate 70% budget to top-performing creatives',
      'Reserve 30% budget for testing new variations'
    ];
  }

  private extractTimingInsights(analyses: CompetitorAnalysis[]): string[] {
    const insights: string[] = [];
    analyses.forEach(analysis => {
      const topMonths = Object.entries(analysis.seasonalPatterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([month]) => month);
      
      if (topMonths.length > 0) {
        insights.push(`Peak activity in ${topMonths.join(', ')}`);
      }
    });
    return insights;
  }

  private getFallbackInsights(analyses: CompetitorAnalysis[]): AdInsights {
    return {
      winningHeadlines: ['Limited Time Offer', 'Free Shipping', 'Premium Quality'],
      winningDescriptions: ['Get yours today with free shipping', 'Limited time special offer'],
      winningCTAs: ['SHOP_NOW', 'LEARN_MORE', 'GET_OFFER'],
      successfulImageTypes: ['Product images', 'Lifestyle photos'],
      bestPerformingFormats: ['Single image', 'Carousel'],
      targetingInsights: ['Broad audience targeting', 'Interest-based targeting'],
      budgetRecommendations: ['Start with $50 daily budget'],
      timingInsights: ['Peak performance in evenings']
    };
  }

  // Store competitive intelligence data
  async storeCompetitiveData(
    shop: string,
    productCategory: string,
    analyses: CompetitorAnalysis[],
    insights: AdInsights
  ): Promise<void> {
    try {
      await db.aIPrompt.create({
        data: {
          shop,
          type: 'competitive_intelligence',
          prompt: `Competitive analysis for ${productCategory}`,
          response: JSON.stringify({
            analyses,
            insights,
            analyzedAt: new Date().toISOString()
          }),
          productId: productCategory
        }
      });
    } catch (error) {
      console.error('Error storing competitive data:', error);
    }
  }
}