// Script to reset the account balance for admin@abv.bg to 50,000
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Read .env.local file manually
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envLines = envContent.split("\n");
let MONGODB_URI = "";

for (const line of envLines) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith("MONGODB_URI=")) {
    MONGODB_URI = trimmedLine
      .substring("MONGODB_URI=".length)
      .replace(/"/g, "");
    break;
  }
}

// Define schemas directly in this script
const UserSchema = new mongoose.Schema(
  {
    email: String,
    password: String,
    name: String,
  },
  { timestamps: true }
);

const AccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance: Number,
    equity: Number,
    margin: Number,
    freeMargin: Number,
    marginLevel: Number,
    currency: String,
    leverage: Number,
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
const Account = mongoose.model("Account", AccountSchema);

async function resetAccount() {
  try {
    // Connect to MongoDB
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    // Find the user
    const user = await User.findOne({ email: "admin@abv.bg" });
    if (!user) {
      console.log("User admin@abv.bg not found!");
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Find the account
    let account = await Account.findOne({ userId: user._id });

    if (!account) {
      console.log("Account not found, creating new one...");
      account = new Account({
        userId: user._id,
        balance: 50000,
        equity: 50000,
        margin: 0,
        freeMargin: 50000,
        marginLevel: 0,
        currency: "USD",
        leverage: 100,
      });
    } else {
      console.log("Account found, updating...");
      account.balance = 50000;
      account.equity = 50000;
      account.margin = 0;
      account.freeMargin = 50000;
      account.marginLevel = 0;
    }

    await account.save();
    console.log("\n✓ Account reset successfully!");
    console.log("New account values:");
    console.log(`  Balance: $${account.balance.toFixed(2)}`);
    console.log(`  Equity: $${account.equity.toFixed(2)}`);
    console.log(`  Margin: $${account.margin.toFixed(2)}`);
    console.log(`  Free Margin: $${account.freeMargin.toFixed(2)}`);
    console.log(`  Margin Level: ${account.marginLevel}%`);
    console.log(`  Currency: ${account.currency}`);
    console.log(`  Leverage: 1:${account.leverage}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

resetAccount();
