import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
import { AdminService } from "../services/admin.server";
import { AdminAuthService } from "../services/admin-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const admin = await AdminAuthService.requireAdminAuth(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");
  const filter = url.searchParams.get("filter") || "all";
  const search = url.searchParams.get("search") || "";

  try {
    const customersData = await AdminService.getAllCustomers(page, limit);
    
    // Filter customers based on criteria
    let filteredCustomers = customersData.customers;
    
    if (filter === "active") {
      filteredCustomers = filteredCustomers.filter(c => c.isActive);
    } else if (filter === "inactive") {
      filteredCustomers = filteredCustomers.filter(c => !c.isActive);
    } else if (filter === "blocked") {
      filteredCustomers = filteredCustomers.filter(c => c.isBlocked);
    }
    
    if (search) {
      filteredCustomers = filteredCustomers.filter(c => 
        c.shop.toLowerCase().includes(search.toLowerCase()) ||
        c.shopName?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return json({
      customers: filteredCustomers,
      pagination: customersData.pagination,
      filters: { filter, search, page, limit }
    });
  } catch (error) {
    console.error("Error loading customers:", error);
    return json({
      customers: [],
      pagination: { total: 0, pages: 0, current: 1, hasNext: false, hasPrev: false },
      filters: { filter, search, page, limit },
      error: "Failed to load customers"
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const admin = await AdminAuthService.requireAdminAuth(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const customerId = formData.get("customerId");

  try {
    switch (action) {
      case "block":
        const blockReason = formData.get("blockReason") as string;
        await AdminService.blockCustomer(customerId as string, blockReason);
        break;
      case "unblock":
        await AdminService.unblockCustomer(customerId as string);
        break;
      case "activate":
        await AdminService.activateCustomer(customerId as string);
        break;
      case "deactivate":
        await AdminService.deactivateCustomer(customerId as string);
        break;
    }

    return json({ success: true });
  } catch (error) {
    console.error("Customer action error:", error);
    return json({ error: "Action failed" }, { status: 500 });
  }
};

export default function AdminCustomers() {
  const { customers, pagination, filters, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleFilterChange = (newFilter: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("filter", newFilter);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleSearchChange = (search: string) => {
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  const handleCustomerAction = (customerId: string, action: string, blockReason?: string) => {
    const formData = new FormData();
    formData.append("action", action);
    formData.append("customerId", customerId);
    if (blockReason) {
      formData.append("blockReason", blockReason);
    }
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>
          Customer Management
        </h1>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Manage all customers and their subscriptions
        </p>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: "#fee", 
          border: "1px solid #fcc", 
          padding: "10px", 
          borderRadius: "4px", 
          marginBottom: "20px",
          color: "#c00"
        }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ 
        backgroundColor: "#f9f9f9", 
        padding: "15px", 
        borderRadius: "8px", 
        marginBottom: "20px",
        display: "flex",
        gap: "15px",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <div>
          <label style={{ marginRight: "8px", fontWeight: "500" }}>Filter:</label>
          <select 
            value={filters.filter} 
            onChange={(e) => handleFilterChange(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="all">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        
        <div>
          <label style={{ marginRight: "8px", fontWeight: "500" }}>Search:</label>
          <input
            type="text"
            placeholder="Search by shop, name, or email..."
            defaultValue={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ 
              padding: "5px 10px", 
              borderRadius: "4px", 
              border: "1px solid #ddd",
              minWidth: "250px"
            }}
          />
        </div>
      </div>

      {/* Customer Table */}
      <div style={{ 
        backgroundColor: "white", 
        borderRadius: "8px", 
        border: "1px solid #e1e1e1",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e1e1e1" }}>
                Shop
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e1e1e1" }}>
                Email
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e1e1e1" }}>
                Status
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e1e1e1" }}>
                Campaigns
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e1e1e1" }}>
                Total Spend
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e1e1e1" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ 
                  padding: "40px", 
                  textAlign: "center", 
                  color: "#666",
                  fontStyle: "italic"
                }}>
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                  <td style={{ padding: "12px" }}>
                    <div>
                      <div style={{ fontWeight: "500" }}>
                        {customer.shopName || customer.shop}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {customer.shop}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {customer.email || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "5px", flexDirection: "column" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: customer.isActive ? "#d4edda" : "#f8d7da",
                        color: customer.isActive ? "#155724" : "#721c24",
                        display: "inline-block",
                        width: "fit-content"
                      }}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                      {customer.isBlocked && (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: "#f8d7da",
                          color: "#721c24",
                          display: "inline-block",
                          width: "fit-content"
                        }}>
                          Blocked
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {customer.totalCampaigns}
                  </td>
                  <td style={{ padding: "12px" }}>
                    ${customer.totalSpend.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                      {customer.isActive ? (
                        <button
                          onClick={() => handleCustomerAction(customer.id, "deactivate")}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "1px solid #ffc107",
                            backgroundColor: "#fff3cd",
                            color: "#856404",
                            cursor: "pointer"
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCustomerAction(customer.id, "activate")}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "1px solid #28a745",
                            backgroundColor: "#d4edda",
                            color: "#155724",
                            cursor: "pointer"
                          }}
                        >
                          Activate
                        </button>
                      )}
                      
                      {customer.isBlocked ? (
                        <button
                          onClick={() => handleCustomerAction(customer.id, "unblock")}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "1px solid #17a2b8",
                            backgroundColor: "#d1ecf1",
                            color: "#0c5460",
                            cursor: "pointer"
                          }}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const reason = prompt("Block reason:");
                            if (reason) {
                              handleCustomerAction(customer.id, "block", reason);
                            }
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "1px solid #dc3545",
                            backgroundColor: "#f8d7da",
                            color: "#721c24",
                            cursor: "pointer"
                          }}
                        >
                          Block
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ 
          marginTop: "20px", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          gap: "10px"
        }}>
          <button
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(pagination.current - 1)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              backgroundColor: pagination.hasPrev ? "white" : "#f8f9fa",
              cursor: pagination.hasPrev ? "pointer" : "not-allowed",
              color: pagination.hasPrev ? "#333" : "#999"
            }}
          >
            Previous
          </button>
          
          <span style={{ margin: "0 15px", color: "#666" }}>
            Page {pagination.current} of {pagination.pages} ({pagination.total} total)
          </span>
          
          <button
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(pagination.current + 1)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              backgroundColor: pagination.hasNext ? "white" : "#f8f9fa",
              cursor: pagination.hasNext ? "pointer" : "not-allowed",
              color: pagination.hasNext ? "#333" : "#999"
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}