// Script to promote a user to admin role
// Usage: node create-admin.js <email>

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

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: node create-admin.js <email>");
  console.error("Example: node create-admin.js admin@atlasx.com");
  process.exit(1);
}

// Define User schema
const UserSchema = new mongoose.Schema(
  {
    email: String,
    password: String,
    name: String,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

async function promoteToAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`\nError: User with email "${email}" not found.`);
      console.log("\nAvailable users:");
      const users = await User.find({});
      users.forEach((u) => {
        console.log(`  - ${u.email} (${u.name}) [${u.role || "user"}]`);
      });
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`\nUser "${email}" is already an admin.`);
      process.exit(0);
    }

    user.role = "admin";
    await user.save();

    console.log(
      `\n✓ Successfully promoted "${user.name}" (${email}) to admin role!`
    );
    console.log("\nYou can now login at: http://localhost:3000/admin-panel");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

promoteToAdmin();
