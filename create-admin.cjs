const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const passwordHash = await bcrypt.hash('Admin123', 12);
    
    const admin = await db.adminUser.create({
      data: {
        email: 'admin@fbai-app.com',
        passwordHash,
        name: 'Admin User',
        role: 'super_admin',
        isActive: true,
        permissions: JSON.stringify(['*']) // Super admin has all permissions
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@fbai-app.com');
    console.log('Password: Admin123');
    console.log('Role: super_admin');
    console.log('ID:', admin.id);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Admin user already exists with this email.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await db.$disconnect();
  }
}

createAdmin();
