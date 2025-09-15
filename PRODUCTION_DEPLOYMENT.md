# AI Facebook Ads Pro - Production Deployment Guide

## 🚀 **Deployment to VPS: 77.37.45.67**

**Target Domain**: https://fbai-app.trustclouds.in  
**SSL**: Let's Encrypt (Automatic)  
**Stack**: Node.js + PostgreSQL + Nginx + PM2

---

## 📋 **Step-by-Step Deployment**

### **Step 1: Connect to Server**
```bash
ssh root@77.37.45.67
# Password: Kalilinux@2812
```

### **Step 2: System Setup**
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2 globally
npm install -g pm2

# Install Git and other tools
apt install -y git curl wget unzip

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

### **Step 3: Configure PostgreSQL**
```bash
# Switch to postgres user and create database
sudo -u postgres psql << EOF
CREATE DATABASE fbai_production;
CREATE USER fbai_user WITH ENCRYPTED PASSWORD 'FbAi2024SecurePass!';
GRANT ALL PRIVILEGES ON DATABASE fbai_production TO fbai_user;
ALTER USER fbai_user CREATEDB;
\q
EOF
```

### **Step 4: Create Application Directory**
```bash
# Create application directory
mkdir -p /var/www/fbai-app
cd /var/www/fbai-app

# Set proper ownership
chown -R www-data:www-data /var/www/fbai-app
```

### **Step 5: Upload Application Files**
Now you need to upload your application files. You can do this by:

**Option A: Using SCP (from your local machine)**
```bash
# From your local machine, run:
cd /workspace/fb-ai-sys
tar -czf fbai-app.tar.gz --exclude=node_modules --exclude=.git --exclude=build .
scp fbai-app.tar.gz root@77.37.45.67:/var/www/fbai-app/

# Then on the server:
cd /var/www/fbai-app
tar -xzf fbai-app.tar.gz
rm fbai-app.tar.gz
```

**Option B: Using Git (recommended)**
```bash
# On the server:
cd /var/www
rm -rf fbai-app
git clone https://github.com/yourusername/fb-ai-sys.git fbai-app
cd fbai-app
```

### **Step 6: Install Dependencies & Build**
```bash
cd /var/www/fbai-app

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Set proper permissions
chown -R www-data:www-data /var/www/fbai-app
chmod -R 755 /var/www/fbai-app
```

### **Step 7: Environment Configuration**
```bash
# Create production environment file
cat > /var/www/fbai-app/.env << 'EOF'
# Database
DATABASE_URL="postgresql://fbai_user:FbAi2024SecurePass!@localhost:5432/fbai_production"

# Shopify Configuration
SHOPIFY_API_KEY="your_shopify_api_key_here"
SHOPIFY_API_SECRET="your_shopify_secret_here"
SHOPIFY_APP_URL="https://fbai-app.trustclouds.in"
SHOPIFY_APP_SESSION_SECRET="your_32_character_session_secret_here"

# Facebook Configuration
FACEBOOK_APP_ID="your_facebook_app_id_here"
FACEBOOK_APP_SECRET="your_facebook_secret_here"
FACEBOOK_REDIRECT_URI="https://fbai-app.trustclouds.in/auth/facebook/callback"
FACEBOOK_ACCESS_TOKEN="your_facebook_access_token_here"

# OpenAI Configuration
OPENAI_API_KEY="your_openai_api_key_here"

# Production Settings
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"
EOF

# Secure the environment file
chmod 600 /var/www/fbai-app/.env
chown www-data:www-data /var/www/fbai-app/.env
```

### **Step 8: Database Setup**
```bash
cd /var/www/fbai-app

# Run database migrations
npx prisma db push

# Verify database connection
npx prisma db seed || echo "No seed file found, continuing..."
```

