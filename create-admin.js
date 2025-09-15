import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: 'admin@fbai-app.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        email: 'admin@fbai-app.com',
        name: 'System Administrator',
        role: 'super_admin',
        passwordHash: passwordHash,
        isActive: true,
        permissions: JSON.stringify(['*']) // All permissions
      }
    });

    console.log('Admin user created successfully:', admin.email);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();