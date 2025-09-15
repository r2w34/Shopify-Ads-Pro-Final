import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  TextField,
  Select,
  Modal,
  Banner,
  Filters,
  Pagination,
  ButtonGroup,
  Tabs,
  ResourceList,
  ResourceItem,
  Avatar,
  Thumbnail,
  TextContainer,
  Checkbox,
  ChoiceList,
} from "@shopify/polaris";
import { AdminService } from "../services/admin.server";
import { SubscriptionService } from "../services/subscription.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");
  const filter = url.searchParams.get("filter") || "all";
  const search = url.searchParams.get("search") || "";

  try {
    const customersData = await AdminService.getAllCustomers(page, limit);
    const subscriptionsData = await AdminService.getAllSubscriptions(1, 100);
    
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
      subscriptions: subscriptionsData.subscriptions,
      filters: { filter, search, page, limit }
    });
  } catch (error) {
    console.error("Admin customers error:", error);
    return json({
      customers: [],
      pagination: { page: 1, limit: 25, total: 0, pages: 0 },
      subscriptions: [],
      filters: { filter: "all", search: "", page: 1, limit: 25 }
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "update_customer") {
    const shop = formData.get("shop") as string;
    const isActive = formData.get("isActive") === "true";
    const isBlocked = formData.get("isBlocked") === "true";
    const blockReason = formData.get("blockReason") as string;
    const supportNotes = formData.get("supportNotes") as string;
    const supportPriority = formData.get("supportPriority") as string;

    try {
      await AdminService.updateCustomer(shop, {
        isActive,
        isBlocked,
        blockReason: isBlocked ? blockReason : null,
        supportNotes,
        supportPriority
      }, "admin-demo");

      return json({ success: true, message: "Customer updated successfully" });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  if (action === "bulk_update") {
    const customerIds = JSON.parse(formData.get("customerIds") as string);
    const updateType = formData.get("updateType") as string;
    const updateValue = formData.get("updateValue") as string;

    try {
      for (const shop of customerIds) {
        const updateData: any = {};
        
        if (updateType === "activate") {
          updateData.isActive = true;
        } else if (updateType === "deactivate") {
          updateData.isActive = false;
        } else if (updateType === "block") {
          updateData.isBlocked = true;
          updateData.blockReason = updateValue;
        } else if (updateType === "unblock") {
          updateData.isBlocked = false;
          updateData.blockReason = null;
        }

        await AdminService.updateCustomer(shop, updateData, "admin-demo");
      }

      return json({ 
        success: true, 
        message: `${customerIds.length} customers updated successfully` 
      });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function AdminCustomers() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  // Filter states
  const [searchValue, setSearchValue] = useState(data.filters.search);
  const [statusFilter, setStatusFilter] = useState(data.filters.filter);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (customer: any) => {
    if (customer.isBlocked) {
      return <Badge tone="critical">Blocked</Badge>;
    }
    if (!customer.isActive) {
      return <Badge tone="warning">Inactive</Badge>;
    }
    return <Badge tone="success">Active</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge tone="critical">Urgent</Badge>;
      case 'high':
        return <Badge tone="warning">High</Badge>;
      case 'normal':
        return <Badge tone="info">Normal</Badge>;
      case 'low':
        return <Badge tone="subdued">Low</Badge>;
      default:
        return <Badge tone="subdued">Normal</Badge>;
    }
  };

  const getSubscriptionForCustomer = (shop: string) => {
    return data.subscriptions.find(s => s.shop === shop);
  };

  const openCustomerModal = (customer: any) => {
    setEditingCustomer({
      ...customer,
      isActive: customer.isActive,
      isBlocked: customer.isBlocked,
      blockReason: customer.blockReason || '',
      supportNotes: customer.supportNotes || '',
      supportPriority: customer.supportPriority || 'normal'
    });
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  const updateCustomer = () => {
    if (editingCustomer) {
      fetcher.submit({
        action: "update_customer",
        shop: editingCustomer.shop,
        isActive: editingCustomer.isActive.toString(),
        isBlocked: editingCustomer.isBlocked.toString(),
        blockReason: editingCustomer.blockReason,
        supportNotes: editingCustomer.supportNotes,
        supportPriority: editingCustomer.supportPriority
      }, { method: "POST" });
    }
  };

  const handleBulkAction = (action: string, value?: string) => {
    if (selectedCustomers.length === 0) return;

    fetcher.submit({
      action: "bulk_update",
      customerIds: JSON.stringify(selectedCustomers),
      updateType: action,
      updateValue: value || ""
    }, { method: "POST" });

    setSelectedCustomers([]);
    setShowBulkModal(false);
  };

  const handleFiltersChange = () => {
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (statusFilter !== "all") params.set("filter", statusFilter);
    params.set("page", "1");
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchValue("");
    setStatusFilter("all");
    setSearchParams({});
  };

  const tabs = [
    { id: 'all', content: `All Customers (${data.customers.length})` },
    { id: 'active', content: `Active (${data.customers.filter(c => c.isActive && !c.isBlocked).length})` },
    { id: 'inactive', content: `Inactive (${data.customers.filter(c => !c.isActive).length})` },
    { id: 'blocked', content: `Blocked (${data.customers.filter(c => c.isBlocked).length})` },
  ];

  useEffect(() => {
    if (fetcher.data?.success) {
      if (showCustomerModal) {
        closeCustomerModal();
      }
      // Reload page to show updated data
      setTimeout(() => window.location.reload(), 1000);
    }
  }, [fetcher.data]);

  return (
    <Page
      title="Customer Management"
      subtitle={`Manage ${data.customers.length} customers`}
      primaryAction={{
        content: "Export Customers",
        onAction: () => {
          // Export functionality would go here
          console.log("Export customers");
        }
      }}
      secondaryActions={[
        {
          content: "Bulk Actions",
          onAction: () => setShowBulkModal(true),
          disabled: selectedCustomers.length === 0
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Filters */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="400" align="space-between">
                  <TextField
                    label="Search customers"
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Search by shop, name, or email"
                    clearButton
                    onClearButtonClick={() => setSearchValue("")}
                    autoComplete="off"
                  />
                  
                  <Select
                    label="Status"
                    options={[
                      { label: 'All', value: 'all' },
                      { label: 'Active', value: 'active' },
                      { label: 'Inactive', value: 'inactive' },
                      { label: 'Blocked', value: 'blocked' }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                  
                  <ButtonGroup>
                    <Button onClick={handleFiltersChange}>Apply Filters</Button>
                    <Button onClick={clearFilters}>Clear</Button>
                  </ButtonGroup>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Customers Table */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Customers</Text>
                  {selectedCustomers.length > 0 && (
                    <Text as="p" variant="bodySm">
                      {selectedCustomers.length} selected
                    </Text>
                  )}
                </InlineStack>

                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                  headings={[
                    <Checkbox
                      key="select-all"
                      checked={selectedCustomers.length === data.customers.length}
                      indeterminate={selectedCustomers.length > 0 && selectedCustomers.length < data.customers.length}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedCustomers(data.customers.map(c => c.shop));
                        } else {
                          setSelectedCustomers([]);
                        }
                      }}
                    />,
                    'Shop',
                    'Email',
                    'Status',
                    'Subscription',
                    'Total Spend',
                    'Support Priority',
                    'Actions'
                  ]}
                  rows={data.customers.map(customer => {
                    const subscription = getSubscriptionForCustomer(customer.shop);
                    const isSelected = selectedCustomers.includes(customer.shop);
                    
                    return [
                      <Checkbox
                        key={customer.shop}
                        checked={isSelected}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedCustomers([...selectedCustomers, customer.shop]);
                          } else {
                            setSelectedCustomers(selectedCustomers.filter(id => id !== customer.shop));
                          }
                        }}
                      />,
                      <BlockStack key={`shop-${customer.shop}`} gap="100">
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          {customer.shopName || customer.shop}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {customer.shop}
                        </Text>
                      </BlockStack>,
                      customer.email || '-',
                      getStatusBadge(customer),
                      subscription ? (
                        <BlockStack key={`sub-${customer.shop}`} gap="100">
                          <Text as="span" variant="bodySm">
                            {subscription.plan.name}
                          </Text>
                          <Badge tone={subscription.status === 'active' ? 'success' : 'warning'}>
                            {subscription.status}
                          </Badge>
                        </BlockStack>
                      ) : (
                        <Badge tone="subdued">No subscription</Badge>
                      ),
                      formatCurrency(customer.totalSpend),
                      getPriorityBadge(customer.supportPriority),
                      <Button
                        key={`action-${customer.shop}`}
                        size="slim"
                        onClick={() => openCustomerModal(customer)}
                      >
                        Edit
                      </Button>
                    ];
                  })}
                />

                {/* Pagination */}
                {data.pagination.pages > 1 && (
                  <InlineStack align="center">
                    <Pagination
                      hasPrevious={data.pagination.page > 1}
                      onPrevious={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set("page", (data.pagination.page - 1).toString());
                        setSearchParams(params);
                      }}
                      hasNext={data.pagination.page < data.pagination.pages}
                      onNext={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set("page", (data.pagination.page + 1).toString());
                        setSearchParams(params);
                      }}
                    />
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Customer Edit Modal */}
      <Modal
        open={showCustomerModal}
        onClose={closeCustomerModal}
        title={`Edit Customer: ${editingCustomer?.shopName || editingCustomer?.shop}`}
        primaryAction={{
          content: "Save Changes",
          onAction: updateCustomer,
          loading: fetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: closeCustomerModal
          }
        ]}
      >
        <Modal.Section>
          {editingCustomer && (
            <BlockStack gap="400">
              <InlineStack gap="400">
                <Checkbox
                  label="Active"
                  checked={editingCustomer.isActive}
                  onChange={(checked) => setEditingCustomer({
                    ...editingCustomer,
                    isActive: checked
                  })}
                />
                
                <Checkbox
                  label="Blocked"
                  checked={editingCustomer.isBlocked}
                  onChange={(checked) => setEditingCustomer({
                    ...editingCustomer,
                    isBlocked: checked
                  })}
                />
              </InlineStack>

              {editingCustomer.isBlocked && (
                <TextField
                  label="Block Reason"
                  value={editingCustomer.blockReason}
                  onChange={(value) => setEditingCustomer({
                    ...editingCustomer,
                    blockReason: value
                  })}
                  multiline={2}
                  autoComplete="off"
                />
              )}

              <Select
                label="Support Priority"
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'High', value: 'high' },
                  { label: 'Urgent', value: 'urgent' }
                ]}
                value={editingCustomer.supportPriority}
                onChange={(value) => setEditingCustomer({
                  ...editingCustomer,
                  supportPriority: value
                })}
              />

              <TextField
                label="Support Notes"
                value={editingCustomer.supportNotes}
                onChange={(value) => setEditingCustomer({
                  ...editingCustomer,
                  supportNotes: value
                })}
                multiline={4}
                placeholder="Add internal notes about this customer..."
                autoComplete="off"
              />
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={`Bulk Actions (${selectedCustomers.length} customers)`}
        primaryAction={{
          content: "Apply",
          onAction: () => {
            // This would be handled by individual action buttons
          },
          disabled: true
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowBulkModal(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Select an action to apply to {selectedCustomers.length} selected customers:
            </Text>

            <ButtonGroup>
              <Button onClick={() => handleBulkAction("activate")}>
                Activate All
              </Button>
              <Button onClick={() => handleBulkAction("deactivate")}>
                Deactivate All
              </Button>
              <Button onClick={() => handleBulkAction("block", "Bulk blocked by admin")}>
                Block All
              </Button>
              <Button onClick={() => handleBulkAction("unblock")}>
                Unblock All
              </Button>
            </ButtonGroup>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}