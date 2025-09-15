#!/usr/bin/env node

/**
 * Admin User Setup Script
 * 
 * This script creates the first admin user for the Facebook AI Ads Pro application.
 * Run this script once to set up your admin access.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const db = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function setupAdmin() {
  console.log('🚀 Facebook AI Ads Pro - Admin Setup');
  console.log('=====================================\n');

  try {
    // Check if admin users already exist
    const existingAdmins = await db.adminUser.count();
    
    if (existingAdmins > 0) {
      console.log('⚠️  Admin users already exist in the database.');
      const overwrite = await question('Do you want to create another admin user? (y/N): ');
      
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }

    console.log('Please provide the following information for the admin user:\n');

    // Get admin details
    const name = await question('Full Name: ');
    const email = await question('Email Address: ');
    const password = await questionHidden('Password: ');
    const confirmPassword = await questionHidden('Confirm Password: ');

    // Validate input
    if (!name || !email || !password) {
      console.log('\n❌ All fields are required.');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match.');
      process.exit(1);
    }

    if (password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long.');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await db.adminUser.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      console.log('\n❌ An admin user with this email already exists.');
      process.exit(1);
    }

    // Create admin user
    console.log('\n🔄 Creating admin user...');
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    const admin = await db.adminUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('\nAdmin Details:');
    console.log(`- Name: ${admin.name}`);
    console.log(`- Email: ${admin.email}`);
    console.log(`- Role: ${admin.role}`);
    console.log(`- ID: ${admin.id}`);
    
    console.log('\n🔗 Access your admin panel at:');
    console.log('https://fbai-app.trustclouds.in/admin');
    
    console.log('\n📝 Login credentials:');
    console.log(`Email: ${admin.email}`);
    console.log('Password: [the password you just entered]');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
    rl.close();
  }
}

// Run the setup
setupAdmin().catch(console.error);