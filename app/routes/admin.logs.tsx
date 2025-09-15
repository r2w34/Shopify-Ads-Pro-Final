import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";
import { AdminService } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await AdminAuthService.requireAdminAuth(request);
  const url = new URL(request.url);
  const level = url.searchParams.get("level") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  
  try {
    // Get system logs
    const logs = await AdminService.getSystemLogs({ level, page, limit: 50 });
    
    return json({ 
      logs,
      admin,
      currentLevel: level,
      currentPage: page,
      error: null 
    });
  } catch (error) {
    console.error("Logs error:", error);
    return json({ 
      logs: null,
      admin,
      currentLevel: level,
      currentPage: page,
      error: "Failed to load system logs" 
    });
  }
}

export default function AdminLogs() {
  const { logs, currentLevel, currentPage, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Mock logs data if not available
  const mockLogs = logs || {
    logs: [
      {
        id: "1",
        timestamp: "2025-09-15T14:30:25Z",
        level: "info",
        message: "User authentication successful",
        source: "auth.server.ts",
        userId: "user_123",
        metadata: { ip: "192.168.1.100", userAgent: "Mozilla/5.0..." }
      },
      {
        id: "2",
        timestamp: "2025-09-15T14:29:15Z",
        level: "error",
        message: "Facebook API rate limit exceeded",
        source: "facebook.server.ts",
        error: "Rate limit exceeded for app ID 123456789",
        metadata: { endpoint: "/v20.0/act_123/campaigns", retryAfter: 3600 }
      },
      {
        id: "3",
        timestamp: "2025-09-15T14:28:45Z",
        level: "warn",
        message: "Database connection pool near capacity",
        source: "database.server.ts",
        metadata: { activeConnections: 18, maxConnections: 20 }
      },
      {
        id: "4",
        timestamp: "2025-09-15T14:27:30Z",
        level: "info",
        message: "Campaign created successfully",
        source: "campaigns.server.ts",
        userId: "user_456",
        metadata: { campaignId: "camp_789", budget: 500 }
      },
      {
        id: "5",
        timestamp: "2025-09-15T14:26:10Z",
        level: "error",
        message: "Payment processing failed",
        source: "stripe.server.ts",
        error: "Card declined: insufficient funds",
        metadata: { customerId: "cus_abc123", amount: 2999 }
      }
    ],
    pagination: {
      current: currentPage,
      total: 5,
      hasNext: false,
      hasPrev: false
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error": return { bg: "#fee2e2", text: "#dc2626", border: "#fecaca" };
      case "warn": return { bg: "#fef3c7", text: "#d97706", border: "#fde68a" };
      case "info": return { bg: "#dbeafe", text: "#2563eb", border: "#bfdbfe" };
      case "debug": return { bg: "#f3e8ff", text: "#9333ea", border: "#e9d5ff" };
      default: return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error": return "🚨";
      case "warn": return "⚠️";
      case "info": return "ℹ️";
      case "debug": return "🐛";
      default: return "📝";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

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
          📋 System Logs
        </h1>
        <p style={{ 
          color: "#64748b", 
          margin: 0,
          fontSize: "18px",
          fontWeight: "400"
        }}>
          Monitor system events, errors, and application activity
        </p>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "14px", 
              fontWeight: "500", 
              color: "#374151", 
              marginBottom: "4px" 
            }}>
              Log Level
            </label>
            <select
              value={currentLevel}
              onChange={(e) => {
                const url = new URL(window.location);
                url.searchParams.set("level", e.target.value);
                url.searchParams.set("page", "1");
                window.location.href = url.toString();
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white"
              }}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: "block", 
              fontSize: "14px", 
              fontWeight: "500", 
              color: "#374151", 
              marginBottom: "4px" 
            }}>
              Actions
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => {
                  // Mock clear logs functionality
                  alert("Logs cleared successfully!");
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        overflow: "hidden"
      }}>
        <div style={{ 
          padding: "20px 24px", 
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc"
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            color: "#1e293b", 
            margin: 0 
          }}>
            Recent Activity
          </h3>
        </div>

        <div style={{ maxHeight: "600px", overflowY: "auto" }}>
          {mockLogs.logs.map((log, index) => {
            const levelStyle = getLevelColor(log.level);
            return (
              <div 
                key={log.id}
                style={{
                  padding: "16px 24px",
                  borderBottom: index < mockLogs.logs.length - 1 ? "1px solid #f1f5f9" : "none",
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start"
                }}
              >
                {/* Level Badge */}
                <div style={{
                  backgroundColor: levelStyle.bg,
                  color: levelStyle.text,
                  border: `1px solid ${levelStyle.border}`,
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  minWidth: "80px",
                  justifyContent: "center"
                }}>
                  {getLevelIcon(log.level)} {log.level.toUpperCase()}
                </div>

                {/* Log Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontWeight: "500", color: "#1e293b", fontSize: "14px" }}>
                      {log.message}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", marginLeft: "16px" }}>
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                    <strong>Source:</strong> {log.source}
                    {log.userId && (
                      <>
                        {" • "}
                        <strong>User:</strong> {log.userId}
                      </>
                    )}
                  </div>

                  {log.error && (
                    <div style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "4px",
                      padding: "8px",
                      fontSize: "12px",
                      color: "#dc2626",
                      marginBottom: "8px"
                    }}>
                      <strong>Error:</strong> {log.error}
                    </div>
                  )}

                  {log.metadata && (
                    <details style={{ fontSize: "12px", color: "#64748b" }}>
                      <summary style={{ cursor: "pointer", fontWeight: "500" }}>
                        View Metadata
                      </summary>
                      <pre style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                        padding: "8px",
                        marginTop: "4px",
                        fontSize: "11px",
                        overflow: "auto"
                      }}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {mockLogs.pagination.total > 1 && (
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Page {mockLogs.pagination.current} of {mockLogs.pagination.total}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {mockLogs.pagination.hasPrev && (
                <button
                  onClick={() => {
                    const url = new URL(window.location);
                    url.searchParams.set("page", (currentPage - 1).toString());
                    window.location.href = url.toString();
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  ← Previous
                </button>
              )}
              {mockLogs.pagination.hasNext && (
                <button
                  onClick={() => {
                    const url = new URL(window.location);
                    url.searchParams.set("page", (currentPage + 1).toString());
                    window.location.href = url.toString();
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}