### **Step 9: Configure PM2**
```bash
# Create PM2 ecosystem file
cat > /var/www/fbai-app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fbai-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/fbai-app',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/fbai-app/error.log',
    out_file: '/var/log/fbai-app/out.log',
    log_file: '/var/log/fbai-app/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000
  }]
};
EOF

# Create log directory
mkdir -p /var/log/fbai-app
chown -R www-data:www-data /var/log/fbai-app

# Start application with PM2
cd /var/www/fbai-app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **Step 10: Configure Nginx**
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/fbai-app << 'EOF'
server {
    listen 80;
    server_name fbai-app.trustclouds.in;
    
    # Temporary location for Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name fbai-app.trustclouds.in;

    # SSL Configuration (will be managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/fbai-app.trustclouds.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fbai-app.trustclouds.in/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Static assets with long cache
    location /assets/ {
        alias /var/www/fbai-app/build/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Favicon
    location /favicon.ico {
        alias /var/www/fbai-app/public/favicon.ico;
        expires 1y;
        access_log off;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/fbai-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start Nginx
systemctl restart nginx
systemctl enable nginx
```

### **Step 11: Setup SSL with Let's Encrypt**
```bash
# First, make sure your domain is pointing to the server
# You can check with: nslookup fbai-app.trustclouds.in

# Obtain SSL certificate
certbot --nginx -d fbai-app.trustclouds.in --non-interactive --agree-tos --email admin@trustclouds.in

# Test SSL renewal
certbot renew --dry-run

# Setup automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### **Step 12: Configure Firewall**
```bash
# Install and configure UFW
apt install -y ufw

# Configure firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 5432 # PostgreSQL (only if needed externally)

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

### **Step 13: Setup Monitoring & Logging**
```bash
# Install logrotate configuration for application logs
cat > /etc/logrotate.d/fbai-app << 'EOF'
/var/log/fbai-app/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Setup PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

---

## 🔄 **Deployment Automation Script**

Create a deployment script for future updates:

```bash
cat > /root/deploy-fbai.sh << 'EOF'
#!/bin/bash

# AI Facebook Ads Pro Deployment Script
set -e

echo "🚀 Starting AI Facebook Ads Pro deployment..."

# Variables
APP_DIR="/var/www/fbai-app"
BACKUP_DIR="/var/backups/fbai-app"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup if app exists
if [ -d "$APP_DIR" ]; then
    echo "📦 Creating backup..."
    tar -czf $BACKUP_DIR/fbai-app-$DATE.tar.gz -C /var/www fbai-app
    echo "✅ Backup created: $BACKUP_DIR/fbai-app-$DATE.tar.gz"
fi

# Navigate to app directory
cd $APP_DIR

# Pull latest changes (if using Git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull origin main
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build application
echo "🔨 Building application..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma db push

# Set proper permissions
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod 600 $APP_DIR/.env

# Restart application
echo "🔄 Restarting application..."
pm2 restart fbai-app

# Reload Nginx
echo "🌐 Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌍 Application is running at: https://fbai-app.trustclouds.in"

# Health check
echo "🏥 Performing health check..."
sleep 10

if curl -f -s https://fbai-app.trustclouds.in/health > /dev/null; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    echo "📋 Checking PM2 status..."
    pm2 status
    echo "📋 Checking recent logs..."
    pm2 logs fbai-app --lines 20
    exit 1
fi

echo "🎉 Deployment completed successfully!"
EOF

chmod +x /root/deploy-fbai.sh
```

---

## 📊 **Verification & Testing**

### **1. Check All Services**
```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs fbai-app --lines 50

# Check Nginx status
systemctl status nginx

# Check PostgreSQL status
systemctl status postgresql

# Check SSL certificate
certbot certificates

# Check firewall status
ufw status
```

### **2. Test Application**
```bash
# Test HTTP redirect
curl -I http://fbai-app.trustclouds.in

# Test HTTPS
curl -I https://fbai-app.trustclouds.in

# Test health endpoint
curl https://fbai-app.trustclouds.in/health

# Test main application
curl -s https://fbai-app.trustclouds.in | head -20
```

### **3. Performance Check**
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check CPU usage
top -n 1

# Check network connections
netstat -tlnp | grep -E '(3000|80|443|5432)'
```

---

## 🚨 **Troubleshooting Guide**

### **Common Issues & Solutions**

