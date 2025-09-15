// Test script to verify email functionality
import { EmailService } from './app/services/email.server.ts';

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  try {
    // Test 1: New ticket creation notification
    console.log('📧 Test 1: New Ticket Creation Notification');
    await EmailService.sendTicketCreatedNotification({
      ticketNumber: 'TEST-001',
      subject: 'Test Support Ticket',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      description: 'This is a test ticket to verify email functionality.',
      priority: 'high',
      category: 'technical'
    });
    console.log('✅ New ticket notification sent successfully\n');

    // Test 2: Status update notification
    console.log('📧 Test 2: Status Update Notification');
    await EmailService.sendTicketStatusUpdateNotification({
      ticketNumber: 'TEST-001',
      subject: 'Test Support Ticket',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      oldStatus: 'open',
      newStatus: 'in_progress',
      adminName: 'Support Agent'
    });
    console.log('✅ Status update notification sent successfully\n');

    // Test 3: Assignment notification
    console.log('📧 Test 3: Assignment Notification');
    await EmailService.sendAdminTicketAssignmentNotification({
      ticketNumber: 'TEST-001',
      subject: 'Test Support Ticket',
      customerName: 'John Doe',
      priority: 'high',
      category: 'technical',
      assignedToEmail: 'support@fbai-app.com',
      assignedToName: 'Support Agent'
    });
    console.log('✅ Assignment notification sent successfully\n');

    // Test 4: Response notification
    console.log('📧 Test 4: Response Notification');
    await EmailService.sendTicketResponseNotification({
      ticketNumber: 'TEST-001',
      subject: 'Test Support Ticket',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      adminResponse: 'Thank you for contacting us. We are looking into your issue and will get back to you shortly.',
      adminName: 'Support Agent',
      status: 'in_progress'
    });
    console.log('✅ Response notification sent successfully\n');

    console.log('🎉 All email tests completed successfully!');
    console.log('📬 Check the configured email addresses for the test messages.');

  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify SMTP credentials are correct');
    console.log('2. Check if the SMTP server is accessible');
    console.log('3. Ensure the email addresses are valid');
    console.log('4. Check firewall settings for port 465');
  }
}

// Run the test
testEmailService();