import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Update admin user password
    const admin = await prisma.adminUser.update({
      where: { email: 'admin@fbai-app.com' },
      data: {
        passwordHash: passwordHash,
        isActive: true
      }
    });

    console.log('Admin password updated successfully for:', admin.email);
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();