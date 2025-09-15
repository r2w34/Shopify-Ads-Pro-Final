import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { AdminService } from "../services/admin.server";
import { AdminAuthService } from "../services/admin-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const admin = await AdminAuthService.requireAdminAuth(request);

  try {
    const settings = await AdminService.getAllSettings();
    
    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, typeof settings>);

    return json({
      settings: groupedSettings,
      categories: Object.keys(groupedSettings)
    });
  } catch (error) {
    console.error("Error loading settings:", error);
    return json({
      settings: {},
      categories: [],
      error: "Failed to load settings"
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const admin = await AdminAuthService.requireAdminAuth(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    switch (action) {
      case "update":
        const key = formData.get("key") as string;
        const value = formData.get("value") as string;
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;
        await AdminService.updateSetting({
          key,
          value,
          description,
          category
        }, admin.id);
        break;
      case "reset":
        await AdminService.initializeDefaultSettings();
        break;
    }

    return json({ success: true });
  } catch (error) {
    console.error("Settings action error:", error);
    return json({ error: "Action failed" }, { status: 500 });
  }
};

export default function AdminSettings() {
  const { settings, categories, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleUpdateSetting = (key: string, value: string, description?: string, category?: string) => {
    const formData = new FormData();
    formData.append("action", "update");
    formData.append("key", key);
    formData.append("value", value);
    formData.append("description", description || "");
    formData.append("category", category || "general");
    fetcher.submit(formData, { method: "post" });
  };

  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to defaults? This cannot be undone.")) {
      const formData = new FormData();
      formData.append("action", "reset");
      fetcher.submit(formData, { method: "post" });
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>
          System Settings
        </h1>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Configure application settings and preferences
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

      {fetcher.data?.success && (
        <div style={{ 
          backgroundColor: "#dfd", 
          border: "1px solid #cfc", 
          padding: "10px", 
          borderRadius: "4px", 
          marginBottom: "20px",
          color: "#060"
        }}>
          Settings updated successfully!
        </div>
      )}

      {fetcher.data?.error && (
        <div style={{ 
          backgroundColor: "#fee", 
          border: "1px solid #fcc", 
          padding: "10px", 
          borderRadius: "4px", 
          marginBottom: "20px",
          color: "#c00"
        }}>
          {fetcher.data.error}
        </div>
      )}

      {/* Reset Button */}
      <div style={{ marginBottom: "30px" }}>
        <button
          onClick={handleResetSettings}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Reset All Settings to Defaults
        </button>
      </div>

      {/* Settings by Category */}
      {categories.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px", 
          color: "#666",
          fontStyle: "italic"
        }}>
          No settings found. Click "Reset All Settings to Defaults" to initialize.
        </div>
      ) : (
        categories.map((category) => (
          <div key={category} style={{ marginBottom: "30px" }}>
            <h2 style={{ 
              fontSize: "18px", 
              fontWeight: "600", 
              marginBottom: "15px",
              textTransform: "capitalize",
              color: "#333"
            }}>
              {category.replace('_', ' ')} Settings
            </h2>
            
            <div style={{ 
              backgroundColor: "white", 
              border: "1px solid #e1e1e1", 
              borderRadius: "8px",
              overflow: "hidden"
            }}>
              {settings[category].map((setting, index) => (
                <div 
                  key={setting.key} 
                  style={{ 
                    padding: "20px",
                    borderBottom: index < settings[category].length - 1 ? "1px solid #f1f1f1" : "none"
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ 
                      fontWeight: "500", 
                      fontSize: "14px",
                      display: "block",
                      marginBottom: "5px"
                    }}>
                      {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    {setting.description && (
                      <p style={{ 
                        fontSize: "12px", 
                        color: "#666", 
                        marginBottom: "10px" 
                      }}>
                        {setting.description}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {setting.isEncrypted ? (
                      <input
                        type="password"
                        defaultValue={setting.value}
                        placeholder="Enter value..."
                        onBlur={(e) => {
                          if (e.target.value !== setting.value) {
                            handleUpdateSetting(setting.key, e.target.value, setting.description, setting.category);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px"
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        defaultValue={setting.value}
                        placeholder="Enter value..."
                        onBlur={(e) => {
                          if (e.target.value !== setting.value) {
                            handleUpdateSetting(setting.key, e.target.value, setting.description, setting.category);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px"
                        }}
                      />
                    )}
                    
                    {setting.isEncrypted && (
                      <span style={{
                        padding: "2px 8px",
                        backgroundColor: "#fff3cd",
                        color: "#856404",
                        fontSize: "11px",
                        borderRadius: "12px",
                        fontWeight: "500"
                      }}>
                        Encrypted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* System Information */}
      <div style={{ marginTop: "40px" }}>
        <h2 style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          marginBottom: "15px",
          color: "#333"
        }}>
          System Information
        </h2>
        
        <div style={{ 
          backgroundColor: "white", 
          border: "1px solid #e1e1e1", 
          borderRadius: "8px",
          padding: "20px"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            <div>
              <strong style={{ fontSize: "14px" }}>Application:</strong>
              <div style={{ color: "#666", fontSize: "14px" }}>Facebook AI Ads Pro v1.0.0</div>
            </div>
            <div>
              <strong style={{ fontSize: "14px" }}>Environment:</strong>
              <div style={{ color: "#666", fontSize: "14px" }}>Production</div>
            </div>
            <div>
              <strong style={{ fontSize: "14px" }}>Database:</strong>
              <div style={{ color: "#666", fontSize: "14px" }}>SQLite</div>
            </div>
            <div>
              <strong style={{ fontSize: "14px" }}>Server:</strong>
              <div style={{ color: "#666", fontSize: "14px" }}>Ubuntu VPS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}