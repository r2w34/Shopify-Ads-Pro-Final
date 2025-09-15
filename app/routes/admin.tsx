import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useLocation, Link } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Skip authentication for login and logout routes
  if (pathname === '/admin/login' || pathname === '/admin/logout') {
    return json({ admin: null, isAuthRoute: true });
  }

  try {
    const admin = await AdminAuthService.requireAdminAuth(request);
    return json({ admin, isAuthRoute: false });
  } catch (error) {
    // If authentication fails, redirect to login
    throw new Response(null, {
      status: 302,
      headers: { Location: '/admin/login' }
    });
  }
}

export default function AdminLayout() {
  const { admin, isAuthRoute } = useLoaderData<typeof loader>();
  const location = useLocation();

  // For auth routes, render simple layout
  if (isAuthRoute) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Outlet />
      </div>
    );
  }

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: "📊", current: location.pathname === "/admin" },
    { name: "Customers", href: "/admin/customers", icon: "👥", current: location.pathname === "/admin/customers" },
    { name: "Support", href: "/admin/support", icon: "🎧", current: location.pathname === "/admin/support" },
    { name: "Analytics", href: "/admin/analytics", icon: "📈", current: location.pathname === "/admin/analytics" },
    { name: "System Logs", href: "/admin/logs", icon: "📋", current: location.pathname === "/admin/logs" },
    { name: "Billing", href: "/admin/billing", icon: "💳", current: location.pathname === "/admin/billing" },
    { name: "Offers", href: "/admin/offers", icon: "🎁", current: location.pathname === "/admin/offers" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️", current: location.pathname === "/admin/settings" },
  ];

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f8fafc",
      display: "flex",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale"
    }}>
      {/* Enhanced Sidebar */}
      <div style={{
        width: "280px",
        backgroundColor: "#1e293b",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        height: "100vh",
        zIndex: 50
      }}>
        {/* Logo Section */}
        <div style={{
          padding: "24px",
          borderBottom: "1px solid #334155",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px"
            }}>
              🚀
            </div>
            <div>
              <h1 style={{ 
                color: "white", 
                fontSize: "18px", 
                fontWeight: "700", 
                margin: 0,
                lineHeight: "1.2"
              }}>
                Admin Panel
              </h1>
              <p style={{ 
                color: "rgba(255,255,255,0.8)", 
                fontSize: "12px", 
                margin: 0,
                fontWeight: "500"
              }}>
                Facebook AI Ads Pro
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "24px 0" }}>
          <div style={{ paddingLeft: "24px", paddingRight: "24px", marginBottom: "16px" }}>
            <p style={{ 
              color: "#64748b", 
              fontSize: "11px", 
              fontWeight: "600", 
              textTransform: "uppercase", 
              letterSpacing: "0.05em",
              margin: 0
            }}>
              Main Menu
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {navigation.map((item) => (
              <li key={item.name} style={{ marginBottom: "4px" }}>
                <Link
                  to={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 24px",
                    color: item.current ? "#3b82f6" : "#cbd5e1",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    backgroundColor: item.current ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    borderRight: item.current ? "3px solid #3b82f6" : "3px solid transparent",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!item.current) {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.current) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#cbd5e1";
                    }
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Admin Info */}
        <div style={{
          padding: "24px",
          borderTop: "1px solid #334155",
          backgroundColor: "#0f172a"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              backgroundColor: "#3b82f6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              {admin?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                color: "#f1f5f9", 
                fontSize: "14px", 
                fontWeight: "500", 
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {admin?.email || "Admin User"}
              </p>
              <p style={{ 
                color: "#64748b", 
                fontSize: "11px", 
                margin: 0,
                textTransform: "uppercase",
                fontWeight: "500",
                letterSpacing: "0.05em"
              }}>
                {admin?.role?.replace('_', ' ') || "SUPER ADMIN"}
              </p>
            </div>
          </div>
          <Link
            to="/admin/logout"
            style={{
              display: "block",
              width: "100%",
              padding: "8px 16px",
              backgroundColor: "#dc2626",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              textAlign: "center",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#b91c1c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
            }}
          >
            🚪 Logout
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        marginLeft: "280px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh"
      }}>
        {/* Enhanced Header */}
        <header style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ 
                fontSize: "24px", 
                fontWeight: "700", 
                color: "#1e293b", 
                margin: 0,
                lineHeight: "1.2"
              }}>
                Admin Dashboard
              </h1>
              <p style={{ 
                color: "#64748b", 
                fontSize: "14px", 
                margin: "4px 0 0 0"
              }}>
                Welcome back, manage your application with ease
              </p>
            </div>
            
            {/* Quick Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                padding: "8px 12px",
                backgroundColor: "#f1f5f9",
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                  🟢 System Online
                </span>
              </div>
              <div style={{
                width: "36px",
                height: "36px",
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer"
              }}>
                {admin?.email?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ 
          flex: 1,
          backgroundColor: "#f8fafc"
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}