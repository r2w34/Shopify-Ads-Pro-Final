// Mock Shopify service for local development and testing
import type { Session } from "@shopify/shopify-app-remix";

export interface MockShopifySession {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope?: string;
  expires?: Date;
  accessToken: string;
  userId?: string;
}

export const createMockSession = (): MockShopifySession => {
  return {
    id: `offline_${process.env.MOCK_SHOP_DOMAIN}`,
    shop: process.env.MOCK_SHOP_DOMAIN || "test-shop.myshopify.com",
    state: "mock-state",
    isOnline: false,
    scope: process.env.SCOPES || "read_products,write_products",
    accessToken: process.env.MOCK_ACCESS_TOKEN || "shpat_test_token",
    userId: "mock-user-123"
  };
};

export const mockShopifyData = {
  shop: {
    id: "gid://shopify/Shop/123456789",
    name: "Test Shop",
    email: "test@example.com",
    domain: "test-shop.myshopify.com",
    province: "California",
    country: "United States",
    address1: "123 Test Street",
    zip: "90210",
    city: "Los Angeles",
    phone: "+1-555-123-4567",
    latitude: 34.0522,
    longitude: -118.2437,
    primary_locale: "en",
    address2: null,
    created_at: "2024-01-01T00:00:00-00:00",
    updated_at: "2024-01-15T12:00:00-00:00",
    country_code: "US",
    country_name: "United States",
    currency: "USD",
    customer_email: "test@example.com",
    timezone: "(GMT-08:00) America/Los_Angeles",
    iana_timezone: "America/Los_Angeles",
    shop_owner: "Test Owner",
    money_format: "${{amount}}",
    money_with_currency_format: "${{amount}} USD",
    weight_unit: "lb",
    province_code: "CA",
    taxes_included: false,
    auto_configure_tax_inclusivity: null,
    tax_shipping: null,
    county_taxes: true,
    plan_display_name: "Shopify Plus",
    plan_name: "plus",
    has_discounts: true,
    has_gift_cards: true,
    myshopify_domain: "test-shop.myshopify.com",
    google_apps_domain: null,
    google_apps_login_enabled: null,
    money_in_emails_format: "${{amount}}",
    money_with_currency_in_emails_format: "${{amount}} USD",
    eligible_for_payments: true,
    requires_extra_payments_agreement: false,
    password_enabled: false,
    has_storefront: true,
    eligible_for_card_reader_giveaway: false,
    finances: true,
    primary_location_id: 987654321,
    checkout_api_supported: true,
    multi_location_enabled: true,
    setup_required: false,
    pre_launch_enabled: false,
    enabled_presentment_currencies: ["USD"]
  },
  
  products: [
    {
      id: "gid://shopify/Product/1",
      title: "Test Product 1",
      handle: "test-product-1",
      description: "This is a test product for demo purposes",
      vendor: "Test Vendor",
      product_type: "Test Type",
      created_at: "2024-01-01T00:00:00-00:00",
      updated_at: "2024-01-15T12:00:00-00:00",
      published_at: "2024-01-01T00:00:00-00:00",
      template_suffix: null,
      status: "active",
      published_scope: "web",
      tags: "test, demo, sample",
      admin_graphql_api_id: "gid://shopify/Product/1",
      variants: [
        {
          id: "gid://shopify/ProductVariant/1",
          product_id: "gid://shopify/Product/1",
          title: "Default Title",
          price: "29.99",
          sku: "TEST-001",
          position: 1,
          inventory_policy: "deny",
          compare_at_price: "39.99",
          fulfillment_service: "manual",
          inventory_management: "shopify",
          option1: "Default Title",
          option2: null,
          option3: null,
          created_at: "2024-01-01T00:00:00-00:00",
          updated_at: "2024-01-15T12:00:00-00:00",
          taxable: true,
          barcode: null,
          grams: 100,
          image_id: null,
          weight: 0.22,
          weight_unit: "lb",
          inventory_item_id: "gid://shopify/InventoryItem/1",
          inventory_quantity: 100,
          old_inventory_quantity: 100,
          requires_shipping: true,
          admin_graphql_api_id: "gid://shopify/ProductVariant/1"
        }
      ],
      options: [
        {
          id: "gid://shopify/ProductOption/1",
          product_id: "gid://shopify/Product/1",
          name: "Title",
          position: 1,
          values: ["Default Title"]
        }
      ],
      images: [
        {
          id: "gid://shopify/ProductImage/1",
          product_id: "gid://shopify/Product/1",
          position: 1,
          created_at: "2024-01-01T00:00:00-00:00",
          updated_at: "2024-01-15T12:00:00-00:00",
          alt: "Test Product Image",
          width: 800,
          height: 600,
          src: "https://via.placeholder.com/800x600/007bff/ffffff?text=Test+Product",
          variant_ids: [],
          admin_graphql_api_id: "gid://shopify/ProductImage/1"
        }
      ],
      image: {
        id: "gid://shopify/ProductImage/1",
        product_id: "gid://shopify/Product/1",
        position: 1,
        created_at: "2024-01-01T00:00:00-00:00",
        updated_at: "2024-01-15T12:00:00-00:00",
        alt: "Test Product Image",
        width: 800,
        height: 600,
        src: "https://via.placeholder.com/800x600/007bff/ffffff?text=Test+Product",
        variant_ids: [],
        admin_graphql_api_id: "gid://shopify/ProductImage/1"
      }
    },
    {
      id: "gid://shopify/Product/2",
      title: "Test Product 2",
      handle: "test-product-2",
      description: "Another test product for demo purposes",
      vendor: "Test Vendor",
      product_type: "Test Type",
      created_at: "2024-01-02T00:00:00-00:00",
      updated_at: "2024-01-16T12:00:00-00:00",
      published_at: "2024-01-02T00:00:00-00:00",
      template_suffix: null,
      status: "active",
      published_scope: "web",
      tags: "test, demo, sample, featured",
      admin_graphql_api_id: "gid://shopify/Product/2",
      variants: [
        {
          id: "gid://shopify/ProductVariant/2",
          product_id: "gid://shopify/Product/2",
          title: "Default Title",
          price: "49.99",
          sku: "TEST-002",
          position: 1,
          inventory_policy: "deny",
          compare_at_price: "59.99",
          fulfillment_service: "manual",
          inventory_management: "shopify",
          option1: "Default Title",
          option2: null,
          option3: null,
          created_at: "2024-01-02T00:00:00-00:00",
          updated_at: "2024-01-16T12:00:00-00:00",
          taxable: true,
          barcode: null,
          grams: 200,
          image_id: null,
          weight: 0.44,
          weight_unit: "lb",
          inventory_item_id: "gid://shopify/InventoryItem/2",
          inventory_quantity: 50,
          old_inventory_quantity: 50,
          requires_shipping: true,
          admin_graphql_api_id: "gid://shopify/ProductVariant/2"
        }
      ],
      options: [
        {
          id: "gid://shopify/ProductOption/2",
          product_id: "gid://shopify/Product/2",
          name: "Title",
          position: 1,
          values: ["Default Title"]
        }
      ],
      images: [
        {
          id: "gid://shopify/ProductImage/2",
          product_id: "gid://shopify/Product/2",
          position: 1,
          created_at: "2024-01-02T00:00:00-00:00",
          updated_at: "2024-01-16T12:00:00-00:00",
          alt: "Test Product 2 Image",
          width: 800,
          height: 600,
          src: "https://via.placeholder.com/800x600/28a745/ffffff?text=Test+Product+2",
          variant_ids: [],
          admin_graphql_api_id: "gid://shopify/ProductImage/2"
        }
      ],
      image: {
        id: "gid://shopify/ProductImage/2",
        product_id: "gid://shopify/Product/2",
        position: 1,
        created_at: "2024-01-02T00:00:00-00:00",
        updated_at: "2024-01-16T12:00:00-00:00",
        alt: "Test Product 2 Image",
        width: 800,
        height: 600,
        src: "https://via.placeholder.com/800x600/28a745/ffffff?text=Test+Product+2",
        variant_ids: [],
        admin_graphql_api_id: "gid://shopify/ProductImage/2"
      }
    }
  ],

  orders: [
    {
      id: "gid://shopify/Order/1001",
      admin_graphql_api_id: "gid://shopify/Order/1001",
      app_id: null,
      browser_ip: "192.168.1.1",
      buyer_accepts_marketing: false,
      cancel_reason: null,
      cancelled_at: null,
      cart_token: "test-cart-token-1",
      checkout_id: "gid://shopify/Checkout/1001",
      checkout_token: "test-checkout-token-1",
      closed_at: null,
      confirmed: true,
      contact_email: "customer@example.com",
      created_at: "2024-01-10T10:00:00-00:00",
      currency: "USD",
      current_subtotal_price: "29.99",
      current_subtotal_price_set: {
        shop_money: { amount: "29.99", currency_code: "USD" },
        presentment_money: { amount: "29.99", currency_code: "USD" }
      },
      current_total_discounts: "0.00",
      current_total_discounts_set: {
        shop_money: { amount: "0.00", currency_code: "USD" },
        presentment_money: { amount: "0.00", currency_code: "USD" }
      },
      current_total_duties_set: null,
      current_total_price: "32.99",
      current_total_price_set: {
        shop_money: { amount: "32.99", currency_code: "USD" },
        presentment_money: { amount: "32.99", currency_code: "USD" }
      },
      current_total_tax: "3.00",
      current_total_tax_set: {
        shop_money: { amount: "3.00", currency_code: "USD" },
        presentment_money: { amount: "3.00", currency_code: "USD" }
      },
      customer_locale: "en",
      device_id: null,
      discount_codes: [],
      email: "customer@example.com",
      estimated_taxes: false,
      financial_status: "paid",
      fulfillment_status: "fulfilled",
      gateway: "manual",
      landing_site: "/",
      landing_site_ref: null,
      location_id: null,
      name: "#1001",
      note: null,
      note_attributes: [],
      number: 1001,
      order_number: 1001,
      order_status_url: "https://test-shop.myshopify.com/orders/test-token",
      original_total_duties_set: null,
      payment_gateway_names: ["manual"],
      phone: null,
      presentment_currency: "USD",
      processed_at: "2024-01-10T10:00:00-00:00",
      processing_method: "direct",
      reference: null,
      referring_site: "",
      source_identifier: null,
      source_name: "web",
      source_url: null,
      subtotal_price: "29.99",
      subtotal_price_set: {
        shop_money: { amount: "29.99", currency_code: "USD" },
        presentment_money: { amount: "29.99", currency_code: "USD" }
      },
      tags: "",
      tax_lines: [
        {
          price: "3.00",
          rate: 0.1,
          title: "State Tax",
          price_set: {
            shop_money: { amount: "3.00", currency_code: "USD" },
            presentment_money: { amount: "3.00", currency_code: "USD" }
          }
        }
      ],
      taxes_included: false,
      test: false,
      token: "test-order-token-1",
      total_discounts: "0.00",
      total_discounts_set: {
        shop_money: { amount: "0.00", currency_code: "USD" },
        presentment_money: { amount: "0.00", currency_code: "USD" }
      },
      total_line_items_price: "29.99",
      total_line_items_price_set: {
        shop_money: { amount: "29.99", currency_code: "USD" },
        presentment_money: { amount: "29.99", currency_code: "USD" }
      },
      total_outstanding: "0.00",
      total_price: "32.99",
      total_price_set: {
        shop_money: { amount: "32.99", currency_code: "USD" },
        presentment_money: { amount: "32.99", currency_code: "USD" }
      },
      total_price_usd: "32.99",
      total_shipping_price_set: {
        shop_money: { amount: "0.00", currency_code: "USD" },
        presentment_money: { amount: "0.00", currency_code: "USD" }
      },
      total_tax: "3.00",
      total_tax_set: {
        shop_money: { amount: "3.00", currency_code: "USD" },
        presentment_money: { amount: "3.00", currency_code: "USD" }
      },
      total_tip_received: "0.00",
      total_weight: 100,
      updated_at: "2024-01-10T10:30:00-00:00",
      user_id: null,
      billing_address: {
        first_name: "John",
        address1: "123 Main St",
        phone: "+1-555-123-4567",
        city: "Los Angeles",
        zip: "90210",
        province: "California",
        country: "United States",
        last_name: "Doe",
        address2: null,
        company: null,
        latitude: 34.0522,
        longitude: -118.2437,
        name: "John Doe",
        country_code: "US",
        province_code: "CA"
      },
      shipping_address: {
        first_name: "John",
        address1: "123 Main St",
        phone: "+1-555-123-4567",
        city: "Los Angeles",
        zip: "90210",
        province: "California",
        country: "United States",
        last_name: "Doe",
        address2: null,
        company: null,
        latitude: 34.0522,
        longitude: -118.2437,
        name: "John Doe",
        country_code: "US",
        province_code: "CA"
      },
      line_items: [
        {
          id: "gid://shopify/LineItem/1001",
          admin_graphql_api_id: "gid://shopify/LineItem/1001",
          fulfillable_quantity: 0,
          fulfillment_service: "manual",
          fulfillment_status: "fulfilled",
          gift_card: false,
          grams: 100,
          name: "Test Product 1",
          origin_location: {
            id: "gid://shopify/Location/1",
            country_code: "US",
            province_code: "CA",
            name: "Test Warehouse",
            address1: "123 Warehouse St",
            address2: null,
            city: "Los Angeles",
            zip: "90210"
          },
          price: "29.99",
          price_set: {
            shop_money: { amount: "29.99", currency_code: "USD" },
            presentment_money: { amount: "29.99", currency_code: "USD" }
          },
          product_exists: true,
          product_id: "gid://shopify/Product/1",
          properties: [],
          quantity: 1,
          requires_shipping: true,
          sku: "TEST-001",
          taxable: true,
          title: "Test Product 1",
          total_discount: "0.00",
          total_discount_set: {
            shop_money: { amount: "0.00", currency_code: "USD" },
            presentment_money: { amount: "0.00", currency_code: "USD" }
          },
          variant_id: "gid://shopify/ProductVariant/1",
          variant_inventory_management: "shopify",
          variant_title: "Default Title",
          vendor: "Test Vendor",
          tax_lines: [
            {
              channel_liable: null,
              price: "3.00",
              price_set: {
                shop_money: { amount: "3.00", currency_code: "USD" },
                presentment_money: { amount: "3.00", currency_code: "USD" }
              },
              rate: 0.1,
              title: "State Tax"
            }
          ],
          duties: [],
          discount_allocations: []
        }
      ]
    }
  ],

  customers: [
    {
      id: "gid://shopify/Customer/1",
      email: "customer@example.com",
      accepts_marketing: false,
      created_at: "2024-01-01T00:00:00-00:00",
      updated_at: "2024-01-15T12:00:00-00:00",
      first_name: "John",
      last_name: "Doe",
      orders_count: 1,
      state: "enabled",
      total_spent: "32.99",
      last_order_id: "gid://shopify/Order/1001",
      note: null,
      verified_email: true,
      multipass_identifier: null,
      tax_exempt: false,
      phone: "+1-555-123-4567",
      tags: "vip, loyal",
      last_order_name: "#1001",
      currency: "USD",
      addresses: [
        {
          id: "gid://shopify/MailingAddress/1",
          customer_id: "gid://shopify/Customer/1",
          first_name: "John",
          last_name: "Doe",
          company: null,
          address1: "123 Main St",
          address2: null,
          city: "Los Angeles",
          province: "California",
          country: "United States",
          zip: "90210",
          phone: "+1-555-123-4567",
          name: "John Doe",
          province_code: "CA",
          country_code: "US",
          country_name: "United States",
          default: true
        }
      ],
      admin_graphql_api_id: "gid://shopify/Customer/1",
      default_address: {
        id: "gid://shopify/MailingAddress/1",
        customer_id: "gid://shopify/Customer/1",
        first_name: "John",
        last_name: "Doe",
        company: null,
        address1: "123 Main St",
        address2: null,
        city: "Los Angeles",
        province: "California",
        country: "United States",
        zip: "90210",
        phone: "+1-555-123-4567",
        name: "John Doe",
        province_code: "CA",
        country_code: "US",
        country_name: "United States",
        default: true
      }
    }
  ]
};

export const isMockMode = () => {
  return process.env.NODE_ENV === "development" && process.env.MOCK_SHOPIFY_SESSION === "true";
};

export const getMockShopifyData = (type: keyof typeof mockShopifyData) => {
  if (!isMockMode()) {
    throw new Error("Mock data is only available in development mode");
  }
  return mockShopifyData[type];
};