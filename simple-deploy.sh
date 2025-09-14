#!/bin/bash

# Simple deployment script for Facebook AI Advertising App
# Skips system updates to avoid interactive prompts

set -e

APP_NAME="fb-ai-ads"
APP_DIR="/var/www/$APP_NAME"

echo "🚀 Setting up Facebook AI Advertising App on VPS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt install -y nginx
else
    echo "✅ Nginx already installed"
fi

# Create application directory
echo "📁 Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Extract deployment package
echo "📦 Extracting application..."
if [ -f /tmp/deploy.tar.gz ]; then
    tar -xzf /tmp/deploy.tar.gz -C $APP_DIR
    rm /tmp/deploy.tar.gz
else
    echo "❌ Deployment package not found at /tmp/deploy.tar.gz"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create environment file
echo "⚙️  Creating environment configuration..."
cat > .env << 'EOF'
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=read_products,write_products,read_orders,write_orders,read_customers,write_customers

# Database
DATABASE_URL="file:./dev.sqlite"

# Session Secret
SESSION_SECRET=your_super_secret_session_key_here

# Facebook/Meta Configuration
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token

# AI Services
GEMINI_API_KEY=AIzaSyCOLsr0_ADY0Lsgs1Vl9TZattNpLBwyGlQ

# App Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
EOF

echo "⚠️  Please update the .env file with your actual credentials!"

# Setup database
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push

# Create PM2 ecosystem file
echo "⚙️  Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fb-ai-ads',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/fb-ai-ads',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
server {
    listen 80;
    server_name _;

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
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start services
echo "🚀 Starting services..."
systemctl restart nginx
systemctl enable nginx

# Start the application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your app should be running on:"
echo "   http://77.37.45.67"
echo "   http://localhost:3000 (local)"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your actual credentials"
echo "2. Configure SSL certificate (recommended)"
echo "3. Test the application"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 status          - Check app status"
echo "   pm2 logs fb-ai-ads  - View app logs"
echo "   pm2 restart fb-ai-ads - Restart app"
echo "   systemctl status nginx - Check Nginx status"
echo ""