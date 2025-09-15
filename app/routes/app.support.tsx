import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  Text,
  Divider,
  Badge,
  DataTable,
  EmptyState,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Mock support tickets data - in real app, fetch from database
  const supportTickets = [
    {
      id: "TICK-001",
      subject: "Facebook Ads Not Creating",
      status: "open",
      priority: "high",
      created: "2024-09-15",
      lastUpdate: "2024-09-15",
      category: "Technical Issue"
    },
    {
      id: "TICK-002", 
      subject: "Billing Question",
      status: "resolved",
      priority: "medium",
      created: "2024-09-14",
      lastUpdate: "2024-09-14",
      category: "Billing"
    },
    {
      id: "TICK-003",
      subject: "Feature Request - Analytics Export",
      status: "in_progress",
      priority: "low",
      created: "2024-09-13",
      lastUpdate: "2024-09-15",
      category: "Feature Request"
    }
  ];

  return json({
    shop: session.shop,
    supportTickets
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create_ticket") {
    const ticketData = {
      subject: formData.get("subject"),
      category: formData.get("category"),
      priority: formData.get("priority"),
      description: formData.get("description"),
      shop: session.shop
    };

    // In real app, save to database
    console.log("Creating support ticket:", ticketData);

    return json({
      success: true,
      message: "Support ticket created successfully! We'll get back to you within 24 hours.",
      ticketId: `TICK-${Date.now()}`
    });
  }

  return json({ success: false, message: "Invalid action" });
};

export default function Support() {
  const { shop, supportTickets } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [formData, setFormData] = useState({
    subject: "",
    category: "technical",
    priority: "medium",
    description: ""
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSubmit = () => {
    const data = new FormData();
    data.append("action", "create_ticket");
    data.append("subject", formData.subject);
    data.append("category", formData.category);
    data.append("priority", formData.priority);
    data.append("description", formData.description);
    
    submit(data, { method: "post" });
    setShowCreateModal(false);
    
    // Reset form
    setFormData({
      subject: "",
      category: "technical",
      priority: "medium",
      description: ""
    });
  };

  const categoryOptions = [
    { label: "Technical Issue", value: "technical" },
    { label: "Billing Question", value: "billing" },
    { label: "Feature Request", value: "feature" },
    { label: "Account Issue", value: "account" },
    { label: "General Question", value: "general" }
  ];

  const priorityOptions = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Urgent", value: "urgent" }
  ];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { status: "attention" as const, children: "Open" },
      in_progress: { status: "info" as const, children: "In Progress" },
      resolved: { status: "success" as const, children: "Resolved" },
      closed: { status: "subdued" as const, children: "Closed" }
    };
    return <Badge {...statusMap[status as keyof typeof statusMap]} />;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { status: "subdued" as const, children: "Low" },
      medium: { status: "info" as const, children: "Medium" },
      high: { status: "warning" as const, children: "High" },
      urgent: { status: "critical" as const, children: "Urgent" }
    };
    return <Badge {...priorityMap[priority as keyof typeof priorityMap]} />;
  };

  const ticketRows = supportTickets.map((ticket) => [
    ticket.id,
    ticket.subject,
    getStatusBadge(ticket.status),
    getPriorityBadge(ticket.priority),
    ticket.category,
    ticket.created,
    ticket.lastUpdate
  ]);

  return (
    <Page
      title="Customer Support"
      subtitle="Get help with your Facebook Ads Pro account"
      primaryAction={{
        content: "Create New Ticket",
        onAction: () => setShowCreateModal(true)
      }}
    >
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner status="success" title="Success">
              <p>{actionData.message}</p>
              {actionData.ticketId && (
                <p>Your ticket ID is: <strong>{actionData.ticketId}</strong></p>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <Text variant="headingMd" as="h2">
                  Quick Help
                </Text>
                
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                  <Card sectioned>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <Text variant="headingSm" as="h3">📚 Documentation</Text>
                      <Text variant="bodyMd" color="subdued">
                        Check our comprehensive guides and tutorials
                      </Text>
                      <Button plain url="https://docs.fbai-app.com" external>
                        View Docs
                      </Button>
                    </div>
                  </Card>

                  <Card sectioned>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <Text variant="headingSm" as="h3">💬 Live Chat</Text>
                      <Text variant="bodyMd" color="subdued">
                        Chat with our support team in real-time
                      </Text>
                      <Button primary>
                        Start Chat
                      </Button>
                    </div>
                  </Card>

                  <Card sectioned>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <Text variant="headingSm" as="h3">📧 Email Support</Text>
                      <Text variant="bodyMd" color="subdued">
                        Send us an email for detailed assistance
                      </Text>
                      <Button plain url="mailto:support@fbai-app.com" external>
                        Email Us
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <Text variant="headingMd" as="h2">
                  Your Support Tickets
                </Text>
                
                {supportTickets.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      'text',
                      'text', 
                      'text',
                      'text',
                      'text',
                      'text',
                      'text'
                    ]}
                    headings={[
                      'Ticket ID',
                      'Subject',
                      'Status',
                      'Priority',
                      'Category',
                      'Created',
                      'Last Update'
                    ]}
                    rows={ticketRows}
                  />
                ) : (
                  <EmptyState
                    heading="No support tickets yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>When you create support tickets, they'll appear here.</p>
                  </EmptyState>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <Text variant="headingMd" as="h2">
                  Common Issues
                </Text>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Card sectioned>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <Text variant="headingSm" as="h3">Facebook Ads Not Creating</Text>
                      <Text variant="bodyMd" color="subdued">
                        Check your Facebook Business Manager permissions and ad account access.
                      </Text>
                    </div>
                  </Card>

                  <Card sectioned>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <Text variant="headingSm" as="h3">Billing Questions</Text>
                      <Text variant="bodyMd" color="subdued">
                        View your subscription details and payment history in the billing section.
                      </Text>
                    </div>
                  </Card>

                  <Card sectioned>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <Text variant="headingSm" as="h3">API Connection Issues</Text>
                      <Text variant="bodyMd" color="subdued">
                        Ensure your Shopify store permissions are properly configured.
                      </Text>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Support Ticket"
        primaryAction={{
          content: "Create Ticket",
          onAction: handleSubmit,
          disabled: !formData.subject || !formData.description
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowCreateModal(false)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Subject"
              value={formData.subject}
              onChange={(value) => setFormData({ ...formData, subject: value })}
              placeholder="Brief description of your issue"
              autoComplete="off"
            />

            <Select
              label="Category"
              options={categoryOptions}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
            />

            <Select
              label="Priority"
              options={priorityOptions}
              value={formData.priority}
              onChange={(value) => setFormData({ ...formData, priority: value })}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              multiline={4}
              placeholder="Please provide detailed information about your issue..."
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}