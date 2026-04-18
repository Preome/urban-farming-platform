const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing Neon DB connection...');
    console.log('Connection string:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    await prisma.$connect();
    console.log('✅ Successfully connected to Neon DB!');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('PostgreSQL version:', result);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if your Neon DB instance is active');
    console.log('2. Verify the connection string is copied correctly');
    console.log('3. Make sure there are no spaces in the connection string');
    console.log('4. Check if the password is correct');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();