import { authenticate } from "../shopify.server";

export interface StoreMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  productId?: string;
  productTitle?: string;
  createdAt: string;
}

export class StoreMediaService {
  /**
   * Get all media files from the store (product images, files, etc.)
   */
  static async getStoreMedia(request: Request): Promise<StoreMedia[]> {
    const { admin } = await authenticate.admin(request);
    const media: StoreMedia[] = [];

    try {
      // Get product images
      const productsResponse = await admin.graphql(`
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                createdAt
              }
            }
          }
        }
      `, {
        variables: { first: 50 }
      });

      const productsData = await productsResponse.json();
      
      if (productsData.data?.products?.edges) {
        productsData.data.products.edges.forEach((productEdge: any) => {
          const product = productEdge.node;
          
          product.images.edges.forEach((imageEdge: any) => {
            const image = imageEdge.node;
            media.push({
              id: image.id,
              type: 'image',
              url: image.url,
              alt: image.altText || product.title,
              width: image.width,
              height: image.height,
              productId: product.id,
              productTitle: product.title,
              createdAt: product.createdAt
            });
          });
        });
      }

      // Get files from Shopify Files API (for videos and other media)
      try {
        const filesResponse = await admin.graphql(`
          query getFiles($first: Int!) {
            files(first: $first) {
              edges {
                node {
                  id
                  alt
                  createdAt
                  fileStatus
                  ... on MediaImage {
                    id
                    image {
                      url
                      width
                      height
                    }
                  }
                  ... on Video {
                    id
                    sources {
                      url
                      mimeType
                      width
                      height
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { first: 50 }
        });

        const filesData = await filesResponse.json();
        
        if (filesData.data?.files?.edges) {
          filesData.data.files.edges.forEach((fileEdge: any) => {
            const file = fileEdge.node;
            
            if (file.image) {
              // It's an image file
              media.push({
                id: file.id,
                type: 'image',
                url: file.image.url,
                alt: file.alt || 'Store image',
                width: file.image.width,
                height: file.image.height,
                createdAt: file.createdAt
              });
            } else if (file.sources && file.sources.length > 0) {
              // It's a video file
              const source = file.sources[0];
              media.push({
                id: file.id,
                type: 'video',
                url: source.url,
                alt: file.alt || 'Store video',
                width: source.width,
                height: source.height,
                createdAt: file.createdAt
              });
            }
          });
        }
      } catch (filesError) {
        console.warn("Could not fetch files:", filesError);
        // Files API might not be available in all plans
      }

    } catch (error) {
      console.error("Error fetching store media:", error);
    }

    // Sort by creation date (newest first) and remove duplicates
    const uniqueMedia = media.filter((item, index, self) => 
      index === self.findIndex(t => t.url === item.url)
    );

    return uniqueMedia.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get products with their details for audience suggestions
   */
  static async getStoreProducts(request: Request) {
    const { admin } = await authenticate.admin(request);

    try {
      const response = await admin.graphql(`
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                description
                productType
                vendor
                tags
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 3) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { first: 50 }
      });

      const data = await response.json();
      
      if (data.data?.products?.edges) {
        return data.data.products.edges.map((edge: any) => {
          const product = edge.node;
          return {
            id: product.id,
            title: product.title,
            description: product.description || '',
            productType: product.productType || '',
            vendor: product.vendor || '',
            tags: product.tags || [],
            price: `$${product.priceRangeV2.minVariantPrice.amount}`,
            images: product.images.edges.map((img: any) => img.node.url)
          };
        });
      }
    } catch (error) {
      console.error("Error fetching store products:", error);
    }

    return [];
  }

  /**
   * Get store information for audience suggestions
   */
  static async getStoreInfo(request: Request) {
    const { admin } = await authenticate.admin(request);

    try {
      const response = await admin.graphql(`
        query getShop {
          shop {
            name
            primaryDomain {
              host
            }
            description
            contactEmail
            currencyCode
            timezone
          }
        }
      `);

      const data = await response.json();
      
      if (data.data?.shop) {
        const shop = data.data.shop;
        return {
          name: shop.name,
          domain: shop.primaryDomain.host,
          description: shop.description,
          email: shop.contactEmail,
          currency: shop.currencyCode,
          timezone: shop.timezone
        };
      }
    } catch (error) {
      console.error("Error fetching store info:", error);
    }

    return {
      name: "Store",
      domain: "example.com",
      description: "",
      email: "",
      currency: "USD",
      timezone: "UTC"
    };
  }
}