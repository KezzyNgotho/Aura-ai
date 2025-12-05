#!/usr/bin/env node

/**
 * Deploy script for ThirdWeb contracts
 * Supports deployment via secret key authentication
 * 
 * Usage:
 *   npm run deploy:contracts
 *   npm run deploy:contracts -- -k=YOUR_SECRET_KEY
 *   THIRDWEB_SECRET_KEY=xxx npm run deploy:contracts
 */

require('dotenv').config();
const { execSync } = require('child_process');

// Get secret key from various sources
const secretKeyFromEnv = process.env.THIRDWEB_SECRET_KEY;
const secretKeyFromArgs = process.argv.find(arg => arg.startsWith('-k=') || arg.startsWith('--key='));
const secretKey = secretKeyFromArgs?.split('=')[1] || secretKeyFromEnv;

try {
  console.log('🚀 Starting ThirdWeb contract deployment...\n');
  
  if (secretKey) {
    console.log('✅ Using secret key for authentication');
    console.log(`   Key: ${secretKey.substring(0, 20)}...\n`);
  } else {
    console.log('📍 No secret key provided - using browser authentication\n');
    console.log('💡 To use secret key authentication:');
    console.log('   1. Get key from: https://thirdweb.com/team/~/~/');
    console.log('   2. Run: npm run deploy:contracts -- -k=YOUR_KEY\n');
  }
  
  console.log('📝 Follow these steps:');
  console.log('   1. When prompted, select your contracts');
  console.log('   2. Choose your target network');
  console.log('   3. Review and confirm deployment\n');
  
  // Build the command
  const command = secretKey 
    ? `npx thirdweb deploy -k ${secretKey}`
    : 'npx thirdweb deploy';
  
  execSync(command, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env
  });
  
  console.log('\n✅ Deployment complete!');
  
} catch (error) {
  console.error('\n❌ Deployment failed');
  if (!secretKey) {
    console.error('\n💡 Troubleshooting:');
    console.error('   - If browser auth timed out, try using a secret key');
    console.error('   - Get key from: https://thirdweb.com/team/~/~/');
    console.error('   - Run: npm run deploy:contracts -- -k=YOUR_SECRET_KEY\n');
  } else {
    console.error('   - Verify your secret key is valid and not expired');
    console.error('   - Check permissions in thirdweb dashboard\n');
  }
  process.exit(1);
}

