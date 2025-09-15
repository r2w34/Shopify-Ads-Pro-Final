import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, Form } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";
import { AdminService } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await AdminAuthService.requireAdminAuth(request);
  
  try {
    // Get billing data
    const billingData = await AdminService.getBillingData();
    
    return json({ 
      billingData,
      admin,
      error: null 
    });
  } catch (error) {
    console.error("Billing error:", error);
    return json({ 
      billingData: null,
      admin,
      error: "Failed to load billing data" 
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const admin = await AdminAuthService.requireAdminAuth(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    switch (action) {
      case "update_plan":
        const customerId = formData.get("customerId") as string;
        const planId = formData.get("planId") as string;
        await AdminService.updateCustomerPlan(customerId, planId);
        break;
      case "process_refund":
        const paymentId = formData.get("paymentId") as string;
        const amount = parseFloat(formData.get("amount") as string);
        await AdminService.processRefund(paymentId, amount);
        break;
      case "suspend_customer":
        const suspendCustomerId = formData.get("customerId") as string;
        await AdminService.suspendCustomer(suspendCustomerId);
        break;
    }

    return json({ success: true, message: "Action completed successfully" });
  } catch (error) {
    console.error("Billing action error:", error);
    return json({ success: false, error: "Failed to complete action" });
  }
}

export default function AdminBilling() {
  const { billingData, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Mock billing data if not available
  const mockBillingData = billingData || {
    overview: {
      totalRevenue: 45230.75,
      monthlyRecurring: 12450.00,
      activeSubscriptions: 156,
      churnRate: 2.3,
      averageRevenuePerUser: 79.81
    },
    recentTransactions: [
      {
        id: "txn_1234567890",
        customerId: "cus_abc123",
        customerName: "John Doe",
        amount: 99.00,
        status: "completed",
        plan: "Pro Plan",
        date: "2025-09-15T10:30:00Z",
        type: "subscription"
      },
      {
        id: "txn_0987654321",
        customerId: "cus_def456",
        customerName: "Jane Smith",
        amount: 199.00,
        status: "completed",
        plan: "Enterprise Plan",
        date: "2025-09-15T09:15:00Z",
        type: "subscription"
      },
      {
        id: "txn_1122334455",
        customerId: "cus_ghi789",
        customerName: "Bob Johnson",
        amount: 49.00,
        status: "failed",
        plan: "Basic Plan",
        date: "2025-09-15T08:45:00Z",
        type: "subscription"
      }
    ],
    subscriptionPlans: [
      {
        id: "plan_basic",
        name: "Basic Plan",
        price: 49.00,
        interval: "monthly",
        activeSubscriptions: 45,
        features: ["Up to 10 campaigns", "Basic analytics", "Email support"]
      },
      {
        id: "plan_pro",
        name: "Pro Plan",
        price: 99.00,
        interval: "monthly",
        activeSubscriptions: 89,
        features: ["Up to 50 campaigns", "Advanced analytics", "Priority support", "AI optimization"]
      },
      {
        id: "plan_enterprise",
        name: "Enterprise Plan",
        price: 199.00,
        interval: "monthly",
        activeSubscriptions: 22,
        features: ["Unlimited campaigns", "Custom analytics", "24/7 support", "White-label", "API access"]
      }
    ],
    failedPayments: [
      {
        id: "pi_failed_123",
        customerId: "cus_ghi789",
        customerName: "Bob Johnson",
        amount: 49.00,
        reason: "Card declined",
        date: "2025-09-15T08:45:00Z",
        retryCount: 2
      },
      {
        id: "pi_failed_456",
        customerId: "cus_jkl012",
        customerName: "Alice Brown",
        amount: 99.00,
        reason: "Insufficient funds",
        date: "2025-09-14T16:20:00Z",
        retryCount: 1
      }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0" };
      case "failed": return { bg: "#fee2e2", text: "#dc2626", border: "#fecaca" };
      case "pending": return { bg: "#fef3c7", text: "#d97706", border: "#fde68a" };
      default: return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
          💳 Billing & Revenue
        </h1>
        <p style={{ 
          color: "#64748b", 
          margin: 0,
          fontSize: "18px",
          fontWeight: "400"
        }}>
          Manage subscriptions, payments, and revenue analytics
        </p>
      </div>

      {/* Revenue Overview */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
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
                {formatCurrency(mockBillingData.overview.totalRevenue)}
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
            ↗ +15.3% from last month
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
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Monthly Recurring</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {formatCurrency(mockBillingData.overview.monthlyRecurring)}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#dbeafe", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#2563eb"
            }}>
              🔄
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +8.7% from last month
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
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Active Subscriptions</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockBillingData.overview.activeSubscriptions}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#f3e8ff", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#9333ea"
            }}>
              👥
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +12 new this month
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
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Churn Rate</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {mockBillingData.overview.churnRate}%
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#fef3c7", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#d97706"
            }}>
              📉
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#dc2626" }}>
            ↗ +0.5% from last month
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
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px 0" }}>Avg Revenue/User</p>
              <p style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                {formatCurrency(mockBillingData.overview.averageRevenuePerUser)}
              </p>
            </div>
            <div style={{ 
              backgroundColor: "#ecfdf5", 
              borderRadius: "8px", 
              padding: "8px",
              color: "#059669"
            }}>
              📊
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#16a34a" }}>
            ↗ +3.2% from last month
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
        {/* Recent Transactions */}
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
              Recent Transactions
            </h3>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {mockBillingData.recentTransactions.map((transaction, index) => {
              const statusStyle = getStatusColor(transaction.status);
              return (
                <div 
                  key={transaction.id}
                  style={{
                    padding: "16px 24px",
                    borderBottom: index < mockBillingData.recentTransactions.length - 1 ? "1px solid #f1f5f9" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "500", color: "#1e293b", marginBottom: "4px" }}>
                      {transaction.customerName}
                    </div>
                    <div style={{ fontSize: "14px", color: "#64748b" }}>
                      {transaction.plan} • {formatDate(transaction.date)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      border: `1px solid ${statusStyle.border}`,
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Plans */}
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
            Subscription Plans
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {mockBillingData.subscriptionPlans.map((plan) => (
              <div key={plan.id} style={{ 
                padding: "16px", 
                backgroundColor: "#f8fafc", 
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "600", color: "#1e293b" }}>
                    {plan.name}
                  </div>
                  <div style={{ fontWeight: "700", color: "#1e293b" }}>
                    {formatCurrency(plan.price)}/{plan.interval}
                  </div>
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
                  {plan.activeSubscriptions} active subscriptions
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {plan.features.slice(0, 2).join(" • ")}
                  {plan.features.length > 2 && ` • +${plan.features.length - 2} more`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Failed Payments */}
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
          backgroundColor: "#fef2f2",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            color: "#dc2626", 
            margin: 0 
          }}>
            🚨 Failed Payments ({mockBillingData.failedPayments.length})
          </h3>
          <button
            onClick={() => {
              // Mock retry all failed payments
              alert("Retrying all failed payments...");
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            Retry All
          </button>
        </div>

        <div>
          {mockBillingData.failedPayments.map((payment, index) => (
            <div 
              key={payment.id}
              style={{
                padding: "16px 24px",
                borderBottom: index < mockBillingData.failedPayments.length - 1 ? "1px solid #f1f5f9" : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ fontWeight: "500", color: "#1e293b", marginBottom: "4px" }}>
                  {payment.customerName}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b" }}>
                  {payment.reason} • {formatDate(payment.date)} • Retry #{payment.retryCount}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontWeight: "600", color: "#dc2626" }}>
                  {formatCurrency(payment.amount)}
                </div>
                <button
                  onClick={() => {
                    // Mock retry payment
                    alert(`Retrying payment for ${payment.customerName}...`);
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}