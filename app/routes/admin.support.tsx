import { useState, Fragment } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useFetcher } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";
import { db } from "../db.server";
import { EmailService } from "../services/email.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await AdminAuthService.requireAdminAuth(request);
  
  // Get all support tickets with messages and assigned admin
  const tickets = await db.supportTicket.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1 // Get latest message for preview
      },
      assignedTo: {
        select: { name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get admin users for assignment
  const adminUsers = await db.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true }
  });

  // Get ticket statistics
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length
  };

  return json({ tickets, adminUsers, stats });
}

export async function action({ request }: ActionFunctionArgs) {
  const admin = await AdminAuthService.requireAdminAuth(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    if (action === "update_ticket") {
      const ticketId = formData.get("ticketId") as string;
      const status = formData.get("status") as string;
      const priority = formData.get("priority") as string;
      const assignedToId = formData.get("assignedToId") as string;

      // Get current ticket data for comparison
      const currentTicket = await db.supportTicket.findUnique({
        where: { id: ticketId },
        include: { assignedTo: true }
      });

      if (!currentTicket) {
        return json({ success: false, message: "Ticket not found" });
      }

      // Update ticket
      const updatedTicket = await db.supportTicket.update({
        where: { id: ticketId },
        data: {
          status,
          priority,
          assignedToId: assignedToId || null,
          updatedAt: new Date(),
          ...(status === 'resolved' && { resolvedAt: new Date() }),
          ...(status === 'closed' && { closedAt: new Date() })
        },
        include: { assignedTo: true }
      });

      // Send email notifications
      try {
        // If status changed, notify customer
        if (currentTicket.status !== status && updatedTicket.customerEmail) {
          await EmailService.sendTicketStatusUpdateNotification({
            ticketNumber: updatedTicket.ticketNumber,
            subject: updatedTicket.subject,
            customerName: updatedTicket.customerName || 'Customer',
            customerEmail: updatedTicket.customerEmail,
            oldStatus: currentTicket.status,
            newStatus: status,
            adminName: admin.name
          });
        }

        // If assigned to someone new, notify the assignee
        if (currentTicket.assignedToId !== assignedToId && assignedToId && updatedTicket.assignedTo) {
          await EmailService.sendAdminTicketAssignmentNotification({
            ticketNumber: updatedTicket.ticketNumber,
            subject: updatedTicket.subject,
            customerName: updatedTicket.customerName || 'Customer',
            priority: updatedTicket.priority,
            category: updatedTicket.category,
            assignedToEmail: updatedTicket.assignedTo.email,
            assignedToName: updatedTicket.assignedTo.name
          });
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the request if email fails
      }

      return json({ success: true, message: "Ticket updated successfully" });
    }

    if (action === "add_message") {
      const ticketId = formData.get("ticketId") as string;
      const message = formData.get("message") as string;
      const isInternal = formData.get("isInternal") === "true";

      // Get ticket data for email notification
      const ticket = await db.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return json({ success: false, message: "Ticket not found" });
      }

      await db.supportMessage.create({
        data: {
          ticketId,
          message,
          isFromCustomer: false,
          authorId: admin.id,
          isInternal
        }
      });

      // Update ticket status to in_progress if it was open
      await db.supportTicket.update({
        where: { id: ticketId },
        data: { 
          status: 'in_progress',
          updatedAt: new Date()
        }
      });

      // Send email notification to customer (only if not internal message)
      if (!isInternal && ticket.customerEmail) {
        try {
          await EmailService.sendTicketResponseNotification({
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            customerName: ticket.customerName || 'Customer',
            customerEmail: ticket.customerEmail,
            adminResponse: message,
            adminName: admin.name,
            status: 'in_progress'
          });
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          // Don't fail the request if email fails
        }
      }

      return json({ success: true, message: "Message added successfully" });
    }

    return json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error("Support action error:", error);
    return json({ success: false, message: "An error occurred" });
  }
}

