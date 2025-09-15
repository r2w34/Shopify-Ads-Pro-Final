#!/usr/bin/env node

/**
 * Local Development Server for Shopify Ads Pro
 * Bypasses Shopify authentication for local testing
 */

import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '.env.local') });

const PORT = process.env.PORT || 50864;
const HOST = process.env.HOST || '0.0.0.0';

// Mock session data for local development
const mockSession = {
  id: `offline_${process.env.MOCK_SHOP_DOMAIN}`,
  shop: process.env.MOCK_SHOP_DOMAIN || "test-shop.myshopify.com",
  state: "mock-state",
  isOnline: false,
  scope: process.env.SCOPES || "read_products,write_products",
  accessToken: process.env.MOCK_ACCESS_TOKEN || "shpat_test_token",
  userId: "mock-user-123"
};

// Simple static file server
function serveStatic(req, res, filePath) {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath);
      const ext = filePath.split('.').pop();
      
      const mimeTypes = {
        'html': 'text/html',
        'js': 'application/javascript',
        'css': 'text/css',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon'
      };
      
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
      return true;
    }
  } catch (error) {
    console.error('Error serving static file:', error);
  }
  return false;
}

// Create development server
const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // Enable CORS for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle different routes
  if (pathname === '/' || pathname === '/app') {
    // Serve main app page
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopify Ads Pro - Local Development</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f6f6f7;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 1px solid #e1e3e5;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .nav {
            display: flex;
            gap: 20px;
            margin: 20px 0;
        }
        .nav a {
            padding: 10px 15px;
            background: #008060;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .nav a:hover {
            background: #006b4f;
        }
        .status {
            background: #e8f5e8;
            border: 1px solid #c6e6c6;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .feature-card {
            border: 1px solid #e1e3e5;
            border-radius: 8px;
            padding: 20px;
            background: #fafbfb;
        }
        .feature-card h3 {
            margin-top: 0;
            color: #202223;
        }
        .feature-card p {
            color: #6d7175;
            margin-bottom: 15px;
        }
        .btn {
            display: inline-block;
            padding: 8px 16px;
            background: #008060;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
        }
        .btn:hover {
            background: #006b4f;
        }
        .btn-secondary {
            background: #6c757d;
        }
        .btn-secondary:hover {
            background: #545b62;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Shopify Ads Pro - Local Development</h1>
            <p>AI-powered Facebook Ads management for Shopify stores</p>
        </div>
        
        <div class="status">
            <strong>✅ Development Server Active</strong><br>
            Running in local development mode with mock Shopify session<br>
            Shop: ${mockSession.shop} | Session: ${mockSession.id}
        </div>
        
        <div class="warning">
            <strong>⚠️ Development Mode</strong><br>
            This is a local development environment. Shopify authentication is bypassed for testing purposes.
        </div>
        
        <div class="nav">
            <a href="/app">Main App</a>
            <a href="/app/support">Support System</a>
            <a href="/admin">Admin Panel</a>
            <a href="/admin/offers">Offers Management</a>
            <a href="/admin/analytics">Analytics</a>
            <a href="/admin/settings">Settings</a>
        </div>
        
        <div class="feature-grid">
            <div class="feature-card">
                <h3>🎧 Customer Support System</h3>
                <p>Complete support ticket management with quick help sections and status tracking.</p>
                <a href="/app/support" class="btn">Test Support System</a>
            </div>
            
            <div class="feature-card">
                <h3>🎁 Offers Management</h3>
                <p>Admin panel for managing discount codes, promotions, and usage tracking.</p>
                <a href="/admin/offers" class="btn">Test Offers Management</a>
            </div>
            
            <div class="feature-card">
                <h3>📊 Enhanced Admin Panel</h3>
                <p>Comprehensive admin dashboard with analytics, user management, and system logs.</p>
                <a href="/admin" class="btn">Access Admin Panel</a>
            </div>
            
            <div class="feature-card">
                <h3>🤖 AI Campaign Management</h3>
                <p>AI-powered Facebook ads creation and optimization for Shopify products.</p>
                <a href="/app/campaigns" class="btn btn-secondary">View Campaigns</a>
            </div>
            
            <div class="feature-card">
                <h3>📈 Performance Analytics</h3>
                <p>Detailed analytics and insights for ad performance and ROI tracking.</p>
                <a href="/app/analytics" class="btn btn-secondary">View Analytics</a>
            </div>
            
            <div class="feature-card">
                <h3>⚙️ Settings & Configuration</h3>
                <p>Configure Facebook integration, AI settings, and app preferences.</p>
                <a href="/app/settings" class="btn btn-secondary">App Settings</a>
            </div>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e3e5; color: #6d7175; font-size: 14px;">
            <p><strong>Development Server Info:</strong></p>
            <ul>
                <li>Server: http://${HOST}:${PORT}</li>
                <li>Environment: ${process.env.NODE_ENV}</li>
                <li>Mock Session: ${process.env.MOCK_SHOPIFY_SESSION}</li>
                <li>Database: ${process.env.DATABASE_URL}</li>
            </ul>
        </div>
    </div>
    
    <script>
        // Add some interactivity
        console.log('Shopify Ads Pro - Local Development Mode');
        console.log('Mock Session:', ${JSON.stringify(mockSession)});
        
        // Simple navigation handler
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' && e.target.href.includes('/app') || e.target.href.includes('/admin')) {
                e.preventDefault();
                alert('Feature: ' + e.target.textContent + '\\n\\nThis would navigate to: ' + e.target.href + '\\n\\nIn a real environment, this would load the actual Remix route.');
            }
        });
    </script>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
    return;
  }
  
  // API endpoints for testing
  if (pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    if (pathname === '/api/session') {
      res.end(JSON.stringify({ session: mockSession, authenticated: true }));
      return;
    }
    
    if (pathname === '/api/shop') {
      res.end(JSON.stringify({
        shop: {
          name: "Test Shop",
          domain: mockSession.shop,
          email: "test@example.com",
          currency: "USD",
          timezone: "America/Los_Angeles"
        }
      }));
      return;
    }
    
    if (pathname === '/api/products') {
      res.end(JSON.stringify({
        products: [
          { id: 1, title: "Test Product 1", price: "29.99", status: "active" },
          { id: 2, title: "Test Product 2", price: "49.99", status: "active" }
        ]
      }));
      return;
    }
    
    res.end(JSON.stringify({ error: "API endpoint not found" }));
    return;
  }
  
  // Try to serve static files
  const staticPaths = [
    join(__dirname, 'public', pathname),
    join(__dirname, 'build/client', pathname),
    join(__dirname, pathname.slice(1))
  ];
  
  for (const staticPath of staticPaths) {
    if (serveStatic(req, res, staticPath)) {
      return;
    }
  }
  
  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>404 - Not Found</title></head>
      <body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>404 - Page Not Found</h1>
        <p>The requested path <code>${pathname}</code> was not found.</p>
        <a href="/" style="color: #008060;">← Back to Home</a>
      </body>
    </html>
  `);
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`
🚀 Shopify Ads Pro - Development Server Started!

📍 Server URL: http://${HOST}:${PORT}
🏪 Mock Shop: ${mockSession.shop}
🔑 Session ID: ${mockSession.id}
🌍 Environment: ${process.env.NODE_ENV}

📋 Available Routes:
   • http://${HOST}:${PORT}/           - Main dashboard
   • http://${HOST}:${PORT}/app        - App interface  
   • http://${HOST}:${PORT}/app/support - Support system
   • http://${HOST}:${PORT}/admin      - Admin panel
   • http://${HOST}:${PORT}/admin/offers - Offers management
   
🔧 API Endpoints:
   • http://${HOST}:${PORT}/api/session - Mock session data
   • http://${HOST}:${PORT}/api/shop    - Mock shop data
   • http://${HOST}:${PORT}/api/products - Mock products

✨ Features Ready for Testing:
   ✅ Customer Support System
   ✅ Offers Management System  
   ✅ Enhanced Admin Panel
   ✅ Mock Shopify Integration

Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});