const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let MONGODB_URI = '';

for (const line of envLines) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('MONGODB_URI=')) {
    MONGODB_URI = trimmedLine
      .substring('MONGODB_URI='.length)
      .replace(/"/g, '');
    break;
  }
}

async function checkUser() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.connection.collection('users');
  const user = await User.findOne({ email: 'admin@abv.bg' });
  console.log('User:', JSON.stringify(user, null, 2));
  await mongoose.disconnect();
}

checkUser();

