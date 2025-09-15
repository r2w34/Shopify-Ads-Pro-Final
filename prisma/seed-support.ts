import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedSupport() {
  console.log('🌱 Seeding support system...');

  // Create admin users if they don't exist
  const adminUsers = [
    {
      email: 'admin@fbai-app.com',
      name: 'Admin User',
      role: 'super_admin',
      permissions: JSON.stringify(['all'])
    },
    {
      email: 'support@fbai-app.com',
      name: 'Support Agent',
      role: 'support',
      permissions: JSON.stringify(['support', 'customers'])
    }
  ];

  for (const userData of adminUsers) {
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: userData.email }
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.adminUser.create({
        data: {
          ...userData,
          passwordHash
        }
      });
      console.log(`✅ Created admin user: ${userData.email}`);
    } else {
      console.log(`⏭️  Admin user already exists: ${userData.email}`);
    }
  }

  // Get admin users for assignment
  const supportAgent = await prisma.adminUser.findUnique({
    where: { email: 'support@fbai-app.com' }
  });

  // Create sample support tickets
  const sampleTickets = [
    {
      ticketNumber: 'SUP-001',
      shop: 'demo-store.myshopify.com',
      subject: 'Facebook Ads Not Creating Properly',
      description: 'Hi, I\'m having trouble creating Facebook ads through your app. When I click "Create Campaign", it shows a loading spinner but nothing happens. I\'ve tried multiple times with different products but the same issue occurs. Please help!',
      category: 'technical',
      priority: 'high',
      status: 'open',
      customerEmail: 'john@demo-store.com',
      customerName: 'John Smith',
      assignedToId: supportAgent?.id
    },
    {
      ticketNumber: 'SUP-002',
      shop: 'fashion-boutique.myshopify.com',
      subject: 'Billing Question - Subscription Charges',
      description: 'I was charged twice this month for my subscription. Can you please check my billing and refund the duplicate charge? My subscription should be $29/month but I see two charges of $29 each.',
      category: 'billing',
      priority: 'medium',
      status: 'in_progress',
      customerEmail: 'sarah@fashionboutique.com',
      customerName: 'Sarah Johnson',
      assignedToId: supportAgent?.id
    },
    {
      ticketNumber: 'SUP-003',
      shop: 'tech-gadgets.myshopify.com',
      subject: 'Feature Request - Bulk Campaign Creation',
      description: 'It would be great if we could create multiple campaigns at once for different products. Currently, I have to create each campaign individually which takes a lot of time. A bulk creation feature would be very helpful!',
      category: 'feature_request',
      priority: 'low',
      status: 'open',
      customerEmail: 'mike@techgadgets.com',
      customerName: 'Mike Chen'
    },
    {
      ticketNumber: 'SUP-004',
      shop: 'organic-foods.myshopify.com',
      subject: 'Facebook Account Connection Issues',
      description: 'I\'m unable to connect my Facebook Business account to the app. I keep getting an error message saying "Authorization failed". I\'ve tried disconnecting and reconnecting multiple times but the issue persists.',
      category: 'technical',
      priority: 'urgent',
      status: 'open',
      customerEmail: 'lisa@organicfoods.com',
      customerName: 'Lisa Williams'
    },
    {
      ticketNumber: 'SUP-005',
      shop: 'sports-equipment.myshopify.com',
      subject: 'Analytics Data Not Updating',
      description: 'The analytics dashboard hasn\'t updated in 3 days. My campaigns are running but the performance data is stuck on old numbers. This is affecting my ability to optimize campaigns.',
      category: 'bug_report',
      priority: 'high',
      status: 'resolved',
      customerEmail: 'david@sportsequip.com',
      customerName: 'David Brown',
      assignedToId: supportAgent?.id,
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Resolved yesterday
    }
  ];

  for (const ticketData of sampleTickets) {
    const existingTicket = await prisma.supportTicket.findUnique({
      where: { ticketNumber: ticketData.ticketNumber }
    });

    if (!existingTicket) {
      const ticket = await prisma.supportTicket.create({
        data: ticketData
      });

      // Add some sample messages for each ticket
      const messages = [
        {
          ticketId: ticket.id,
          message: ticketData.description,
          isFromCustomer: true,
          authorName: ticketData.customerName,
          authorEmail: ticketData.customerEmail
        }
      ];

      // Add admin responses for some tickets
      if (ticketData.status === 'in_progress' || ticketData.status === 'resolved') {
        messages.push({
          ticketId: ticket.id,
          message: 'Thank you for contacting us. I\'ve received your request and I\'m looking into this issue. I\'ll get back to you shortly with an update.',
          isFromCustomer: false,
          authorId: supportAgent?.id
        });
      }

      if (ticketData.status === 'resolved') {
        messages.push({
          ticketId: ticket.id,
          message: 'I\'ve identified and fixed the issue with the analytics data sync. The dashboard should now be updating properly. Please let me know if you continue to experience any problems.',
          isFromCustomer: false,
          authorId: supportAgent?.id
        });
        messages.push({
          ticketId: ticket.id,
          message: 'Perfect! The analytics are working now. Thank you for the quick resolution!',
          isFromCustomer: true,
          authorName: ticketData.customerName,
          authorEmail: ticketData.customerEmail
        });
      }

      for (const messageData of messages) {
        await prisma.supportMessage.create({
          data: messageData
        });
      }

      console.log(`✅ Created support ticket: ${ticketData.ticketNumber}`);
    } else {
      console.log(`⏭️  Support ticket already exists: ${ticketData.ticketNumber}`);
    }
  }

  console.log('🎉 Support system seeding completed!');
}

seedSupport()
  .catch((e) => {
    console.error('❌ Error seeding support system:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });