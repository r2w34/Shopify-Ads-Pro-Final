import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";
import { AdminService } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await AdminAuthService.requireAdminAuth(request);
  
  try {
    const stats = await AdminService.getDashboardStats();
    return json({ admin, stats, error: null });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return json({ 
      admin, 
      stats: null, 
      error: "Failed to load dashboard statistics" 
    });
  }
}

export default function AdminDashboard() {
  const { stats, error } = useLoaderData<typeof loader>();

  // Mock enhanced stats if not available
  const mockStats = {
    totalCustomers: stats?.totalCustomers || 0,
    totalSubscriptions: stats?.totalSubscriptions || 0,
    totalCampaigns: stats?.totalCampaigns || 0,
    totalRevenue: stats?.totalRevenue || 0,
    recentActivity: stats?.recentActivity || [],
    systemHealth: {
      uptime: "99.9%",
      responseTime: "120ms",
      errorRate: "0.1%",
      activeUsers: 45
    }
  };

  const quickActions = [
    { name: "Add Customer", href: "/admin/customers", icon: "👤", color: "#3b82f6" },
    { name: "View Analytics", href: "/admin/analytics", icon: "📊", color: "#10b981" },
    { name: "System Logs", href: "/admin/logs", icon: "📋", color: "#f59e0b" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️", color: "#8b5cf6" }
  ];

  const recentActivities = [
    { id: 1, action: "New customer registered", user: "john@example.com", time: "2 minutes ago", type: "user" },
    { id: 2, action: "Campaign created", user: "jane@example.com", time: "15 minutes ago", type: "campaign" },
    { id: 3, action: "Payment processed", user: "bob@example.com", time: "1 hour ago", type: "payment" },
    { id: 4, action: "Settings updated", user: "admin@example.com", time: "2 hours ago", type: "system" }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user": return "👤";
      case "campaign": return "🚀";
      case "payment": return "💳";
      case "system": return "⚙️";
      default: return "📝";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "user": return "#3b82f6";
      case "campaign": return "#10b981";
      case "payment": return "#f59e0b";
      case "system": return "#8b5cf6";
      default: return "#64748b";
    }
  };

  if (error) {
    return (
      <div style={{ padding: "32px" }}>
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          padding: "20px",
          color: "#dc2626"
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontWeight: "600" }}>Error Loading Dashboard</h3>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "32px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale"
    }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          padding: "32px",
          color: "white",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "50%"
          }} />
          <div style={{
            position: "absolute",
            bottom: "-30px",
            left: "-30px",
            width: "150px",
            height: "150px",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "50%"
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: "700", 
              margin: "0 0 8px 0",
              textShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              Welcome to Admin Dashboard
            </h1>
            <p style={{ 
              fontSize: "18px", 
              margin: 0, 
              opacity: 0.9,
              fontWeight: "400"
            }}>
              Monitor your application performance and manage users efficiently
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "24px", 
        marginBottom: "32px" 
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #f1f5f9",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "linear-gradient(90deg, #3b82f6, #1d4ed8)"
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0", fontWeight: "500" }}>Total Customers</p>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockStats.totalCustomers.toLocaleString()}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#dbeafe", 
              borderRadius: "12px", 
              padding: "12px",
              color: "#3b82f6"
            }}>
              <span style={{ fontSize: "24px" }}>👥</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>↗ +12.5%</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>from last month</span>
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #f1f5f9",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "linear-gradient(90deg, #10b981, #059669)"
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0", fontWeight: "500" }}>Active Subscriptions</p>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockStats.totalSubscriptions.toLocaleString()}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#d1fae5", 
              borderRadius: "12px", 
              padding: "12px",
              color: "#10b981"
            }}>
              <span style={{ fontSize: "24px" }}>📊</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>↗ +8.3%</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>from last month</span>
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #f1f5f9",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "linear-gradient(90deg, #f59e0b, #d97706)"
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0", fontWeight: "500" }}>Total Campaigns</p>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockStats.totalCampaigns.toLocaleString()}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#fef3c7", 
              borderRadius: "12px", 
              padding: "12px",
              color: "#f59e0b"
            }}>
              <span style={{ fontSize: "24px" }}>🚀</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>↗ +15.7%</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>from last month</span>
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #f1f5f9",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "linear-gradient(90deg, #8b5cf6, #7c3aed)"
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0", fontWeight: "500" }}>Total Revenue</p>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                ${mockStats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#f3e8ff", 
              borderRadius: "12px", 
              padding: "12px",
              color: "#8b5cf6"
            }}>
              <span style={{ fontSize: "24px" }}>💰</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>↗ +22.1%</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>from last month</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "2fr 1fr", 
        gap: "24px", 
        marginBottom: "32px" 
      }}>
        {/* Quick Actions */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #f1f5f9"
        }}>
          <h3 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#1e293b", 
            margin: "0 0 24px 0" 
          }}>
            Quick Actions
          </h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "16px" 
          }}>
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  textDecoration: "none",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f1f5f9";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: action.color,
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}>
                  {action.icon}
                </div>
                <span style={{ 
                  color: "#1e293b", 
                  fontWeight: "500",
                  fontSize: "14px"
                }}>
                  {action.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #f1f5f9"
        }}>
          <h3 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#1e293b", 
            margin: "0 0 24px 0" 
          }}>
            System Health
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>Uptime</span>
              <span style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>
                {mockStats.systemHealth.uptime}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>Response Time</span>
              <span style={{ color: "#3b82f6", fontSize: "14px", fontWeight: "600" }}>
                {mockStats.systemHealth.responseTime}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>Error Rate</span>
              <span style={{ color: "#10b981", fontSize: "14px", fontWeight: "600" }}>
                {mockStats.systemHealth.errorRate}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>Active Users</span>
              <span style={{ color: "#f59e0b", fontSize: "14px", fontWeight: "600" }}>
                {mockStats.systemHealth.activeUsers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #f1f5f9",
        overflow: "hidden"
      }}>
        <div style={{ 
          padding: "28px 28px 0 28px"
        }}>
          <h3 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#1e293b", 
            margin: "0 0 24px 0" 
          }}>
            Recent Activity
          </h3>
        </div>
        
        <div>
          {recentActivities.map((activity, index) => (
            <div 
              key={activity.id}
              style={{
                padding: "20px 28px",
                borderBottom: index < recentActivities.length - 1 ? "1px solid #f1f5f9" : "none",
                display: "flex",
                alignItems: "center",
                gap: "16px"
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                backgroundColor: `${getActivityColor(activity.type)}15`,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                {getActivityIcon(activity.type)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  color: "#1e293b", 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  margin: "0 0 4px 0" 
                }}>
                  {activity.action}
                </p>
                <p style={{ 
                  color: "#64748b", 
                  fontSize: "12px", 
                  margin: 0 
                }}>
                  {activity.user} • {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}