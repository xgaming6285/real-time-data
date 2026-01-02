// Run this script to clean up duplicate accounts
// Usage: node cleanup-duplicate-accounts.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Account = mongoose.model('Account', new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      balance: Number,
      equity: Number,
      margin: Number,
      freeMargin: Number,
      marginLevel: Number,
      currency: String,
      leverage: Number,
      isAutoLeverage: Boolean,
    }, { timestamps: true }));

    // Find all accounts
    const accounts = await Account.find();
    console.log(`Found ${accounts.length} accounts`);

    // Group by userId
    const accountsByUser = {};
    for (const acc of accounts) {
      const key = acc.userId.toString();
      if (!accountsByUser[key]) {
        accountsByUser[key] = [];
      }
      accountsByUser[key].push(acc);
    }

    // Find and fix duplicates
    for (const [userId, userAccounts] of Object.entries(accountsByUser)) {
      if (userAccounts.length > 1) {
        console.log(`\nUser ${userId} has ${userAccounts.length} accounts:`);
        userAccounts.forEach((acc, i) => {
          console.log(`  ${i + 1}. _id: ${acc._id}, leverage: ${acc.leverage}, balance: ${acc.balance}, created: ${acc.createdAt}`);
        });

        // Keep the oldest one (first created), delete the rest
        const sorted = userAccounts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const keep = sorted[0];
        const toDelete = sorted.slice(1);

        console.log(`  Keeping: ${keep._id} (oldest)`);
        
        for (const acc of toDelete) {
          console.log(`  Deleting: ${acc._id}`);
          await Account.deleteOne({ _id: acc._id });
        }

        // Update the kept account with the most recent leverage if different
        const mostRecent = sorted[sorted.length - 1];
        if (mostRecent.leverage !== keep.leverage) {
          console.log(`  Updating leverage from ${keep.leverage} to ${mostRecent.leverage}`);
          await Account.updateOne({ _id: keep._id }, { $set: { leverage: mostRecent.leverage, isAutoLeverage: mostRecent.isAutoLeverage } });
        }
      }
    }

    console.log('\nCleanup complete!');
    
    // Verify
    const remaining = await Account.find();
    console.log(`Remaining accounts: ${remaining.length}`);
    remaining.forEach(acc => {
      console.log(`  userId: ${acc.userId}, leverage: ${acc.leverage}, isAutoLeverage: ${acc.isAutoLeverage}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();

