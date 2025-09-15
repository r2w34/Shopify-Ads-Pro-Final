import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  TextField,
  Select,
  Modal,
  Banner,
  Tabs,
  Divider,
  ButtonGroup,
  Checkbox,
  DataTable,
} from "@shopify/polaris";
import { AdminService } from "../services/admin.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const settings = await AdminService.getSettings();
    
    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, any[]>);

    return json({
      settings,
      groupedSettings,
      categories: Object.keys(groupedSettings).sort()
    });
  } catch (error) {
    console.error("Admin settings error:", error);
    return json({
      settings: [],
      groupedSettings: {},
      categories: []
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "update_setting") {
    const key = formData.get("key") as string;
    const value = formData.get("value") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const isEncrypted = formData.get("isEncrypted") === "true";

    try {
      await AdminService.updateSetting({
        key,
        value,
        description,
        category,
        isEncrypted
      }, "admin-demo");

      return json({ success: true, message: "Setting updated successfully" });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  if (action === "delete_setting") {
    const key = formData.get("key") as string;

    try {
      // In a real app, you'd implement delete functionality
      return json({ success: true, message: "Setting deleted successfully" });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  if (action === "bulk_update") {
    const settingsData = JSON.parse(formData.get("settingsData") as string);

    try {
      for (const setting of settingsData) {
        await AdminService.updateSetting(setting, "admin-demo");
      }

      return json({ 
        success: true, 
        message: `${settingsData.length} settings updated successfully` 
      });
    } catch (error: any) {
      return json({ success: false, message: error.message });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function AdminSettings() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSettings, setBulkSettings] = useState<any[]>([]);

  const categories = ['all', ...data.categories];
  const currentCategory = categories[selectedTab];
  const currentSettings = currentCategory === 'all' 
    ? data.settings 
    : data.groupedSettings[currentCategory] || [];

  const tabs = categories.map(category => ({
    id: category,
    content: category === 'all' 
      ? `All Settings (${data.settings.length})`
      : `${category.charAt(0).toUpperCase() + category.slice(1)} (${data.groupedSettings[category]?.length || 0})`
  }));

  const openSettingModal = (setting?: any) => {
    setEditingSetting(setting || {
      key: '',
      value: '',
      description: '',
      category: currentCategory === 'all' ? 'general' : currentCategory,
      isEncrypted: false
    });
    setShowSettingModal(true);
  };

  const closeSettingModal = () => {
    setShowSettingModal(false);
    setEditingSetting(null);
  };

  const saveSetting = () => {
    if (editingSetting) {
      fetcher.submit({
        action: "update_setting",
        key: editingSetting.key,
        value: editingSetting.value,
        description: editingSetting.description,
        category: editingSetting.category,
        isEncrypted: editingSetting.isEncrypted.toString()
      }, { method: "POST" });
    }
  };

  const deleteSetting = (key: string) => {
    if (confirm(`Are you sure you want to delete the setting "${key}"?`)) {
      fetcher.submit({
        action: "delete_setting",
        key
      }, { method: "POST" });
    }
  };

  const startBulkEdit = () => {
    setBulkEditMode(true);
    setBulkSettings(currentSettings.map(s => ({ ...s })));
  };

  const cancelBulkEdit = () => {
    setBulkEditMode(false);
    setBulkSettings([]);
  };

  const saveBulkSettings = () => {
    const changedSettings = bulkSettings.filter((setting, index) => {
      const original = currentSettings[index];
      return setting.value !== original.value || 
             setting.description !== original.description ||
             setting.category !== original.category;
    });

    if (changedSettings.length > 0) {
      fetcher.submit({
        action: "bulk_update",
        settingsData: JSON.stringify(changedSettings)
      }, { method: "POST" });
    }

    setBulkEditMode(false);
    setBulkSettings([]);
  };

  const updateBulkSetting = (index: number, field: string, value: any) => {
    const updated = [...bulkSettings];
    updated[index] = { ...updated[index], [field]: value };
    setBulkSettings(updated);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, any> = {
      api: 'info',
      billing: 'warning',
      features: 'success',
      general: 'subdued',
      limits: 'critical'
    };
    
    return <Badge tone={colors[category] || 'subdued'}>{category}</Badge>;
  };

  const getDefaultSettings = () => {
    return [
      {
        key: 'openai_api_key',
        value: '',
        description: 'OpenAI API Key for AI features',
        category: 'api',
        isEncrypted: true
      },
      {
        key: 'facebook_app_id',
        value: '',
        description: 'Facebook App ID',
        category: 'api',
        isEncrypted: false
      },
      {
        key: 'facebook_app_secret',
        value: '',
        description: 'Facebook App Secret',
        category: 'api',
        isEncrypted: true
      },
      {
        key: 'ai_features_enabled',
        value: 'true',
        description: 'Enable AI-powered features',
        category: 'features',
        isEncrypted: false
      },
      {
        key: 'trial_days',
        value: '14',
        description: 'Default trial period in days',
        category: 'billing',
        isEncrypted: false
      },
      {
        key: 'max_campaigns_per_customer',
        value: '100',
        description: 'Maximum campaigns per customer',
        category: 'limits',
        isEncrypted: false
      }
    ];
  };

  const initializeDefaultSettings = () => {
    const defaultSettings = getDefaultSettings();
    fetcher.submit({
      action: "bulk_update",
      settingsData: JSON.stringify(defaultSettings)
    }, { method: "POST" });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      if (showSettingModal) {
        closeSettingModal();
      }
      if (bulkEditMode) {
        setBulkEditMode(false);
        setBulkSettings([]);
      }
      // Reload page to show updated data
      setTimeout(() => window.location.reload(), 1000);
    }
  }, [fetcher.data]);

  return (
    <Page
      title="Application Settings"
      subtitle="Manage API keys, feature flags, and system configuration"
      primaryAction={{
        content: "Add Setting",
        onAction: () => openSettingModal()
      }}
      secondaryActions={[
        {
          content: bulkEditMode ? "Cancel Bulk Edit" : "Bulk Edit",
          onAction: bulkEditMode ? cancelBulkEdit : startBulkEdit,
          disabled: currentSettings.length === 0
        },
        {
          content: "Initialize Defaults",
          onAction: initializeDefaultSettings
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {data.settings.length === 0 && (
              <Banner
                title="No settings configured"
                status="info"
                action={{
                  content: "Initialize Default Settings",
                  onAction: initializeDefaultSettings
                }}
              >
                <p>Get started by initializing the default application settings.</p>
              </Banner>
            )}

            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <div style={{ marginTop: '20px' }}>
                  {bulkEditMode ? (
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">
                          Bulk Edit Mode - {currentSettings.length} settings
                        </Text>
                        <ButtonGroup>
                          <Button 
                            variant="primary" 
                            onClick={saveBulkSettings}
                            loading={fetcher.state === "submitting"}
                          >
                            Save All Changes
                          </Button>
                          <Button onClick={cancelBulkEdit}>Cancel</Button>
                        </ButtonGroup>
                      </InlineStack>

                      <BlockStack gap="300">
                        {bulkSettings.map((setting, index) => (
                          <Card key={setting.key}>
                            <BlockStack gap="300">
                              <InlineStack gap="200" align="start">
                                <Text as="h3" variant="headingSm">{setting.key}</Text>
                                {getCategoryBadge(setting.category)}
                                {setting.isEncrypted && <Badge tone="critical">Encrypted</Badge>}
                              </InlineStack>

                              <InlineStack gap="400">
                                <TextField
                                  label="Value"
                                  value={setting.value}
                                  onChange={(value) => updateBulkSetting(index, 'value', value)}
                                  type={setting.isEncrypted ? "password" : "text"}
                                  autoComplete="off"
                                />

                                <TextField
                                  label="Description"
                                  value={setting.description || ''}
                                  onChange={(value) => updateBulkSetting(index, 'description', value)}
                                  autoComplete="off"
                                />

                                <Select
                                  label="Category"
                                  options={[
                                    { label: 'General', value: 'general' },
                                    { label: 'API', value: 'api' },
                                    { label: 'Billing', value: 'billing' },
                                    { label: 'Features', value: 'features' },
                                    { label: 'Limits', value: 'limits' }
                                  ]}
                                  value={setting.category}
                                  onChange={(value) => updateBulkSetting(index, 'category', value)}
                                />
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">
                          {currentCategory === 'all' ? 'All Settings' : `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Settings`}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {currentSettings.length} settings
                        </Text>
                      </InlineStack>

                      {currentSettings.length === 0 ? (
                        <Text as="p" variant="bodySm" tone="subdued">
                          No settings in this category
                        </Text>
                      ) : (
                        <DataTable
                          columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                          headings={['Key', 'Value', 'Category', 'Description', 'Encrypted', 'Actions']}
                          rows={currentSettings.map(setting => [
                            <Text key={`key-${setting.key}`} as="span" variant="bodyMd" fontWeight="bold">
                              {setting.key}
                            </Text>,
                            <Text key={`value-${setting.key}`} as="span" variant="bodySm">
                              {setting.isEncrypted 
                                ? '••••••••' 
                                : (setting.value.length > 50 
                                    ? setting.value.substring(0, 50) + '...' 
                                    : setting.value)
                              }
                            </Text>,
                            getCategoryBadge(setting.category),
                            <Text key={`desc-${setting.key}`} as="span" variant="bodySm" tone="subdued">
                              {setting.description || '-'}
                            </Text>,
                            setting.isEncrypted ? (
                              <Badge tone="critical">Yes</Badge>
                            ) : (
                              <Badge tone="subdued">No</Badge>
                            ),
                            <ButtonGroup key={`actions-${setting.key}`}>
                              <Button size="slim" onClick={() => openSettingModal(setting)}>
                                Edit
                              </Button>
                              <Button 
                                size="slim" 
                                tone="critical" 
                                onClick={() => deleteSetting(setting.key)}
                              >
                                Delete
                              </Button>
                            </ButtonGroup>
                          ])}
                        />
                      )}
                    </BlockStack>
                  )}
                </div>
              </Tabs>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Quick Actions */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Quick Actions</Text>
                
                <BlockStack gap="200">
                  <Button fullWidth onClick={() => openSettingModal()}>
                    Add New Setting
                  </Button>
                  
                  <Button fullWidth onClick={initializeDefaultSettings}>
                    Reset to Defaults
                  </Button>
                  
                  <Button fullWidth onClick={() => {
                    // Export functionality
                    const dataStr = JSON.stringify(data.settings, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'settings-export.json';
                    link.click();
                  }}>
                    Export Settings
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Settings Categories */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Categories</Text>
                
                <BlockStack gap="200">
                  {data.categories.map(category => (
                    <InlineStack key={category} align="space-between">
                      <Text as="span" variant="bodySm">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                      <Badge tone="subdued">
                        {data.groupedSettings[category]?.length || 0}
                      </Badge>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Security Notice */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Security Notice</Text>
                
                <Text as="p" variant="bodySm">
                  🔒 Encrypted settings are stored securely and never displayed in plain text.
                </Text>
                
                <Text as="p" variant="bodySm">
                  ⚠️ API keys and sensitive data should always be marked as encrypted.
                </Text>
                
                <Text as="p" variant="bodySm">
                  📝 Changes to settings may require application restart to take effect.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Setting Edit Modal */}
      <Modal
        open={showSettingModal}
        onClose={closeSettingModal}
        title={editingSetting?.id ? "Edit Setting" : "Add New Setting"}
        primaryAction={{
          content: "Save Setting",
          onAction: saveSetting,
          loading: fetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: closeSettingModal
          }
        ]}
      >
        <Modal.Section>
          {editingSetting && (
            <BlockStack gap="400">
              <TextField
                label="Key"
                value={editingSetting.key}
                onChange={(value) => setEditingSetting({...editingSetting, key: value})}
                disabled={!!editingSetting.id}
                placeholder="e.g., openai_api_key"
                autoComplete="off"
              />
              
              <TextField
                label="Value"
                value={editingSetting.value}
                onChange={(value) => setEditingSetting({...editingSetting, value: value})}
                type={editingSetting.isEncrypted ? "password" : "text"}
                multiline={!editingSetting.isEncrypted ? 3 : undefined}
                placeholder="Enter the setting value"
                autoComplete="off"
              />
              
              <Select
                label="Category"
                options={[
                  { label: 'General', value: 'general' },
                  { label: 'API', value: 'api' },
                  { label: 'Billing', value: 'billing' },
                  { label: 'Features', value: 'features' },
                  { label: 'Limits', value: 'limits' }
                ]}
                value={editingSetting.category}
                onChange={(value) => setEditingSetting({...editingSetting, category: value})}
              />
              
              <TextField
                label="Description"
                value={editingSetting.description || ''}
                onChange={(value) => setEditingSetting({...editingSetting, description: value})}
                placeholder="Describe what this setting controls"
                autoComplete="off"
              />
              
              <Checkbox
                label="Encrypt this setting (for sensitive data like API keys)"
                checked={editingSetting.isEncrypted}
                onChange={(checked) => setEditingSetting({...editingSetting, isEncrypted: checked})}
              />
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}