1. **Application won't start**
   ```bash
   pm2 logs fbai-app
   cd /var/www/fbai-app && npm run build
   pm2 restart fbai-app
   ```

2. **Database connection issues**
   ```bash
   sudo -u postgres psql -c "\l"
   netstat -tlnp | grep 5432
   systemctl status postgresql
   ```

3. **SSL certificate issues**
   ```bash
   certbot certificates
   certbot renew --dry-run
   nginx -t
   systemctl restart nginx
   ```

4. **Domain not resolving**
   ```bash
   nslookup fbai-app.trustclouds.in
   dig fbai-app.trustclouds.in
   ```

5. **High memory usage**
   ```bash
   pm2 restart fbai-app
   pm2 set pm2-logrotate:max_size 5M
   ```

---

## 🔧 **Maintenance Commands**

### **Daily Operations**
```bash
# View application status
pm2 status

# View recent logs
pm2 logs fbai-app --lines 100

# Restart application
pm2 restart fbai-app

# Monitor performance
pm2 monit

# Check SSL certificate expiry
certbot certificates
```

### **Database Maintenance**
```bash
# Backup database
pg_dump -U fbai_user -h localhost fbai_production > /var/backups/fbai-db-$(date +%Y%m%d).sql

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('fbai_production'));"

# Vacuum database (monthly)
sudo -u postgres psql fbai_production -c "VACUUM ANALYZE;"
```

### **Log Management**
```bash
# View Nginx access logs
tail -f /var/log/nginx/access.log

# View Nginx error logs
tail -f /var/log/nginx/error.log

# View application logs
tail -f /var/log/fbai-app/combined.log

# Clear old logs (if needed)
find /var/log/fbai-app -name "*.log" -mtime +30 -delete
```

---

## 📈 **Performance Optimization**

### **Database Optimization**
```sql
-- Connect to database and add indexes
sudo -u postgres psql fbai_production

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_shop ON "Campaign"(shop);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON "Campaign"(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON "Campaign"("createdAt");
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop ON "Subscription"(shop);
CREATE INDEX IF NOT EXISTS idx_facebook_accounts_shop ON "FacebookAccount"(shop);

-- Check index usage
SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats WHERE tablename IN ('Campaign', 'Subscription', 'FacebookAccount');
```

### **Nginx Optimization**
```bash
# Add to /etc/nginx/nginx.conf in http block
cat >> /etc/nginx/nginx.conf << 'EOF'

# Performance optimizations
client_max_body_size 10M;
keepalive_timeout 65;
keepalive_requests 100;
sendfile on;
tcp_nopush on;
tcp_nodelay on;

# Worker processes
worker_processes auto;
worker_connections 1024;
worker_rlimit_nofile 2048;

# Buffers
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
output_buffers 1 32k;
postpone_output 1460;

EOF

# Restart Nginx
systemctl restart nginx
```

---

## 🔐 **Security Hardening**

### **Additional Security Measures**
```bash
# Install fail2ban for SSH protection
apt install -y fail2ban

# Configure fail2ban for Nginx
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

systemctl restart fail2ban

# Setup automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Secure shared memory
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab
```

---

## 📞 **Final Checklist**

Before going live, ensure:

- ✅ Domain `fbai-app.trustclouds.in` points to `77.37.45.67`
- ✅ SSL certificate is installed and working
- ✅ Application starts without errors
- ✅ Database connection is working
- ✅ All environment variables are set
- ✅ Firewall is configured
- ✅ Monitoring is set up
- ✅ Backups are configured
- ✅ Health check endpoint responds

**🎉 Your AI Facebook Ads Pro application is now ready for production!**

**Access URLs:**
- **Main App**: https://fbai-app.trustclouds.in
- **Health Check**: https://fbai-app.trustclouds.in/health
- **Admin Dashboard**: https://fbai-app.trustclouds.in/admin

**Next Steps:**
1. Configure your Shopify App settings to use the production URL
2. Set up Facebook App with the production callback URL
3. Configure OpenAI API key
4. Test the complete user flow
5. Monitor logs and performance