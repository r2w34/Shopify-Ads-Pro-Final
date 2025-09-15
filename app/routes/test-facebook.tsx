import { useState } from "react";

export default function TestFacebook() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFacebookAuth = () => {
    addLog("Starting Facebook authentication test...");
    
    // Test shop context
    const shop = "test-shop.myshopify.com";
    const facebookAppId = "342313695281811";
    const redirectUri = encodeURIComponent("https://fbai-app.trustclouds.in/auth/facebook/callback");
    const state = btoa(JSON.stringify({ shop: shop, popup: true }));
    
    addLog(`Shop: ${shop}`);
    addLog(`Facebook App ID: ${facebookAppId}`);
    addLog(`Redirect URI: ${redirectUri}`);
    addLog(`State: ${state}`);
    
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management,pages_read_engagement&response_type=code&popup=true`;
    
    addLog(`Facebook Auth URL: ${facebookAuthUrl}`);
    
    // Open popup window
    const popup = window.open(
      facebookAuthUrl,
      'facebook-auth-test',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      addLog("❌ Failed to open popup - popup blocked?");
      return;
    }
    
    addLog("✅ Popup opened successfully");
    
    // Listen for messages from popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        addLog(`❌ Message from wrong origin: ${event.origin}`);
        return;
      }
      
      addLog(`📨 Message received: ${JSON.stringify(event.data)}`);
      
      if (event.data.type === 'FACEBOOK_AUTH_SUCCESS') {
        addLog("✅ Facebook authentication successful!");
        addLog(`Shop: ${event.data.shop}`);
      } else if (event.data.type === 'FACEBOOK_AUTH_ERROR') {
        addLog(`❌ Facebook authentication error: ${event.data.error}`);
      }
      
      window.removeEventListener('message', messageHandler);
    };
    
    window.addEventListener('message', messageHandler);
    
    // Check if popup is closed
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        addLog("🔒 Popup window closed");
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
      }
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Facebook Authentication Test</h1>
      <p>This page helps debug Facebook authentication issues.</p>
      
      <button 
        onClick={testFacebookAuth}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1877f2',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🚀 Test Facebook Authentication
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h2>📋 Debug Logs</h2>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '5px',
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #ddd'
        }}>
          {logs.length === 0 ? (
            <p style={{ color: '#666' }}>No logs yet. Click the test button to start.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => setLogs([])}
          style={{
            padding: '5px 10px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Logs
        </button>
      </div>
    </div>
  );
}