import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return json({
    message: "Test Campaigns New Route",
    mockData: {
      adAccounts: [
        { id: "123", name: "Test Ad Account", currency: "USD" },
        { id: "456", name: "Demo Ad Account", currency: "EUR" }
      ],
      products: [
        { id: "prod_1", title: "Test Product 1", handle: "test-product-1" },
        { id: "prod_2", title: "Test Product 2", handle: "test-product-2" }
      ]
    }
  });
};

export default function TestCampaignsNew() {
  const { message, mockData } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>{message}</h1>
      <p>This is a test version of the campaigns/new route without Shopify authentication.</p>
      
      <h2>Mock Ad Accounts:</h2>
      <ul>
        {mockData.adAccounts.map((account) => (
          <li key={account.id}>
            {account.name} ({account.currency})
          </li>
        ))}
      </ul>

      <h2>Mock Products:</h2>
      <ul>
        {mockData.products.map((product) => (
          <li key={product.id}>
            {product.title} - {product.handle}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0" }}>
        <h3>Route Status: ✅ Working</h3>
        <p>The routing system is functioning correctly. The issue with /app/campaigns/new is that it requires Shopify authentication.</p>
        <p>To test the actual app routes, you need to:</p>
        <ol>
          <li>Install the app in a Shopify store</li>
          <li>Or use the Shopify CLI with proper authentication</li>
          <li>Or modify the authentication middleware for testing</li>
        </ol>
      </div>
    </div>
  );
}