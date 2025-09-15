import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";
import { AdminService } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await AdminAuthService.requireAdminAuth(request);
  
  try {
    // Get analytics data
    const analytics = await AdminService.getAnalytics();
    
    return json({ 
      analytics,
      admin,
      error: null 
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return json({ 
      analytics: null,
      admin,
      error: "Failed to load analytics data" 
    });
  }
}

export default function AdminAnalytics() {
  const { analytics, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "16px",
          color: "#dc2626"
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontWeight: "600" }}>Error</h3>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  const mockAnalytics = analytics || {
    overview: {
      totalRevenue: 15420.50,
      totalCustomers: 234,
      activeCampaigns: 45,
      conversionRate: 3.2
    },
    revenueChart: [
      { month: "Jan", revenue: 2400 },
      { month: "Feb", revenue: 1398 },
      { month: "Mar", revenue: 9800 },
      { month: "Apr", revenue: 3908 },
      { month: "May", revenue: 4800 },
      { month: "Jun", revenue: 3800 }
    ],
    topCampaigns: [
      { name: "Summer Sale", revenue: 5420, clicks: 12500, conversions: 234 },
      { name: "Product Launch", revenue: 3200, clicks: 8900, conversions: 156 },
      { name: "Holiday Special", revenue: 2800, clicks: 7200, conversions: 98 }
    ],
    customerGrowth: [
      { month: "Jan", customers: 180 },
      { month: "Feb", customers: 195 },
      { month: "Mar", customers: 210 },
      { month: "Apr", revenue: 225 },
      { month: "May", customers: 234 },
      { month: "Jun", customers: 234 }
    ]
  };

  return (
    <div style={{ 
      padding: "32px", 
      backgroundColor: "#f8fafc", 
      minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale"
    }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          color: "#1e293b", 
          margin: "0 0 8px 0",
          letterSpacing: "-0.025em"
        }}>
          📈 Analytics Dashboard
        </h1>
        <p style={{ 
          color: "#64748b", 
          margin: 0,
          fontSize: "18px",
          fontWeight: "400"
        }}>
          Monitor your application performance and user engagement
        </p>
      </div>

      {/* Overview Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "20px", 
        marginBottom: "32px" 
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Total Revenue</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                ${mockAnalytics.overview.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#dcfce7", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#16a34a"
            }}>
              💰
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +12.5% from last month
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Total Customers</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockAnalytics.overview.totalCustomers.toLocaleString()}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#dbeafe", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#2563eb"
            }}>
              👥
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +8.2% from last month
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Active Campaigns</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockAnalytics.overview.activeCampaigns}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#fef3c7", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#d97706"
            }}>
              🚀
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +5 new this week
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Conversion Rate</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockAnalytics.overview.conversionRate}%
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#f3e8ff", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#9333ea"
            }}>
              📊
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +0.3% from last month
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "2fr 1fr", 
        gap: "24px", 
        marginBottom: "32px" 
      }}>
        {/* Revenue Chart */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            color: "#1e293b", 
            margin: "0 0 20px 0" 
          }}>
            Revenue Trend
          </h3>
          <div style={{ height: "200px", display: "flex", alignItems: "end", gap: "12px" }}>
            {mockAnalytics.revenueChart.map((item, index) => (
              <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div 
                  style={{
                    backgroundColor: "#3b82f6",
                    width: "100%",
                    height: `${(item.revenue / 10000) * 160}px`,
                    borderRadius: "4px 4px 0 0",
                    marginBottom: "8px"
                  }}
                />
                <span style={{ fontSize: "12px", color: "#64748b" }}>{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            color: "#1e293b", 
            margin: "0 0 20px 0" 
          }}>
            Top Campaigns
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {mockAnalytics.topCampaigns.map((campaign, index) => (
              <div key={index} style={{ 
                padding: "12px", 
                backgroundColor: "#f8fafc", 
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                  {campaign.name}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b" }}>
                  Revenue: ${campaign.revenue.toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {campaign.clicks.toLocaleString()} clicks • {campaign.conversions} conversions
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0"
      }}>
        <h3 style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          color: "#1e293b", 
          margin: "0 0 20px 0" 
        }}>
          Performance Metrics
        </h3>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "20px" 
        }}>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>98.5%</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Uptime</div>
          </div>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>1.2s</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Avg Response Time</div>
          </div>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>99.2%</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Success Rate</div>
          </div>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>4.8/5</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>User Rating</div>
          </div>
        </div>
      </div>
    </div>
  );
}