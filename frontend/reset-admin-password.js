const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

async function resetPassword() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.connection.collection('users');
  
  const newPassword = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  await User.updateOne(
    { email: 'admin@abv.bg' },
    { $set: { password: hashedPassword } }
  );
  
  console.log('Password reset to: admin123');
  await mongoose.disconnect();
}

resetPassword();

