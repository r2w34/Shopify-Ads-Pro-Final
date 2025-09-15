import nodemailer from 'nodemailer';

// SMTP Configuration
const SMTP_CONFIG = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'no-reply@trustclouds.in',
    pass: 'Kalilinux@2812'
  }
};

// Create transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: {
          name: 'Shopify Ads Pro Support',
          address: 'no-reply@trustclouds.in'
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  // Support ticket email templates
  static async sendTicketCreatedNotification(ticketData: {
    ticketNumber: string;
    subject: string;
    customerName: string;
    customerEmail: string;
    description: string;
    priority: string;
    category: string;
  }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Ticket Created</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .priority-urgent { border-left-color: #dc2626; }
          .priority-high { border-left-color: #ea580c; }
          .priority-medium { border-left-color: #ca8a04; }
          .priority-low { border-left-color: #16a34a; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; margin-bottom: 10px; }
          .description { background: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎧 New Support Ticket Created</h1>
            <p>A new support ticket has been submitted and requires attention</p>
          </div>
          
          <div class="content">
            <div class="ticket-info priority-${ticketData.priority}">
              <h2>Ticket #${ticketData.ticketNumber}</h2>
              
              <div class="label">Subject:</div>
              <div class="value">${ticketData.subject}</div>
              
              <div class="label">Customer:</div>
              <div class="value">${ticketData.customerName} (${ticketData.customerEmail})</div>
              
              <div class="label">Priority:</div>
              <div class="value">${ticketData.priority.toUpperCase()}</div>
              
              <div class="label">Category:</div>
              <div class="value">${ticketData.category}</div>
              
              <div class="label">Description:</div>
              <div class="description">${ticketData.description}</div>
            </div>
            
            <p><strong>Action Required:</strong> Please review and respond to this ticket as soon as possible.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://fbai-app.trustclouds.in/admin/support" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Ticket in Admin Panel
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Shopify Ads Pro Support System</p>
            <p>© 2024 Shopify Ads Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: 'support@trustclouds.in', // Send to support team
      subject: `🚨 New Support Ticket: ${ticketData.subject} [${ticketData.ticketNumber}]`,
      html
    });
  }

  static async sendTicketResponseNotification(ticketData: {
    ticketNumber: string;
    subject: string;
    customerName: string;
    customerEmail: string;
    adminResponse: string;
    adminName: string;
    status: string;
  }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Ticket Response</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .response { background: #f0f9ff; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 3px solid #3b82f6; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; margin-bottom: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Support Ticket Response</h1>
            <p>We've responded to your support ticket</p>
          </div>
          
          <div class="content">
            <p>Hello ${ticketData.customerName},</p>
            
            <p>We've responded to your support ticket. Here are the details:</p>
            
            <div class="ticket-info">
              <div class="label">Ticket #${ticketData.ticketNumber}</div>
              <div class="value">${ticketData.subject}</div>
              
              <div class="label">Status:</div>
              <div class="value">${ticketData.status.replace('_', ' ').toUpperCase()}</div>
              
              <div class="label">Response from ${ticketData.adminName}:</div>
              <div class="response">${ticketData.adminResponse}</div>
            </div>
            
            <p>If you have any additional questions or concerns, please don't hesitate to reply to this ticket.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://fbai-app.trustclouds.in/app/support" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Ticket Details
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for using Shopify Ads Pro!</p>
            <p>© 2024 Shopify Ads Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: ticketData.customerEmail,
      subject: `Re: ${ticketData.subject} [${ticketData.ticketNumber}]`,
      html
    });
  }

  static async sendTicketStatusUpdateNotification(ticketData: {
    ticketNumber: string;
    subject: string;
    customerName: string;
    customerEmail: string;
    oldStatus: string;
    newStatus: string;
    adminName?: string;
  }): Promise<boolean> {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'resolved': return '#10b981';
        case 'closed': return '#6b7280';
        case 'in_progress': return '#f59e0b';
        default: return '#3b82f6';
      }
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Ticket Status Update</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
          .status-change { background: #f0f9ff; padding: 15px; border-radius: 4px; margin: 15px 0; text-align: center; }
          .status-badge { padding: 6px 12px; border-radius: 4px; color: white; font-weight: 600; margin: 0 5px; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; margin-bottom: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Ticket Status Updated</h1>
            <p>Your support ticket status has been updated</p>
          </div>
          
          <div class="content">
            <p>Hello ${ticketData.customerName},</p>
            
            <p>The status of your support ticket has been updated:</p>
            
            <div class="ticket-info">
              <div class="label">Ticket #${ticketData.ticketNumber}</div>
              <div class="value">${ticketData.subject}</div>
              
              <div class="status-change">
                <span class="status-badge" style="background-color: ${getStatusColor(ticketData.oldStatus)}">
                  ${ticketData.oldStatus.replace('_', ' ').toUpperCase()}
                </span>
                →
                <span class="status-badge" style="background-color: ${getStatusColor(ticketData.newStatus)}">
                  ${ticketData.newStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              ${ticketData.adminName ? `<div class="label">Updated by:</div><div class="value">${ticketData.adminName}</div>` : ''}
            </div>
            
            ${ticketData.newStatus === 'resolved' ? 
              '<p><strong>Great news!</strong> Your ticket has been resolved. If you\'re satisfied with the resolution, no further action is needed.</p>' :
              ticketData.newStatus === 'closed' ?
              '<p>This ticket has been closed. If you need further assistance, please create a new support ticket.</p>' :
              '<p>We\'ll continue working on your ticket and keep you updated on any progress.</p>'
            }
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://fbai-app.trustclouds.in/app/support" 
                 style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Ticket Details
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for using Shopify Ads Pro!</p>
            <p>© 2024 Shopify Ads Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: ticketData.customerEmail,
      subject: `Ticket Status Update: ${ticketData.subject} [${ticketData.ticketNumber}]`,
      html
    });
  }

  // Admin notification emails
  static async sendAdminTicketAssignmentNotification(ticketData: {
    ticketNumber: string;
    subject: string;
    customerName: string;
    priority: string;
    category: string;
    assignedToEmail: string;
    assignedToName: string;
  }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Ticket Assigned</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; margin-bottom: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Ticket Assigned to You</h1>
            <p>A support ticket has been assigned to you</p>
          </div>
          
          <div class="content">
            <p>Hello ${ticketData.assignedToName},</p>
            
            <p>A support ticket has been assigned to you. Please review and respond as soon as possible:</p>
            
            <div class="ticket-info">
              <div class="label">Ticket #${ticketData.ticketNumber}</div>
              <div class="value">${ticketData.subject}</div>
              
              <div class="label">Customer:</div>
              <div class="value">${ticketData.customerName}</div>
              
              <div class="label">Priority:</div>
              <div class="value">${ticketData.priority.toUpperCase()}</div>
              
              <div class="label">Category:</div>
              <div class="value">${ticketData.category}</div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://fbai-app.trustclouds.in/admin/support" 
                 style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View & Respond to Ticket
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Shopify Ads Pro Admin Panel</p>
            <p>© 2024 Shopify Ads Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: ticketData.assignedToEmail,
      subject: `🎯 Ticket Assigned: ${ticketData.subject} [${ticketData.ticketNumber}]`,
      html
    });
  }
}