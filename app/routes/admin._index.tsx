import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    stats: {
      totalUsers: 0,
      totalCampaigns: 0,
      totalAdSpend: 0,
      systemHealth: 100
    },
    systemInfo: {
      application: 'Facebook AI Ads Pro',
      version: '1.0.0',
      environment: 'Production',
      database: 'SQLite',
      server: 'Ubuntu VPS',
      domain: 'fbai-app.trustclouds.in',
      ssl: "Let's Encrypt",
      processManager: 'PM2'
    },
    lastUpdated: new Date().toISOString()
  });
}

export default function AdminIndex() {
  const { stats, systemInfo, lastUpdated } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin Dashboard - Facebook AI Ads Pro</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #333; line-height: 1.6; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
            .header h1 { color: #2c3e50; font-size: 2.5rem; margin-bottom: 10px; }
            .header p { color: #7f8c8d; font-size: 1.1rem; }
            .status-card { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .status-card h2 { color: #155724; margin-bottom: 10px; }
            .status-card p { color: #155724; margin-bottom: 5px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .stat-card h3 { color: #2c3e50; font-size: 1.1rem; margin-bottom: 15px; }
            .stat-value { font-size: 2.5rem; font-weight: bold; color: #3498db; margin-bottom: 10px; }
            .stat-label { color: #7f8c8d; font-size: 0.9rem; }
            .actions-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
            .actions-section h2 { color: #2c3e50; margin-bottom: 20px; }
            .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .action-btn { display: block; padding: 15px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 8px; text-align: center; transition: background 0.3s; }
            .action-btn:hover { background: #2980b9; }
            .system-info { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .system-info h2 { color: #2c3e50; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
            .info-item { margin-bottom: 15px; }
            .info-item strong { color: #2c3e50; }
          `
        }} />
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1>🚀 Admin Dashboard</h1>
            <p><strong>Facebook AI Ads Pro - Administration Panel</strong></p>
          </div>

          <div className="status-card">
            <h2>✅ System Status: Online</h2>
            <p>Application is running normally. All services are operational.</p>
            <p><strong>Last Updated:</strong> {lastUpdated}</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">{stats.totalUsers} active</div>
            </div>
            <div className="stat-card">
              <h3>Total Campaigns</h3>
              <div className="stat-value">{stats.totalCampaigns}</div>
              <div className="stat-label">All time</div>
            </div>
            <div className="stat-card">
              <h3>Total Ad Spend</h3>
              <div className="stat-value">${stats.totalAdSpend}</div>
              <div className="stat-label">All campaigns</div>
            </div>
            <div className="stat-card">
              <h3>System Health</h3>
              <div className="stat-value">{stats.systemHealth}%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>

          <div className="actions-section">
            <h2>🔧 Quick Actions</h2>
            <div className="actions-grid">
              <a href="/admin/customers" className="action-btn">Manage Customers</a>
              <a href="/admin/settings" className="action-btn">System Settings</a>
              <a href="/admin/logs" className="action-btn">View Logs</a>
              <a href="/admin/backup" className="action-btn">Backup Data</a>
            </div>
          </div>

          <div className="system-info">
            <h2>📊 System Information</h2>
            <div className="info-grid">
              <div>
                <div className="info-item">
                  <strong>Application:</strong> {systemInfo.application}
                </div>
                <div className="info-item">
                  <strong>Version:</strong> {systemInfo.version}
                </div>
                <div className="info-item">
                  <strong>Environment:</strong> {systemInfo.environment}
                </div>
                <div className="info-item">
                  <strong>Database:</strong> {systemInfo.database}
                </div>
              </div>
              <div>
                <div className="info-item">
                  <strong>Server:</strong> {systemInfo.server}
                </div>
                <div className="info-item">
                  <strong>Domain:</strong> {systemInfo.domain}
                </div>
                <div className="info-item">
                  <strong>SSL:</strong> {systemInfo.ssl}
                </div>
                <div className="info-item">
                  <strong>Process Manager:</strong> {systemInfo.processManager}
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
