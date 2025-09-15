import OpenAI from "openai";
import { db } from "../db.server";

export interface ProductData {
  id: string;
  title: string;
  description: string;
  price: string;
  images?: string[];
  tags?: string[];
}

export interface AdCopyRequest {
  product: ProductData;
  objective: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
  platform?: 'facebook' | 'instagram';
}

export interface AdCopyResponse {
  headlines: string[];
  primaryText: string[];
  descriptions: string[];
  callToActions: string[];
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateAdCopy(request: AdCopyRequest, shop: string): Promise<AdCopyResponse> {
    const prompt = this.buildPrompt(request);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert Facebook Ads copywriter. Generate compelling ad copy that drives conversions. Always return valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const adCopy = JSON.parse(response) as AdCopyResponse;

      // Store the prompt and response in database
      await db.aIPrompt.create({
        data: {
          shop: shop,
          type: "ad_copy",
          prompt: prompt,
          response: response,
          productId: request.product.id,
        }
      });

      return adCopy;
    } catch (error: any) {
      console.error("OpenAI ad copy generation error:", error);
      
      // Fallback to template-based generation
      return this.generateFallbackAdCopy(request);
    }
  }

  async generateHeadlines(product: ProductData, count: number = 5, shop: string): Promise<string[]> {
    const prompt = `Generate ${count} compelling Facebook ad headlines for this product:
    
Product: ${product.title}
Description: ${product.description}
Price: ${product.price}

Requirements:
- Headlines should be under 40 characters
- Focus on benefits and value proposition
- Create urgency or curiosity
- Be specific and actionable

Return only a JSON array of headlines.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert copywriter. Generate compelling headlines that drive clicks and conversions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const headlines = JSON.parse(response) as string[];

      // Store in database
      await db.aIPrompt.create({
        data: {
          shop: shop,
          type: "headline",
          prompt: prompt,
          response: response,
          productId: product.id,
        }
      });

      return headlines;
    } catch (error: any) {
      console.error("OpenAI headline generation error:", error);
      
      // Fallback headlines
      return [
        `Get ${product.title} Now!`,
        `Limited Time: ${product.title}`,
        `${product.title} - Special Offer`,
        `Don't Miss Out: ${product.title}`,
        `${product.title} Available Now`
      ];
    }
  }

  async generateAudienceInsights(product: ProductData, shop: string): Promise<{
    demographics: string[];
    interests: string[];
    behaviors: string[];
    suggestions: string[];
  }> {
    const prompt = `Analyze this product and suggest Facebook ad targeting options:

Product: ${product.title}
Description: ${product.description}
Price: ${product.price}
Tags: ${product.tags?.join(', ') || 'None'}

Provide targeting suggestions in JSON format:
{
  "demographics": ["age ranges, genders, locations"],
  "interests": ["relevant interests and hobbies"],
  "behaviors": ["purchase behaviors and patterns"],
  "suggestions": ["strategic targeting recommendations"]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a Facebook Ads targeting expert. Provide detailed audience insights and targeting recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const insights = JSON.parse(response);

      // Store in database
      await db.aIPrompt.create({
        data: {
          shop: shop,
          type: "audience_insights",
          prompt: prompt,
          response: response,
          productId: product.id,
        }
      });

      return insights;
    } catch (error: any) {
      console.error("OpenAI audience insights error:", error);
      
      // Fallback insights
      return {
        demographics: ["Ages 25-54", "All genders", "English-speaking countries"],
        interests: ["Online shopping", "E-commerce", "Product category related"],
        behaviors: ["Online shoppers", "Frequent online purchasers"],
        suggestions: ["Start with broad targeting and narrow based on performance"]
      };
    }
  }

  async optimizeCampaign(campaignData: {
    name: string;
    objective: string;
    performance: {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
    };
  }, shop: string): Promise<{
    recommendations: string[];
    optimizations: string[];
    nextSteps: string[];
  }> {
    const ctr = campaignData.performance.clicks / campaignData.performance.impressions * 100;
    const cpc = campaignData.performance.spend / campaignData.performance.clicks;
    const conversionRate = campaignData.performance.conversions / campaignData.performance.clicks * 100;

    const prompt = `Analyze this Facebook ad campaign performance and provide optimization recommendations:

Campaign: ${campaignData.name}
Objective: ${campaignData.objective}

Performance Metrics:
- Impressions: ${campaignData.performance.impressions}
- Clicks: ${campaignData.performance.clicks}
- Conversions: ${campaignData.performance.conversions}
- Spend: $${campaignData.performance.spend}
- CTR: ${ctr.toFixed(2)}%
- CPC: $${cpc.toFixed(2)}
- Conversion Rate: ${conversionRate.toFixed(2)}%

Provide optimization suggestions in JSON format:
{
  "recommendations": ["specific actionable recommendations"],
  "optimizations": ["technical optimizations to implement"],
  "nextSteps": ["immediate next steps to take"]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a Facebook Ads optimization expert. Provide data-driven recommendations to improve campaign performance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 600,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const optimization = JSON.parse(response);

      // Store in database
      await db.aIPrompt.create({
        data: {
          shop: shop,
          type: "campaign_optimization",
          prompt: prompt,
          response: response,
        }
      });

      return optimization;
    } catch (error: any) {
      console.error("OpenAI campaign optimization error:", error);
      
      // Fallback recommendations
      return {
        recommendations: [
          "Monitor performance metrics daily",
          "Test different ad creatives",
          "Adjust targeting based on results"
        ],
        optimizations: [
          "Increase budget for high-performing ads",
          "Pause underperforming ad sets",
          "A/B test different audiences"
        ],
        nextSteps: [
          "Review campaign performance",
          "Implement recommended changes",
          "Monitor results for 3-5 days"
        ]
      };
    }
  }

  private buildPrompt(request: AdCopyRequest): string {
    return `Generate Facebook ad copy for this product:

Product: ${request.product.title}
Description: ${request.product.description}
Price: ${request.product.price}
Tags: ${request.product.tags?.join(', ') || 'None'}

Campaign Details:
- Objective: ${request.objective}
- Target Audience: ${request.targetAudience || 'General audience'}
- Tone: ${request.tone || 'professional'}
- Platform: ${request.platform || 'facebook'}

Generate compelling ad copy in JSON format:
{
  "headlines": ["5 attention-grabbing headlines under 40 characters"],
  "primaryText": ["3 engaging primary text options under 125 characters"],
  "descriptions": ["3 compelling descriptions under 30 characters"],
  "callToActions": ["5 effective call-to-action phrases"]
}

Focus on:
- Benefits over features
- Creating urgency or curiosity
- Clear value proposition
- Emotional triggers
- Action-oriented language`;
  }

  private generateFallbackAdCopy(request: AdCopyRequest): AdCopyResponse {
    const productName = request.product.title;
    
    return {
      headlines: [
        `Get ${productName} Now!`,
        `${productName} - Limited Time`,
        `Don't Miss: ${productName}`,
        `${productName} Special Offer`,
        `New: ${productName}`
      ],
      primaryText: [
        `Discover the amazing ${productName}. Perfect for your needs with unbeatable quality and value.`,
        `Transform your experience with ${productName}. Limited time offer - don't wait!`,
        `${productName} is here! Get yours today and see the difference quality makes.`
      ],
      descriptions: [
        "Shop Now & Save",
        "Limited Time Offer",
        "Free Shipping Available"
      ],
      callToActions: [
        "Shop Now",
        "Learn More",
        "Get Offer",
        "Buy Now",
        "See Details"
      ]
    };
  }
}