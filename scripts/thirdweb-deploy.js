#!/usr/bin/env node

/**
 * ThirdWeb Contract Upload & Deploy Script
 * Uses secret key for authentication
 */

require('dotenv').config();
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('\n🚀 ThirdWeb Contract Deployment\n');
  console.log('📋 Step 1: Get your secret key');
  console.log('   1. Go to: https://thirdweb.com/dashboard');
  console.log('   2. Click Settings → API Keys');
  console.log('   3. Create a new API Key');
  console.log('   4. Copy the key\n');
  
  const secretKey = await prompt('🔐 Paste your ThirdWeb Secret Key: ');
  
  if (!secretKey || secretKey.trim().length === 0) {
    console.error('❌ Secret key is required!');
    process.exit(1);
  }
  
  console.log('\n📝 Step 2: Select action');
  console.log('   1. Upload contracts');
  console.log('   2. Deploy contracts');
  
  const action = await prompt('\nChoose (1 or 2): ');
  
  try {
    if (action === '1') {
      console.log('\n⬆️  Uploading contracts...\n');
      execSync(`npx thirdweb upload -k ${secretKey}`, { stdio: 'inherit' });
    } else if (action === '2') {
      console.log('\n🚀 Deploying contracts...\n');
      execSync(`npx thirdweb deploy -k ${secretKey}`, { stdio: 'inherit' });
    } else {
      console.error('❌ Invalid choice');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Operation failed');
    process.exit(1);
  }
  
  rl.close();
}

main();