export default function AdminSupport() {
  const { tickets, adminUsers, stats } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus !== "all" && ticket.status !== filterStatus) return false;
    if (filterPriority !== "all" && ticket.priority !== filterPriority) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'waiting_customer': return '#8b5cf6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          color: "#1f2937", 
          marginBottom: "8px" 
        }}>
          Customer Support
        </h1>
        <p style={{ color: "#6b7280", fontSize: "16px" }}>
          Manage customer support tickets and communications
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "20px", 
        marginBottom: "32px" 
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937" }}>
            {stats.total}
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
            Total Tickets
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#ef4444" }}>
            {stats.open}
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
            Open Tickets
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#f59e0b" }}>
            {stats.inProgress}
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
            In Progress
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#dc2626" }}>
            {stats.urgent}
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
            Urgent Priority
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginRight: "8px" }}>
              Status:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginRight: "8px" }}>
              Priority:
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        overflow: "hidden"
      }}>
        <div style={{
          padding: "20px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb"
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>
            Support Tickets ({filteredTickets.length})
          </h2>
        </div>

        {filteredTickets.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            No tickets found matching the current filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Ticket
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Subject
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Customer
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Priority
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Assigned
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Created
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <Fragment key={ticket.id}>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "600", color: "#1f2937" }}>
                          {ticket.ticketNumber}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {ticket.category}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "500", color: "#1f2937", maxWidth: "200px" }}>
                          {ticket.subject}
                        </div>
                        {ticket.messages.length > 0 && (
                          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                            Last message: {new Date(ticket.messages[0].createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "500", color: "#1f2937" }}>
                          {ticket.customerName || "Unknown"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {ticket.customerEmail}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: getStatusColor(ticket.status) + "20",
                          color: getStatusColor(ticket.status)
                        }}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: getPriorityColor(ticket.priority) + "20",
                          color: getPriorityColor(ticket.priority)
                        }}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {ticket.assignedTo ? (
                          <div style={{ fontSize: "14px", color: "#1f2937" }}>
                            {ticket.assignedTo.name}
                          </div>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "14px" }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#6b7280" }}>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => setSelectedTicket(selectedTicket === ticket.id ? null : ticket.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          {selectedTicket === ticket.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {selectedTicket === ticket.id && (
                      <tr key={`${ticket.id}-details`}>
                        <td colSpan={8} style={{ padding: "0", backgroundColor: "#f9fafb" }}>
                          <TicketDetails 
                            ticket={ticket} 
                            adminUsers={adminUsers}
                            onClose={() => setSelectedTicket(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {actionData && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          padding: "12px 16px",
          borderRadius: "8px",
          backgroundColor: actionData.success ? "#10b981" : "#ef4444",
          color: "white",
          fontSize: "14px",
          fontWeight: "500",
          zIndex: 1000
        }}>
          {actionData.message}
        </div>
      )}
    </div>
  );
}

function TicketDetails({ ticket, adminUsers, onClose }: any) {
  const fetcher = useFetcher();
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  return (
    <div style={{ padding: "24px", border: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>
          Ticket Details: {ticket.ticketNumber}
        </h3>
        <button
          onClick={onClose}
          style={{
            padding: "6px 12px",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          Close
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px" }}>
        {/* Ticket Description and Messages */}
        <div>
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
              Description
            </h4>
            <div style={{ 
              padding: "12px", 
              backgroundColor: "white", 
              border: "1px solid #e5e7eb", 
              borderRadius: "6px",
              color: "#374151"
            }}>
              {ticket.description}
            </div>
          </div>

          {/* Messages */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "12px" }}>
              Messages ({ticket.messages?.length || 0})
            </h4>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {ticket.messages?.map((message: any) => (
                <div
                  key={message.id}
                  style={{
                    padding: "12px",
                    marginBottom: "8px",
                    backgroundColor: message.isFromCustomer ? "#f3f4f6" : "#dbeafe",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${message.isFromCustomer ? "#6b7280" : "#3b82f6"}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>
                      {message.isFromCustomer ? (message.authorName || "Customer") : "Admin"}
                      {message.isInternal && (
                        <span style={{ 
                          marginLeft: "8px", 
                          padding: "2px 6px", 
                          backgroundColor: "#fbbf24", 
                          color: "white", 
                          borderRadius: "4px", 
                          fontSize: "10px" 
                        }}>
                          INTERNAL
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: "#374151" }}>
                    {message.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Message Form */}
          <div>
            <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "12px" }}>
              Add Message
            </h4>
            <fetcher.Form method="post">
              <input type="hidden" name="action" value="add_message" />
              <input type="hidden" name="ticketId" value={ticket.id} />
              
              <textarea
                name="message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  marginBottom: "12px",
                  resize: "vertical"
                }}
                required
              />
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    name="isInternal"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    value="true"
                  />
                  Internal note (not visible to customer)
                </label>
              </div>
              
              <button
                type="submit"
                disabled={!newMessage.trim() || fetcher.state === "submitting"}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  opacity: (!newMessage.trim() || fetcher.state === "submitting") ? 0.5 : 1
                }}
              >
                {fetcher.state === "submitting" ? "Adding..." : "Add Message"}
              </button>
            </fetcher.Form>
          </div>
        </div>

        {/* Ticket Management */}
        <div>
          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "12px" }}>
            Ticket Management
          </h4>
          
          <fetcher.Form method="post">
            <input type="hidden" name="action" value="update_ticket" />
            <input type="hidden" name="ticketId" value={ticket.id} />
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                Status
              </label>
              <select
                name="status"
                defaultValue={ticket.status}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting Customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                Priority
              </label>
              <select
                name="priority"
                defaultValue={ticket.priority}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                Assign To
              </label>
              <select
                name="assignedToId"
                defaultValue={ticket.assignedToId || ""}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="">Unassigned</option>
                {adminUsers.map((admin: any) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={fetcher.state === "submitting"}
              style={{
                width: "100%",
                padding: "10px 16px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                opacity: fetcher.state === "submitting" ? 0.5 : 1
              }}
            >
              {fetcher.state === "submitting" ? "Updating..." : "Update Ticket"}
            </button>
          </fetcher.Form>

          {/* Ticket Info */}
          <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
            <h5 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
              Ticket Information
            </h5>
            <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>
              <div><strong>Shop:</strong> {ticket.shop}</div>
              <div><strong>Category:</strong> {ticket.category}</div>
              <div><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}</div>
              <div><strong>Updated:</strong> {new Date(ticket.updatedAt).toLocaleString()}</div>
              {ticket.resolvedAt && (
                <div><strong>Resolved:</strong> {new Date(ticket.resolvedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}