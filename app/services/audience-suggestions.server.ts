import { GeminiService } from "./gemini.server";

export interface AudienceSuggestion {
  id: string;
  name: string;
  description: string;
  targeting: {
    geo_locations: {
      countries: string[];
      regions?: any[];
      cities?: any[];
    };
    age_min: number;
    age_max: number;
    genders: number[];
    interests?: any[];
    behaviors?: any[];
    demographics?: any[];
    publisher_platforms: string[];
    facebook_positions: string[];
    instagram_positions: string[];
    device_platforms: string[];
  };
  estimatedReach?: string;
  confidence: number;
  aiGenerated: boolean;
}

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  price: string;
  images: string[];
}

export class AudienceSuggestionsService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Get audience suggestions based on store products and data
   */
  async getAudienceSuggestions(
    products: StoreProduct[],
    storeInfo: {
      name: string;
      domain: string;
      industry?: string;
      location?: string;
    }
  ): Promise<AudienceSuggestion[]> {
    const suggestions: AudienceSuggestion[] = [];

    // Add predefined audiences based on common e-commerce segments
    suggestions.push(...this.getPredefinedAudiences());

    // Add product-based audiences
    suggestions.push(...this.getProductBasedAudiences(products));

    // Add AI-generated audiences
    const aiAudiences = await this.getAIGeneratedAudiences(products, storeInfo);
    suggestions.push(...aiAudiences);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get predefined audience templates
   */
  private getPredefinedAudiences(): AudienceSuggestion[] {
    return [
      {
        id: "broad-shoppers",
        name: "Broad Online Shoppers",
        description: "General online shopping audience with broad interests",
        targeting: {
          geo_locations: { countries: ["US"] },
          age_min: 18,
          age_max: 65,
          genders: [0], // All genders
          interests: [
            { id: "6003107902433", name: "Online shopping" },
            { id: "6003629266583", name: "Shopping and fashion" }
          ],
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed", "right_hand_column", "instant_article"],
          instagram_positions: ["stream", "story"],
          device_platforms: ["mobile", "desktop"]
        },
        estimatedReach: "50M - 100M",
        confidence: 0.7,
        aiGenerated: false
      },
      {
        id: "mobile-shoppers",
        name: "Mobile Shoppers",
        description: "Users who frequently shop on mobile devices",
        targeting: {
          geo_locations: { countries: ["US"] },
          age_min: 18,
          age_max: 45,
          genders: [0],
          behaviors: [
            { id: "6002714895372", name: "Mobile device users" },
            { id: "6003629266583", name: "Online shoppers" }
          ],
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed"],
          instagram_positions: ["stream", "story"],
          device_platforms: ["mobile"]
        },
        estimatedReach: "30M - 60M",
        confidence: 0.8,
        aiGenerated: false
      },
      {
        id: "lookalike-website-visitors",
        name: "Lookalike Website Visitors",
        description: "People similar to your website visitors",
        targeting: {
          geo_locations: { countries: ["US"] },
          age_min: 18,
          age_max: 65,
          genders: [0],
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed", "right_hand_column", "instant_article"],
          instagram_positions: ["stream", "story"],
          device_platforms: ["mobile", "desktop"]
        },
        estimatedReach: "20M - 40M",
        confidence: 0.9,
        aiGenerated: false
      }
    ];
  }

  /**
   * Generate audiences based on product categories and attributes
   */
  private getProductBasedAudiences(products: StoreProduct[]): AudienceSuggestion[] {
    const audiences: AudienceSuggestion[] = [];
    const productTypes = [...new Set(products.map(p => p.productType).filter(Boolean))];
    const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))];
    const allTags = [...new Set(products.flatMap(p => p.tags))];

    // Create audiences based on product types
    productTypes.forEach((productType, index) => {
      if (productType) {
        audiences.push({
          id: `product-type-${index}`,
          name: `${productType} Enthusiasts`,
          description: `People interested in ${productType.toLowerCase()} products`,
          targeting: {
            geo_locations: { countries: ["US"] },
            age_min: 18,
            age_max: 65,
            genders: [0],
            interests: this.getInterestsForProductType(productType),
            publisher_platforms: ["facebook", "instagram"],
            facebook_positions: ["feed", "right_hand_column", "instant_article"],
            instagram_positions: ["stream", "story"],
            device_platforms: ["mobile", "desktop"]
          },
          estimatedReach: "10M - 25M",
          confidence: 0.75,
          aiGenerated: false
        });
      }
    });

    // Create audiences based on price ranges
    const priceRanges = this.categorizeProductsByPrice(products);
    if (priceRanges.luxury.length > 0) {
      audiences.push({
        id: "luxury-shoppers",
        name: "Luxury Shoppers",
        description: "High-income individuals interested in premium products",
        targeting: {
          geo_locations: { countries: ["US"] },
          age_min: 25,
          age_max: 55,
          genders: [0],
          demographics: [
            { id: "6003054923172", name: "Household income: top 10%" }
          ],
          interests: [
            { id: "6003195797498", name: "Luxury goods" }
          ],
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed", "right_hand_column", "instant_article"],
          instagram_positions: ["stream", "story"],
          device_platforms: ["mobile", "desktop"]
        },
        estimatedReach: "5M - 15M",
        confidence: 0.85,
        aiGenerated: false
      });
    }

    return audiences;
  }

  /**
   * Use AI to generate custom audiences based on products and store info
   */
  private async getAIGeneratedAudiences(
    products: StoreProduct[],
    storeInfo: any
  ): Promise<AudienceSuggestion[]> {
    try {
      const productSummary = products.slice(0, 5).map(p => ({
        title: p.title,
        type: p.productType,
        price: p.price,
        tags: p.tags.slice(0, 3)
      }));

      const prompt = `
        Analyze this e-commerce store and suggest 3 highly targeted Facebook ad audiences:
        
        Store: ${storeInfo.name}
        Products: ${JSON.stringify(productSummary, null, 2)}
        
        For each audience, provide:
        1. A creative name
        2. Detailed description
        3. Age range (18-65)
        4. Key interests/behaviors that would match
        5. Confidence level (0.1-1.0)
        
        Focus on audiences that would be most likely to purchase these specific products.
        Consider demographics, interests, behaviors, and purchasing patterns.
        
        Return as JSON array with this structure:
        [
          {
            "name": "Audience Name",
            "description": "Detailed description",
            "age_min": 18,
            "age_max": 65,
            "interests": ["interest1", "interest2"],
            "behaviors": ["behavior1"],
            "confidence": 0.9
          }
        ]
      `;

      const response = await this.geminiService.generateContent(prompt);
      const aiSuggestions = JSON.parse(response);

      return aiSuggestions.map((suggestion: any, index: number) => ({
        id: `ai-audience-${index}`,
        name: suggestion.name,
        description: suggestion.description,
        targeting: {
          geo_locations: { countries: ["US"] },
          age_min: suggestion.age_min || 18,
          age_max: suggestion.age_max || 65,
          genders: [0],
          interests: suggestion.interests?.map((interest: string, i: number) => ({
            id: `custom-${i}`,
            name: interest
          })) || [],
          behaviors: suggestion.behaviors?.map((behavior: string, i: number) => ({
            id: `custom-behavior-${i}`,
            name: behavior
          })) || [],
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed", "right_hand_column", "instant_article"],
          instagram_positions: ["stream", "story"],
          device_platforms: ["mobile", "desktop"]
        },
        estimatedReach: "5M - 20M",
        confidence: suggestion.confidence || 0.8,
        aiGenerated: true
      }));
    } catch (error) {
      console.error("AI audience generation error:", error);
      return [];
    }
  }

  /**
   * Get Facebook interests based on product type
   */
  private getInterestsForProductType(productType: string): any[] {
    const interestMap: { [key: string]: any[] } = {
      "clothing": [
        { id: "6003629266583", name: "Shopping and fashion" },
        { id: "6003195797498", name: "Fashion" }
      ],
      "electronics": [
        { id: "6003195797498", name: "Electronics" },
        { id: "6003629266583", name: "Technology" }
      ],
      "home": [
        { id: "6003195797498", name: "Home and garden" },
        { id: "6003629266583", name: "Home improvement" }
      ],
      "beauty": [
        { id: "6003195797498", name: "Beauty" },
        { id: "6003629266583", name: "Cosmetics" }
      ],
      "sports": [
        { id: "6003195797498", name: "Sports" },
        { id: "6003629266583", name: "Fitness and wellness" }
      ]
    };

    const key = productType.toLowerCase();
    return interestMap[key] || [
      { id: "6003107902433", name: "Online shopping" }
    ];
  }

  /**
   * Categorize products by price range
   */
  private categorizeProductsByPrice(products: StoreProduct[]) {
    const categories = {
      budget: [] as StoreProduct[],
      mid: [] as StoreProduct[],
      luxury: [] as StoreProduct[]
    };

    products.forEach(product => {
      const price = parseFloat(product.price.replace(/[^0-9.]/g, ''));
      if (price < 50) {
        categories.budget.push(product);
      } else if (price < 200) {
        categories.mid.push(product);
      } else {
        categories.luxury.push(product);
      }
    });

    return categories;
  }
}