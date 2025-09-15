# 🚀 Admin Panel Setup Guide

## Overview

Your Facebook AI Ads Pro application now has a comprehensive admin panel where you can manage customers, settings, and monitor the system. This guide will help you set up and access the admin panel.

## 🔐 Admin Panel Features

### **Dashboard** (`/admin`)
- System statistics (total users, campaigns, ad spend)
- System health monitoring
- Quick action buttons
- System information overview

### **Customer Management** (`/admin/customers`)
- View all Shopify stores using your app
- Filter customers by status (active, inactive, blocked)
- Search customers by shop name or email
- Manage customer accounts (activate/deactivate, block/unblock)
- View subscription details
- Add support notes and priority levels

### **Settings Management** (`/admin/settings`)
- Configure system-wide settings
- Manage API keys and configurations
- Update application parameters
- Bulk settings management

### **Security Features**
- Secure login with bcrypt password hashing
- Session-based authentication
- Role-based access control (Super Admin, Admin, Support)
- Automatic logout and session management

## 🛠️ Setup Instructions

### Step 1: Deploy the Admin Panel Code

```bash
# SSH into your server
ssh root@77.37.45.67

# Navigate to your app directory
cd /var/www/fbai-app

# Pull the latest code with admin panel
git pull origin main

# Install any new dependencies
npm install

# Build the application
npm run build

# Restart the application
pm2 restart all
```

### Step 2: Create Your First Admin User

```bash
# In your app directory, run the admin setup script
node setup-admin.js
```

The script will prompt you for:
- **Full Name**: Your display name
- **Email Address**: Your login email
- **Password**: Secure password (minimum 8 characters)
- **Confirm Password**: Password confirmation

Example:
```
🚀 Facebook AI Ads Pro - Admin Setup
=====================================

Please provide the following information for the admin user:

Full Name: John Doe
Email Address: admin@yourcompany.com
Password: ********
Confirm Password: ********

🔄 Creating admin user...

✅ Admin user created successfully!

Admin Details:
- Name: John Doe
- Email: admin@yourcompany.com
- Role: super_admin
- ID: clx1234567890

🔗 Access your admin panel at:
https://fbai-app.trustclouds.in/admin

📝 Login credentials:
Email: admin@yourcompany.com
Password: [the password you just entered]
```

### Step 3: Access the Admin Panel

1. **Open your browser** and go to: `https://fbai-app.trustclouds.in/admin`
2. **You'll be redirected** to the login page: `https://fbai-app.trustclouds.in/admin/login`
3. **Enter your credentials** that you created in Step 2
4. **Click "Sign In"** to access the admin dashboard

## 📊 Admin Panel URLs

| Page | URL | Description |
|------|-----|-------------|
| **Login** | `/admin/login` | Admin authentication |
| **Dashboard** | `/admin` | Main admin dashboard |
| **Customers** | `/admin/customers` | Manage Shopify stores |
| **Settings** | `/admin/settings` | System configuration |
| **Logout** | `/admin/logout` | Sign out of admin panel |

## 👥 User Roles

### **Super Admin** (Highest Level)
- Full access to all features
- Can manage other admin users
- Can modify critical system settings
- Access to all customer data

### **Admin** (Standard Level)
- Manage customers and their subscriptions
- View analytics and reports
- Modify most system settings
- Cannot create other admin users

### **Support** (Limited Level)
- View customer information
- Add support notes
- Limited settings access
- Cannot modify critical configurations

## 🔧 Managing Customers

### **Customer List View**
- **Search**: Find customers by shop name or email
- **Filter**: Show active, inactive, or blocked customers
- **Pagination**: Navigate through customer pages

### **Customer Actions**
- **Activate/Deactivate**: Enable or disable customer access
- **Block/Unblock**: Restrict customer access with reason
- **Support Notes**: Add internal notes about customer issues
- **Priority Level**: Set support priority (Low, Medium, High, Critical)

### **Subscription Management**
- View current subscription plans
- See subscription status and billing
- Track usage and limits

## ⚙️ System Settings

### **Categories**
- **API Configuration**: Facebook, OpenAI, and other API settings
- **Billing Settings**: Subscription plans and pricing
- **Feature Flags**: Enable/disable application features
- **Security Settings**: Authentication and access controls
- **Email Settings**: SMTP and notification configurations

### **Setting Types**
- **Text**: Simple text values
- **Number**: Numeric configurations
- **Boolean**: True/false toggles
- **Encrypted**: Sensitive data (API keys, passwords)

## 🚨 Security Best Practices

### **Password Security**
- Use strong passwords (minimum 8 characters)
- Include uppercase, lowercase, numbers, and symbols
- Don't share admin credentials
- Change passwords regularly

### **Access Control**
- Only create admin accounts for trusted team members
- Use appropriate role levels
- Monitor admin activity logs
- Remove inactive admin accounts

### **Session Management**
- Admin sessions expire after 7 days of inactivity
- Always log out when finished
- Don't use admin panel on shared computers

## 🔍 Monitoring and Analytics

### **Dashboard Metrics**
- **Total Users**: Number of Shopify stores using your app
- **Total Campaigns**: All Facebook campaigns created
- **Total Ad Spend**: Sum of all advertising spend
- **System Health**: Application uptime and performance

### **Customer Insights**
- Active vs inactive customers
- Subscription distribution
- Support ticket priorities
- Usage patterns

## 🆘 Troubleshooting

### **Can't Access Admin Panel**
1. **Check URL**: Ensure you're going to `/admin` not `/app`
2. **Clear Browser Cache**: Hard refresh (Ctrl+F5)
3. **Check Credentials**: Verify email and password
4. **Reset Password**: Contact system administrator

### **Admin Setup Script Issues**
```bash
# If you get permission errors
chmod +x setup-admin.js

# If you get database errors
npm run db:push

# If you get bcrypt errors
npm install bcryptjs --save
```

### **Login Problems**
- **Invalid Credentials**: Double-check email and password
- **Account Inactive**: Admin account may be deactivated
- **Session Expired**: Clear cookies and try again
- **Database Issues**: Check server logs

## 📞 Support

If you encounter any issues with the admin panel:

1. **Check Server Logs**: `pm2 logs` on your server
2. **Database Issues**: Ensure SQLite database is accessible
3. **Permission Problems**: Check file permissions in app directory
4. **Network Issues**: Verify SSL certificate and domain configuration

## 🔄 Adding More Admin Users

After you have access to the admin panel, you can create additional admin users:

1. **Log into Admin Panel**
2. **Go to Settings** (when user management is implemented)
3. **Add New Admin User**
4. **Set Appropriate Role Level**
5. **Send Credentials Securely**

## 📋 Quick Checklist

- [ ] Code deployed to server
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build`)
- [ ] Application restarted (`pm2 restart all`)
- [ ] Admin user created (`node setup-admin.js`)
- [ ] Admin panel accessible at `/admin`
- [ ] Login working with created credentials
- [ ] Dashboard showing system statistics
- [ ] Customer management functional
- [ ] Settings panel accessible

Your admin panel is now ready to use! You can manage your Facebook AI Ads Pro application, monitor customers, and configure system settings through the secure admin interface.